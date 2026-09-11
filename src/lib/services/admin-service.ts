import type { AccountDoc, AdminDashboard, CustomerDoc, PaymentDoc, StaffDoc, TicketDoc } from '@/lib/utils/admin-stats';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

import { COLLECTIONS, ERROR_MESSAGES, USER_ROLES } from '@/constants';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { buildActivity, recentCustomers, summariseAccounts, summarisePayments, summariseStaff, topAreas } from '@/lib/utils/admin-stats';

const DOC_CAP = 5000;

// Simple in-memory cache to prevent redundant reads on quick navigation
let cachedDashboardData: { data: AdminDashboard; tenantId: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function readDocs<T>(name: string, tenantId: string) {
  const snapshot = await getDocs(query(collection(db, name), where('tenantId', '==', tenantId), limit(DOC_CAP)));
  return snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as T & { id: string });
}

async function readOptional<T>(name: string, tenantId: string) {
  try {
    return await readDocs<T>(name, tenantId);
  }
  catch {
    return [];
  }
}

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
      readDocs<AccountDoc>(COLLECTIONS.CUSTOMER_ACCOUNTS, tenantId),
      readDocs<CustomerDoc>(COLLECTIONS.CUSTOMERS, tenantId),
      readOptional<PaymentDoc>(COLLECTIONS.PAYMENTS, tenantId),
      readOptional<TicketDoc>(COLLECTIONS.TICKETS, tenantId),
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

  clearCache() {
    cachedDashboardData = null;
  },
};
