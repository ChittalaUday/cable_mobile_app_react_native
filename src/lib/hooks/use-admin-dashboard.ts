import type { CreateCustomerPayload } from '@/lib/services/admin-service';
import type { AdminDashboard } from '@/lib/utils/admin-stats';
import type { ConsolidatedCustomer } from '@/types/customer-connection';

import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';

import { adminService } from '@/lib/services';

export type { ActivityRow, AdminDashboard, AreaRow, Bar, CustomerRow, RevenueRange, Slice, StaffRow } from '@/lib/utils/admin-stats';

type DashboardVariables = { tenantId?: string } | void;

export const useAdminDashboard = createQuery<AdminDashboard, DashboardVariables, Error>({
  queryKey: [QUERY_KEYS.ADMIN_DASHBOARD],
  fetcher: variables => adminService.fetchDashboardData(variables?.tenantId),
  staleTime: 5 * 60 * 1000,
});

export const useConsolidatedCustomers = createQuery<ConsolidatedCustomer[], DashboardVariables, Error>({
  queryKey: ['consolidated-customers'],
  fetcher: variables => adminService.fetchConsolidatedCustomers(variables?.tenantId),
  staleTime: 2 * 60 * 1000,
});

export const useCreateCustomer = createMutation<ConsolidatedCustomer, { payload: CreateCustomerPayload; tenantId?: string }, Error>({
  mutationFn: variables => adminService.createCustomer(variables.payload, variables.tenantId),
});
