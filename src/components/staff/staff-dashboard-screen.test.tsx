import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { StaffDashboardScreen } from '@/app/staff/(tabs)';

const mockDashboard = jest.fn<{
  data: undefined;
  error: null;
  isPending: boolean;
  isRefetching: boolean;
  refetch: jest.Mock;
}, []>();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/ui/focus-aware-status-bar', () => ({ FocusAwareStatusBar: () => null }));
jest.mock('@/components/notifications/notification-bell', () => ({ NotificationBell: () => null }));
jest.mock('@/components/tenant/tenant-picker', () => ({ TenantSwitcher: () => null }));
jest.mock('@/components/common/global-search-modal', () => ({ GlobalSearchModal: () => null }));
jest.mock('@/components/common/quick-actions-fab', () => ({ QuickActionsFab: () => null }));
jest.mock('@/lib/hooks/api/use-staff-dashboard', () => ({
  useStaffDashboard: () => mockDashboard(),
}));
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: {
    use: {
      user: () => ({ displayName: 'Suresh Babu', email: 'suresh.staff@sscn.com' }),
    },
  },
}));

describe('staffDashboardScreen', () => {
  it('shows a real loading state instead of zero-valued KPIs', () => {
    mockDashboard.mockReturnValue({ data: undefined, isPending: true, isRefetching: false, error: null, refetch: jest.fn() });

    render(<StaffDashboardScreen />);

    expect(screen.getByText('Loading live figures…')).toBeTruthy();
    expect(screen.queryByText('₹0.00')).toBeNull();
  });
});
