import type { PackageDoc, PackagePayload } from '@/types/service';

import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';
import { packageService } from '@/lib/services';

type PackageVariables = { tenantId?: string } | void;

export const usePackages = createQuery<PackageDoc[], PackageVariables, Error>({
  queryKey: [QUERY_KEYS.PACKAGES],
  fetcher: variables => packageService.list(variables?.tenantId),
  staleTime: 5 * 60 * 1000,
});

export const useCreatePackage = createMutation<PackageDoc, { payload: PackagePayload; tenantId?: string }, Error>({
  mutationFn: variables => packageService.create(variables.payload, variables.tenantId),
});

export const useUpdatePackage = createMutation<void, { id: string; patch: Partial<PackagePayload> }, Error>({
  mutationFn: variables => packageService.update(variables.id, variables.patch),
});

export const useDeletePackage = createMutation<void, { id: string }, Error>({
  mutationFn: variables => packageService.remove(variables.id),
});
