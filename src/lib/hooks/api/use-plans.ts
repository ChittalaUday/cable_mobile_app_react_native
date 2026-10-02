import type { ApiQuery, ApiResponse } from '@/lib/api/contracts';
import type { CreatePlanInput, Plan, UpdatePlanInput } from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';
import { client } from '@/lib/api/client';
import { MAX_PAGE_SIZE } from '@/lib/api/types';

/** What `GET /plans` filters on. */
export type PlanVariables = ApiQuery<'/api/v1/plans'> | void;

export const usePlans = createQuery<Plan[], PlanVariables, Error>({
  queryKey: [QUERY_KEYS.PLANS],
  // Every page: a provider can sell hundreds of add-ons, past the API's page cap.
  fetcher: async (variables) => {
    const all: Plan[] = [];
    for (let page = 1; ; page += 1) {
      const response = await client.get<ApiResponse<'/api/v1/plans', 'get', 200>>('/plans', {
        params: { limit: MAX_PAGE_SIZE, page, ...variables },
      });
      const items = response.data.items ?? [];
      all.push(...items);
      if (items.length < MAX_PAGE_SIZE || all.length >= response.data.total)
        return all;
    }
  },
  staleTime: 5 * 60 * 1000,
});

export const usePlanDetail = createQuery<Plan, { id: string }, Error>({
  queryKey: [QUERY_KEYS.PLANS, 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/plans/{id}', 'get', 200>>(`/plans/${id}`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useCreatePlan = createMutation<Plan, { payload: CreatePlanInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/plans', 'post', 201>>('/plans', payload);
    return response.data;
  },
});

export const useUpdatePlan = createMutation<Plan, { id: string; patch: UpdatePlanInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<ApiResponse<'/api/v1/plans/{id}', 'patch', 200>>(`/plans/${id}`, patch);
    return response.data;
  },
});

export const useDeletePlan = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/plans/${id}`);
  },
});
