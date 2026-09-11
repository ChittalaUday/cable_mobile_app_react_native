import * as React from 'react';

import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { AdminHomeScreen } from '@/screens/admin/admin-home-screen';
import { CustomerDashboardScreen } from '@/screens/customer/customer-dashboard-screen';
import { StaffDashboardScreen } from '@/screens/staff/staff-dashboard-screen';

export function DashboardScreen() {
  const role = useAuthStore.use.role() ?? 'customer';

  if (role === 'admin')
    return <AdminHomeScreen />;

  if (role === 'staff')
    return <StaffDashboardScreen />;

  return <CustomerDashboardScreen />;
}
