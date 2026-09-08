import { Redirect } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { Button, FocusAwareStatusBar, Input, ScrollView, Text, View } from '@/components/ui';
import { authErrorMessage } from './auth-error';
import { useAuthStore } from './use-auth-store';

export function LoginScreen() {
  const status = useAuthStore.use.status();
  const signIn = useAuthStore.use.signIn();
  const signUp = useAuthStore.use.signUp();
  const continueAsGuest = useAuthStore.use.continueAsGuest();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  if (status === 'signIn')
    return <Redirect href="/" />;

  async function submit() {
    if (!email.trim() || !password)
      return showMessage({ message: 'Enter both email and password.', type: 'danger' });
    if (isSignUp && password !== confirmPassword)
      return showMessage({ message: 'Passwords do not match.', type: 'danger' });
    setLoading(true);
    try {
      await (isSignUp ? signUp(email, password) : signIn(email, password));
    }
    catch (error) {
      showMessage({ message: 'Authentication failed', description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setLoading(false);
    }
  }

  async function guest() {
    setLoading(true);
    try {
      await continueAsGuest();
    }
    catch (error) {
      showMessage({ message: 'Guest sign-in failed', description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerClassName="flex-grow justify-center bg-background px-5 py-10" keyboardShouldPersistTaps="handled">
      <FocusAwareStatusBar />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
        <View className="mx-auto w-full max-w-md gap-2 rounded-3xl border border-border bg-card p-5">
          <View className="mb-4 gap-2">
            <Text className="text-sm font-semibold tracking-widest text-primary-500 uppercase">Satya Cable & Broadband</Text>
            <Text selectable className="text-4xl font-bold text-foreground">{isSignUp ? 'Create account' : 'Welcome back'}</Text>
            <Text className="text-muted-foreground">{isSignUp ? 'Set up your subscriber account.' : 'Sign in to manage your connection and billing.'}</Text>
          </View>
          <Input testID="email-input" label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input testID="password-input" label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {isSignUp && <Input testID="confirm-password-input" label="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />}
          <Button testID="login-button" label={isSignUp ? 'Create account' : 'Sign in'} loading={loading} onPress={submit} />
          <Button label="Continue as guest" variant="outline" disabled={loading} onPress={guest} />
          <Button label={isSignUp ? 'Already have an account? Sign in' : 'New here? Create account'} variant="ghost" disabled={loading} onPress={() => setIsSignUp(value => !value)} />
        </View>
      </MotiView>
    </ScrollView>
  );
}
