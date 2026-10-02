import type { CustomerFilterValues } from '@/components/admin/customer-filter-modal';
import * as React from 'react';

/** The quick chips above the customer list. */
export type CustomerListFilter = 'all' | 'active' | 'inactive' | 'multi' | 'pending';

/** The balance chips: every customer, or only those owing, in advance, or settled. */
export type CustomerBalanceFilter = 'any' | 'due' | 'advance' | 'clear';

const NO_FILTERS: CustomerFilterValues = {
  status: undefined,
  locationId: undefined,
  serviceProviderId: undefined,
  datePreset: 'all',
};

/**
 * Search text, the quick chip and the filter sheet, kept in step: a status chip
 * and the sheet's status are the same filter, so setting one sets the other.
 */
export function useCustomerFilters() {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<CustomerListFilter>('all');
  const [modalFilters, setModalFilters] = React.useState<CustomerFilterValues>(NO_FILTERS);
  const [balance, setBalance] = React.useState<CustomerBalanceFilter>('any');

  const hasActiveFilters = Boolean(
    modalFilters.status
    || modalFilters.locationId
    || modalFilters.serviceProviderId
    || (modalFilters.datePreset && modalFilters.datePreset !== 'all'),
  );

  const selectChip = (key: CustomerListFilter) => {
    setFilter(key);
    const status = key === 'active' || key === 'inactive' || key === 'pending' ? key : undefined;
    setModalFilters(prev => ({ ...prev, status }));
  };

  const applyFilters = (next: CustomerFilterValues) => {
    setModalFilters(next);
    if (next.status)
      setFilter(next.status);
  };

  const resetFilters = () => {
    setModalFilters(NO_FILTERS);
    setFilter('all');
  };

  /** Drops one filter from the sheet; dropping the status puts the chip back on All. */
  const clearFilter = (key: keyof CustomerFilterValues) => {
    setModalFilters(prev => ({ ...prev, [key]: key === 'datePreset' ? 'all' : undefined }));
    if (key === 'status')
      setFilter('all');
  };

  return {
    query,
    setQuery,
    filter,
    /** The chip to highlight: the sheet's status wins when one is set. */
    activeChip: modalFilters.status ?? filter,
    modalFilters,
    balance,
    setBalance,
    hasActiveFilters,
    selectChip,
    applyFilters,
    resetFilters,
    clearFilter,
  };
}
