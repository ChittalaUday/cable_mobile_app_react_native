import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/lib/hooks/use-auth-store';

export default function AppLayout() {
  const status = useAuthStore.use.status();
  const needsProfileCompletion = useAuthStore.use.needsProfileCompletion();

  if (status === 'idle')
    return null;
  if (status === 'signOut')
    return <Redirect href="/login" />;
  if (needsProfileCompletion)
    return <Redirect href="/complete-profile" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
