import type { AdminDashboard } from '@/lib/utils/admin-stats';
import { createQuery } from 'react-query-kit';

import { adminService } from '@/lib/services';

export type { ActivityRow, AdminDashboard, AreaRow, Bar, CustomerRow, RevenueRange, Slice, StaffRow } from '@/lib/utils/admin-stats';

export const useAdminDashboard = createQuery<AdminDashboard, void, Error>({
  queryKey: ['admin-dashboard'],
  fetcher: () => adminService.fetchDashboardData(),
  staleTime: 5 * 60 * 1000,
});
