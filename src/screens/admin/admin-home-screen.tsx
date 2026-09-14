import type { QuickActionKey } from './components/quick-actions';
import type { TabKey } from '@/components/common/shell';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalSearchModal } from '@/components/common/global-search-modal';
import { BottomNav, comingSoon, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';
import { CustomersView } from './components/customers-view';
import { KpiGrid } from './components/kpi-grid';
import { MoreView } from './components/more-view';
import { Greeting, OperatorHeader } from './components/operator-header';
import { QuickActions } from './components/quick-actions';
import { RecentActivity } from './components/recent-activity';

function Fade({ children, tabKey }: { children: React.ReactNode; tabKey: string }) {
  return (
    <MotiView
      key={tabKey}
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      className="flex-1"
    >
      {children}
    </MotiView>
  );
}

export function AdminHomeScreen() {
  const user = useAuthStore.use.user();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<TabKey>('home');
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [addModalOpen, setAddModalOpen] = React.useState(false);

  // Only the home tab reads this. It used to gate the whole screen, so opening
  // Customers or More during a refetch showed a spinner instead of the tab.
  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard({
    enabled: tab === 'home',
  });

  const now = React.useMemo(() => new Date(), []);
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin').split(' ')[0];

  const onTab = (key: TabKey) => {
    if (key !== 'home' && key !== 'customers' && key !== 'more') {
      comingSoon(key.charAt(0).toUpperCase() + key.slice(1));
      return;
    }
    setTab(key);
  };

  const onQuickAction = (key: QuickActionKey) => {
    if (key === 'add-customer')
      router.push('/add-customer');
    else
      comingSoon(key.split('-').join(' '));
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />

      <GlobalSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />

      {tab === 'customers'
        ? (
            <Fade tabKey="customers">
              <CustomersView
                initialAddModalOpen={addModalOpen}
                onCloseAddModal={() => setAddModalOpen(false)}
                onRecharge={conn => comingSoon(`Recharge ${conn.packageName}`)}
                onRaiseTicket={(_cust, conn) => comingSoon(`Ticket for ${conn.stbNumber ?? conn.serviceTypeName}`)}
              />
            </Fade>
          )
        : tab === 'more'
          ? (
              <Fade tabKey="more">
                <MoreView />
              </Fade>
            )
          : isPending
            ? <Loading />
            : error || !data
              ? <LoadError message={error?.message} onRetry={refetch} />
              : (
                  <ScrollView
                    className="flex-1"
                    contentContainerClassName="gap-2.5 px-3 pt-2 pb-6"
                    showsVerticalScrollIndicator={false}
                    refreshControl={(
                      <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        tintColor={colors.primary[600]}
                      />
                    )}
                  >
                    <Fade tabKey="home">
                      <View className="gap-2.5">
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
                      </View>
                    </Fade>
                  </ScrollView>
                )}

      <BottomNav active={tab} onSelect={onTab} bottomInset={insets.bottom} />
    </View>
  );
}
