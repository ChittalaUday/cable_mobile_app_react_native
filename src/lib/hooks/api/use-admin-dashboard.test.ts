import { mapAdminDashboard } from './use-admin-dashboard';

describe('mapAdminDashboard', () => {
  it('maps server money, connection states, and timestamps for the UI', () => {
    const result = mapAdminDashboard({
      customers: { total: 3, active: 2, inactive: 1, pending: 0, delta: 50, series: [1, 2, 3] },
      connections: { total: 4, active: 2, inactive: 1, suspended: 1, cancelled: 0, delta: 25, series: [2, 3, 4], inactiveSeries: [0, 1, 2], inactiveDelta: -40 },
      collections: {
        today: '500.00',
        week: '800.00',
        month: '1200.50',
        delta: 20,
        todayReceipts: 1,
        weekReceipts: 2,
        monthReceipts: 3,
        series: { daily: [{ key: 'd', label: '14', value: '500.00' }], weekly: [], monthly: [] },
      },
      outstanding: { amount: '125.50', accounts: 1 },
      services: [{ id: 'cable', label: 'Cable', count: 4, share: 100 }],
      areas: [{ id: 'north', name: 'North', count: 4, share: 100 }],
      recentCustomers: [{ id: 'c1', name: 'Ramu', phone: '9999999999', status: 'active', createdAt: '2026-09-14T06:00:00.000Z', connectionCount: 2 }],
      staff: [{ id: 's1', name: 'Ravi', collected: '1600.00', receipts: 2, lastCollectedAt: '2026-09-14T04:30:00.000Z' }],
      activity: [{ id: 'p1', kind: 'payment', title: 'TX-1', subtitle: 'ACC-1', createdAt: '2026-09-14T06:00:00.000Z' }],
      generatedAt: '2026-09-14T06:30:00.000Z',
    });

    expect(result).toMatchObject({
      totalCustomers: 3,
      activeConnections: 2,
      inactiveConnections: 2,
      revenueThisMonth: 1200.5,
      collectedToday: 500,
      collectedWeek: 800,
      outstandingDues: 125.5,
      dueAccounts: 1,
      arpu: 600.25,
    });
    expect(result.revenue.daily).toEqual([{ key: 'd', label: '14', value: 500 }]);
    expect(result.recentCustomers[0]).toMatchObject({ name: 'Ramu', ago: '30 mins ago' });
    // Churn rides its own series, not a copy of the active one.
    expect(result.inactiveSeries).toEqual([0, 1, 2]);
    expect(result.inactiveDelta).toBe(-40);
    expect(result.staff).toEqual([{ id: 's1', name: 'Ravi', collected: 1600, bills: 2, ago: '2 hrs ago' }]);
  });
});
