import { coverageLabel } from './use-packages';

/**
 * One provider may sell the same package name twice, once per area. The label
 * is the only thing separating the two rows in a list, so it has to survive
 * the breadcrumbs being long and mostly identical.
 */
describe('coverageLabel', () => {
  it('says nothing when the package goes wherever its provider does', () => {
    expect(coverageLabel({ coverageAreas: [] })).toBeNull();
  });

  it('keeps the last step, because the towns above it read the same on both', () => {
    expect(coverageLabel({
      coverageAreas: ['Mandapeta / Sri Sai Apartments / Block A'],
    })).toBe('Block A');
  });

  it('joins a handful and counts the rest', () => {
    expect(coverageLabel({
      coverageAreas: ['T / Block A', 'T / Block B', 'T / Block C', 'T / Block D', 'T / Block E'],
    })).toBe('Block A, Block B, Block C +2');
  });

  it('falls back to the whole path when there is nothing to trim', () => {
    expect(coverageLabel({ coverageAreas: ['Mandapeta'] })).toBe('Mandapeta');
  });

  it('survives a package cached before the field existed', () => {
    expect(coverageLabel({})).toBeNull();
  });
});
