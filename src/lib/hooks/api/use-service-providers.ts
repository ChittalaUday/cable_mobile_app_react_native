import type { ApiQuery, ApiResponse } from '@/lib/api/contracts';
import type {
  CreateServiceProviderInput,
  ServiceProvider,
  UpdateServiceProviderInput,
} from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

export type ListProvidersVariables = ApiQuery<'/api/v1/service-providers'> | void;

export const useServiceProviders = createQuery<ServiceProvider[], ListProvidersVariables, Error>({
  queryKey: ['service-providers'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/service-providers', 'get', 200>>('/service-providers', { params: variables || {} });
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useServiceProvider = createQuery<ServiceProvider, { id: string }, Error>({
  queryKey: ['service-providers', 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/service-providers/{id}', 'get', 200>>(`/service-providers/${id}`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useCreateServiceProvider = createMutation<ServiceProvider, { payload: CreateServiceProviderInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/service-providers', 'post', 201>>('/service-providers', payload);
    return response.data;
  },
});

export const useUpdateServiceProvider = createMutation<ServiceProvider, { id: string; patch: UpdateServiceProviderInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<ApiResponse<'/api/v1/service-providers/{id}', 'patch', 200>>(`/service-providers/${id}`, patch);
    return response.data;
  },
});

export const useDeleteServiceProvider = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/service-providers/${id}`);
  },
});
