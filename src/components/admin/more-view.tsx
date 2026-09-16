import type { IconSvgElement } from '@hugeicons/react-native';
import type { TintKey } from '@/components/common/shell';
import {
  ArrowRight01Icon,
  Location01Icon,
  Logout01Icon,
  Package01Icon,
  Tv01Icon,
  UserGroupIcon,
  UserIcon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card, IconTile, TINT } from '@/components/common/shell';
import {
  Button,
  colors,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { initials } from '@/lib/utils/admin-format';
import { ConfirmDialog } from '../common/confirm-dialog';

type NavItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: IconSvgElement;
  tint: TintKey;
  route:
    | '/admin/services'
    | '/admin/channels'
    | '/admin/locations'
    | '/admin/staff'
    | '/admin/inventory'
    | '/admin/profile';
};

const NAV_ITEMS: NavItem[] = [
  {
    key: 'services',
    title: 'Services',
    subtitle: 'Broadband, digital cable tiers & providers',
    icon: Wifi01Icon,
    tint: 'blue',
    route: '/admin/services',
  },
  {
    key: 'channels',
    title: 'Channels',
    subtitle: 'Channel lineup, genres, and pricing',
    icon: Tv01Icon,
    tint: 'purple',
    route: '/admin/channels',
  },
  {
    key: 'locations',
    title: 'Locations',
    subtitle: 'Hierarchy categories and coverage nodes',
    icon: Location01Icon,
    tint: 'green',
    route: '/admin/locations',
  },
  {
    key: 'staff',
    title: 'Staff & Teams',
    subtitle: 'People, crews & the areas each of them covers',
    icon: UserGroupIcon,
    tint: 'purple',
    route: '/admin/staff',
  },
  {
    key: 'inventory',
    title: 'Inventory',
    subtitle: 'Manage equipment, stock & customer assignments',
    icon: Package01Icon,
    tint: 'orange',
    route: '/admin/inventory',
  },
  {
    key: 'profile',
    title: 'Profile',
    subtitle: 'Account details, settings, and security',
    icon: UserIcon,
    tint: 'blue',
    route: '/admin/profile',
  },
];

export function MoreView() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const role = useAuthStore.use.role();
  const signOut = useAuthStore.use.signOut();
  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin Operator';
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const confirmSignOut = () => {
    setOpenConfirmDialog(true);
  };
  const handleConfirmSignOut = () => {
    signOut();
    setOpenConfirmDialog(false);
  };
  const handleCancelSignOut = () => {
    setOpenConfirmDialog(false);
  };
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="More"
        subtitle="Manage services, network catalog, staff, and account"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-3 pt-3 pb-12 gap-3"
        showsVerticalScrollIndicator={false}
      >
        <Card className="border border-border p-3.5">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3">
              <View className="size-12 overflow-hidden rounded-full bg-neutral-200">
                {user?.photoURL
                  ? (
                      <Image source={{ uri: user.photoURL }} className="size-12" contentFit="cover" />
                    )
                  : (
                      <View className="size-12 items-center justify-center bg-primary-600">
                        <Text className="text-base font-bold text-white">{initials(name)}</Text>
                      </View>
                    )}
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-bold text-foreground">{name}</Text>
                  {role
                    ? (
                        <View className="rounded-sm px-1.5 py-0.5" style={{ backgroundColor: TINT.orange.bg }}>
                          <Text className="text-[10px] font-bold uppercase" style={{ color: TINT.orange.fg }}>
                            {role}
                          </Text>
                        </View>
                      )
                    : null}
                </View>
                <Text className="text-xs text-muted-foreground">{user?.phone ?? user?.email ?? 'No phone'}</Text>
              </View>
            </View>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
          </Pressable>
        </Card>

        <Card className="gap-1 border border-border p-2">
          {NAV_ITEMS.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => router.push(item.route)}
              className={`flex-row items-center justify-between rounded-xl p-3 active:bg-muted/40 ${
                index > 0 ? 'border-t border-border/50' : ''
              }`}
            >
              <View className="flex-row items-center gap-3">
                <IconTile icon={item.icon} tint={item.tint} size={36} iconSize={18} />
                <View>
                  <Text className="text-sm font-bold text-foreground">{item.title}</Text>
                  <Text className="text-xs text-muted-foreground">{item.subtitle}</Text>
                </View>
              </View>
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            </Pressable>
          ))}
        </Card>

        <View className="mt-2">
          <Button
            label="Sign Out"
            variant="outline"
            onPress={confirmSignOut}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={openConfirmDialog}
        title="Sign Out"
        message="Are you sure you want to sign out of this device?"
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancelSignOut}
        icon={Logout01Icon}
        tone="danger"
      />
    </View>
  );
}
