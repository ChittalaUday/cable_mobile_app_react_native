import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export default function AuthLayout() {
  const status = useAuthStore.use.status();

  // Back to the index, which is the one place that decides where a signed-in
  // person belongs: tenant picker if they have not chosen one, otherwise the
  // dashboard for their role. Naming a destination here would duplicate that
  // and, as `/(app)` did, can name a group this app does not have — which
  // renders the catch-all "screen doesn't exist" for a frame before the index
  // takes over.
  if (status === 'signIn')
    return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
