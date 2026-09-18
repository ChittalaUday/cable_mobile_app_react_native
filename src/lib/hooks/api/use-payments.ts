import type { CollectionOutcome, PaymentMethod } from '@/lib/api/types';
import * as Crypto from 'expo-crypto';
import { createInfiniteQuery, createMutation, createQuery } from 'react-query-kit';
import { queryClient } from '@/lib/api';
import { client } from '@/lib/api/client';

const PAGE_SIZE = 30;

export type CollectionAccessory = {
  catalogId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  amount: string;
};

export type Collection = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerCode: string | null;
  subscriptionId: string | null;
  serviceAccountNumber: string | null;
  locationId: string | null;
  locationPath: string | null;
  collectedBy: string;
  collectorName: string | null;
  outcome: CollectionOutcome;
  method: PaymentMethod | null;
  dueAmount: string;
  duesPaid: string;
  accessoryAmount: string;
  totalCollected: string;
  balanceAfter: string;
  accessories: CollectionAccessory[];
  reversesId: string | null;
  reversedById: string | null;
  reason: string | null;
  notes: string | null;
  reference: string;
  collectedAt: string;
  latitude: string | null;
  longitude: string | null;
  gpsAccuracyM: string | null;
};

export type CollectionPage = {
  items: Collection[];
  total: number | null;
  limit: number;
  nextCursor: string | null;
  /** The takings the whole filter covers, not just the rows on this page. */
  totals: { duesPaid: string; accessoryAmount: string; totalCollected: string; receipts: number };
};

export type CollectionQueryVariables = {
  customerId?: string;
  /** Receipts recorded within `withinM` metres of this point. */
  nearLatitude?: number;
  nearLongitude?: number;
  withinM?: number;
  /** That node AND everything under it. */
  locationId?: string;
  collectedBy?: string | 'me';
  outcome?: CollectionOutcome;
  from?: string;
  to?: string;
} | void;

export type RecordCollectionPayload = {
  customerId: string;
  subscriptionId?: string;
  /** Dues taken, as a decimal string. `"0"` records a visit that collected nothing. */
  amount: string;
  method?: PaymentMethod;
  accessories?: { catalogId: string; quantity: number; unitPrice: string }[];
  reason?: string;
  notes?: string;
  reference: string;
  collectedAt?: string;
  /** Where the collector was standing. All three or none. */
  latitude?: number;
  longitude?: number;
  /** Metres of horizontal error the handset reported. */
  gpsAccuracyM?: number;
};

/**
 * The id this device gives a visit, generated once per attempt and kept across
 * retries. Replaying it is what makes a flaky connection, a double tap and a
 * queued offline receipt all land as one payment instead of several.
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
    const response = await client.get<CollectionPage>('/payments', {
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
  fetcher: async ({ id }) => (await client.get<Collection>(`/payments/${id}`)).data,
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
  mutationFn: async ({ payload }) => (await client.post<Collection>('/payments', payload)).data,
  onSuccess: refreshAfterCollection,
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
  mutationFn: async ({ id, reason }) => (await client.post<Collection>(
    `/payments/${id}/reverse`,
    { reason, reference: newCollectionReference() },
  )).data,
  onSuccess: refreshAfterCollection,
});
