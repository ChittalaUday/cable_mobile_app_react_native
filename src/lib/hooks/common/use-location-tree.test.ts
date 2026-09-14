import type { Level } from './use-location-tree';
import { flatten, revealPlan } from './use-location-tree';

function node(id: string, parentId: string | null, childCount = 0) {
  return { id, parentId, name: id, childCount } as never;
}

function level(items: ReturnType<typeof node>[], total = items.length): Level {
  return { items, total, page: 1, loading: false };
}

describe('flatten', () => {
  it('puts children directly under the parent they belong to', () => {
    const levels = new Map<string, Level>([
      ['root', level([node('a', null, 2), node('b', null)])],
      ['a', level([node('a1', 'a'), node('a2', 'a')])],
    ]);

    const { rows } = flatten(levels, new Set(['a']));

    expect(rows.map(r => r.key)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(rows.map(r => (r.kind === 'node' ? r.depth : -1))).toEqual([0, 1, 1, 0]);
  });

  it('leaves a collapsed branch out, even when its rows are cached', () => {
    const levels = new Map<string, Level>([
      ['root', level([node('a', null, 2)])],
      ['a', level([node('a1', 'a')])],
    ]);

    expect(flatten(levels, new Set()).rows.map(r => r.key)).toEqual(['a']);
  });

  it('emits a load-more row for a level that is only partly loaded', () => {
    const levels = new Map<string, Level>([
      ['root', level([node('a', null)], 250)],
    ]);

    const { rows, tailParentKey } = flatten(levels, new Set());
    const more = rows.at(-1);

    expect(more?.kind).toBe('more');
    expect(more?.kind === 'more' && more.remaining).toBe(249);
    // The end of the list pages this level, so scrolling keeps loading.
    expect(tailParentKey).toBe('root');
  });

  it('pages the deepest open level, not the root, when both have more', () => {
    const levels = new Map<string, Level>([
      ['root', level([node('a', null, 500)], 200)],
      ['a', level([node('a1', 'a')], 500)],
    ]);

    const { rows, tailParentKey } = flatten(levels, new Set(['a']));

    expect(rows.filter(r => r.kind === 'more').map(r => r.kind === 'more' && r.parentKey))
      .toEqual(['a', 'root']);
    // 'a' is emitted last in depth-first order before root's own trailing row,
    // but root's row is what sits at the bottom of the list.
    expect(tailParentKey).toBe('root');
  });

  it('is empty until the root level has answered', () => {
    expect(flatten(new Map(), new Set()).rows).toEqual([]);
  });

  it('closes a group at the row before the next top-level one', () => {
    const levels = new Map<string, Level>([
      ['root', level([node('a', null, 2), node('b', null)])],
      ['a', level([node('a1', 'a'), node('a2', 'a')])],
    ]);

    const { rows } = flatten(levels, new Set(['a']));

    // a, a1, a2 are one card; only a2 and b close a group and carry the gap.
    expect(rows.map(r => [r.key, r.isGroupEnd])).toEqual([
      ['a', false],
      ['a1', false],
      ['a2', true],
      ['b', true],
    ]);
  });

  it('closes the group on a trailing load-more row', () => {
    const levels = new Map<string, Level>([
      ['root', level([node('a', null, 300)])],
      ['a', level([node('a1', 'a')], 300)],
    ]);

    const { rows } = flatten(levels, new Set(['a']));

    expect(rows.at(-1)?.kind).toBe('more');
    expect(rows.at(-1)?.isGroupEnd).toBe(true);
    expect(rows.find(r => r.key === 'a')?.isGroupEnd).toBe(false);
  });
});

describe('revealPlan', () => {
  const step = (id: string, siblingIndex: number) => ({ id, siblingIndex }) as never;

  it('loads each step in its own parent level, root first', () => {
    const { loads, expand } = revealPlan([step('area', 0), step('tower', 3), step('block', 1)]);

    expect(loads).toEqual([
      { parentId: null, page: 1 },
      { parentId: 'area', page: 1 },
      { parentId: 'tower', page: 1 },
    ]);
    // The node itself is not expanded — only the way down to it.
    expect(expand).toEqual(['area', 'tower']);
  });

  it('loads every page up to the one a deep sibling sits on', () => {
    // Rank 250 with a page size of 100 is on page 3, and pages 1 and 2 have to
    // come with it or the rows above it are missing.
    const { loads } = revealPlan([step('area', 0), step('tower', 250)]);

    expect(loads).toEqual([
      { parentId: null, page: 1 },
      { parentId: 'area', page: 1 },
      { parentId: 'area', page: 2 },
      { parentId: 'area', page: 3 },
    ]);
  });

  it('handles a root-level hit with nothing to expand', () => {
    const { loads, expand } = revealPlan([step('area', 0)]);

    expect(loads).toEqual([{ parentId: null, page: 1 }]);
    expect(expand).toEqual([]);
  });

  it('does nothing for an empty chain', () => {
    expect(revealPlan([])).toEqual({ loads: [], expand: [] });
  });
});
