import { act, renderHook } from '@testing-library/react-native';
import { useCustomerFilters } from './use-customer-filters';

describe('useCustomerFilters', () => {
  it('keeps the status chip and the sheet status in step', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.selectChip('active'));
    expect(result.current.modalFilters.status).toBe('active');
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilter('status'));
    expect(result.current.activeChip).toBe('all');
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.selectChip('multi'));
    expect(result.current.activeChip).toBe('multi');
    expect(result.current.modalFilters.status).toBeUndefined();
  });

  it('resets the date preset to all rather than clearing it', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.applyFilters({ ...result.current.modalFilters, datePreset: 'today' as never }));
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilter('datePreset'));
    expect(result.current.modalFilters.datePreset).toBe('all');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('takes the payment filter from the sheet and clears it like any other', () => {
    const { result } = renderHook(() => useCustomerFilters());
    expect(result.current.balance).toBe('any');

    act(() => result.current.applyFilters({ ...result.current.modalFilters, balance: 'due' }));
    expect(result.current.balance).toBe('due');
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.applyFilters({ ...result.current.modalFilters, balance: 'advance' }));
    expect(result.current.balance).toBe('advance');

    act(() => result.current.clearFilter('balance'));
    expect(result.current.balance).toBe('any');
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
