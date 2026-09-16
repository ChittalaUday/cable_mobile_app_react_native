import type { IconSvgElement } from '@hugeicons/react-native';
import type { Href } from 'expo-router';
import type { TintKey } from '@/components/common/shell';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Exchange01Icon,
  File01Icon,
  LayoutGridIcon,
  Location01Icon,
  Package01Icon,
  QrCodeIcon,
  Search01Icon,
  Upload01Icon,
  UserCheck01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Card, IconTile, ScreenHeader } from '@/components/common/shell';
import {
  colors,
  Input,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: IconSvgElement;
  tint: TintKey;
  path: Href;
  adminOnly?: boolean;
};

export function InventoryMenu({ basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const router = useRouter();
  const role = useAuthStore.use.role();
  const [search, setSearch] = React.useState('');

  const isAdmin = role === 'admin' || role === 'super_admin';

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Stock overview & quick stats',
      icon: LayoutGridIcon,
      tint: 'blue',
      path: `${basePath}/dashboard`,
    },
    {
      key: 'stock',
      title: 'Stock & Locations',
      subtitle: 'View stock by location',
      icon: Location01Icon,
      tint: 'orange',
      path: `${basePath}/stock`,
    },
    {
      key: 'scan',
      title: 'Scan / Lookup',
      subtitle: 'Scan serial code or search item',
      icon: QrCodeIcon,
      tint: 'orange',
      path: `${basePath}/issue`,
    },
    {
      key: 'issue',
      title: 'Issue to Customer',
      subtitle: 'Assign equipment to customer',
      icon: Upload01Icon,
      tint: 'purple',
      path: `${basePath}/issue`,
    },
    {
      key: 'receive',
      title: 'Receive Stock',
      subtitle: 'Log inward stock (purchase/return)',
      icon: Download01Icon,
      tint: 'green',
      path: `${basePath}/receive`,
    },
    {
      key: 'transfer',
      title: 'Transfer Stock',
      subtitle: 'Move stock between locations',
      icon: Exchange01Icon,
      tint: 'blue',
      path: `${basePath}/transfer`,
    },
    {
      key: 'customer_equipment',
      title: 'Customer Equipment',
      subtitle: 'View customer assignments',
      icon: UserCheck01Icon,
      tint: 'purple',
      path: `${basePath}/customer-equipment`,
    },
    {
      key: 'movements',
      title: 'Stock Movements',
      subtitle: 'Audit log of all movements',
      icon: File01Icon,
      tint: 'blue',
      path: `${basePath}/movements`,
    },
    {
      key: 'catalog',
      title: 'Item Catalog',
      subtitle: isAdmin ? 'Manage products & kits' : 'View products & kits (Read-only)',
      icon: Package01Icon,
      tint: 'orange',
      path: `${basePath}/catalog`,
    },
    ...(isAdmin
      ? ([
          {
            key: 'approvals',
            title: 'Approval Requests',
            subtitle: 'Review staff change requests',
            icon: CheckmarkCircle02Icon,
            tint: 'green',
            path: `${basePath}/approvals`,
          },
        ] satisfies MenuItem[])
      : ([
          {
            key: 'my_approvals',
            title: 'My Change Requests',
            subtitle: 'View submitted catalog requests',
            icon: CheckmarkCircle02Icon,
            tint: 'green',
            path: `${basePath}/approvals`,
          },
        ] satisfies MenuItem[])),
  ];

  const filteredItems = menuItems.filter(
    item =>
      item.title.toLowerCase().includes(search.toLowerCase())
      || item.subtitle.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Inventory"
        subtitle="Manage equipment, stock & customer assignments"
        showBack
        withSafeArea
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-12 gap-3"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-xl border border-border bg-card px-3 py-1">
          <View className="flex-row items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search inventory..."
              className="flex-1 border-0 bg-transparent text-sm text-foreground"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        <Card className="gap-1 border border-border p-2">
          {filteredItems.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => router.push(item.path)}
              className={`flex-row items-center justify-between rounded-xl p-3 active:bg-muted/40 ${
                index > 0 ? 'border-t border-border/50' : ''
              }`}
            >
              <View className="flex-1 flex-row items-center gap-3">
                <IconTile icon={item.icon} tint={item.tint} size={36} iconSize={18} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">{item.title}</Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
