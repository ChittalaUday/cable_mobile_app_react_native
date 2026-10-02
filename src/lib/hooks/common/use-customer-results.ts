import type { CustomerBalanceFilter, CustomerListFilter } from './use-customer-filters';
import type { CustomerFilterValues } from '@/components/admin/customer-filter-modal';
import * as React from 'react';
import { customerItemToConsolidated, useCustomers } from '@/lib/hooks/api/use-customers';
import { getDateRangeFromPreset } from '@/lib/utils/date-presets';
import { useDebounced } from './use-debounced';

/** The customer list for the current search text, chip and filter sheet, paged. */
export function useCustomerResults(query: string, filter: CustomerListFilter, modalFilters: CustomerFilterValues, balance: CustomerBalanceFilter = 'any') {
  const debouncedQuery = useDebounced(query.trim());
  const isSearchMode = debouncedQuery.length > 0;
  const searchReady = debouncedQuery.length >= 3;
  const status = modalFilters.status ?? (
    filter === 'active'
      ? ('active' as const)
      : filter === 'inactive'
        ? ('inactive' as const)
        : filter === 'pending'
          ? ('pending' as const)
          : undefined
  );
  const dateRange = React.useMemo(() => getDateRangeFromPreset(modalFilters.datePreset), [modalFilters.datePreset]);

  // Everything but the status, so the All / Active / Inactive counts agree with the list.
  const base = {
    q: searchReady ? debouncedQuery : undefined,
    locationId: modalFilters.locationId,
    serviceProviderId: modalFilters.serviceProviderId,
    createdFrom: dateRange.createdFrom,
    createdTo: dateRange.createdTo,
    multiBox: filter === 'multi' ? true : undefined,
    balance: balance === 'any' ? undefined : balance,
  };
  const enabled = !isSearchMode || searchReady;
  const list = useCustomers({ variables: { ...base, status }, enabled });
  // One-row pages: only `total` is read. ponytail: three requests, a counts endpoint if the list gets slow.
  const all = useCustomers({ variables: { ...base, limit: 1 }, enabled });
  const active = useCustomers({ variables: { ...base, status: 'active', limit: 1 }, enabled });
  const inactive = useCustomers({ variables: { ...base, status: 'inactive', limit: 1 }, enabled });

  const listed = list.data?.pages.flatMap(page => page.items).map(customerItemToConsolidated) ?? [];
  const items = isSearchMode && !searchReady ? [] : listed;

  return {
    items,
    counts: {
      all: all.data?.pages[0]?.total ?? undefined,
      active: active.data?.pages[0]?.total ?? undefined,
      inactive: inactive.data?.pages[0]?.total ?? undefined,
    },
    isError: list.isError,
    isPending: (!isSearchMode || searchReady) && list.isPending,
    isRefetching: list.isRefetching,
    isSearchMode,
    list,
    refetch: () => Promise.all([list.refetch(), all.refetch(), active.refetch(), inactive.refetch()]),
    searchReady,
  };
}
