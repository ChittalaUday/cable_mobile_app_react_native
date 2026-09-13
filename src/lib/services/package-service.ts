import type { PackageDoc, PackagePayload } from '@/types/service';

const unavailable = () => Promise.reject(new Error('Packages are waiting for their backend API.'));

export const packageService = {
  list: (_tenantId?: string): Promise<PackageDoc[]> => unavailable(),
  create: (_payload: PackagePayload, _tenantId?: string): Promise<PackageDoc> => unavailable(),
  update: (_id: string, _patch: Partial<PackagePayload>): Promise<void> => unavailable(),
  remove: (_id: string): Promise<void> => unavailable(),
};
