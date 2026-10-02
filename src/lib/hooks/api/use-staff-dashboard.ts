import type { ApiResponse } from '@/lib/api/contracts';
import { createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { relativeTime } from '@/lib/utils/admin-stats';

type ApiMetrics = StaffDashboardResponse['personal'];

export type StaffDashboardResponse = ApiResponse<'/api/v1/analytics/dashboard/staff', 'get', 200>;

export type StaffCollectionMetrics = Omit<ApiMetrics, 'today' | 'week' | 'month'> & { today: number; week: number; month: number };
export type StaffDashboard = {
  personal: StaffCollectionMetrics;
  team: StaffCollectionMetrics | null;
  workload: Omit<StaffDashboardResponse['workload'], 'outstanding'> & { outstanding: number };
  recentCollections: (Omit<StaffDashboardResponse['recentCollections'][number], 'amount'> & { amount: number; ago: string })[];
};

function mapMetrics(metrics: ApiMetrics): StaffCollectionMetrics {
  return {
    ...metrics,
    today: Number(metrics.today),
    week: Number(metrics.week),
    month: Number(metrics.month),
  };
}

export function mapStaffDashboard(dto: StaffDashboardResponse): StaffDashboard {
  const now = new Date(dto.generatedAt);
  return {
    personal: mapMetrics(dto.personal),
    team: dto.team ? mapMetrics(dto.team) : null,
    workload: { ...dto.workload, outstanding: Number(dto.workload.outstanding) },
    recentCollections: dto.recentCollections.map(row => ({
      ...row,
      amount: Number(row.amount),
      ago: relativeTime(new Date(row.collectedAt), now),
    })),
  };
}

export const useStaffDashboard = createQuery<StaffDashboard, void, Error>({
  queryKey: ['staff-dashboard'],
  fetcher: async () => mapStaffDashboard((await client.get<ApiResponse<'/api/v1/analytics/dashboard/staff', 'get', 200>>('/analytics/dashboard/staff')).data),
  staleTime: 5 * 60 * 1000,
});
