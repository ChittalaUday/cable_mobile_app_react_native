import type { StaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import i18n from '@/lib/i18n';
import { StaffCollectionsCard } from './staff-collections-card';

const dashboard: StaffDashboard = {
  personal: { today: 500, week: 700, month: 900, todayReceipts: 1, weekReceipts: 2, monthReceipts: 3 },
  team: { today: 800, week: 1200, month: 2000, todayReceipts: 2, weekReceipts: 4, monthReceipts: 6 },
  workload: { customers: 20, dueCustomers: 5, outstanding: 2500, activeConnections: 18, inactiveConnections: 2 },
  recentCollections: [{ id: 'p1', customerId: 'c1', customerName: 'Ramu', accountNumber: 'ACC-1', amount: 500, collectedAt: '2026-09-14T06:00:00.000Z', ago: '30 mins ago' }],
};

describe('staffCollectionsCard', () => {
  it('switches between personal and team collection status', async () => {
    await i18n.changeLanguage('en');
    render(<StaffCollectionsCard dashboard={dashboard} />);

    expect(screen.getAllByText('₹500.00')).toHaveLength(2);
    fireEvent.press(screen.getByText('Team'));
    expect(screen.getByText('₹800.00')).toBeTruthy();
  });

  it('renders Telugu staff status labels', async () => {
    await i18n.changeLanguage('te');
    render(<StaffCollectionsCard dashboard={dashboard} />);
    expect(screen.getByText('నా స్థితి')).toBeTruthy();
  });
});
