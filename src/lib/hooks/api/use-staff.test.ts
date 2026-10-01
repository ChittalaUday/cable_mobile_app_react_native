import type { LocationRef } from '@/lib/api/types';
import { sameAreas, teamCoverageLabel } from './use-staff';

const area = (id: string): LocationRef => ({ id, name: id, path: `Mandapeta / ${id}`, pathIds: ['m', id] });

/**
 * This guard is what stands between "the admin pressed Save without touching
 * the areas" and a PUT that rewrites every grant row and invalidates the
 * cached permissions of everyone it touches — for a team, every member of it.
 */
describe('sameAreas', () => {
  it('treats an untouched set as unchanged, whatever order it came back in', () => {
    expect(sameAreas([area('a'), area('b')], [area('b'), area('a')])).toBe(true);
  });

  it('sees an area added', () => {
    expect(sameAreas([area('a'), area('b')], [area('a')])).toBe(false);
  });

  it('sees an area removed', () => {
    expect(sameAreas([area('a')], [area('a'), area('b')])).toBe(false);
  });

  it('sees one area swapped for another — same count, different reach', () => {
    expect(sameAreas([area('a')], [area('b')])).toBe(false);
  });

  it('calls two empty sets unchanged, so a person with no areas is not rewritten', () => {
    expect(sameAreas([], [])).toBe(true);
  });

  it('compares by id, not by the name or path rendered beside it', () => {
    expect(sameAreas(
      [{ id: 'a', name: 'Sai Nagar', path: 'Mandapeta / Sai Nagar', pathIds: ['m', 'a'] }],
      [{ id: 'a', name: 'Sai Nagar (renamed)', path: 'Mandapeta / Sai Nagar (renamed)', pathIds: ['m', 'a'] }],
    )).toBe(true);
  });
});

/**
 * `teamAreas` subtracts from the crew's patch, so an empty list is the
 * PERMISSIVE case. Every other grant list in this app reads the other way, and
 * a roster row that rendered it literally would show a blank for the member who
 * covers the most.
 */
describe('teamCoverageLabel', () => {
  it('reads an empty narrowing as the whole patch, not as nothing', () => {
    expect(teamCoverageLabel({ teamAreas: [] })).toBe('All team areas');
  });

  it('names the areas once someone is pinned to part of it', () => {
    expect(teamCoverageLabel({ teamAreas: [area('Block A'), area('Block B')] })).toBe('Block A, Block B');
  });

  it('names a single area on its own', () => {
    expect(teamCoverageLabel({ teamAreas: [area('Block A')] })).toBe('Block A');
  });
});
