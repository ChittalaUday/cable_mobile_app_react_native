import { Redirect } from 'expo-router';
import * as React from 'react';

import { LoadError } from '@/components/common/shell';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export default function RootIndex() {
  const status = useAuthStore.use.status();
  const error = useAuthStore.use.error();
  const hydrate = useAuthStore.use.hydrate();
  const tenantId = useAuthStore.use.tenantId();
  const role = useAuthStore.use.role();

  if (status === 'idle') {
    return error ? <LoadError message={error} onRetry={hydrate} /> : null;
  }

  if (status === 'signOut') {
    return <Redirect href="/(auth)/login" />;
  }

  // Before accessing admin, staff, or customer routes, user must select a tenant
  if (!tenantId || !role) {
    return <Redirect href="/select-tenant" />;
  }

  if (role === 'admin' || role === 'super_admin') {
    return <Redirect href="/admin" />;
  }

  if (role === 'staff') {
    return <Redirect href="/staff" />;
  }

  if (role === 'customer') {
    return <Redirect href="/customer" />;
  }

  return <Redirect href="/select-tenant" />;
}
