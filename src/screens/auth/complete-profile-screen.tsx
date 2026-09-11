import * as React from 'react';

import { Button, FocusAwareStatusBar, Input, SafeAreaView, Text, View } from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { translate } from '@/lib/i18n';

export function CompleteProfileScreen() {
  const completeProfile = useAuthStore.use.completeProfile();
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onPhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10));
  };

  const onSubmit = async () => {
    if (phone.length < 10)
      return setError('Enter a valid 10-digit mobile number');
    if (!address.trim())
      return setError('Enter your complete installation address');

    setError(null);
    setSaving(true);
    try {
      await completeProfile({ phone, address: address.trim() });
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile details.');
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <View className="flex-1 justify-between p-6">
        <View className="gap-6 pt-4">
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">{translate('complete_profile.title')}</Text>
            <Text className="text-sm text-muted-foreground">{translate('complete_profile.subtitle')}</Text>
          </View>

          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{translate('complete_profile.phone_label')}</Text>
              <Input
                placeholder={translate('complete_profile.phone_placeholder')}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={onPhoneChange}
                maxLength={10}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{translate('complete_profile.address_label')}</Text>
              <Input
                placeholder={translate('complete_profile.address_placeholder')}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>

            {error && (
              <Text className="text-xs font-medium text-danger-600">{error}</Text>
            )}
          </View>
        </View>

        <Button
          label={translate('complete_profile.save')}
          loading={saving}
          onPress={onSubmit}
        />
      </View>
    </SafeAreaView>
  );
}
