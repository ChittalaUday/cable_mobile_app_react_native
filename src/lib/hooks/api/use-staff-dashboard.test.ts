import { mapStaffDashboard } from './use-staff-dashboard';

describe('mapStaffDashboard', () => {
  it('keeps personal and team collection status separate', () => {
    const result = mapStaffDashboard({
      personal: { today: '500.00', week: '700.00', month: '900.00', todayReceipts: 1, weekReceipts: 2, monthReceipts: 3 },
      team: { today: '800.00', week: '1200.00', month: '2000.00', todayReceipts: 2, weekReceipts: 4, monthReceipts: 6 },
      workload: { customers: 20, dueCustomers: 5, outstanding: '2500.00', activeConnections: 18, inactiveConnections: 2 },
      recentCollections: [{ id: 'p1', customerId: 'c1', customerName: 'Ramu', accountNumber: 'ACC-1', amount: '500.00', collectedAt: '2026-09-14T06:00:00.000Z' }],
      generatedAt: '2026-09-14T06:30:00.000Z',
    });

    expect(result.personal).toMatchObject({ today: 500, month: 900, todayReceipts: 1 });
    expect(result.team).toMatchObject({ today: 800, month: 2000, todayReceipts: 2 });
    expect(result.workload.outstanding).toBe(2500);
    expect(result.recentCollections[0]).toMatchObject({ amount: 500, ago: '30 mins ago' });
  });
});
