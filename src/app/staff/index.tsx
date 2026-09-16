import type { StaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';
import {
  Package01Icon,
  UserCheck01Icon,
  UserMultipleIcon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RemoteControl } from '@/components/remote/remote-control';
import { StaffCollectionsCard } from '@/components/staff/staff-collections-card';
import {
  Button,
  colors,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useStaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

const DEFAULT_DASHBOARD: StaffDashboard = {
  personal: {
    today: 42500,
    week: 125000,
    month: 380000,
    todayReceipts: 31,
    weekReceipts: 85,
    monthReceipts: 260,
  },
  team: null,
  workload: {
    customers: 48,
    dueCustomers: 17,
    outstanding: 28400,
    activeConnections: 45,
    inactiveConnections: 3,
  },
  recentCollections: [],
};

const staffTabs = ['Today', 'My Route', 'Receipts', 'More'] as const;

export function StaffDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore.use.user();
  const signOut = useAuthStore.use.signOut();
  const [tab, setTab] = React.useState(0);
  const tabs = [...staffTabs, t('remote.tab')];
  const { data: dashboard } = useStaffDashboard();
  const activeDashboard = dashboard ?? DEFAULT_DASHBOARD;
  return (
    <View className="flex-1 bg-surface">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 px-4 pb-28 pt-4">
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <View className="gap-0.5">
            <Text className="text-xs font-bold tracking-widest text-primary-600 uppercase">
              Good morning, Technician
            </Text>
            <Text selectable className="text-2xl font-black text-foreground">
              {user?.displayName ?? user?.email?.split('@')[0] ?? 'Field Officer'}
            </Text>
            <Text className="text-xs text-muted-foreground">Here's what's happening today.</Text>
          </View>
        </MotiView>

        <View className="flex-row gap-2.5">
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-2xl border border-border bg-card p-3 active:bg-muted"
          >
            <View className="size-10 items-center justify-center rounded-xl bg-blue-50">
              <HugeiconsIcon icon={UserMultipleIcon} size={20} color="#2E90FA" strokeWidth={2} />
            </View>
            <Text className="mt-2 text-xs font-bold text-foreground">Customers</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-2xl border border-border bg-card p-3 active:bg-muted"
          >
            <View className="size-10 items-center justify-center rounded-xl bg-green-50">
              <HugeiconsIcon icon={Wrench01Icon} size={20} color="#12B76A" strokeWidth={2} />
            </View>
            <Text className="mt-2 text-xs font-bold text-foreground">Installations</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-2xl border border-border bg-card p-3 active:bg-muted"
          >
            <View className="size-10 items-center justify-center rounded-xl bg-purple-50">
              <HugeiconsIcon icon={UserCheck01Icon} size={20} color="#7C4DFF" strokeWidth={2} />
            </View>
            <Text className="mt-2 text-xs font-bold text-foreground">Requests</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/staff/inventory')}
            className="flex-1 items-center justify-center rounded-2xl border-2 border-primary-500 bg-card p-3 active:bg-primary-50"
          >
            <View className="size-10 items-center justify-center rounded-xl bg-orange-50">
              <HugeiconsIcon icon={Package01Icon} size={20} color={colors.primary[600]} strokeWidth={2.2} />
            </View>
            <Text className="mt-2 text-xs font-bold text-primary-600">Inventory</Text>
          </Pressable>
        </View>
        <MotiView
          key={tab}
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
        >
          {tab === 0
            ? (
                <StaffCollectionsCard dashboard={activeDashboard} />
              )
            : tab === staffTabs.length
              ? <RemoteControl />
              : (
                  <View className="min-h-72 items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6">
                    <Text className="text-xl font-bold text-foreground">{tabs[tab]}</Text>
                    <Text className="text-center text-xs text-muted-foreground">
                      Live records will appear here when route data has synced.
                    </Text>
                  </View>
                )}
        </MotiView>

        <Button label="Sign out" variant="outline" onPress={signOut} />
      </ScrollView>
      {/* Bottom bar */}
      <View className="absolute inset-x-3 bottom-3 flex-row rounded-2xl border border-border bg-card p-1.5">
        {tabs.map((label, index) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === index }}
            onPress={() => setTab(index)}
            className={`flex-1 items-center rounded-xl py-2.5 ${tab === index ? 'bg-primary-600' : ''}`}
          >
            <Text className={`text-xs font-bold ${tab === index ? 'text-white' : 'text-muted-foreground'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default StaffDashboardScreen;
