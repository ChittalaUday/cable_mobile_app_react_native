import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { translate } from '@/lib/i18n';
import { authErrorMessage } from '@/lib/utils/auth-error';

export type LoginCredentials = {
  email: string;
  password: string;
  phone: string;
  code: string;
  mode: 'password' | 'otp';
  otpRequested: boolean;
  onOtpRequested: () => void;
};

export function useLoginActions({ email, password, phone, code, mode, otpRequested, onOtpRequested }: LoginCredentials) {
  const signIn = useAuthStore.use.signIn();
  const requestOtp = useAuthStore.use.requestOtp();
  const verifyOtp = useAuthStore.use.verifyOtp();
  const [loading, setLoading] = React.useState(false);

  async function sendOtp() {
    if (phone.length !== 10) {
      showMessage({ message: translate('login.enter_phone'), type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const expiresInSeconds = await requestOtp(phone);
      onOtpRequested();
      showMessage({ message: translate('login.otp_sent', { seconds: expiresInSeconds }), type: 'success' });
    }
    catch (error) {
      showMessage({ message: translate('login.otp_failed'), description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (mode === 'otp') {
      if (!otpRequested)
        return sendOtp();
      if (otpRequested && !code)
        return showMessage({ message: translate('login.enter_otp'), type: 'danger' });

      setLoading(true);
      try {
        await verifyOtp(phone, code);
      }
      catch (error) {
        setLoading(false);
        showMessage({ message: translate('login.otp_failed'), description: authErrorMessage(error), type: 'danger' });
      }
      return;
    }

    if (!email.trim() || !password)
      return showMessage({ message: translate('login.enter_both'), type: 'danger' });
    setLoading(true);
    try {
      await signIn(email, password);
    }
    catch (error) {
      setLoading(false);
      showMessage({ message: translate('login.auth_failed'), description: authErrorMessage(error), type: 'danger' });
    }
  }

  return { loading, resendOtp: sendOtp, submit };
}
