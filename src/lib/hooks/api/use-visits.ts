import type { ApiBody, ApiQuery, ApiResponse } from '@/lib/api/contracts';
import { createInfiniteQuery, createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';

export type DueVisit = ApiResponse<'/api/v1/visits/due', 'get', 200>['items'][number];
export type DueVisitReason = DueVisit['reason'];
export type Visit = ApiResponse<'/api/v1/customers/{id}/visits', 'post', 201>;
export type RecordVisitPayload = ApiBody<'/api/v1/customers/{id}/visits', 'post'>;
export type VisitPurpose = RecordVisitPayload['purpose'];
export type VisitOutcome = RecordVisitPayload['outcome'];
export type VisitAction = NonNullable<DueVisit['action']>;
export type TimelinePage = ApiResponse<'/api/v1/customers/{id}/timeline', 'get', 200>;
export type TimelineItem = TimelinePage['items'][number];

export const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  payment: 'Bill',
  complaint: 'Complaint',
  installation: 'Installation',
  other: 'Other',
};

export const VISIT_OUTCOME_LABELS: Record<VisitOutcome, string> = {
  not_available: 'Not available',
  refused: 'Refused',
  come_later: 'Come later',
  done: 'Done',
  other: 'Other',
};

/** A visit marked at the door: it lands on the customer's timeline and the visit list. */
export async function recordVisit(customerId: string, payload: RecordVisitPayload): Promise<Visit> {
  const response = await client.post<Visit>(`/customers/${customerId}/visits`, payload);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['visits'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-timeline'] }),
    // Recent activity on the dashboards and analytics lists visits too.
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] }),
  ]);
  return response.data;
}

export const useRecordVisit = createMutation<Visit, { customerId: string; payload: RecordVisitPayload }, Error>({
  mutationFn: ({ customerId, payload }) => recordVisit(customerId, payload),
});

/** Today's round: open complaints, lines ending within 3 days, and doors promised for today. */
export const useDueVisits = createQuery<DueVisit[], void, Error>({
  queryKey: ['visits', 'due'],
  fetcher: async () => (await client.get<ApiResponse<'/api/v1/visits/due', 'get', 200>>('/visits/due')).data.items,
  staleTime: 0,
});

export type VisitVariables = ApiQuery<'/api/v1/visits'> | void;

export const useVisits = createQuery<ApiResponse<'/api/v1/visits', 'get', 200>, VisitVariables, Error>({
  queryKey: ['visits'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/visits', 'get', 200>>('/visits', { params: { limit: 50, ...variables } });
    return response.data;
  },
});

/** A customer's whole history, newest first; each page reaches further back. */
export const useCustomerTimeline = createInfiniteQuery<TimelinePage, { customerId: string }, Error, string | null>({
  queryKey: ['customer-timeline'],
  fetcher: async ({ customerId }, { pageParam }) => {
    const response = await client.get<TimelinePage>(`/customers/${customerId}/timeline`, {
      params: { limit: 30, ...(pageParam === null ? {} : { before: pageParam }) },
    });
    return response.data;
  },
  initialPageParam: null,
  getNextPageParam: last => last.nextBefore,
});
