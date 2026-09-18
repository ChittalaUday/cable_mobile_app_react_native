import * as React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { CredentialsCard } from '@/components/auth/credentials-card';
import { LoginFooter } from '@/components/auth/login-footer';
import { LoginHero } from '@/components/auth/login-hero';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { useLoginActions } from '@/lib/hooks/common/use-login-actions';
import { getItem, removeItem, setItem } from '@/lib/storage';

const REMEMBERED_EMAIL = 'login.remembered-email';

export function LoginScreen() {
  const remembered = React.useRef(getItem<string>(REMEMBERED_EMAIL)).current;
  const [email, setEmail] = React.useState(remembered ?? '');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [mode, setMode] = React.useState<'password' | 'otp'>('password');
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);
  const [remember, setRemember] = React.useState(remembered !== null);

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

  const onOtpRequested = (nextCooldownSeconds: number) => {
    setOtpRequested(true);
    setResendIn(nextCooldownSeconds);
  };

  const { loading, resendOtp, submit } = useLoginActions({ email, password, phone, code, mode, otpRequested, onOtpRequested });

  const changeMode = (nextMode: 'password' | 'otp') => {
    setMode(nextMode);
    setOtpRequested(false);
    setResendIn(0);
    setCode('');
  };

  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <LoginHero />
        <CredentialsCard
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
          otpRequested={otpRequested}
          resendIn={resendIn}
          remember={remember}
          setRemember={setRemember}
          loading={loading}
          onSubmit={submit}
          onResendOtp={resendOtp}
        />
        <LoginFooter />
      </KeyboardAwareScrollView>
    </View>
  );
}

export default LoginScreen;
