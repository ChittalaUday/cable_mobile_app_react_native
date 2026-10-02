import type { ApiBody, ApiQuery, ApiResponse } from '@/lib/api/contracts';
import { createMutation, createQuery } from 'react-query-kit';
import { client, queryClient } from '@/lib/api';

export type AppNotification = ApiResponse<'/api/v1/notifications', 'get', 200>['items'][number];

type InboxPage = ApiResponse<'/api/v1/notifications', 'get', 200>;

type InboxVariables = ApiQuery<'/api/v1/notifications'>;

/** Everything addressed to the signed-in person, newest first. */
export const useNotifications = createQuery<InboxPage, InboxVariables | void, Error>({
  queryKey: ['notifications'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/notifications', 'get', 200>>('/notifications', { params: variables || {} });
    return response.data;
  },
});

export const useUnreadCount = createQuery<
  ApiResponse<'/api/v1/notifications/unread-count'>,
  void,
  Error
>({
  queryKey: ['notifications', 'unread-count'],
  fetcher: async () => {
    const response = await client.get<ApiResponse<'/api/v1/notifications/unread-count', 'get', 200>>(
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
    const response = await client.get<ApiResponse<'/api/v1/notifications', 'get', 200>>('/notifications', {
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
    const response = await client.patch<ApiResponse<'/api/v1/notifications/{id}/read', 'patch', 200>>(`/notifications/${id}/read`);
    return response.data;
  },
  onSuccess: refreshInbox,
});

export const useMarkAllRead = createMutation<
  ApiResponse<'/api/v1/notifications/read-all', 'patch'>,
  ApiBody<'/api/v1/notifications/read-all', 'patch'> | void,
  Error
>({
  mutationFn: async (variables) => {
    const response = await client.patch<ApiResponse<'/api/v1/notifications/read-all', 'patch', 200>>('/notifications/read-all', variables || {});
    return response.data;
  },
  onSuccess: refreshInbox,
});

export type SendNotificationVariables = ApiBody<'/api/v1/notifications/send', 'post'>;

export const useSendNotification = createMutation<
  ApiResponse<'/api/v1/notifications/send', 'post'>,
  SendNotificationVariables,
  Error
>({
  mutationFn: async (variables) => {
    const response = await client.post<ApiResponse<'/api/v1/notifications/send', 'post', 200>>(
      '/notifications/send',
      variables,
    );
    return response.data;
  },
});
