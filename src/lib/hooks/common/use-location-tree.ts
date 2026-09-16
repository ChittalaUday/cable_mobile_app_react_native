import type { Location, LocationAncestor, Page } from '@/lib/api/types';
import * as React from 'react';

import { client } from '@/lib/api/client';
import { MAX_PAGE_SIZE } from '@/lib/api/types';
import { fetchLocationAncestors } from '@/lib/hooks/api/use-locations';

/**
 * The location tree, flattened into one pageable list.
 *
 * Each level is its own request (`?parentId=`), and every level pages: a parent
 * with 4 000 doors under it is read `MAX_PAGE_SIZE` at a time like anything
 * else. That rules out a component-per-level with its own query hook — the set
 * of open levels changes as you tap, and hooks cannot be called in a loop over
 * it — so the levels are held here as plain state and flattened in depth-first
 * order for a single virtualised list.
 */

/** The key a level is stored under; the root has no parent id. */
const ROOT = 'root';

export type Level = {
  items: Location[];
  total: number;
  /** Highest page number already merged into `items`. */
  page: number;
  loading: boolean;
};

/**
 * `isGroupEnd` marks the last row belonging to a top-level branch.
 *
 * The tree draws one card per top-level group, not one per row: a group is a
 * single continuous surface however deep it runs, and the spacing sits between
 * groups. A row only needs to know whether it closes one.
 */
export type TreeRow = { isGroupEnd: boolean } & (
  | { kind: 'node'; key: string; node: Location; depth: number }
  | { kind: 'more'; key: string; parentKey: string; depth: number; remaining: number; loading: boolean }
);

function keyOf(parentId: string | null) {
  return parentId ?? ROOT;
}

/**
 * The level above, when the tree is being used to pick coverage.
 *
 * A provider cannot be sold where its service is not, so the picker must not
 * offer those places — the operator would tick one and get a 400 back. The API
 * applies the same rule it enforces on the write, so the two cannot disagree.
 */
export type CoverageBounds = { serviceId?: string; providerId?: string };

async function fetchLevel(parentId: string | null, page: number, bounds: CoverageBounds): Promise<Page<Location>> {
  const response = await client.get<Page<Location>>('/locations', {
    // The API takes the literal string `null` to mean "top level".
    params: {
      parentId: parentId ?? 'null',
      limit: MAX_PAGE_SIZE,
      page,
      ...(bounds.serviceId ? { coverageServiceId: bounds.serviceId } : {}),
      ...(bounds.providerId ? { coverageProviderId: bounds.providerId } : {}),
    },
  });

  return response.data;
}

/**
 * Depth-first, so a child sits directly under its parent.
 *
 * A level with more pages behind it emits a trailing row; the last such level
 * is also what the end of the list pages, so scrolling to the bottom keeps
 * loading rather than stopping at a button.
 */
export function flatten(levels: Map<string, Level>, expanded: ReadonlySet<string>) {
  const rows: TreeRow[] = [];
  let tailParentKey: string | null = null;

  const walk = (parentId: string | null, depth: number) => {
    const key = keyOf(parentId);
    const level = levels.get(key);
    if (!level)
      return;

    for (const node of level.items) {
      rows.push({ kind: 'node', key: node.id, node, depth, isGroupEnd: false });
      if (expanded.has(node.id))
        walk(node.id, depth + 1);
    }

    const remaining = level.total - level.items.length;
    if (remaining > 0) {
      rows.push({ kind: 'more', key: `more:${key}`, parentKey: key, depth, remaining, loading: level.loading, isGroupEnd: false });
      tailParentKey = key;
    }
  };

  walk(null, 0);

  // A group ends where the next top-level row begins, or at the bottom.
  for (let i = 0; i < rows.length; i += 1)
    rows[i]!.isGroupEnd = i === rows.length - 1 || rows[i + 1]!.depth === 0;

  return { rows, tailParentKey: tailParentKey as string | null };
}

/**
 * The levels and pages that have to be loaded for a node to be on screen.
 *
 * Each step of the chain lives in its parent's level, and its rank among its
 * siblings says which page of that level it falls on — so everything up to that
 * page is needed for the row to exist at all.
 */
export function revealPlan(chain: LocationAncestor[]) {
  const loads: { parentId: string | null; page: number }[] = [];

  chain.forEach((step, index) => {
    const parentId = index === 0 ? null : chain[index - 1]!.id;
    const lastPage = Math.floor(step.siblingIndex / MAX_PAGE_SIZE) + 1;

    for (let page = 1; page <= lastPage; page += 1)
      loads.push({ parentId, page });
  });

  return {
    loads,
    // Every step but the node itself has to be open for it to be visible.
    expand: chain.slice(0, -1).map(step => step.id),
  };
}

// Destructured in the signature, so the fetch depends on the two ids and not
// on the identity of the object literal the caller rebuilds every render.
export function useLocationTree(expanded: ReadonlySet<string>, { serviceId, providerId }: CoverageBounds = {}) {
  const [levels, setLevels] = React.useState<Map<string, Level>>(() => new Map());
  const [refreshing, setRefreshing] = React.useState(false);

  // Guards against a level being fetched twice — by a re-render, or by the
  // end-of-list handler firing repeatedly while the request is still out.
  const inFlight = React.useRef<Set<string>>(new Set());

  const load = React.useCallback(async (parentId: string | null, page: number) => {
    const key = keyOf(parentId);
    const token = `${key}:${page}`;
    if (inFlight.current.has(token))
      return;

    inFlight.current.add(token);
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect -- `load` is a fetch called from an effect and this stores its result; that is what the effect is for, not state derived from a prop
    const mark = (loading: boolean, result?: Page<Location>) => setLevels((prev) => {
      const next = new Map(prev);
      const level = next.get(key);

      // Page 1 replaces; later pages append. Re-fetching page 1 is how a level
      // is refreshed after an edit.
      const items = result === undefined
        ? level?.items ?? []
        : page === 1 ? result.items : [...(level?.items ?? []), ...result.items];

      next.set(key, {
        items,
        total: result?.total ?? level?.total ?? 0,
        page: result === undefined ? level?.page ?? 0 : page,
        loading,
      });
      return next;
    });

    mark(true);
    try {
      mark(false, await fetchLevel(parentId, page, { serviceId, providerId }));
    }
    catch {
      mark(false);
    }
    finally {
      inFlight.current.delete(token);
    }
  }, [serviceId, providerId]);

  // The root, and the first page of every level as it is opened.
  React.useEffect(() => {
    if (!levels.has(ROOT))
      void load(null, 1);
  }, [levels, load]);

  React.useEffect(() => {
    for (const id of expanded) {
      if (!levels.has(id))
        void load(id, 1);
    }
  }, [expanded, levels, load]);

  const loadMore = React.useCallback((parentKey: string) => {
    const level = levels.get(parentKey);
    if (!level || level.loading || level.items.length >= level.total)
      return;

    void load(parentKey === ROOT ? null : parentKey, level.page + 1);
  }, [levels, load]);

  /**
   * Opens the tree onto one node and returns the ancestors to expand.
   *
   * A search hit can sit five levels down and on page three of its own level,
   * so neither expanding nor scrolling is enough on its own: the API hands back
   * the chain with each step's rank among its siblings, and every page up to
   * that rank is loaded so the row actually exists to scroll to.
   */
  const reveal = React.useCallback(async (id: string): Promise<string[]> => {
    const { loads, expand } = revealPlan(await fetchLocationAncestors(id));
    await Promise.all(loads.map(step => load(step.parentId, step.page)));
    return expand;
  }, [load]);

  /** Re-reads every level that is currently open, first page onwards. */
  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    const open = [null, ...expanded];
    // Dropping to page 1 everywhere: anything scrolled past is re-paged on
    // demand rather than re-fetched now.
    setLevels(new Map());
    await Promise.all(open.map(id => load(id, 1)));
    setRefreshing(false);
  }, [expanded, load]);

  const { rows, tailParentKey } = React.useMemo(() => flatten(levels, expanded), [levels, expanded]);

  return {
    rows,
    /** True until the root level has answered. */
    isLoading: !levels.has(ROOT) || (levels.get(ROOT)?.loading === true && rows.length === 0),
    refreshing,
    refresh,
    reveal,
    loadMore,
    /** The level the end of the list should page, if any. */
    onEndReached: React.useCallback(() => {
      if (tailParentKey)
        loadMore(tailParentKey);
    }, [tailParentKey, loadMore]),
  };
}
