import type { ApiBody, ApiQuery, ApiResponse } from '@/lib/api/contracts';
import type { Page } from '@/lib/api/types';
import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/constants/crm';
import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { MAX_PAGE_SIZE } from '@/lib/api/types';

/*
 * The vocabularies live in `@/lib/constants/crm` with the other mirrors of the
 * backend's, so `parity.test.ts` checks them against it. Kept re-exported here
 * because every screen already reaches for them beside the hooks.
 */
export {
  TICKET_CATEGORIES,
  TICKET_CLOSED_STATUSES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@/lib/constants/crm';
export type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/constants/crm';

/** What a collector taps, in the words they would use at a door. */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  no_signal: 'No signal',
  poor_quality: 'Poor picture',
  billing: 'Billing query',
  installation: 'New installation',
  relocation: 'Shifting house',
  disconnection: 'Disconnection',
  other: 'Something else',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export type Ticket = ApiResponse<'/api/v1/tickets/{id}', 'get', 200>;

export type TicketQueryVariables = ApiQuery<'/api/v1/tickets'> | void;

export const useTickets = createQuery<Page<Ticket>, TicketQueryVariables, Error>({
  queryKey: [QUERY_KEYS.TICKETS],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/tickets', 'get', 200>>('/tickets', {
      params: { limit: MAX_PAGE_SIZE, ...variables },
    });
    return response.data;
  },
  // A complaint queue is a shared book — somebody else closing one changes what
  // this screen should show, so it goes stale quickly and refetches on focus.
  staleTime: 30 * 1000,
  refetchOnWindowFocus: true,
});

export const useTicket = createQuery<Ticket, { id: string }, Error>({
  queryKey: [QUERY_KEYS.TICKETS, 'detail'],
  fetcher: async ({ id }) => (await client.get<ApiResponse<'/api/v1/tickets/{id}', 'get', 200>>(`/tickets/${id}`)).data,
  staleTime: 30 * 1000,
});

export type CreateTicketPayload = ApiBody<'/api/v1/tickets', 'post'>;

async function refreshTickets(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
}

export const useRaiseTicket = createMutation<Ticket, { payload: CreateTicketPayload }, Error>({
  mutationFn: async ({ payload }) => (await client.post<ApiResponse<'/api/v1/tickets', 'post', 201>>('/tickets', payload)).data,
  onSuccess: refreshTickets,
});

export type UpdateTicketPayload = ApiBody<'/api/v1/tickets/{id}', 'patch'>;

export const useUpdateTicket = createMutation<Ticket, { id: string; payload: UpdateTicketPayload }, Error>({
  mutationFn: async ({ id, payload }) => (await client.patch<ApiResponse<'/api/v1/tickets/{id}', 'patch', 200>>(`/tickets/${id}`, payload)).data,
  onSuccess: refreshTickets,
});

/** Hand a ticket to somebody, or pass `null` to put it back in the pool. */
export const useAssignTicket = createMutation<Ticket, { id: string; assignedTo: string | null }, Error>({
  mutationFn: async ({ id, assignedTo }) => (await client.post<ApiResponse<'/api/v1/tickets/{id}/assign', 'post', 200>>(`/tickets/${id}/assign`, { assignedTo })).data,
  onSuccess: refreshTickets,
});
