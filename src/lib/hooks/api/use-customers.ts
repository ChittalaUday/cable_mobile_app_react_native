import type {
  CustomerDetail,
  CustomerListItem,
  CustomerPage,
} from '@/lib/api/types';
import { createInfiniteQuery, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

const PAGE_SIZE = 30;

/** What `GET /customers` narrows on. Everything is server-side — nothing is filtered locally. */
export type CustomerQueryVariables = {
  /** Matches the account name and phone, the imported name and phone, and the code. */
  q?: string;
  status?: 'active' | 'inactive' | 'pending';
  /** That node AND everything under it. */
  locationId?: string;
  serviceProviderId?: string;
  packageId?: string;
  createdFrom?: string;
  createdTo?: string;
  multiBox?: boolean;
} | void;

/**
 * The staff customer list, paged by cursor.
 *
 * Cursor rather than page number for two reasons that both bite as the book
 * grows: an offset makes the server walk every row it skips, and it silently
 * repeats or drops a row when someone adds a customer while an operator is
 * halfway down the list.
 */
export const useCustomers = createInfiniteQuery<
  CustomerPage,
  CustomerQueryVariables,
  Error,
  string | undefined
>({
  queryKey: ['customers'],
  fetcher: async (variables, { pageParam, signal }) => {
    const response = await client.get<CustomerPage>('/customers', {
      params: { limit: PAGE_SIZE, cursor: pageParam, ...variables },
      signal,
    });
    return response.data;
  },
  getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  initialPageParam: undefined,
  staleTime: 60 * 1000,
});

/**
 * One customer, fully resolved — subscriptions with their service, provider and
 * package, the equipment on loan, the recent ledger and the summary.
 *
 * On demand only: the list deliberately does not carry any of it.
 */
export const useCustomer = createQuery<CustomerDetail, { id: string }, Error>({
  queryKey: ['customer'],
  fetcher: async ({ id }) => (await client.get<CustomerDetail>(`/customers/${id}`)).data,
  staleTime: 60 * 1000,
});

/**
 * Maps a wire `CustomerListItem` to a `ConsolidatedCustomer` for display in list cards.
 */
export function customerItemToConsolidated(item: CustomerListItem) {
  const accounts = item.serviceAccounts ?? [];
  const defaultServiceName = item.services[0] || 'Cable TV';

  const connections = accounts.length > 0
    ? accounts.flatMap((account) => {
        const serviceName = account.service || defaultServiceName;
        const isBroadband = serviceName.toLowerCase().includes('broadband') || serviceName.toLowerCase().includes('fiber');
        const serviceType = isBroadband ? 'broadband' : 'cable';
        const boxes = (item.equipment ?? []).filter(
          asset => asset.subscriptionId === account.subscriptionId
            && (asset.type === 'stb' || asset.type === 'ont' || asset.type === 'router'),
        );
        if (boxes.length > 1) {
          return boxes.map((box, idx) => ({
            id: `${account.subscriptionId}-box-${box.id || idx}`,
            customerId: item.id,
            serviceType,
            serviceTypeName: serviceName,
            provider: '',
            providerName: serviceName,
            stbNumber: box.serialNumber ?? undefined,
            vcNumber: box.vcNumber ?? undefined,
            packageName: `${account.accountNumber} (Box ${idx + 1})`,
            monthlyPrice: Number(item.outstandingBalance) || 0,
            status: item.status === 'active' ? ('active' as const) : ('pending' as const),
            locationLabel: account.locationPath?.split(' / ').pop(),
          }));
        }
        const box = boxes[0] ?? item.equipment?.find(asset => asset.subscriptionId === account.subscriptionId);
        return [{
          id: account.subscriptionId,
          customerId: item.id,
          serviceType,
          serviceTypeName: serviceName,
          provider: '',
          providerName: serviceName,
          stbNumber: box?.serialNumber ?? undefined,
          vcNumber: box?.vcNumber ?? undefined,
          packageName: account.accountNumber,
          monthlyPrice: Number(item.outstandingBalance) || 0,
          status: item.status === 'active' ? ('active' as const) : ('pending' as const),
          locationLabel: account.locationPath?.split(' / ').pop(),
        }];
      })
    : (item.services.length > 0 ? item.services : ['Cable TV']).map((service, index) => ({
        id: `${item.id}-conn-${index}`,
        customerId: item.id,
        serviceType: service.toLowerCase().includes('broadband') || service.toLowerCase().includes('fiber') ? 'broadband' : 'cable',
        serviceTypeName: service,
        provider: '',
        providerName: service,
        packageName: item.customerCode ? `${item.customerCode} • ${service}` : service,
        monthlyPrice: Number(item.outstandingBalance) || 0,
        status: item.status === 'active' ? ('active' as const) : ('pending' as const),
        locationLabel: item.locationPath ? item.locationPath.split(' / ').pop() : undefined,
      }));

  return {
    id: item.id,
    customerCode: item.customerCode,
    name: item.name || item.customerCode || 'Customer',
    phone: item.phone || item.alternatePhone || item.whatsappNumber || '',
    address: item.locations?.[0]?.path || item.locationPath || item.address || '',
    status: item.status,
    connections,
    createdAt: item.createdAt,
  };
}
