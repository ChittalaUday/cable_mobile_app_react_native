import type { CreateServiceInput, QueryOptions, Service, UpdateServiceInput } from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

export const useServices = createQuery<Service[], QueryOptions | void, Error>({
  queryKey: ['services'],
  fetcher: async (variables) => {
    const response = await client.get<Service[]>('/services', { params: variables || {} });
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useService = createQuery<Service, { id: string }, Error>({
  queryKey: ['services', 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<Service>(`/services/${id}`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useCreateService = createMutation<Service, { payload: CreateServiceInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<Service>('/services', payload);
    return response.data;
  },
});

export const useUpdateService = createMutation<Service, { id: string; patch: UpdateServiceInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<Service>(`/services/${id}`, patch);
    return response.data;
  },
});

export const useDeleteService = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/services/${id}`);
  },
});
