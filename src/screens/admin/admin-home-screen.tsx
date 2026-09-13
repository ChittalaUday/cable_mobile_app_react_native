import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { QuickActionKey } from './components/quick-actions';
import type { TabKey } from '@/components/common/shell';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalSearchModal } from '@/components/common/global-search-modal';
import { BottomNav, comingSoon, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/use-admin-dashboard';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';
import { CustomersView } from './components/customers-view';
import { KpiGrid } from './components/kpi-grid';
import { Greeting, OperatorHeader } from './components/operator-header';
import { QuickActions } from './components/quick-actions';
import { RecentActivity } from './components/recent-activity';

// eslint-disable-next-line max-lines-per-function
export function AdminHomeScreen() {
  const user = useAuthStore.use.user();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<TabKey>('home');
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [nearBottomTrigger, setNearBottomTrigger] = React.useState(0);
  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  const now = React.useMemo(() => new Date(), []);
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin').split(' ')[0];

  const handleScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isNearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 350;
    if (isNearEnd) {
      setNearBottomTrigger(Date.now());
    }
  }, [setNearBottomTrigger]);

  const onTab = (key: TabKey) => {
    setTab(key);
    if (key !== 'home' && key !== 'customers') {
      comingSoon(key.charAt(0).toUpperCase() + key.slice(1));
    }
  };

  const onQuickAction = (key: QuickActionKey) => {
    if (key === 'add-customer') {
      router.push('/add-customer');
    }
    else {
      comingSoon(key.split('-').join(' '));
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />

      <GlobalSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />

      {isPending
        ? <Loading />
        : error || !data
          ? <LoadError message={error?.message} onRetry={refetch} />
          : tab === 'customers'
            ? (
                <MotiView
                  key="customers"
                  from={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300 }}
                  className="flex-1"
                >
                  <CustomersView
                    nearBottomTrigger={nearBottomTrigger}
                    onScroll={handleScroll}
                    initialAddModalOpen={addModalOpen}
                    onCloseAddModal={() => setAddModalOpen(false)}
                    refreshControl={(
                      <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        tintColor={colors.primary[600]}
                      />
                    )}
                    onRecharge={conn => comingSoon(`Recharge ${conn.packageName}`)}
                    onRaiseTicket={(_cust, conn) => comingSoon(`Ticket for ${conn.stbNumber ?? conn.serviceTypeName}`)}
                  />
                </MotiView>
              )
            : (
                <ScrollView
                  className="flex-1"
                  contentContainerClassName="gap-2.5 px-3 pt-2 pb-6"
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={handleScroll}
                  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
                >
                  <MotiView key={tab} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }} className="gap-2.5">
                    {tab === 'home'
                      ? (
                          <>
                            <OperatorHeader
                              photoURL={user?.photoURL}
                              name={firstName}
                              onProfile={() => router.push('/profile')}
                              onNotifications={() => comingSoon('Notifications')}
                              onSearch={() => setSearchVisible(true)}
                            />
                            <Greeting greeting={greeting(now)} name={firstName} />
                            <KpiGrid data={data} />
                            <QuickActions onPress={onQuickAction} onSeeAll={() => router.push('/dashboard')} />
                            <RecentActivity rows={data.activity} onSeeAll={() => router.push('/dashboard')} />
                          </>
                        )
                      : (
                          <View className="min-h-72 items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6">
                            <Text className="text-xl font-bold text-foreground capitalize">{tab}</Text>
                            <Text className="text-center text-muted-foreground">Live records will appear here when your account has synced data.</Text>
                          </View>
                        )}
                  </MotiView>
                </ScrollView>
              )}

      <BottomNav active={tab} onSelect={onTab} bottomInset={insets.bottom} />
    </View>
  );
}
