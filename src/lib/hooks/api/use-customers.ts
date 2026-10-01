import type {
  CustomerDetail,
  CustomerListItem,
  CustomerPage,
  CustomerSubscription,
} from '@/lib/api/types';
import { createInfiniteQuery, createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';

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

export type ChangePlanPayload = {
  packageId: string;
  /** What this customer actually pays, when it is not the package list price. */
  price?: string;
};

export type AddSubscriptionPayload = {
  packageId: string;
  /** The line the new one sits beside; it inherits the provider and the address. */
  basedOn: string;
  price?: string;
};

/** Everything a written subscription changes, in one place so no caller forgets one. */
async function refreshAfterSubscriptionWrite(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customer'] }),
    queryClient.invalidateQueries({ queryKey: ['customers'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] }),
  ]);
}

/** What `POST /customers` takes. The subscriber code is minted by the server. */
export type CreateCustomerPayload = {
  name: string;
  /** Ten digits, no country code — the server rejects anything else. */
  phone: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  status?: 'active' | 'inactive' | 'pending';
  address?: string;
  notes?: string;
  /**
   * The first connection, fitted with the subscriber in one transaction. An
   * area-scoped collector must send it: without a line there is no location,
   * and without a location the customer they just registered is one they can
   * no longer open.
   */
  connection?: {
    packageId: string;
    locationId: string;
    installationAddress?: string;
    price?: string;
  };
};

/**
 * Register a subscriber, and their first connection with them.
 *
 * Returns the same shape `GET /customers/:id` does, so the screen that called
 * it can draw the new customer without a follow-up fetch.
 */
export const useCreateCustomer = createMutation<
  CustomerDetail,
  { payload: CreateCustomerPayload },
  Error
>({
  mutationFn: async ({ payload }) => (await client.post<CustomerDetail>('/customers', payload)).data,
  onSuccess: refreshAfterSubscriptionWrite,
});

/**
 * Move a connection onto a different package.
 *
 * Takes no money and settles nothing: the balance is left exactly where it was,
 * because the server prorates nothing — there is no cycle job accruing a fee to
 * split. The new price is what the next charge will use.
 */
export const useChangePlan = createMutation<
  CustomerSubscription,
  { customerId: string; subscriptionId: string; payload: ChangePlanPayload },
  Error
>({
  mutationFn: async ({ customerId, subscriptionId, payload }) => (
    await client.patch<CustomerSubscription>(`/customers/${customerId}/subscriptions/${subscriptionId}`, payload)
  ).data,
  onSuccess: refreshAfterSubscriptionWrite,
});

/**
 * Put another package on the customer as a line of its own — an addon, or a
 * second connection. It starts at a zero balance; money is taken against it
 * through the ordinary subscription payment afterwards.
 */
export const useAddSubscription = createMutation<
  CustomerSubscription,
  { customerId: string; payload: AddSubscriptionPayload },
  Error
>({
  mutationFn: async ({ customerId, payload }) => (
    await client.post<CustomerSubscription>(`/customers/${customerId}/subscriptions`, payload)
  ).data,
  onSuccess: refreshAfterSubscriptionWrite,
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
            subscriptionId: account.subscriptionId,
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
          subscriptionId: account.subscriptionId,
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
