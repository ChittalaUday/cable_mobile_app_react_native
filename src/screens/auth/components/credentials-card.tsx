import { ArrowRight02Icon, LockPasswordIcon, User03Icon, ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { MotiView } from 'moti';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { Button, Checkbox, colors, Pressable, Text, View } from '@/components/ui';
import { translate } from '@/lib/i18n';
import { LoginField } from './login-field';

type CredentialsCardProps = {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  code: string;
  setCode: (val: string) => void;
  mode: 'password' | 'otp';
  setMode: (mode: 'password' | 'otp') => void;
  otpRequested: boolean;
  resendIn: number;
  remember: boolean;
  setRemember: (val: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
  onResendOtp: () => void;
};

export function CredentialsCard(props: CredentialsCardProps) {
  const { email, setEmail, password, setPassword, phone, setPhone, code, setCode, mode, setMode, otpRequested, resendIn, remember, setRemember, loading, onSubmit, onResendOtp } = props;
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <MotiView className="rounded-sm px-5 py-6" from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
      <Text className="text-2xl font-extrabold text-foreground">{translate('login.welcome_back')}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{translate('login.sign_in_prompt')}</Text>

      <View className="mt-6 gap-3">
        {mode === 'password'
          ? (
              <>
                <LoginField icon={User03Icon} placeholder={translate('login.email_placeholder')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" testID="email-input" />
                <LoginField
                  icon={LockPasswordIcon}
                  placeholder={translate('login.password_placeholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="password-input"
                  right={(
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={translate(showPassword ? 'login.hide_password' : 'login.show_password')}
                      hitSlop={12}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <HugeiconsIcon icon={showPassword ? ViewIcon : ViewOffSlashIcon} size={20} color={colors.neutral[500]} strokeWidth={1.8} />
                    </Pressable>
                  )}
                />
              </>
            )
          : (
              <>
                <LoginField icon={User03Icon} placeholder={translate('login.phone_placeholder')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!otpRequested} testID="phone-input" />
                {otpRequested && <LoginField icon={LockPasswordIcon} placeholder={translate('login.otp_placeholder')} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" testID="otp-input" />}
                {otpRequested && (
                  <Pressable accessibilityRole="button" disabled={loading || resendIn > 0} onPress={onResendOtp} className="items-end py-1">
                    <Text className="text-xs font-semibold text-primary-600">
                      {resendIn > 0 ? translate('login.resend_otp_in', { seconds: resendIn }) : translate('login.resend_otp')}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
      </View>

      {mode === 'password' && (
        <View className="mt-4 flex-row items-center justify-between">
          <Checkbox.Root checked={remember} onChange={setRemember} accessibilityLabel={translate('login.remember_me')} testID="remember-me">
            <Checkbox.Icon checked={remember} />
            <Text className="pl-2 text-xs font-medium text-foreground">{translate('login.remember_me')}</Text>
          </Checkbox.Root>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => showMessage({ message: translate('login.password_reset_coming'), type: 'info' })}
          >
            <Text className="text-xs font-bold text-primary-600">{translate('login.forgot_password')}</Text>
          </Pressable>
        </View>
      )}

      <Button testID="login-button" loading={loading} onPress={onSubmit} className="mt-5 h-12 rounded-2xl bg-primary-600">
        <View className="flex-row items-center gap-2.5">
          <Text className="text-base font-bold text-white">{translate(mode === 'password' ? 'login.sign_in' : otpRequested ? 'login.verify_otp' : 'login.send_otp')}</Text>
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} color="#fff" strokeWidth={2.2} />
        </View>
      </Button>

      {mode === 'password' && (
        <View className="my-5 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-neutral-200" />
          <Text className="text-xs font-semibold text-neutral-400">{translate('login.or')}</Text>
          <View className="h-px flex-1 bg-neutral-200" />
        </View>
      )}

      <Button
        testID={mode === 'password' ? 'phone-otp-option' : 'password-option'}
        variant="outline"
        disabled={loading}
        onPress={() => setMode(mode === 'password' ? 'otp' : 'password')}
        className={mode === 'otp' ? 'mt-5 h-12 rounded-2xl border-neutral-200' : 'h-12 rounded-2xl border-neutral-200'}
      >
        <Text className="text-sm font-bold text-foreground">{translate(mode === 'password' ? 'login.use_otp' : 'login.use_password')}</Text>
      </Button>

    </MotiView>
  );
}
