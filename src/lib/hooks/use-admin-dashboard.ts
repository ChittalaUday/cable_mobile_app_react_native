import type { AdminDashboard } from '@/lib/utils/admin-stats';
import { createQuery } from 'react-query-kit';

import { QUERY_KEYS } from '@/constants';
import { adminService } from '@/lib/services';

export type { ActivityRow, AdminDashboard, AreaRow, Bar, CustomerRow, RevenueRange, Slice, StaffRow } from '@/lib/utils/admin-stats';

type DashboardVariables = { tenantId?: string } | void;

export const useAdminDashboard = createQuery<AdminDashboard, DashboardVariables, Error>({
  queryKey: [QUERY_KEYS.ADMIN_DASHBOARD],
  fetcher: variables => adminService.fetchDashboardData(variables?.tenantId),
  staleTime: 5 * 60 * 1000,
});
