import type { OtpChannel } from '@/lib/api/types';
import type { LoginMode } from '@/lib/auth/login-methods';
import type { TxKeyPath } from '@/lib/i18n';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { googleIdToken } from '@/lib/auth/google';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { translate } from '@/lib/i18n';
import { authErrorMessage } from '@/lib/utils/auth-error';

/** Where a code went, so the countdown and the message can say so. */
export type CodeSent = {
  nextCooldownSeconds: number;
  channel: string;
  /** Set when it went to the account's email — the address it was sent to. */
  emailedTo?: string;
  /** Proof of the password check, needed to verify or resend the emailed code. */
  challengeToken?: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
  phone: string;
  code: string;
  mode: LoginMode;
  channel: OtpChannel;
  /** A phone code is out and we are waiting on it. */
  otpRequested: boolean;
  /** Proof the password was accepted, once the server has asked for a code. */
  challengeToken: string | null;
  onCodeSent: (sent: CodeSent) => void;
};

const CHANNEL_LABELS: Record<string, TxKeyPath> = {
  whatsapp: 'login.channel_whatsapp',
  sms: 'login.channel_sms',
};

export function useLoginActions(credentials: LoginCredentials) {
  const { email, password, phone, code, mode, channel, otpRequested, challengeToken, onCodeSent } = credentials;

  const signIn = useAuthStore.use.signIn();
  const requestOtp = useAuthStore.use.requestOtp();
  const verifyOtp = useAuthStore.use.verifyOtp();
  const resendEmailCode = useAuthStore.use.resendEmailCode();
  const verifyEmailCode = useAuthStore.use.verifyEmailCode();
  const signInWithGoogle = useAuthStore.use.signInWithGoogle();
  const [loading, setLoading] = React.useState(false);

  /** One place to announce a code, whichever channel carried it. */
  function announce(sent: { channel: string; expiresInSeconds: number }) {
    const label = CHANNEL_LABELS[sent.channel];

    showMessage({
      message: label === undefined
        ? translate('login.otp_sent', { seconds: sent.expiresInSeconds })
        : translate('login.otp_sent_via', { channel: translate(label), seconds: sent.expiresInSeconds }),
      type: 'success',
    });
  }

  async function sendPhoneOtp() {
    if (phone.length !== 10) {
      showMessage({ message: translate('login.enter_phone'), type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      const sent = await requestOtp(phone, channel);
      onCodeSent({ nextCooldownSeconds: sent.nextCooldownSeconds, channel: sent.channel });
      announce(sent);
    }
    catch (error) {
      showMessage({ message: translate('login.otp_failed'), description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setLoading(true);
    try {
      const idToken = await googleIdToken();

      // Backing out of the Google sheet is a decision, not a failure — telling
      // them it went wrong would be telling them off for changing their mind.
      if (idToken === null)
        return;

      await signInWithGoogle(idToken);
    }
    catch (error) {
      showMessage({ message: translate('login.auth_failed'), description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    // Mid-way through an emailed code there is no phone to send to: the
    // challenge names the account, and the server mails the same address.
    if (challengeToken === null)
      return sendPhoneOtp();

    setLoading(true);
    try {
      const sent = await resendEmailCode(challengeToken);
      onCodeSent({ nextCooldownSeconds: sent.nextCooldownSeconds, channel: sent.channel, emailedTo: email.trim() });
      announce(sent);
    }
    catch (error) {
      showMessage({ message: translate('login.otp_failed'), description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setLoading(false);
    }
  }

  async function submitCode(verify: () => Promise<void>) {
    if (!code) {
      showMessage({ message: translate('login.enter_otp'), type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      await verify();
    }
    catch (error) {
      setLoading(false);
      showMessage({ message: translate('login.otp_failed'), description: authErrorMessage(error), type: 'danger' });
    }
  }

  async function submit() {
    // The emailed code, once the password has already been accepted.
    if (challengeToken !== null)
      return submitCode(async () => verifyEmailCode(challengeToken, code));

    if (mode === 'otp') {
      return otpRequested
        ? submitCode(async () => verifyOtp(phone, code))
        : sendPhoneOtp();
    }

    if (!email.trim() || !password)
      return showMessage({ message: translate('login.enter_both'), type: 'danger' });

    setLoading(true);
    try {
      const challenge = await signIn(email, password);

      // A password is not always the whole sign-in: the server may want a code
      // emailed to the account before it hands over any tokens.
      if (challenge !== null) {
        onCodeSent({
          nextCooldownSeconds: challenge.nextCooldownSeconds,
          channel: challenge.channel,
          emailedTo: email.trim(),
          challengeToken: challenge.challengeToken,
        });
        announce(challenge);
        setLoading(false);
      }
    }
    catch (error) {
      setLoading(false);
      showMessage({ message: translate('login.auth_failed'), description: authErrorMessage(error), type: 'danger' });
    }
  }

  return { continueWithGoogle, loading, resendOtp, submit };
}
