import type { QuickActionKey } from './components/quick-actions';
import type { TabKey } from '@/components/common/shell';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';

import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, comingSoon, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/use-admin-dashboard';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';
import { KpiGrid } from './components/kpi-grid';
import { Greeting, OperatorHeader } from './components/operator-header';
import { QuickActions } from './components/quick-actions';
import { RecentActivity } from './components/recent-activity';

export function AdminHomeScreen() {
  const user = useAuthStore.use.user();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<TabKey>('home');
  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  const now = React.useMemo(() => new Date(), []);
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin').split(' ')[0];

  const onTab = (key: TabKey) => {
    setTab(key);
    if (key !== 'home')
      comingSoon(key.charAt(0).toUpperCase() + key.slice(1));
  };

  const onQuickAction = (key: QuickActionKey) => comingSoon(key.split('-').join(' '));

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="px-3 pt-1 pb-3">
          <OperatorHeader
            photoURL={user?.photoURL}
            name={firstName}
            onProfile={() => router.push('/profile')}
            onNotifications={() => comingSoon('Notifications')}
          />
          <Greeting greeting={greeting(now)} name={firstName} />
        </View>
      </SafeAreaView>

      {isPending
        ? <Loading />
        : error || !data
          ? <LoadError message={error?.message} onRetry={refetch} />
          : (
              <ScrollView
                className="flex-1"
                contentContainerClassName="gap-2.5 px-3 pb-6"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
              >
                <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }} className="gap-2.5">
                  <KpiGrid data={data} />
                  <QuickActions onPress={onQuickAction} onSeeAll={() => router.push('/dashboard')} />
                  <RecentActivity rows={data.activity} onSeeAll={() => router.push('/dashboard')} />
                </MotiView>
              </ScrollView>
            )}

      <BottomNav active={tab} onSelect={onTab} bottomInset={insets.bottom} />
    </View>
  );
}
