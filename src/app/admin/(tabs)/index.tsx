import type { QuickActionKey } from '@/components/admin/quick-actions';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { RefreshControl } from 'react-native';

import { KpiGrid } from '@/components/admin/kpi-grid';
import { Greeting, OperatorHeader } from '@/components/admin/operator-header';
import { QuickActions } from '@/components/admin/quick-actions';
import { RecentActivity } from '@/components/admin/recent-activity';
import { GlobalSearchModal } from '@/components/common/global-search-modal';
import { comingSoon, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';

export function AdminHomeScreen() {
  const user = useAuthStore.use.user();
  const router = useRouter();
  const [searchVisible, setSearchVisible] = React.useState(false);

  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  const now = React.useMemo(() => new Date(), []);
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin').split(' ')[0];

  const onQuickAction = (key: QuickActionKey) => {
    if (key === 'add-customer')
      router.push('/admin/customers/add');
    else
      comingSoon(key.split('-').join(' '));
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
                <MotiView
                  from={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300 }}
                  className="flex-1"
                >
                  <View className="gap-2.5">
                    <OperatorHeader
                      onNotifications={() => comingSoon('Notifications')}
                      onSearch={() => setSearchVisible(true)}
                    />
                    <Greeting greeting={greeting(now)} name={firstName} />
                    <KpiGrid data={data} />
                    <QuickActions onPress={onQuickAction} onSeeAll={() => router.push('/admin/analytics')} />
                    <RecentActivity rows={data.activity} onSeeAll={() => router.push('/admin/analytics')} />
                  </View>
                </MotiView>
              </ScrollView>
            )}
    </View>
  );
}

export default AdminHomeScreen;
