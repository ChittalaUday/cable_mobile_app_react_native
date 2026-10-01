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

export type Ticket = {
  id: string;
  ticketNo: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string | null;
  customer: { id: string; name: string | null; phone: string | null; customerCode: string | null };
  subscription: { id: string; serviceAccountNumber: string; packageName: string } | null;
  locationId: string | null;
  locationPath: string | null;
  assignedTo: { id: string; name: string | null } | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketQueryVariables = {
  status?: TicketStatus;
  /** Everything still on somebody's plate, which is what "open" means out loud. */
  openOnly?: boolean;
  priority?: TicketPriority;
  category?: TicketCategory;
  customerId?: string;
  /** `'me'` resolves server-side, so the handset needs no user id of its own. */
  assignedTo?: string | 'me';
  q?: string;
  page?: number;
  limit?: number;
} | void;

export const useTickets = createQuery<Page<Ticket>, TicketQueryVariables, Error>({
  queryKey: [QUERY_KEYS.TICKETS],
  fetcher: async (variables) => {
    const response = await client.get<Page<Ticket>>('/tickets', {
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
  fetcher: async ({ id }) => (await client.get<Ticket>(`/tickets/${id}`)).data,
  staleTime: 30 * 1000,
});

export type CreateTicketPayload = {
  customerId: string;
  subscriptionId?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  subject: string;
  description?: string;
  /** Needs `tickets.assign` as well as `tickets.create`. */
  assignedTo?: string;
};

async function refreshTickets(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
}

export const useRaiseTicket = createMutation<Ticket, { payload: CreateTicketPayload }, Error>({
  mutationFn: async ({ payload }) => (await client.post<Ticket>('/tickets', payload)).data,
  onSuccess: refreshTickets,
});

export type UpdateTicketPayload = {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  subject?: string;
  description?: string;
  /** Required by the server to move a ticket to `resolved`. */
  resolution?: string;
};

export const useUpdateTicket = createMutation<Ticket, { id: string; payload: UpdateTicketPayload }, Error>({
  mutationFn: async ({ id, payload }) => (await client.patch<Ticket>(`/tickets/${id}`, payload)).data,
  onSuccess: refreshTickets,
});

/** Hand a ticket to somebody, or pass `null` to put it back in the pool. */
export const useAssignTicket = createMutation<Ticket, { id: string; assignedTo: string | null }, Error>({
  mutationFn: async ({ id, assignedTo }) => (await client.post<Ticket>(`/tickets/${id}/assign`, { assignedTo })).data,
  onSuccess: refreshTickets,
});
