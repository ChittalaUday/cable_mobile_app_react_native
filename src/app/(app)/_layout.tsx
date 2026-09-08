import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/features/auth/use-auth-store';

export default function AppLayout() {
  const status = useAuthStore.use.status();

  if (status === 'idle')
    return null;
  if (status === 'signOut')
    return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
