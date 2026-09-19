import type { LoginConfig, OtpChannel } from '@/lib/api/types';
import type { LoginMode } from '@/lib/auth/login-methods';
import type { TxKeyPath } from '@/lib/i18n';
import { ArrowRight02Icon, LockPasswordIcon, User03Icon, ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { MotiView } from 'moti';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { Button, Checkbox, colors, Pressable, Text, View } from '@/components/ui';
import { offersMode, openingMode } from '@/lib/auth/login-methods';
import { translate } from '@/lib/i18n';
import { LoginField } from './login-field';

type CredentialsCardProps = {
  config: LoginConfig;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  code: string;
  setCode: (val: string) => void;
  mode: LoginMode;
  setMode: (mode: LoginMode) => void;
  channel: OtpChannel;
  setChannel: (channel: OtpChannel) => void;
  /** A code is out and the form is waiting for it, in either mode. */
  awaitingCode: boolean;
  /** Set when the code went to the account's email rather than a phone. */
  emailedTo: string | null;
  resendIn: number;
  remember: boolean;
  setRemember: (val: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
  onResendOtp: () => void;
  onStartOver: () => void;
  onContinueWithGoogle: () => void;
};

const CHANNEL_LABELS: Record<OtpChannel, TxKeyPath> = {
  whatsapp: 'login.channel_whatsapp',
  sms: 'login.channel_sms',
};

/** Only worth showing when there is actually a choice to make. */
function ChannelPicker({ channels, value, onChange, disabled }: {
  channels: OtpChannel[];
  value: OtpChannel;
  onChange: (channel: OtpChannel) => void;
  disabled: boolean;
}) {
  if (channels.length < 2)
    return null;

  return (
    <View>
      <Text className="mb-2 text-xs font-medium text-muted-foreground">{translate('login.send_code_via')}</Text>
      <View className="flex-row gap-2">
        {channels.map(channel => (
          <Pressable
            key={channel}
            accessibilityRole="radio"
            accessibilityState={{ selected: channel === value }}
            disabled={disabled}
            onPress={() => onChange(channel)}
            testID={`channel-${channel}`}
            className={channel === value
              ? 'flex-1 items-center rounded-2xl border border-primary-600 bg-primary-50 py-2.5 dark:bg-neutral-800'
              : 'flex-1 items-center rounded-2xl border border-neutral-200 py-2.5'}
          >
            <Text className={channel === value ? 'text-sm font-bold text-primary-600' : 'text-sm font-medium text-foreground'}>
              {translate(CHANNEL_LABELS[channel])}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** The code entry, identical whether the code came by WhatsApp, SMS or email. */
function CodeStep({ code, setCode, resendIn, loading, onResendOtp }: {
  code: string;
  setCode: (val: string) => void;
  resendIn: number;
  loading: boolean;
  onResendOtp: () => void;
}) {
  return (
    <>
      <LoginField
        icon={LockPasswordIcon}
        placeholder={translate('login.otp_placeholder')}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        testID="otp-input"
      />
      <Pressable accessibilityRole="button" disabled={loading || resendIn > 0} onPress={onResendOtp} className="items-end py-1">
        <Text className="text-xs font-semibold text-primary-600">
          {resendIn > 0 ? translate('login.resend_otp_in', { seconds: resendIn }) : translate('login.resend_otp')}
        </Text>
      </Pressable>
    </>
  );
}

export function CredentialsCard(props: CredentialsCardProps) {
  const { config, email, setEmail, password, setPassword, phone, setPhone, code, setCode, mode, setMode, channel, setChannel, awaitingCode, emailedTo, resendIn, remember, setRemember, loading, onSubmit, onResendOtp, onStartOver, onContinueWithGoogle } = props;
  const [showPassword, setShowPassword] = React.useState(false);

  /** Waiting on an emailed code blocks the form, so it gates every branch below. */
  const waiting = emailedTo !== null;

  const submitLabel = waiting || (mode === 'otp' && awaitingCode)
    ? 'login.verify_code'
    : mode === 'password' ? 'login.sign_in' : 'login.send_otp';

  /**
   * The other ways in that this deployment actually offers.
   *
   * Derived rather than hand-wired per pair, so a method switched off server
   * side can never hide the only way back out of the one on screen.
   */
  const alternatives = ([
    { mode: 'password', label: 'login.use_password', testID: 'password-option' },
    { mode: 'otp', label: 'login.use_otp', testID: 'phone-otp-option' },
  ] as const).filter(item => item.mode !== mode && offersMode(config, item.mode));

  /** One branch per step, flat: the chain reads as the screen's state machine. */
  function fields() {
    if (waiting)
      return <CodeStep code={code} setCode={setCode} resendIn={resendIn} loading={loading} onResendOtp={onResendOtp} />;

    if (mode === 'otp') {
      return (
        <>
          {!awaitingCode && (
            <ChannelPicker channels={config.phoneOtpChannels} value={channel} onChange={setChannel} disabled={loading} />
          )}
          <LoginField icon={User03Icon} placeholder={translate('login.phone_placeholder')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!awaitingCode} testID="phone-input" />
          {awaitingCode && <CodeStep code={code} setCode={setCode} resendIn={resendIn} loading={loading} onResendOtp={onResendOtp} />}
        </>
      );
    }

    return (
      <>
        <LoginField icon={User03Icon} placeholder={translate('login.email_placeholder')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" testID="email-input" />
        {mode === 'password' && (
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
        )}
      </>
    );
  }

  // Every method switched off is a message, not a form. Drawing the fields here
  // would invite a sign-in nothing can answer, and the failure would look like
  // the person's own credentials being wrong.
  if (!waiting && openingMode(config) === null) {
    return (
      <MotiView className="rounded-sm px-5 py-6" from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
        <Text className="text-2xl font-extrabold text-foreground">{translate('login.welcome_back')}</Text>
        <Text testID="no-methods" className="mt-2 text-sm text-muted-foreground">{translate('login.no_methods')}</Text>
      </MotiView>
    );
  }

  return (
    <MotiView className="rounded-sm px-5 py-6" from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
      <Text className="text-2xl font-extrabold text-foreground">
        {translate(waiting ? 'login.email_code_title' : 'login.welcome_back')}
      </Text>
      <Text className="mt-1 text-xs text-muted-foreground">
        {waiting
          ? translate('login.email_code_prompt', { email: emailedTo })
          : translate('login.sign_in_prompt')}
      </Text>

      <View className="mt-6 gap-3">{fields()}</View>

      {mode === 'password' && !waiting && (
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
          <Text className="text-base font-bold text-white">{translate(submitLabel)}</Text>
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} color="#fff" strokeWidth={2.2} />
        </View>
      </Button>

      {/* Half-way through a code, the only other move is to back out. */}
      {waiting && (
        <Button testID="start-over" variant="outline" disabled={loading} onPress={onStartOver} className="mt-5 h-12 rounded-2xl border-neutral-200">
          <Text className="text-sm font-bold text-foreground">{translate('login.start_over')}</Text>
        </Button>
      )}

      {/* Only offer what the server says works — never a dead form. */}
      {!waiting && alternatives.length > 0 && (
        <>
          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-neutral-200" />
            <Text className="text-xs font-semibold text-neutral-400">{translate('login.or')}</Text>
            <View className="h-px flex-1 bg-neutral-200" />
          </View>

          {alternatives.map(item => (
            <Button
              key={item.mode}
              testID={item.testID}
              variant="outline"
              disabled={loading}
              onPress={() => setMode(item.mode)}
              className="mb-3 h-12 rounded-2xl border-neutral-200"
            >
              <Text className="text-sm font-bold text-foreground">{translate(item.label)}</Text>
            </Button>
          ))}
        </>
      )}

      {/* One tap, not a mode: there is no form for it to swap in. */}
      {!waiting && config.google && (
        <Button
          testID="google-option"
          variant="outline"
          disabled={loading}
          onPress={onContinueWithGoogle}
          className={alternatives.length > 0 ? 'h-12 rounded-2xl border-neutral-200' : 'mt-5 h-12 rounded-2xl border-neutral-200'}
        >
          <Text className="text-sm font-bold text-foreground">{translate('login.continue_with_google')}</Text>
        </Button>
      )}
    </MotiView>
  );
}
