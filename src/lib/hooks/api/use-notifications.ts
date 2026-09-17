import type { NotificationCategory, NotificationDelivery } from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { client, queryClient } from '@/lib/api';

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  delivery: NotificationDelivery;
  channel: string;
  type: string;
  title: string | null;
  body: string;
  data: Record<string, unknown> | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type InboxPage = {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
};

type InboxVariables = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  category?: NotificationCategory;
  delivery?: NotificationDelivery;
};

/** Everything addressed to the signed-in person, newest first. */
export const useNotifications = createQuery<InboxPage, InboxVariables | void, Error>({
  queryKey: ['notifications'],
  fetcher: async (variables) => {
    const response = await client.get<InboxPage>('/notifications', { params: variables || {} });
    return response.data;
  },
});

export const useUnreadCount = createQuery<
  { total: number; byCategory: Record<string, number> },
  void,
  Error
>({
  queryKey: ['notifications', 'unread-count'],
  fetcher: async () => {
    const response = await client.get<{ total: number; byCategory: Record<string, number> }>(
      '/notifications/unread-count',
    );
    return response.data;
  },
});

/**
 * The in-app messages waiting to be shown. One at a time and newest first: a
 * stack of five banners on launch is not a feature.
 */
export const usePendingInApp = createQuery<InboxPage, { deliveries: string }, Error>({
  queryKey: ['notifications', 'pending-in-app'],
  fetcher: async ({ deliveries }) => {
    const response = await client.get<InboxPage>('/notifications', {
      params: { delivery: deliveries, unreadOnly: true, limit: 1 },
    });
    return response.data;
  },
});

function refreshInbox() {
  return queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export const useMarkRead = createMutation<AppNotification, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    const response = await client.patch<AppNotification>(`/notifications/${id}/read`);
    return response.data;
  },
  onSuccess: refreshInbox,
});

export const useMarkAllRead = createMutation<
  { updated: number },
  { category?: NotificationCategory } | void,
  Error
>({
  mutationFn: async (variables) => {
    const response = await client.patch<{ updated: number }>('/notifications/read-all', variables || {});
    return response.data;
  },
  onSuccess: refreshInbox,
});

export type SendNotificationVariables = {
  audience: 'user' | 'role' | 'tenant';
  userIds?: string[];
  roleId?: 'admin' | 'staff' | 'customer';
  category: NotificationCategory;
  delivery?: NotificationDelivery;
  type: string;
  title: string;
  body: string;
};

export const useSendNotification = createMutation<
  { notified: number; pushed: number; failed: number },
  SendNotificationVariables,
  Error
>({
  mutationFn: async (variables) => {
    const response = await client.post<{ notified: number; pushed: number; failed: number }>(
      '/notifications/send',
      variables,
    );
    return response.data;
  },
});
