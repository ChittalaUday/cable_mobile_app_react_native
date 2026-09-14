import { Redirect } from 'expo-router';
import * as React from 'react';

import { SelectTenantScreen } from '@/components/tenant/tenant-picker';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export default function SelectTenantRoute() {
  const status = useAuthStore.use.status();

  if (status === 'signOut') {
    return <Redirect href="/(auth)/login" />;
  }

  return <SelectTenantScreen />;
}
