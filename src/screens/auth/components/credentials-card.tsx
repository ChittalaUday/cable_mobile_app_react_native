import { ArrowRight02Icon, LockPasswordIcon, User03Icon, ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { MotiView } from 'moti';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { Button, Checkbox, colors, Image, Pressable, Text, View } from '@/components/ui';
import { IMAGES } from '@/constants';
import { translate } from '@/lib/i18n';
import { LoginField } from './login-field';

type CredentialsCardProps = {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  remember: boolean;
  setRemember: (val: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
  onGuest: () => void;
  onGoogle: () => void;
};

export function CredentialsCard(props: CredentialsCardProps) {
  const { email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, isSignUp, setIsSignUp, remember, setRemember, loading, onSubmit, onGuest, onGoogle } = props;
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <MotiView className="rounded-sm px-5 py-6" from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
      <Text className="text-2xl font-extrabold text-foreground">{translate(isSignUp ? 'login.create_account' : 'login.welcome_back')}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{translate(isSignUp ? 'login.set_up_account' : 'login.sign_in_prompt')}</Text>

      <View className="mt-6 gap-3">
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
        {isSignUp && (
          <LoginField icon={LockPasswordIcon} placeholder={translate('login.confirm_password_placeholder')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry testID="confirm-password-input" />
        )}
      </View>

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

      <Button testID="login-button" loading={loading} onPress={onSubmit} className="mt-5 h-12 rounded-2xl bg-primary-600">
        <View className="flex-row items-center gap-2.5">
          <Text className="text-base font-bold text-white">{translate(isSignUp ? 'login.create_account' : 'login.sign_in')}</Text>
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} color="#fff" strokeWidth={2.2} />
        </View>
      </Button>

      <View className="my-5 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-neutral-200" />
        <Text className="text-xs font-semibold text-neutral-400">{translate('login.or')}</Text>
        <View className="h-px flex-1 bg-neutral-200" />
      </View>

      <Button testID="google-signin-button" variant="outline" disabled={loading} onPress={onGoogle} className="h-12 rounded-2xl border-neutral-200">
        <View className="flex-row items-center gap-2.5">
          <Image source={IMAGES.googleLogo} className="size-5" contentFit="contain" />
          <Text className="text-sm font-bold text-foreground">{translate('login.continue_with_google')}</Text>
        </View>
      </Button>

      <View className="mt-5 flex-row items-center justify-center gap-4">
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setIsSignUp(!isSignUp)}>
          <Text className="text-xs font-semibold text-muted-foreground">{translate(isSignUp ? 'login.already_have_account' : 'login.new_here')}</Text>
        </Pressable>
        <View className="h-3 w-px bg-neutral-200" />
        <Pressable testID="guest-login-button" accessibilityRole="button" hitSlop={8} disabled={loading} onPress={onGuest}>
          <Text className="text-xs font-semibold text-muted-foreground">{translate('login.continue_as_guest')}</Text>
        </Pressable>
      </View>
    </MotiView>
  );
}
