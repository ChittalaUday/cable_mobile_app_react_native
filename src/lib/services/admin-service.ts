import type { AdminDashboard } from '@/lib/utils/admin-stats';
import type {
  AccountDoc,
  ConnectionAccount,
  ConsolidatedCustomer,
  CustomerDoc,
  PackageDoc,
  PaymentDoc,
  RawAccountDoc,
  RawConnectionItem,
  RawCustomerDoc,
  StaffDoc,
  TicketDoc,
} from '@/types';

import { addDoc, collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { COLLECTIONS, ERROR_MESSAGES, USER_ROLES } from '@/constants';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { stripUndefined } from '@/lib/utils';
import { buildActivity, recentCustomers, summariseAccounts, summarisePayments, summariseStaff, topAreas } from '@/lib/utils/admin-stats';

export type CreateCustomerPayload = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  serviceType: string;
  packageName: string;
  /** Catalogue package id from the `packages` collection, when chosen from Packages & Plans. */
  packageId?: string;
  monthlyPrice: number;
  speedMbps?: number;
  stbNumber?: string;
  vcNumber?: string;
  boxModel?: string;
  locationLabel?: string;
};

const DOC_CAP = 5000;

let cachedDashboardData: { data: AdminDashboard; tenantId: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function readStaff(tenantId: string) {
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', USER_ROLES.STAFF), where('tenantId', '==', tenantId), limit(200)));
    return snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as StaffDoc & { id: string });
  }
  catch {
    return [];
  }
}

function growthOf(total: number, addedThisMonth: number) {
  const previous = total - addedThisMonth;
  return previous > 0 ? ((total - previous) / previous) * 100 : null;
}

async function fetchCollection<T>(collName: string, tenantId: string, limitCount = DOC_CAP): Promise<(T & { id: string })[]> {
  // Legacy docs bulk-uploaded by scripts/bulk_upload_customers.py carry no `tenantId`, so a
  // server-side where('tenantId','==',...) silently hides every one of them. Read the collection
  // and scope client-side, treating a missing tenantId as belonging to the current tenant.
  // ponytail: reads the whole collection. Backfill tenantId on every doc, then move the filter
  // back into the query as where('tenantId', '==', tenantId).
  try {
    const snap = await getDocs(query(collection(db, collName), limit(limitCount)));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as T & { id: string; tenantId?: string })
      .filter(d => !d.tenantId || d.tenantId === tenantId);
  }
  catch (e) {
    console.warn(`Unconstrained read for ${collName} failed, retrying tenant-scoped`, e);
  }

  try {
    const snap = await getDocs(query(collection(db, collName), where('tenantId', '==', tenantId), limit(limitCount)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T & { id: string });
  }
  catch (err) {
    console.warn(`Tenant-scoped read for ${collName} failed:`, err);
    return [];
  }
}

export const adminService = {
  /**
   * Fetches dashboard analytics using low-read strategy:
   * 1. Check in-memory TTL cache (0 Firestore reads)
   * 2. Read single pre-compiled `tenant_stats/{tenantId}` document (1 Firestore read)
   * 3. Fall back to raw collection query only if stats doc missing
   */
  async fetchDashboardData(tenantIdOverride?: string, forceRefresh = false): Promise<AdminDashboard> {
    const tenantId = tenantIdOverride ?? useAuthStore.getState().tenantId ?? 'satya_cable_network';
    if (!tenantId)
      throw new Error(ERROR_MESSAGES.NO_TENANT_ID);

    const now = Date.now();
    if (!forceRefresh && cachedDashboardData && cachedDashboardData.tenantId === tenantId && (now - cachedDashboardData.timestamp) < CACHE_TTL_MS) {
      return cachedDashboardData.data;
    }

    // 1-Read Bulk Aggregated Query
    try {
      const statsDocRef = doc(db, 'tenant_stats', tenantId);
      const statsSnap = await getDoc(statsDocRef);
      if (statsSnap.exists()) {
        const statsData = statsSnap.data() as AdminDashboard;
        cachedDashboardData = { data: statsData, tenantId, timestamp: now };
        return statsData;
      }
    }
    catch (err) {
      console.warn('Pre-compiled tenant_stats read failed, falling back to collection reads:', err);
    }

    // Fallback: Multi-collection document reads
    const [accounts, customers, payments, tickets, staff] = await Promise.all([
      fetchCollection<AccountDoc>(COLLECTIONS.CUSTOMER_ACCOUNTS, tenantId),
      fetchCollection<CustomerDoc>(COLLECTIONS.CUSTOMERS, tenantId),
      fetchCollection<PaymentDoc>(COLLECTIONS.PAYMENTS, tenantId),
      fetchCollection<TicketDoc>(COLLECTIONS.TICKETS, tenantId),
      readStaff(tenantId),
    ]);

    const dateNow = new Date();
    const accountStats = summariseAccounts(accounts, dateNow);
    const paymentStats = summarisePayments(payments, dateNow);
    const totalCustomers = customers.length || accountStats.statusByCustomer.size;
    const nameById = new Map(customers.map(customer => [customer.id, customer.name ?? customer.id]));

    const dashboard: AdminDashboard = {
      totalCustomers,
      totalCustomersDelta: growthOf(totalCustomers, accountStats.addedThisMonth),
      totalCustomersSeries: accountStats.totalSeries,
      activeConnections: accountStats.counts.active,
      activeDelta: accountStats.activeDelta,
      activeSeries: accountStats.activeSeries,
      inactiveConnections: accountStats.counts.inactive,
      inactiveDelta: accountStats.inactiveDelta,
      inactiveSeries: accountStats.inactiveSeries,
      connectionStatus: accountStats.connectionStatus,
      services: accountStats.services,
      recentCustomers: recentCustomers({ customers, statusByCustomer: accountStats.statusByCustomer, now: dateNow }),
      activity: buildActivity({ customers, activations: accountStats.activations, payments, nameById, now: dateNow }),
      outstandingDues: accountStats.outstandingDues,
      dueAccounts: accountStats.dueAccounts,
      arpu: accountStats.counts.active > 0 ? paymentStats.revenueThisMonth / accountStats.counts.active : 0,
      areas: topAreas(customers),
      staff: summariseStaff({ staff, payments, tickets, nameById, now: dateNow }),
      ...paymentStats,
    };

    cachedDashboardData = { data: dashboard, tenantId, timestamp: now };
    return dashboard;
  },

  async fetchConsolidatedCustomers(tenantIdOverride?: string, limitCount = 200): Promise<ConsolidatedCustomer[]> {
    const tenantId = tenantIdOverride ?? useAuthStore.getState().tenantId ?? 'satya_cable_network';

    const [rawCustomers, rawAccounts, rawServices, rawPackages] = await Promise.all([
      fetchCollection<RawCustomerDoc>(COLLECTIONS.CUSTOMERS, tenantId, limitCount),
      fetchCollection<RawAccountDoc>(COLLECTIONS.CUSTOMER_ACCOUNTS, tenantId, limitCount),
      fetchCollection<RawAccountDoc>(COLLECTIONS.SERVICES, tenantId, limitCount),
      fetchCollection<PackageDoc>(COLLECTIONS.PACKAGES, tenantId, limitCount),
    ]);

    // Package catalogue, so a connection referencing `packageIds` shows the live plan name & price.
    const packagesById = new Map(rawPackages.map(pkg => [pkg.id, pkg]));

    const allAccountDocs = rawAccounts.length > 0 ? rawAccounts : rawServices;
    const accountsByCustomer = new Map<string, ConnectionAccount[]>();

    for (const acc of allAccountDocs) {
      if (!acc.customerId)
        continue;

      const linkedPackage = acc.packageIds?.map(id => packagesById.get(id)).find(Boolean);

      const connection: ConnectionAccount = {
        id: acc.id ?? acc.accountNumber ?? String(Math.random()),
        customerId: acc.customerId,
        serviceType: acc.serviceType ?? '',
        serviceTypeName: acc.serviceTypeName ?? '',
        provider: acc.provider ?? '',
        providerName: acc.providerName ?? '',
        stbNumber: acc.stbSerialNumber,
        vcNumber: acc.vcNumber,
        packageName: linkedPackage?.name ?? acc.packages?.[0] ?? '',
        monthlyPrice: acc.monthlyPrice ?? linkedPackage?.monthlyPrice ?? 0,
        status: acc.status === 'active' ? 'active' : 'expired',
        expiryDate: acc.expiryDate,
        locationLabel: acc.locationLabel,
        speedMbps: acc.speedMbps ?? linkedPackage?.speedMbps,
      };

      const list = accountsByCustomer.get(acc.customerId) ?? [];
      list.push(connection);
      accountsByCustomer.set(acc.customerId, list);
    }

    return rawCustomers.map((cust) => {
      const custId = cust.id ?? String(Math.random());
      const connList = accountsByCustomer.get(custId) ?? [];

      if (connList.length === 0 && Array.isArray(cust.connections)) {
        cust.connections.forEach((c: RawConnectionItem, idx: number) => {
          connList.push({
            id: c.id ?? `${custId}_conn_${idx}`,
            customerId: custId,
            serviceType: c.serviceType ?? '',
            serviceTypeName: c.serviceTypeName ?? '',
            provider: c.provider ?? '',
            providerName: c.providerName ?? '',
            stbNumber: c.stbSerialNumber,
            vcNumber: c.vcNumber,
            packageName: c.packages?.[0] ?? '',
            monthlyPrice: c.monthlyPrice ?? 0,
            status: (c.status === 'active' ? 'active' : 'expired') as ConnectionAccount['status'],
            expiryDate: c.expiryDate,
            locationLabel: c.locationLabel,
          });
        });
      }

      const rawStatus = (cust.status ?? 'active').toLowerCase();
      const status: ConsolidatedCustomer['status'] = rawStatus.includes('pend')
        ? 'pending'
        : rawStatus.includes('inact')
          ? 'inactive'
          : 'active';

      return {
        id: custId,
        name: cust.name ?? 'Subscriber Customer',
        phone: cust.phone ?? '—',
        email: cust.email,
        address: cust.address ?? '',
        status,
        connections: connList,
        createdAt: cust.createdAt,
      };
    });
  },

  async createCustomer(payload: CreateCustomerPayload, tenantIdOverride?: string): Promise<ConsolidatedCustomer> {
    const tenantId = tenantIdOverride ?? useAuthStore.getState().tenantId ?? 'satya_cable_network';
    const nowIso = new Date().toISOString();

    let customerId = `cust_${Date.now()}`;
    let connectionId = `conn_${Date.now()}`;

    const serviceTypeName = payload.serviceType === 'internet' || payload.serviceType === 'broadband'
      ? 'Broadband'
      : payload.serviceType === 'fiber'
        ? 'AP Fiber'
        : 'Cable TV';

    const customerDoc: RawCustomerDoc = {
      tenantId,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: payload.email?.trim() || undefined,
      address: payload.address.trim(),
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const accountDoc: RawAccountDoc = {
      tenantId,
      serviceType: payload.serviceType,
      serviceTypeName,
      provider: 'satya_cable',
      providerName: 'Satya Cable & Broadband',
      stbSerialNumber: payload.stbNumber?.trim() || undefined,
      vcNumber: payload.vcNumber?.trim() || undefined,
      packages: [payload.packageName.trim() || 'Standard Pack'],
      packageIds: payload.packageId ? [payload.packageId] : undefined,
      monthlyPrice: payload.monthlyPrice ?? 350,
      status: 'active',
      locationLabel: payload.locationLabel?.trim() || 'Main Connection',
      speedMbps: payload.speedMbps ? Number(payload.speedMbps) : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const custRef = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), stripUndefined(customerDoc));
      customerId = custRef.id;

      const accRef = await addDoc(collection(db, COLLECTIONS.CUSTOMER_ACCOUNTS), stripUndefined({
        ...accountDoc,
        customerId,
        accountNumber: `ACC_${Date.now()}`,
      }));
      connectionId = accRef.id;
    }
    catch (err) {
      console.warn('Firestore create customer write failed, maintaining client fallback:', err);
    }

    this.clearCache();

    const connection: ConnectionAccount = {
      id: connectionId,
      customerId,
      serviceType: payload.serviceType,
      serviceTypeName,
      provider: 'satya_cable',
      providerName: 'Satya Cable & Broadband',
      stbNumber: payload.stbNumber?.trim() || undefined,
      vcNumber: payload.vcNumber?.trim() || undefined,
      packageName: payload.packageName.trim() || 'Standard Pack',
      monthlyPrice: payload.monthlyPrice ?? 350,
      status: 'active',
      locationLabel: payload.locationLabel?.trim() || 'Main Connection',
      speedMbps: payload.speedMbps ? Number(payload.speedMbps) : undefined,
    };

    return {
      id: customerId,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: payload.email?.trim() || undefined,
      address: payload.address.trim(),
      status: 'active',
      connections: [connection],
      createdAt: nowIso,
    };
  },

  clearCache() {
    cachedDashboardData = null;
  },
};
