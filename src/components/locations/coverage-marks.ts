import type { Location } from '@/lib/api/types';

/**
 * What a coverage mark means, and what tapping one does.
 *
 * The API resolves coverage by nearest ancestor: a mark covers its node **and
 * everything under it**, and a deeper mark overrides it. So marking an area as
 * served covers every block and door inside it without a row each, and the only
 * way to carve out a gap is to mark the exception "not served".
 *
 * That inheritance has to be visible, or a served area looks like a screen full
 * of unticked children. Each child still stands on its own: one can be dropped
 * without touching its parent or its siblings.
 */
export type Mark = 'served' | 'excluded';

/** Which level of the catalogue a coverage screen is editing. */
export type CoverageScope = 'service' | 'provider' | 'package';

/**
 * The level above, whose reach this one cannot exceed.
 *
 * The API bounds a child by its parent and rejects a write that steps outside,
 * so the picker has to stop offering those places — otherwise the operator
 * ticks one and gets a 400 back with no way to see why. A service is bounded by
 * nothing; a provider by its service; a package by its provider, which already
 * carries the service's limit.
 */
export function boundsFor(
  scope: CoverageScope,
  ids: { serviceId?: string; providerId?: string },
): { serviceId?: string; providerId?: string } {
  if (scope === 'service')
    return {};

  return scope === 'provider'
    ? { serviceId: ids.serviceId }
    : { serviceId: ids.serviceId, providerId: ids.providerId };
}

export type EffectiveMark = {
  mark: Mark | undefined;
  /** True when the mark comes from an ancestor rather than this node. */
  inherited: boolean;
};

/**
 * The nearest ancestor's mark, ignoring the node's own.
 *
 * `pathIds` runs root-first and ends with the node itself — the same order the
 * API resolves in — so walking it backwards from the parent finds whatever
 * applies from above.
 */
export function inheritedMark(node: Location, marks: ReadonlyMap<string, Mark>): Mark | undefined {
  for (let i = node.pathIds.length - 2; i >= 0; i -= 1) {
    const ancestor = marks.get(node.pathIds[i]!);
    if (ancestor !== undefined)
      return ancestor;
  }

  return undefined;
}

/** The mark that actually applies here: this node's own, or the one above it. */
export function effectiveMark(node: Location, marks: ReadonlyMap<string, Mark>): EffectiveMark {
  const own = marks.get(node.id);
  if (own !== undefined)
    return { mark: own, inherited: false };

  const above = inheritedMark(node, marks);
  return { mark: above, inherited: above !== undefined };
}

/**
 * What a tap does, given where the node stands.
 *
 * Under a served parent the useful action is the exception — one tap drops this
 * child, another hands it back. A node with nothing above it cycles through the
 * three states it can be in on its own: served, not served, unset.
 */
export function nextMarks(node: Location, marks: ReadonlyMap<string, Mark>): Map<string, Mark> {
  const next = new Map(marks);
  const own = marks.get(node.id);
  const above = inheritedMark(node, marks);

  if (own === undefined) {
    // Say the opposite of what it inherits; with nothing above, start at served.
    next.set(node.id, above === 'served' ? 'excluded' : 'served');
    return next;
  }

  // Clearing an explicit mark means going back to inheriting. With nothing to
  // inherit, "served" still has "not served" to offer before it clears.
  if (above === undefined && own === 'served')
    next.set(node.id, 'excluded');
  else
    next.delete(node.id);

  return next;
}

/** The marks a saved coverage list starts from. */
export function marksFromCoverage(rows: { locationId: string; isAvailable: boolean }[]) {
  return new Map<string, Mark>(
    rows.map(row => [row.locationId, row.isAvailable ? 'served' : 'excluded'] as const),
  );
}

/** The entries a marks map sends back to the API. */
export function entriesFromMarks(marks: ReadonlyMap<string, Mark>) {
  return [...marks].map(([locationId, mark]) => ({ locationId, isAvailable: mark === 'served' }));
}
