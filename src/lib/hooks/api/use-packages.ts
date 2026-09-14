import type {
  CreatePackageInput,
  Package,
  PackageDetail,
  Page,
  UpdatePackageInput,
} from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';
import { client } from '@/lib/api/client';
import { MAX_PAGE_SIZE } from '@/lib/api/types';

export type NormalizedPackage = Omit<Package, 'description'> & {
  description?: string;
  monthlyPrice: number;
  durationMonths: number;
  active: boolean;
  speedMbps?: number;
  providerName?: string;
};

const MONTHS_PER_CYCLE = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
} as const;

function toNormalizedPackage(pkg: Package): NormalizedPackage {
  return {
    ...pkg,
    description: pkg.description ?? undefined,
    monthlyPrice: Number(pkg.price) || 0,
    durationMonths: MONTHS_PER_CYCLE[pkg.billingCycle] ?? 1,
    active: pkg.status === 'active',
    providerName: pkg.serviceProviderName,
    speedMbps: (pkg.metadata as { speedMbps?: number } | null)?.speedMbps,
  };
}

/**
 * The areas a package is sold in, short enough for a list row.
 *
 * Only the last step of each breadcrumb: two packages under one provider are
 * told apart by "Block A" against "Block C", and the towns above them are the
 * same words on both. Empty is the normal case and says nothing, because the
 * package simply goes wherever its provider does.
 */
export function coverageLabel(pkg: { coverageAreas?: string[] }): string | null {
  // Optional on the way in: a response cached before the field existed, or a
  // package built by hand, must not take the row down with it.
  const areas = pkg.coverageAreas ?? [];
  if (areas.length === 0)
    return null;

  const places = areas.map(path => path.split(' / ').at(-1) ?? path);

  return places.length > 3
    ? `${places.slice(0, 3).join(', ')} +${places.length - 3}`
    : places.join(', ');
}

/** What `GET /packages` filters on. Anything else is filtered in the list. */
export type PackageVariables = {
  serviceProviderId?: string;
  serviceId?: string;
  packageType?: 'base' | 'bouquet' | 'addon' | 'ala_carte' | 'combo';
  status?: 'active' | 'inactive';
  /** Free-text search; the API calls it `q`. */
  q?: string;
  limit?: number;
  page?: number;
} | void;

export const usePackages = createQuery<NormalizedPackage[], PackageVariables, Error>({
  queryKey: [QUERY_KEYS.PACKAGES],
  fetcher: async (variables) => {
    const response = await client.get<Page<Package>>('/packages', {
      params: { limit: MAX_PAGE_SIZE, ...variables },
    });
    return (response.data.items ?? []).map(toNormalizedPackage);
  },
  staleTime: 5 * 60 * 1000,
});

export const usePackageDetail = createQuery<PackageDetail, { id: string }, Error>({
  queryKey: [QUERY_KEYS.PACKAGES, 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<PackageDetail>(`/packages/${id}`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000,
});

export const useCreatePackage = createMutation<Package, { payload: CreatePackageInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<Package>('/packages', payload);
    return response.data;
  },
});

export const useUpdatePackage = createMutation<Package, { id: string; patch: UpdatePackageInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<Package>(`/packages/${id}`, patch);
    return response.data;
  },
});

export const useDeletePackage = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/packages/${id}`);
  },
});

export const useSetPackageChannels = createMutation<
  PackageDetail,
  { id: string; channelIds: string[] },
  Error
>({
  mutationFn: async ({ id, channelIds }) => {
    const response = await client.put<PackageDetail>(`/packages/${id}/channels`, {
      channels: channelIds.map(channelId => ({ channelId })),
    });
    return response.data;
  },
});
