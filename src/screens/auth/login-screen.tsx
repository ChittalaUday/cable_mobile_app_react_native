import * as React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { FocusAwareStatusBar, View } from '@/components/ui';
import { useLoginActions } from '@/lib/hooks/use-login-actions';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { CredentialsCard } from './components/credentials-card';
import { LoginFooter } from './components/login-footer';
import { LoginHero } from './components/login-hero';

const REMEMBERED_EMAIL = 'login.remembered-email';

export function LoginScreen() {
  const remembered = React.useRef(getItem<string>(REMEMBERED_EMAIL)).current;
  const [email, setEmail] = React.useState(remembered ?? '');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [remember, setRemember] = React.useState(remembered !== null);

  React.useEffect(() => {
    if (remember)
      setItem(REMEMBERED_EMAIL, email);
    else
      removeItem(REMEMBERED_EMAIL);
  }, [remember, email]);

  const { loading, submit, guest, google } = useLoginActions({
    email,
    password,
    confirmPassword,
    isSignUp,
  });

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
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          isSignUp={isSignUp}
          setIsSignUp={setIsSignUp}
          remember={remember}
          setRemember={setRemember}
          loading={loading}
          onSubmit={submit}
          onGuest={guest}
          onGoogle={google}
        />
        <LoginFooter />
      </KeyboardAwareScrollView>
    </View>
  );
}
