import type { ApiQuery, ApiResponse } from '@/lib/api/contracts';
import type { RemoteCapture, RemoteDetail, RemoteSummary } from '@/lib/api/types';
import { createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

/**
 * The IR remote library: the shared catalogue plus anything this tenant has
 * captured itself, filed under the appliance each handset drives.
 */
export const useRemotes = createQuery<RemoteSummary[], ApiQuery<'/api/v1/remotes'> | void, Error>({
  queryKey: ['remotes'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/remotes', 'get', 200>>('/remotes', { params: variables || {} });
    return response.data;
  },
  // Codes change when somebody captures a handset, which is rare. An hour keeps
  // a technician moving between rooms off the network.
  staleTime: 60 * 60 * 1000,
});

/** One handset with its full code set — fetched when a remote is actually opened. */
export const useRemote = createQuery<RemoteDetail, { id: string }, Error>({
  queryKey: ['remotes', 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/remotes/{id}', 'get', 200>>(`/remotes/${id}`);
    return response.data;
  },
  staleTime: 60 * 60 * 1000,
});

/** Signal captures recorded for a handset. */
export const useRemoteCaptures = createQuery<RemoteCapture[], { id: string }, Error>({
  queryKey: ['remotes', 'captures'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/remotes/{id}/captures', 'get', 200>>(`/remotes/${id}/captures`);
    return response.data;
  },
  staleTime: 60 * 60 * 1000,
});
