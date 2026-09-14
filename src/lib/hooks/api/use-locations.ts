import type {
  Availability,
  Coverage,
  CreateLocationInput,
  Location,
  LocationAncestor,
  LocationCategory,
  LocationSchema,
  Page,
  QueryOptions,
} from '@/lib/api/types';
import { createInfiniteQuery, createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { MAX_PAGE_SIZE } from '@/lib/api/types';

export const useLocationCategories = createQuery<LocationCategory[], void, Error>({
  queryKey: ['location-categories'],
  fetcher: async () => {
    const response = await client.get<LocationCategory[]>('/location-categories');
    return response.data;
  },
  staleTime: 10 * 60 * 1000,
});

export const useLocationSchemas = createQuery<LocationSchema[], void, Error>({
  queryKey: ['location-schemas'],
  fetcher: async () => {
    const response = await client.get<LocationSchema[]>('/location-schemas');
    return response.data;
  },
  staleTime: 10 * 60 * 1000,
});

export type LocationQueryVariables = (QueryOptions & {
  parentId?: string;
  categoryId?: string;
  schemaId?: string;
  /** Free-text search; the API calls it `q`. */
  q?: string;
}) | void;

export const useLocations = createQuery<Page<Location>, LocationQueryVariables, Error>({
  queryKey: ['locations'],
  fetcher: async (variables) => {
    const response = await client.get<Page<Location>>('/locations', {
      params: { limit: MAX_PAGE_SIZE, ...variables },
    });
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

/** The chain to a node, for opening the tree straight onto it. */
export async function fetchLocationAncestors(id: string): Promise<LocationAncestor[]> {
  const response = await client.get<LocationAncestor[]>(`/locations/${id}/ancestors`);
  return response.data;
}

/**
 * One level of the tree, paged — for drilling down a level at a time.
 *
 * `parentId` is the literal string `null` at the top, which is what the API
 * takes to mean "no parent".
 */
export const useLocationLevel = createInfiniteQuery<
  Page<Location>,
  { parentId: string | null },
  Error,
  number
>({
  queryKey: ['locations', 'level'],
  fetcher: async ({ parentId }, { pageParam }) => {
    const response = await client.get<Page<Location>>('/locations', {
      params: { parentId: parentId ?? 'null', limit: MAX_PAGE_SIZE, page: pageParam },
    });
    return response.data;
  },
  getNextPageParam: (lastPage) => {
    const loaded = lastPage.page * lastPage.limit;
    return loaded < lastPage.total ? lastPage.page + 1 : undefined;
  },
  initialPageParam: 1,
  staleTime: 5 * 60 * 1000,
});

export const useCreateLocation = createMutation<Location, { payload: CreateLocationInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<Location>('/locations', payload);
    return response.data;
  },
});

export const useUpdateLocation = createMutation<
  Location,
  { id: string; patch: Partial<Pick<Location, 'name' | 'code' | 'isActive' | 'status' | 'metadata'>> },
  Error
>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<Location>(`/locations/${id}`, patch);
    return response.data;
  },
});

export const useDeleteLocation = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/locations/${id}`);
  },
});

export const useLocationAvailability = createQuery<Availability, { id: string }, Error>({
  queryKey: ['locations', 'availability'],
  fetcher: async ({ id }) => {
    const response = await client.get<Availability>(`/locations/${id}/availability`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useServiceCoverage = createQuery<Coverage[], { id: string }, Error>({
  queryKey: ['services', 'coverage'],
  fetcher: async ({ id }) => {
    const response = await client.get<Coverage[]>(`/services/${id}/coverage`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useServiceProviderCoverage = createQuery<Coverage[], { id: string }, Error>({
  queryKey: ['service-providers', 'coverage'],
  fetcher: async ({ id }) => {
    const response = await client.get<Coverage[]>(`/service-providers/${id}/coverage`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const usePackageCoverage = createQuery<Coverage[], { id: string }, Error>({
  queryKey: ['packages', 'coverage'],
  fetcher: async ({ id }) => {
    const response = await client.get<Coverage[]>(`/packages/${id}/coverage`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

/**
 * One entry of a coverage list.
 *
 * `isAvailable: false` is how a hole is punched in a wider area that IS
 * covered — "the whole town, except Block C" is two entries, not one per street
 * around it.
 */
export type CoverageEntryInput = {
  locationId: string;
  isAvailable?: boolean;
  note?: string;
};

export const useUpdateServiceCoverage = createMutation<
  void,
  { id: string; entries: CoverageEntryInput[] },
  Error
>({
  mutationFn: async ({ id, entries }) => {
    await client.put(`/services/${id}/coverage`, { entries });
  },
});

export const useUpdateServiceProviderCoverage = createMutation<
  void,
  { id: string; entries: CoverageEntryInput[] },
  Error
>({
  mutationFn: async ({ id, entries }) => {
    await client.put(`/service-providers/${id}/coverage`, { entries });
  },
});

export const useUpdatePackageCoverage = createMutation<
  void,
  { id: string; entries: CoverageEntryInput[] },
  Error
>({
  mutationFn: async ({ id, entries }) => {
    await client.put(`/packages/${id}/coverage`, { entries });
  },
});
