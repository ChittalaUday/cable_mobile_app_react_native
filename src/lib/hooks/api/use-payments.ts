import type { ApiBody, ApiQuery, ApiResponse } from '@/lib/api/contracts';
import * as Crypto from 'expo-crypto';
import { createInfiniteQuery, createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';

const PAGE_SIZE = 30;

export type CollectionAccessory = Collection['accessories'][number];

export type Collection = ApiResponse<'/api/v1/payments/{id}', 'get', 200>;

export type CollectionPage = ApiResponse<'/api/v1/payments', 'get', 200>;

export type CollectionQueryVariables = ApiQuery<'/api/v1/payments'> | void;

export type RecordCollectionPayload = ApiBody<'/api/v1/payments/subscription', 'post'>;

/**
 * A charge for hardware rather than dues: a set-top box sold, a deposit taken,
 * a router issued on the spot.
 *
 * Deliberately not part of `RecordCollectionPayload`. The server posts this as
 * a deposit and leaves the subscription balance alone, so folding the two into
 * one payload would invite a screen to show a recharge taking money off a
 * balance it never touches.
 */
export type RecordEquipmentPaymentPayload = ApiBody<'/api/v1/payments/equipment', 'post'>;

/**
 * The id this device gives a visit. Replaying it makes a retry or double tap
 * return the same receipt instead of recording another payment.
 */
export function newCollectionReference(): string {
  return Crypto.randomUUID();
}

/**
 * Receipts the caller may see. The server decides which ones from the grant on
 * `payments.view` — the whole tenant, the areas they were assigned, or a
 * subscriber's own — so nothing here filters after the fact.
 */
export const useCollections = createInfiniteQuery<
  CollectionPage,
  CollectionQueryVariables,
  Error,
  string | undefined
>({
  queryKey: ['payments'],
  fetcher: async (variables, { pageParam, signal }) => {
    const response = await client.get<ApiResponse<'/api/v1/payments', 'get', 200>>('/payments', {
      params: { limit: PAGE_SIZE, cursor: pageParam, ...variables },
      signal,
    });
    return response.data;
  },
  getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  initialPageParam: undefined,
  // A collection round is a shared book — somebody else's receipt changes what
  // this screen should show. Short and refetched on focus rather than pushed:
  // ponytail, upgrade to a push-triggered invalidation if minutes is too slow.
  staleTime: 15 * 1000,
  refetchOnWindowFocus: true,
});

/**
 * One receipt, fetched by id rather than hunted for in the paged list — a
 * receipt older than the first page is still a receipt, and a link to one has
 * to open it rather than report it missing. Out of the caller's areas is a 404,
 * the same answer the list gives by leaving it out.
 */
export const useCollection = createQuery<Collection, { id: string }, Error>({
  queryKey: ['payment'],
  fetcher: async ({ id }) => (await client.get<ApiResponse<'/api/v1/payments/{id}', 'get', 200>>(`/payments/${id}`)).data,
  staleTime: 15 * 1000,
});

/** Everything a recorded payment changes, in one place so no caller forgets one. */
async function refreshAfterCollection(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['payments'] }),
    queryClient.invalidateQueries({ queryKey: ['payment'] }),
    queryClient.invalidateQueries({ queryKey: ['customers'] }),
    queryClient.invalidateQueries({ queryKey: ['customer'] }),
    queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
  ]);
}

export const useRecordCollection = createMutation<Collection, { payload: RecordCollectionPayload }, Error>({
  mutationFn: async ({ payload }) => (await client.post<ApiResponse<'/api/v1/payments/subscription', 'post', 201>>('/payments/subscription', payload)).data,
  onSuccess: refreshAfterCollection,
});

/**
 * Money taken for hardware. Issuing a unit moves it out of stock and onto the
 * customer, so the inventory views are refreshed on top of the usual set.
 */
export const useRecordEquipmentPayment = createMutation<
  Collection,
  { payload: RecordEquipmentPaymentPayload },
  Error
>({
  mutationFn: async ({ payload }) => (await client.post<ApiResponse<'/api/v1/payments/equipment', 'post', 201>>('/payments/equipment', payload)).data,
  onSuccess: async () => {
    await Promise.all([
      refreshAfterCollection(),
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    ]);
  },
});

/**
 * Corrects a receipt by posting its mirror image. Needs `payments.update` at
 * `ALL`, so a collector cannot unwind their own round.
 */
export const useReverseCollection = createMutation<
  Collection,
  { id: string; reason: string },
  Error
>({
  mutationFn: async ({ id, reason }) => (await client.post<ApiResponse<'/api/v1/payments/{id}/reverse', 'post', 201>>(
    `/payments/${id}/reverse`,
    { reason, reference: newCollectionReference() },
  )).data,
  onSuccess: refreshAfterCollection,
});
