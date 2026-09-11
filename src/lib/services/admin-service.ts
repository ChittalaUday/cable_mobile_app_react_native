import type { AccountDoc, AdminDashboard, CustomerDoc, PaymentDoc, StaffDoc, TicketDoc } from '@/lib/utils/admin-stats';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { buildActivity, recentCustomers, summariseAccounts, summarisePayments, summariseStaff, topAreas } from '@/lib/utils/admin-stats';

const DOC_CAP = 5000;

async function readDocs<T>(name: string) {
  const snapshot = await getDocs(query(collection(db, name), limit(DOC_CAP)));
  return snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as T & { id: string });
}

async function readOptional<T>(name: string) {
  try {
    return await readDocs<T>(name);
  }
  catch {
    return [];
  }
}

async function readStaff() {
  try {
    const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'staff'), limit(200)));
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
  async fetchDashboardData(): Promise<AdminDashboard> {
    const [accounts, customers, payments, tickets, staff] = await Promise.all([
      readDocs<AccountDoc>('customer_accounts'),
      readDocs<CustomerDoc>('customers'),
      readOptional<PaymentDoc>('payments'),
      readOptional<TicketDoc>('tickets'),
      readStaff(),
    ]);

    const now = new Date();
    const accountStats = summariseAccounts(accounts, now);
    const paymentStats = summarisePayments(payments, now);
    const totalCustomers = customers.length || accountStats.statusByCustomer.size;
    const nameById = new Map(customers.map(customer => [customer.id, customer.name ?? customer.id]));

    return {
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
      recentCustomers: recentCustomers({ customers, statusByCustomer: accountStats.statusByCustomer, now }),
      activity: buildActivity({ customers, activations: accountStats.activations, payments, nameById, now }),
      outstandingDues: accountStats.outstandingDues,
      dueAccounts: accountStats.dueAccounts,
      arpu: accountStats.counts.active > 0 ? paymentStats.revenueThisMonth / accountStats.counts.active : 0,
      areas: topAreas(customers),
      staff: summariseStaff({ staff, payments, tickets, nameById, now }),
      ...paymentStats,
    };
  },
};
