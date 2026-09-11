import { isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { translate } from '@/lib/i18n';
import { authErrorMessage } from '@/lib/utils/auth-error';

export type LoginCredentials = {
  email: string;
  password: string;
  confirmPassword: string;
  isSignUp: boolean;
};

export function useLoginActions({ email, password, confirmPassword, isSignUp }: LoginCredentials) {
  const signIn = useAuthStore.use.signIn();
  const signUp = useAuthStore.use.signUp();
  const continueAsGuest = useAuthStore.use.continueAsGuest();
  const signInWithGoogle = useAuthStore.use.signInWithGoogle();
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (!email.trim() || !password)
      return showMessage({ message: translate('login.enter_both'), type: 'danger' });
    if (isSignUp && password !== confirmPassword)
      return showMessage({ message: translate('login.passwords_no_match'), type: 'danger' });
    setLoading(true);
    try {
      await (isSignUp ? signUp(email, password) : signIn(email, password));
    }
    catch (error) {
      setLoading(false);
      showMessage({ message: translate('login.auth_failed'), description: authErrorMessage(error), type: 'danger' });
    }
  }

  async function guest() {
    setLoading(true);
    try {
      await continueAsGuest();
    }
    catch (error) {
      setLoading(false);
      showMessage({ message: translate('login.guest_failed'), description: authErrorMessage(error), type: 'danger' });
    }
  }

  async function google() {
    setLoading(true);
    try {
      await signInWithGoogle();
    }
    catch (error) {
      setLoading(false);
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED)
        return;
      showMessage({ message: translate('login.auth_failed'), description: authErrorMessage(error), type: 'danger' });
    }
  }

  return { loading, submit, guest, google };
}
