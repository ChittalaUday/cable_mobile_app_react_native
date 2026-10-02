import { HeadphonesIcon } from '@hugeicons/core-free-icons';
import Constants from 'expo-constants';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { Pressable, SafeAreaView, Text, ThemedIcon, View } from '@/components/ui';
import { translate } from '@/lib/i18n';

export function LoginFooter() {
  return (
    <SafeAreaView edges={['bottom']} className="px-5 pt-5 pb-6">
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2"
        onPress={() => showMessage({ message: translate('login.contact_support_coming'), type: 'info' })}
      >
        <ThemedIcon icon={HeadphonesIcon} size={16} colorClassName="text-muted-foreground" strokeWidth={1.8} />
        <Text className="text-xs text-muted-foreground">{translate('login.need_help')}</Text>
        <Text className="text-xs font-bold text-primary-600">{translate('login.contact_support')}</Text>
      </Pressable>
      <View className="mt-2 items-center">
        <Text className="text-[11px] text-neutral-400">
          {translate('login.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        </Text>
      </View>
    </SafeAreaView>
  );
}
