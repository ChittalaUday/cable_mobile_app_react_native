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
  outstandingDues: 500,
} as unknown as AdminDashboard;

describe('kpiGrid', () => {
  it('renders the live collections label in both languages', async () => {
    await i18n.changeLanguage('en');
    const view = render(<KpiGrid data={data} />);
    expect(screen.getByText('Collections (This Month)')).toBeTruthy();

    await act(() => i18n.changeLanguage('te'));
    view.rerender(<KpiGrid data={data} />);
    expect(screen.getByText('వసూళ్లు (ఈ నెల)')).toBeTruthy();
  });
});
