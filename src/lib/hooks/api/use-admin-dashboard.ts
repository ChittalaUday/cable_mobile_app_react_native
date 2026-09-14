import type { AdminDashboard } from '@/lib/utils/admin-stats';
import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { createMutation, createQuery } from 'react-query-kit';
import { QUERY_KEYS } from '@/constants';

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

/**
 * ponytail: placeholder dashboard. The API has no aggregation endpoint yet
 * (billing, payments and tickets are Phase 2), so every figure below is a
 * fixture. Replace the whole function with one `GET /dashboard` call when that
 * endpoint lands — do not grow it by deriving numbers from catalogue lists,
 * which is what it used to do: it fetched `/services` and `/packages` on every
 * load and used them for two counts that a fallback overrode anyway.
 */
function placeholderDashboard(): AdminDashboard {
  return {
    totalCustomers: 764,
    totalCustomersDelta: 5.2,
    totalCustomersSeries: [700, 715, 730, 740, 750, 755, 760, 764],
    activeConnections: 728,
    activeDelta: 4.8,
    activeSeries: [670, 680, 695, 705, 712, 720, 724, 728],
    inactiveConnections: 36,
    inactiveDelta: -2.1,
    inactiveSeries: [45, 42, 40, 39, 38, 37, 36, 36],
    revenueThisMonth: 284500,
    revenueDelta: 8.4,
    revenueSeries: [210000, 225000, 240000, 255000, 260000, 272000, 278000, 284500],
    revenue: {
      daily: [
        { key: 'd1', label: '1', value: 9200 },
        { key: 'd2', label: '2', value: 11400 },
        { key: 'd3', label: '3', value: 8700 },
        { key: 'd4', label: '4', value: 10500 },
        { key: 'd5', label: '5', value: 12100 },
        { key: 'd6', label: '6', value: 9800 },
        { key: 'd7', label: '7', value: 14200 },
        { key: 'd8', label: '8', value: 13100 },
        { key: 'd9', label: '9', value: 15400 },
      ],
      weekly: [
        { key: 'w1', label: 'W1', value: 65000 },
        { key: 'w2', label: 'W2', value: 72000 },
        { key: 'w3', label: 'W3', value: 68000 },
        { key: 'w4', label: 'W4', value: 79500 },
      ],
      monthly: [
        { key: 'm1', label: 'Jan', value: 240000 },
        { key: 'm2', label: 'Feb', value: 255000 },
        { key: 'm3', label: 'Mar', value: 284500 },
      ],
    },
    connectionStatus: [
      { id: 'active', label: 'Active', count: 728, share: 95.3 },
      { id: 'inactive', label: 'Inactive', count: 36, share: 4.7 },
    ],
    services: [
      { id: 'cable', label: 'Digital Cable', count: 420, share: 58 },
      { id: 'broadband', label: 'Broadband', count: 308, share: 42 },
    ],
    recentCustomers: [],
    activity: [
      { id: 'act-1', kind: 'customer', title: 'New subscriber registered', subtitle: 'Digital Cable Base Plan', ago: '10m ago' },
      { id: 'act-2', kind: 'payment', title: 'Payment received ₹450', subtitle: 'Online UPI payment', ago: '25m ago' },
      { id: 'act-3', kind: 'connection', title: 'STB Activated', subtitle: 'Customer #C2602498', ago: '1h ago' },
    ],
    collectedToday: 15400,
    collectedWeek: 79500,
    outstandingDues: 42500,
    dueAccounts: 48,
    arpu: 390,
    areas: [
      { id: 'area-1', name: 'Main Road Sector 1', count: 245, share: 32 },
      { id: 'area-2', name: 'Gandhi Nagar', count: 198, share: 26 },
      { id: 'area-3', name: 'RTC Colony', count: 185, share: 24 },
      { id: 'area-4', name: 'Bazaar Street', count: 136, share: 18 },
    ],
    staff: [
      { id: 'staff-1', name: 'Ramesh (Field Tech)', collected: 24500, bills: 42, ticketsClosed: 8, lastAction: 'Payment recorded', ago: '15m ago' },
      { id: 'staff-2', name: 'Suresh (Collections)', collected: 32000, bills: 56, ticketsClosed: 5, lastAction: 'Collection completed', ago: '1h ago' },
    ],
  };
}

export const useAdminDashboard = createQuery<AdminDashboard, DashboardVariables, Error>({
  queryKey: [QUERY_KEYS.ADMIN_DASHBOARD],
  fetcher: async () => placeholderDashboard(),
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
