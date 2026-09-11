import type { IconSvgElement } from '@hugeicons/react-native';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  HeadsetIcon,
  Logout01Icon,
  Notification03Icon,
  TranslateIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { Card, comingSoon, Divider, IconTile, TINT } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, Image, Pressable, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { initials } from '@/lib/utils/admin-format';

const ROWS: { key: string; icon: IconSvgElement; tint: keyof typeof TINT; label: string }[] = [
  { key: 'account', icon: UserIcon, tint: 'blue', label: 'Account details' },
  { key: 'notifications', icon: Notification03Icon, tint: 'orange', label: 'Notifications' },
  { key: 'language', icon: TranslateIcon, tint: 'purple', label: 'Language' },
  { key: 'support', icon: HeadsetIcon, tint: 'green', label: 'Help & support' },
];

export function ProfileScreen() {
  const user = useAuthStore.use.user();
  const role = useAuthStore.use.role();
  const signOut = useAuthStore.use.signOut();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin';

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    }
    finally {
      setSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-2 px-3 pt-1 pb-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} className="size-9 items-center justify-center">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <Text className="flex-1 text-[17px] font-bold text-foreground">Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-3 pb-8" showsVerticalScrollIndicator={false}>
        <Card className="items-center gap-1 p-5">
          <View className="size-20 overflow-hidden rounded-full bg-neutral-200">
            {user?.photoURL
              ? <Image source={{ uri: user.photoURL }} className="size-20" contentFit="cover" />
              : (
                  <View className="size-20 items-center justify-center bg-primary-600">
                    <Text className="text-2xl font-bold text-white">{initials(name)}</Text>
                  </View>
                )}
          </View>
          <Text className="mt-2 text-lg font-bold text-foreground">{name}</Text>
          <Text className="text-[13px] text-muted-foreground">{user?.email ?? 'Guest account'}</Text>
          {role && (
            <View className="mt-1 rounded-md px-2.5 py-1" style={{ backgroundColor: TINT.orange.bg }}>
              <Text className="text-[11px] font-semibold uppercase" style={{ color: TINT.orange.fg }}>{role}</Text>
            </View>
          )}
        </Card>

        <Card className="px-3.5">
          {ROWS.map((row, index) => (
            <View key={row.key}>
              {index > 0 && <Divider />}
              <Pressable accessibilityRole="button" onPress={() => comingSoon(row.label)} className="flex-row items-center gap-3 py-3.5">
                <IconTile icon={row.icon} tint={row.tint} size={32} iconSize={17} />
                <Text className="flex-1 text-[14px] text-charcoal-900">{row.label}</Text>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[400]} strokeWidth={2.2} />
              </Pressable>
            </View>
          ))}
        </Card>

        <Card className="px-3.5">
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={onSignOut}
            className="flex-row items-center gap-3 py-3.5"
          >
            <IconTile icon={Logout01Icon} tint="red" size={32} iconSize={17} />
            <Text className="flex-1 text-[14px] font-semibold text-danger-600">{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
