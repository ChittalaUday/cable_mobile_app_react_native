import type { IconSvgElement } from '@hugeicons/react-native';
import type { Href } from 'expo-router';
import {
  ArrowRight01Icon,
  Logout01Icon,
  Notification03Icon,
  QrCodeIcon,
  RemoteControlIcon,
} from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { dialogs } from '@/components/common/dialogs';
import { LanguageItem, ThemeItem } from '@/components/common/settings';

import { Card, Divider, IconTile, ScreenHeader, TINT } from '@/components/common/shell';
import { FocusAwareStatusBar, Image, Pressable, ScrollView, Text, ThemedIcon, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { translate } from '@/lib/i18n';
import { initials } from '@/lib/utils/admin-format';
import { authErrorMessage } from '@/lib/utils/auth-error';

/**
 * Only rows that land on a screen. Theme and language live right here; there
 * is no separate Settings page. UPI accounts are an office setting, shown to
 * whoever may change them.
 */
function rowsFor(canManageUpi: boolean): { key: string; icon: IconSvgElement; tint: keyof typeof TINT; label: string; route: Href }[] {
  return [
    { key: 'notifications', icon: Notification03Icon, tint: 'orange', label: 'Notifications', route: '/notifications' },
    { key: 'remote', icon: RemoteControlIcon, tint: 'blue', label: translate('remote.public_remote'), route: '/remote' },
    ...(canManageUpi ? [{ key: 'upi', icon: QrCodeIcon, tint: 'purple' as const, label: translate('settings.upi_accounts'), route: '/admin/settings/upi' as Href }] : []),
  ];
}

export function ProfileScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const user = useAuthStore.use.user();
  const role = useAuthStore.use.role();
  const signOut = useAuthStore.use.signOut();
  const signOutEverywhere = useAuthStore.use.signOutEverywhere();
  const [signingOut, setSigningOut] = React.useState<'current' | 'all' | null>(null);

  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin';

  const runSignOut = async (everywhere = false) => {
    setSigningOut(everywhere ? 'all' : 'current');
    try {
      await (everywhere ? signOutEverywhere() : signOut());
    }
    catch (error) {
      showMessage({ message: translate('profile.sign_out_failed'), description: authErrorMessage(error), type: 'danger' });
    }
    finally {
      setSigningOut(null);
    }
  };

  const confirmSignOutEverywhere = async () => {
    const agreed = await dialogs.confirm({
      title: translate('profile.sign_out_all'),
      message: translate('profile.sign_out_all_confirmation'),
      confirmLabel: translate('profile.confirm'),
      cancelLabel: translate('profile.cancel'),
    });

    if (agreed)
      runSignOut(true);
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader
        title="Profile"
        subtitle="Account, theme, language and sign-in"
        showBack
        withSafeArea
      />

      <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-3 pb-8" showsVerticalScrollIndicator={false}>
        <Card className="items-center gap-1 p-5">
          <View className="size-20 overflow-hidden rounded-full bg-muted">
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
          <Text className="pt-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">Appearance</Text>
          <ThemeItem />
          <Divider />
          <LanguageItem />
        </Card>

        <Card className="px-3.5">
          {rowsFor(can(PERMISSIONS.SETTINGS_UPDATE)).map((row, index) => (
            <View key={row.key}>
              {index > 0 && <Divider />}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(row.route)}
                className="flex-row items-center gap-3 py-3.5"
              >
                <IconTile icon={row.icon} tint={row.tint} size={32} iconSize={17} />
                <Text className="flex-1 text-[14px] text-foreground">{row.label}</Text>
                <ThemedIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} colorClassName="text-muted-foreground" />
              </Pressable>
            </View>
          ))}
        </Card>

        <Card className="px-3.5">
          <Pressable
            accessibilityRole="button"
            disabled={signingOut !== null}
            onPress={() => runSignOut()}
            className="flex-row items-center gap-3 py-3.5"
          >
            <IconTile icon={Logout01Icon} tint="red" size={32} iconSize={17} />
            <Text className="flex-1 text-[14px] font-semibold text-danger-600">{signingOut === 'current' ? translate('profile.signing_out') : translate('profile.sign_out')}</Text>
          </Pressable>
          <Divider />
          <Pressable
            accessibilityRole="button"
            disabled={signingOut !== null}
            onPress={confirmSignOutEverywhere}
            className="flex-row items-center gap-3 py-3.5"
          >
            <IconTile icon={Logout01Icon} tint="red" size={32} iconSize={17} />
            <Text className="flex-1 text-[14px] font-semibold text-danger-600">{signingOut === 'all' ? translate('profile.signing_out_all') : translate('profile.sign_out_all')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

export default ProfileScreen;
