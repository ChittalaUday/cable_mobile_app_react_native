import * as React from 'react';

import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { AdminHomeScreen } from '@/screens/admin/admin-home-screen';
import { StaffDashboardScreen } from '@/screens/staff/staff-dashboard-screen';
import { SubscriberDashboardScreen } from '@/screens/subscriber/subscriber-dashboard-screen';

export function DashboardScreen() {
  const role = useAuthStore.use.role() ?? 'subscriber';

  if (role === 'admin')
    return <AdminHomeScreen />;

  if (role === 'staff')
    return <StaffDashboardScreen />;

  return <SubscriberDashboardScreen />;
}
