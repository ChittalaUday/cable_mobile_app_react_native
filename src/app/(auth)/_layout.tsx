import { Redirect, Stack } from 'expo-router';
import * as React from 'react';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

export default function AuthLayout() {
  const status = useAuthStore.use.status();
  const needsProfileCompletion = useAuthStore.use.needsProfileCompletion();

  if (status === 'signIn') {
    if (needsProfileCompletion) {
      return (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="complete-profile" />
        </Stack>
      );
    }
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="complete-profile" />
    </Stack>
  );
}
