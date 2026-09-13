import type { AdminDashboard } from '@/lib/utils/admin-stats';
import type { ConsolidatedCustomer } from '@/types';

export type CreateCustomerPayload = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  serviceType: string;
  packageName: string;
  packageId?: string;
  monthlyPrice: number;
  speedMbps?: number;
  stbNumber?: string;
  vcNumber?: string;
  boxModel?: string;
  locationLabel?: string;
};

const unavailable = () => Promise.reject(new Error('This feature is waiting for its backend API.'));

export const adminService = {
  fetchDashboardData: (_tenantId?: string, _forceRefresh?: boolean): Promise<AdminDashboard> => unavailable(),
  fetchConsolidatedCustomers: (_tenantId?: string, _limit?: number): Promise<ConsolidatedCustomer[]> => unavailable(),
  createCustomer: (_payload: CreateCustomerPayload, _tenantId?: string): Promise<ConsolidatedCustomer> => unavailable(),
  clearCache: () => {},
};
