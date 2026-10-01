import type { AdminDashboard } from '@/lib/utils/admin-stats';
import { createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';
import { client } from '@/lib/api/client';
import { relativeTime } from '@/lib/utils/admin-stats';

export type { ActivityRow, AdminDashboard, AreaRow, Bar, CustomerRow, RevenueRange, Slice, StaffRow } from '@/lib/utils/admin-stats';

type DashboardVariables = { tenantId?: string } | void;

type ApiBar = { key: string; label: string; value: string };
type ApiCollectionMetrics = {
  today: string;
  week: string;
  month: string;
  todayReceipts: number;
  weekReceipts: number;
  monthReceipts: number;
};

export type AdminDashboardResponse = {
  customers: { total: number; active: number; inactive: number; pending: number; delta: number | null; series: number[] };
  connections: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    cancelled: number;
    delta: number | null;
    series: number[];
    inactiveSeries: number[];
    inactiveDelta: number | null;
  };
  collections: ApiCollectionMetrics & {
    delta: number | null;
    series: { daily: ApiBar[]; weekly: ApiBar[]; monthly: ApiBar[] };
  };
  outstanding: { amount: string; accounts: number };
  services: AdminDashboard['services'];
  areas: AdminDashboard['areas'];
  recentCustomers: { id: string; name: string; phone: string; status: 'active' | 'inactive' | 'pending'; createdAt: string; connectionCount: number }[];
  staff: { id: string; name: string; collected: string; receipts: number; lastCollectedAt: string | null }[];
  activity: { id: string; kind: 'customer' | 'payment'; title: string; subtitle: string; createdAt: string }[];
  generatedAt: string;
};

export function mapAdminDashboard(dto: AdminDashboardResponse): AdminDashboard {
  const now = new Date(dto.generatedAt);
  const inactive = dto.connections.inactive + dto.connections.suspended + dto.connections.cancelled;
  const bars = (items: ApiBar[]) => items.map(item => ({ ...item, value: Number(item.value) }));
  const month = Number(dto.collections.month);

  return {
    totalCustomers: dto.customers.total,
    totalCustomersDelta: dto.customers.delta,
    totalCustomersSeries: dto.customers.series,
    activeConnections: dto.connections.active,
    activeDelta: dto.connections.delta,
    activeSeries: dto.connections.series,
    inactiveConnections: inactive,
    // Connections that stopped, not connections that are stopped: the sparkline
    // is a churn trend, so it is counted on the date each one ended.
    inactiveDelta: dto.connections.inactiveDelta,
    inactiveSeries: dto.connections.inactiveSeries,
    revenueThisMonth: month,
    revenueDelta: dto.collections.delta,
    revenueSeries: dto.collections.series.monthly.map(point => Number(point.value)),
    revenue: {
      daily: bars(dto.collections.series.daily),
      weekly: bars(dto.collections.series.weekly),
      monthly: bars(dto.collections.series.monthly),
    },
    connectionStatus: [
      { id: 'active', label: 'Active', count: dto.connections.active, share: dto.connections.total ? (dto.connections.active / dto.connections.total) * 100 : 0 },
      { id: 'inactive', label: 'Inactive', count: inactive, share: dto.connections.total ? (inactive / dto.connections.total) * 100 : 0 },
    ],
    services: dto.services,
    recentCustomers: dto.recentCustomers.map(customer => ({ ...customer, ago: relativeTime(new Date(customer.createdAt), now) })),
    activity: dto.activity.map(activity => ({ ...activity, ago: relativeTime(new Date(activity.createdAt), now) })),
    collectedToday: Number(dto.collections.today),
    receiptsToday: dto.collections.todayReceipts,
    collectedWeek: Number(dto.collections.week),
    outstandingDues: Number(dto.outstanding.amount),
    dueAccounts: dto.outstanding.accounts,
    arpu: dto.connections.active > 0 ? month / dto.connections.active : 0,
    areas: dto.areas,
    staff: dto.staff.map(row => ({
      id: row.id,
      name: row.name,
      collected: Number(row.collected),
      bills: row.receipts,
      ago: row.lastCollectedAt === null ? null : relativeTime(new Date(row.lastCollectedAt), now),
    })),
  };
}

export const useAdminDashboard = createQuery<AdminDashboard, DashboardVariables, Error>({
  queryKey: [QUERY_KEYS.ADMIN_DASHBOARD],
  fetcher: async () => mapAdminDashboard((await client.get<AdminDashboardResponse>('/analytics/dashboard/admin')).data),
  staleTime: 5 * 60 * 1000,
});
