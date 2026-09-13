import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

export default function AuthLayout() {
  const status = useAuthStore.use.status();

  if (status === 'signIn')
    return <Redirect href="/(app)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
