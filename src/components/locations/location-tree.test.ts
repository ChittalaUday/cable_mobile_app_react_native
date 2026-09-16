import { act, renderHook } from '@testing-library/react-native';
import { useTreeExpansion } from '@/lib/hooks/common/use-tree-expansion';

describe('useTreeExpansion', () => {
  it('opens, closes, and keeps siblings independent', () => {
    const { result } = renderHook(() => useTreeExpansion());

    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('b'));
    expect([...result.current.expanded].sort()).toEqual(['a', 'b']);

    act(() => result.current.toggle('a'));
    expect([...result.current.expanded]).toEqual(['b']);
  });

  it('starts from the ids it is seeded with, and collapses the lot', () => {
    const { result } = renderHook(() => useTreeExpansion(['root']));
    expect(result.current.expanded.has('root')).toBe(true);

    act(() => result.current.toggle('child'));
    act(() => result.current.collapseAll());
    expect(result.current.expanded.size).toBe(0);
  });

  it('closes a whole level in one go, for the header button', () => {
    const { result } = renderHook(() => useTreeExpansion(['a', 'b', 'c']));

    // The two deepest open nodes go; the one above them stays open.
    act(() => result.current.collapseMany(['a', 'b']));

    expect([...result.current.expanded]).toEqual(['c']);
  });

  it('ignores an empty collapse without churning state', () => {
    const { result } = renderHook(() => useTreeExpansion(['a']));
    const before = result.current.expanded;

    act(() => result.current.collapseMany([]));

    expect(result.current.expanded).toBe(before);
  });

  it('opens a whole ancestor chain at once, for a revealed search hit', () => {
    const { result } = renderHook(() => useTreeExpansion());

    act(() => result.current.expand(['area', 'building', 'block']));

    expect([...result.current.expanded].sort()).toEqual(['area', 'block', 'building']);
  });

  it('leaves already-open branches alone when a chain overlaps them', () => {
    const { result } = renderHook(() => useTreeExpansion(['area']));

    act(() => result.current.expand(['area', 'building']));

    expect([...result.current.expanded].sort()).toEqual(['area', 'building']);
  });
});
