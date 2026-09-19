import type { OtpChannel } from '@/lib/api/types';
import type { LoginMode } from '@/lib/auth/login-methods';
import type { CodeSent } from '@/lib/hooks/common/use-login-actions';

import * as React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { CredentialsCard } from '@/components/auth/credentials-card';
import { LoginFooter } from '@/components/auth/login-footer';
import { LoginHero } from '@/components/auth/login-hero';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { offersMode, openingMode } from '@/lib/auth/login-methods';
import { OFFLINE_LOGIN_CONFIG, useLoginConfig } from '@/lib/hooks/api/use-login-config';
import { useLoginActions } from '@/lib/hooks/common/use-login-actions';
import { getItem, removeItem, setItem } from '@/lib/storage';

const REMEMBERED_EMAIL = 'login.remembered-email';

export function LoginScreen() {
  const remembered = React.useRef(getItem<string>(REMEMBERED_EMAIL)).current;
  const [email, setEmail] = React.useState(remembered ?? '');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  // Null until the person picks one — the server decides the opening method.
  const [chosenMode, setChosenMode] = React.useState<LoginMode | null>(null);
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);
  const [remember, setRemember] = React.useState(remembered !== null);
  const [challengeToken, setChallengeToken] = React.useState<string | null>(null);
  const [emailedTo, setEmailedTo] = React.useState<string | null>(null);
  const [channel, setChannel] = React.useState<OtpChannel | null>(null);

  /*
   * What this deployment allows, read from the server rather than assumed. Until
   * it answers — or if it cannot — the app offers the two methods that have
   * always worked, so nobody is left on a screen with no way in.
   */
  const { data: config = OFFLINE_LOGIN_CONFIG } = useLoginConfig();

  const chosenChannel = channel ?? config.defaultPhoneOtpChannel ?? 'whatsapp';

  /*
   * Derived, not stored: config arrives a render late, so a stored opening mode
   * would have to be corrected afterwards — and a password-less deployment
   * would flash a password form first. The person's own choice wins while the
   * server still offers it.
   */
  const mode: LoginMode = chosenMode !== null && offersMode(config, chosenMode)
    ? chosenMode
    : openingMode(config) ?? 'password';

  React.useEffect(() => {
    if (remember)
      setItem(REMEMBERED_EMAIL, email);
    else
      removeItem(REMEMBERED_EMAIL);
  }, [remember, email]);

  React.useEffect(() => {
    if (resendIn === 0)
      return;
    const timeout = setTimeout(() => setResendIn(value => value - 1), 1000);
    return () => clearTimeout(timeout);
  }, [resendIn]);

  const onCodeSent = ({ nextCooldownSeconds, emailedTo: sentToEmail, challengeToken: token }: CodeSent) => {
    setResendIn(nextCooldownSeconds);

    if (sentToEmail === undefined) {
      setOtpRequested(true);
      return;
    }

    setEmailedTo(sentToEmail);

    // A resend answers with a fresh cooldown but no new token, so the one from
    // the sign-in has to survive it.
    if (token !== undefined)
      setChallengeToken(token);
  };

  const { continueWithGoogle, loading, resendOtp, submit } = useLoginActions({
    email,
    password,
    phone,
    code,
    mode,
    channel: chosenChannel,
    otpRequested,
    challengeToken,
    onCodeSent,
  });

  /** Back to a blank form: nothing half-entered survives a change of method. */
  const reset = () => {
    setOtpRequested(false);
    setChallengeToken(null);
    setEmailedTo(null);
    setResendIn(0);
    setCode('');
  };

  const changeMode = (nextMode: LoginMode) => {
    setChosenMode(nextMode);
    reset();
  };

  const startOver = () => {
    reset();
    setPassword('');
  };

  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        // Without this the focused field is scrolled to exactly the keyboard's
        // top edge, which reads as touching it. A field also has a label or a
        // resend link under it that has to stay visible.
        bottomOffset={24}
      >
        <LoginHero />
        <CredentialsCard
          config={config}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          phone={phone}
          setPhone={text => setPhone(text.replace(/\D/g, '').slice(0, 10))}
          code={code}
          setCode={text => setCode(text.replace(/\D/g, '').slice(0, 8))}
          mode={mode}
          setMode={changeMode}
          channel={chosenChannel}
          setChannel={setChannel}
          awaitingCode={otpRequested}
          emailedTo={emailedTo}
          resendIn={resendIn}
          remember={remember}
          setRemember={setRemember}
          loading={loading}
          onSubmit={submit}
          onResendOtp={resendOtp}
          onContinueWithGoogle={continueWithGoogle}
          onStartOver={startOver}
        />
        <LoginFooter />
      </KeyboardAwareScrollView>
    </View>
  );
}

export default LoginScreen;
