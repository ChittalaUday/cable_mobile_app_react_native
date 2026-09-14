import { Redirect, Stack } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { LoadError } from '@/components/common/shell';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { SelectTenantScreen } from '@/screens/tenant/tenant-picker';

export default function AppLayout() {
  const status = useAuthStore.use.status();
  const error = useAuthStore.use.error();
  const hydrate = useAuthStore.use.hydrate();
  const tenantId = useAuthStore.use.tenantId();

  if (status === 'idle') {
    /*
     * Still `idle` with an error means restoring the session failed for a
     * reason that is not the session's fault — a timeout, a 5xx, no signal.
     * The token is deliberately still on the device, so this offers another go
     * instead of dropping the operator back at a login form.
     */
    return error ? <LoadError message={error} onRetry={hydrate} /> : null;
  }

  if (status === 'signOut')
    return <Redirect href="/login" />;

  /*
   * NO TENANT, whatever the reason — several to choose between, or none at all.
   * Every screen below this point is tenant-scoped and every request it makes
   * needs `X-Tenant-Id`, so none of them may render until there is one.
   *
   * The condition is `tenantId === null` rather than a membership count on
   * purpose: a caller with no membership used to fall straight through to the
   * dashboard, where a null role reads as `customer` and quietly drops an admin
   * into the subscriber app. Anything that leaves us without a tenant lands
   * here, where it is visible.
   *
   * It COVERS the stack rather than replacing it. `(auth)` redirects INTO this
   * group on sign-in, and a group whose layout renders something that is not a
   * navigator has no screen for that redirect to land on — a blank page, not a
   * picker. Keeping the navigator mounted is what makes the redirect resolve.
   */
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {tenantId === null
        ? (
            <View style={StyleSheet.absoluteFill}>
              <SelectTenantScreen />
            </View>
          )
        : null}
    </>
  );
}
