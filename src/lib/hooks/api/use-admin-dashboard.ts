import type { AdminDashboard } from '@/lib/utils/admin-stats';
import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';
import { client } from '@/lib/api/client';
import { relativeTime } from '@/lib/utils/admin-stats';

export type { ActivityRow, AdminDashboard, AreaRow, Bar, CustomerRow, RevenueRange, Slice, StaffRow } from '@/lib/utils/admin-stats';

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
  connections: { total: number; active: number; inactive: number; suspended: number; cancelled: number; delta: number | null; series: number[] };
  collections: ApiCollectionMetrics & {
    delta: number | null;
    series: { daily: ApiBar[]; weekly: ApiBar[]; monthly: ApiBar[] };
  };
  outstanding: { amount: string; accounts: number };
  services: AdminDashboard['services'];
  areas: AdminDashboard['areas'];
  recentCustomers: { id: string; name: string; phone: string; status: 'active' | 'inactive' | 'pending'; createdAt: string; connectionCount: number }[];
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
    inactiveDelta: null,
    inactiveSeries: [],
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
    collectedWeek: Number(dto.collections.week),
    outstandingDues: Number(dto.outstanding.amount),
    dueAccounts: dto.outstanding.accounts,
    arpu: dto.connections.active > 0 ? month / dto.connections.active : 0,
    areas: dto.areas,
    staff: [],
  };
}

export const useAdminDashboard = createQuery<AdminDashboard, DashboardVariables, Error>({
  queryKey: [QUERY_KEYS.ADMIN_DASHBOARD],
  fetcher: async () => mapAdminDashboard((await client.get<AdminDashboardResponse>('/analytics/dashboard/admin')).data),
  staleTime: 5 * 60 * 1000,
});

/**
 * ponytail: always empty. The API exposes a customer's own profile on
 * `/auth/me` and nothing else — there is no customer list or create endpoint to
 * call (`modules/customers` is profile-only). Point this at `GET /customers`
 * when that module grows routes.
 */
export const useConsolidatedCustomers = createQuery<ConsolidatedCustomer[], DashboardVariables, Error>({
  queryKey: ['consolidated-customers'],
  fetcher: async () => [],
  staleTime: 2 * 60 * 1000,
});

/** ponytail: local-only, for the same reason as the list above. */
export const useCreateCustomer = createMutation<
  ConsolidatedCustomer,
  { payload: CreateCustomerPayload; tenantId?: string },
  Error
>({
  mutationFn: async ({ payload }) => {
    const mockCustomer: ConsolidatedCustomer = {
      id: `cust-${Date.now()}`,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      status: 'active',
      connections: [],
      createdAt: new Date().toISOString(),
    };
    return mockCustomer;
  },
});
