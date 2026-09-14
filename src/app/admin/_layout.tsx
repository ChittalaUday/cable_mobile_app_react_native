import { Redirect, Stack } from 'expo-router';
import * as React from 'react';

import { LoadError } from '@/components/common/shell';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export default function AdminLayout() {
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

  if (!tenantId) {
    return <Redirect href="/select-tenant" />;
  }

  if (role !== 'admin' && role !== 'super_admin') {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
