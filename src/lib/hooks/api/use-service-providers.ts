import type {
  CreateServiceProviderInput,
  ServiceProvider,
  UpdateServiceProviderInput,
} from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

export type ListProvidersVariables = {
  serviceId?: string;
  status?: 'active' | 'inactive';
  search?: string;
} | void;

export const useServiceProviders = createQuery<ServiceProvider[], ListProvidersVariables, Error>({
  queryKey: ['service-providers'],
  fetcher: async (variables) => {
    const response = await client.get<ServiceProvider[]>('/service-providers', { params: variables || {} });
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useServiceProvider = createQuery<ServiceProvider, { id: string }, Error>({
  queryKey: ['service-providers', 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<ServiceProvider>(`/service-providers/${id}`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useCreateServiceProvider = createMutation<ServiceProvider, { payload: CreateServiceProviderInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ServiceProvider>('/service-providers', payload);
    return response.data;
  },
});

export const useUpdateServiceProvider = createMutation<ServiceProvider, { id: string; patch: UpdateServiceProviderInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<ServiceProvider>(`/service-providers/${id}`, patch);
    return response.data;
  },
});

export const useDeleteServiceProvider = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/service-providers/${id}`);
  },
});
