import { ArrowDown01Icon, Notification03Icon, Tv01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { colors, Image, Pressable, Text, View } from '@/components/ui';
import { initials } from '@/lib/utils/admin-format';

export function OperatorHeader({ photoURL, name, onProfile, onNotifications }: {
  photoURL?: string | null;
  name: string;
  onProfile: () => void;
  onNotifications: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-11 items-center justify-center rounded-2xl bg-primary-600">
        <HugeiconsIcon icon={Tv01Icon} size={24} color="#fff" strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-bold text-foreground">Satya Cable</Text>
        <Text className="text-xs text-muted-foreground">Operator Panel</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={onNotifications} className="size-10 items-center justify-center rounded-full bg-card">
        <HugeiconsIcon icon={Notification03Icon} size={19} color={colors.charcoal[800]} strokeWidth={2} />
        <View className="absolute top-2 right-2.5 size-2 rounded-full bg-primary-600" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onProfile} className="flex-row items-center gap-1 rounded-full bg-card py-1 pr-2 pl-1">
        <View className="size-8 items-center justify-center overflow-hidden rounded-full bg-primary-600">
          {photoURL
            ? <Image source={{ uri: photoURL }} className="size-8" contentFit="cover" />
            : <Text className="text-[11px] font-bold text-white">{initials(name)}</Text>}
        </View>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} color={colors.neutral[500]} strokeWidth={2.4} />
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
