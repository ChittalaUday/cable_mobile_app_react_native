import type { AccountDoc, CustomerDoc, PaymentDoc } from './admin-stats';
import { niceTicks } from './admin-format';
import { areaOf, buildActivity, formatPhone, recentCustomers, relativeTime, summariseAccounts, summarisePayments, topAreas } from './admin-stats';

const NOW = new Date(2026, 8, 9, 12); // Wed 9 Sep 2026, noon local

const ACCOUNTS: AccountDoc[] = [
  { customerId: 'CUST-1', serviceTypeName: 'Cable TV', status: 'active', createdAt: '01-09-2026' },
  { customerId: 'CUST-2', serviceTypeName: 'Cable TV', status: 'active', createdAt: '05-09-2026', msoShareDue: 120 },
  { customerId: 'CUST-3', serviceTypeName: 'Cable TV', status: '  Deactive ', createdAt: '15-08-2026', msoShareDue: 50.5 },
  { customerId: 'CUST-1', serviceTypeName: 'High-Speed Broadband', status: 'active', createdAt: '2026-09-08T05:00:00' },
  { customerId: 'CUST-4', serviceTypeName: 'High-Speed Broadband', status: 'pending' },
  { customerId: 'CUST-5', serviceTypeName: 'Internet + IPTV Combo', status: 'active', createdAt: '01-01-2020' },
  { customerId: 'CUST-6', serviceTypeName: 'Cable TV', status: 'inactive', createdAt: '01-01-2020' },
];

const CUSTOMERS: CustomerDoc[] = [
  { id: 'CUST-1', name: 'Ramesh Kumar', phone: '919876543210', address: 'A31sf1', createdAt: '2026-09-09T09:00:00' },
  { id: 'CUST-2', name: 'Sowmya Priya', phone: '919123456789', address: '12/4 Main Road, Velachery', createdAt: '2026-09-09T06:00:00' },
  { id: 'CUST-4', name: 'Venkatesh', phone: '9998876655', address: 'A12sf2', createdAt: '2026-09-08T12:00:00' },
  { id: 'CUST-3', name: 'Arjun Reddy', phone: '919845677890', address: 'Adyar', createdAt: '01-09-2026' },
  { id: 'CUST-9', name: 'Undated Customer' },
];

const PAYMENTS: PaymentDoc[] = [
  { id: 'p1', amount: 1000, paidAt: '2026-09-09T05:00:00', subscriberName: 'Venkatesh', collectorId: 'S1' },
  { id: 'p2', amount: 400, paidAt: '2026-09-08T05:00:00', collectorId: 'S2' },
  { id: 'p3', amount: 600, paidAt: '01-09-2026', collectorId: 'S1' },
  { id: 'p4', amount: 900, paidAt: '10-08-2026' },
  { id: 'p5', amount: 200, paidAt: '05-04-2026' },
  { id: 'p6', amount: 0, paidAt: '01-09-2026' },
  { id: 'p7', amount: 50 },
];

const accountStats = summariseAccounts(ACCOUNTS, NOW);
const paymentStats = summarisePayments(PAYMENTS, NOW);

describe('summariseAccounts', () => {
  it('normalises the MSO status strings into active / inactive / pending', () => {
    expect(accountStats.counts).toEqual({ active: 4, inactive: 2, pending: 1 });
    expect(accountStats.connectionStatus.map(slice => [slice.label, slice.count, slice.share])).toEqual([
      ['Active', 4, 57],
      ['Inactive', 2, 29],
      ['Pending', 1, 14],
    ]);
  });

  it('totals outstanding MSO dues and the accounts behind them', () => {
    expect(accountStats.outstandingDues).toBe(170.5);
    expect(accountStats.dueAccounts).toBe(2);
  });

  it('groups service distribution by service type, largest first', () => {
    expect(accountStats.services.map(slice => [slice.label, slice.count, slice.share])).toEqual([
      ['Cable TV', 4, 57],
      ['High-Speed Broadband', 2, 29],
      ['Internet + IPTV Combo', 1, 14],
    ]);
  });

  it('keeps the first account status per customer', () => {
    expect(accountStats.statusByCustomer.get('CUST-1')).toBe('active');
    expect(accountStats.statusByCustomer.get('CUST-3')).toBe('inactive');
    expect(accountStats.statusByCustomer.get('CUST-4')).toBe('pending');
  });

  it('parses both dd-MM-yyyy and ISO dates into month buckets and deltas', () => {
    expect(accountStats.addedThisMonth).toBe(3);
    expect(accountStats.addedLastMonth).toBe(1);
    expect(accountStats.activeDelta).toBe(300);
    expect(accountStats.inactiveDelta).toBe(0);
  });

  it('builds a rising cumulative sparkline that counts undated rows as pre-existing', () => {
    expect(accountStats.totalSeries).toEqual([3, 3, 3, 3, 3, 3, 4, 7]);
    expect(accountStats.activeSeries).toEqual([1, 1, 1, 1, 1, 1, 1, 4]);
    expect(accountStats.inactiveSeries).toEqual([1, 1, 1, 1, 1, 1, 2, 2]);
  });
});

describe('summarisePayments', () => {
  it('buckets nine months of revenue for the bar chart', () => {
    expect(paymentStats.revenue.monthly.map(bar => bar.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']);
    expect(paymentStats.revenue.monthly.map(bar => bar.value)).toEqual([0, 0, 0, 200, 0, 0, 0, 900, 2000]);
  });

  it('buckets the daily range by calendar day', () => {
    expect(paymentStats.revenue.daily.map(bar => bar.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(paymentStats.revenue.daily.map(bar => bar.value)).toEqual([600, 0, 0, 0, 0, 0, 0, 400, 1000]);
  });

  it('reports what was collected today and so far this week', () => {
    expect(paymentStats.collectedToday).toBe(1000);
    expect(paymentStats.collectedWeek).toBe(1400);
  });

  it('derives this month, the month-over-month delta and the sparkline', () => {
    expect(paymentStats.revenueThisMonth).toBe(2000);
    expect(paymentStats.revenueDelta).toBeCloseTo(122.22, 1);
    expect(paymentStats.revenueSeries).toEqual([0, 0, 200, 0, 0, 0, 900, 2000]);
  });

  it('returns no delta rather than a fake one when there is no prior month', () => {
    expect(summarisePayments([], NOW).revenueDelta).toBeNull();
  });
});

describe('recentCustomers', () => {
  const rows = recentCustomers({ customers: CUSTOMERS, statusByCustomer: accountStats.statusByCustomer, now: NOW });

  it('takes the newest four, drops undated rows and joins account status', () => {
    expect(rows.map(row => [row.name, row.status, row.ago])).toEqual([
      ['Ramesh Kumar', 'active', '3 hrs ago'],
      ['Sowmya Priya', 'active', '6 hrs ago'],
      ['Venkatesh', 'pending', '1 day ago'],
      ['Arjun Reddy', 'inactive', '9 days ago'],
    ]);
  });
});

describe('buildActivity', () => {
  it('merges signups, activations and payments newest first', () => {
    const nameById = new Map(CUSTOMERS.map(customer => [customer.id, customer.name ?? '']));
    const rows = buildActivity({ customers: CUSTOMERS, activations: accountStats.activations, payments: PAYMENTS, nameById: nameById as Map<string, string>, now: NOW });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ id: 'c-CUST-1', kind: 'customer', title: 'New customer added', subtitle: 'Ramesh Kumar', ago: '3 hrs ago' });
    expect(rows.find(row => row.kind === 'payment')?.subtitle).toBe('₹1000 from Venkatesh');
  });
});

describe('formatting helpers', () => {
  it.each([
    ['919876543210', '+91 98765 43210'],
    ['9998876655', '+91 99988 76655'],
    [undefined, '—'],
  ])('formats phone %p as %p', (phone, expected) => {
    expect(formatPhone(phone)).toBe(expected);
  });

  it('reads relative times in operator-friendly units', () => {
    expect(relativeTime(new Date(2026, 8, 9, 11, 30), NOW)).toBe('30 mins ago');
    expect(relativeTime(new Date(2026, 8, 9, 13), NOW)).toBe('just now');
  });

  it('snaps revenue axis ticks to 50K / 1L / 1.5L boundaries', () => {
    expect(niceTicks(180_000)).toEqual([0, 50_000, 100_000, 150_000, 200_000]);
  });
});

describe('topAreas', () => {
  it('ranks localities and block codes by customer count', () => {
    expect(topAreas(CUSTOMERS).map(area => [area.name, area.count, area.share])).toEqual([
      ['Block A', 2, 40],
      ['Velachery', 1, 20],
      ['Adyar', 1, 20],
      ['Unassigned', 1, 20],
    ]);
  });

  it.each([
    ['A31sf1', 'Block A'],
    ['12/4 Main Road, Velachery', 'Velachery'],
    ['Adyar', 'Adyar'],
    ['', 'Unassigned'],
    [undefined, 'Unassigned'],
  ])('maps address %p to %p', (address, expected) => {
    expect(areaOf(address)).toBe(expected);
  });
});
