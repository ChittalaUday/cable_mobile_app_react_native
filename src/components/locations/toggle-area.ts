import type { LocationRef } from '@/lib/api/types';

/**
 * Add or drop one area from a multi-select.
 *
 * A grant already covers everything beneath it, so a place and its parent are
 * never both held: picking a child drops the parent, picking a parent drops
 * the children it now covers.
 */
export function toggleArea(selected: readonly LocationRef[], node: LocationRef): LocationRef[] {
  if (selected.some(area => area.id === node.id))
    return selected.filter(area => area.id !== node.id);

  const overlaps = (area: LocationRef) => node.pathIds.includes(area.id) || area.pathIds.includes(node.id);

  return [
    ...selected.filter(area => !overlaps(area)),
    { id: node.id, name: node.name, path: node.path, pathIds: node.pathIds },
  ];
}
