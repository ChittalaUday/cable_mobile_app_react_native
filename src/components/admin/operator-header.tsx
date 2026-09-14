import { Notification03Icon, Search01Icon, Tv01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { TenantSwitcher } from '@/components/tenant/tenant-picker';
import { colors, Pressable, Text, View } from '@/components/ui';

export function OperatorHeader({ onNotifications, onSearch }: {
  onNotifications: () => void;
  onSearch?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="size-11 items-center justify-center rounded-2xl bg-primary-600">
        <HugeiconsIcon icon={Tv01Icon} size={24} color="#fff" strokeWidth={2} />
      </View>
      <TenantSwitcher subtitle="Operator Panel" />
      {onSearch
        ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Global Search" onPress={onSearch} className="size-10 items-center justify-center rounded-full bg-card">
              <HugeiconsIcon icon={Search01Icon} size={19} color={colors.charcoal[800]} strokeWidth={2} />
            </Pressable>
          )
        : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={onNotifications} className="size-10 items-center justify-center rounded-full bg-card">
        <HugeiconsIcon icon={Notification03Icon} size={19} color={colors.charcoal[800]} strokeWidth={2} />
        <View className="absolute top-2 right-2.5 size-2 rounded-full bg-primary-600" />
      </Pressable>
    </View>
  );
}

export function Greeting({ greeting, name }: { greeting: string; name: string }) {
  return (
    <View className="mt-3">
      <Text className="text-[22px] font-bold text-foreground" numberOfLines={1}>
        {greeting}
        ,
        {' '}
        {name}
        {' '}
        👋
      </Text>
      <Text className="mt-0.5 text-xs text-muted-foreground">Here's what's happening with your network today.</Text>
    </View>
  );
}
