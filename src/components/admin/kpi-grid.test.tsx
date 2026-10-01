import type { AdminDashboard } from '@/lib/utils/admin-stats';
import { act, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import i18n from '@/lib/i18n';
import { KpiGrid } from './kpi-grid';

jest.mock('@/components/common/permission-guard', () => ({ PermissionGuard: ({ children }: { children: React.ReactNode }) => children }));

const data = {
  totalCustomers: 20,
  totalCustomersDelta: 5,
  totalCustomersSeries: [10, 20],
  activeConnections: 18,
  activeDelta: 4,
  activeSeries: [15, 18],
  inactiveConnections: 2,
  inactiveDelta: null,
  inactiveSeries: [],
  revenueThisMonth: 1250,
  revenueDelta: 2,
  revenueSeries: [1000, 1250],
  revenue: { daily: [{ key: 'today', label: 'Today', value: 300 }], weekly: [], monthly: [] },
  collectedToday: 300,
  receiptsToday: 2,
  outstandingDues: 500,
  dueAccounts: 3,
} as unknown as AdminDashboard;

describe('kpiGrid', () => {
  it('keeps the home KPIs focused on today and outstanding work', async () => {
    await i18n.changeLanguage('en');
    const view = render(<KpiGrid data={data} />);
    expect(screen.getByText('Collected Today')).toBeTruthy();
    expect(screen.getByText('Outstanding Dues')).toBeTruthy();
    expect(screen.queryByText('Collections (This Month)')).toBeNull();
    expect(screen.queryByText('Inactive Connections')).toBeNull();

    await act(() => i18n.changeLanguage('te'));
    view.rerender(<KpiGrid data={data} />);
    expect(screen.getByText('ఈ రోజు వసూలైంది')).toBeTruthy();
    expect(screen.getByText('మొత్తం బకాయిలు')).toBeTruthy();
  });
});
