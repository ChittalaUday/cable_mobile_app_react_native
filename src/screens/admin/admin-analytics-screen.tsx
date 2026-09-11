import type { TabKey } from '@/components/common/shell';
import type { RevenueRange } from '@/lib/hooks/use-admin-dashboard';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { RefreshControl } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, comingSoon, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/use-admin-dashboard';
import { monthYear } from '@/lib/utils/admin-format';
import { AnalyticsTopBar } from './components/analytics-top-bar';
import { CollectionsSummary } from './components/collections-summary';
import { DonutCard } from './components/donut-card';
import { PromoBanner } from './components/promo-banner';
import { RecentCustomers } from './components/recent-customers';
import { RevenueOverview } from './components/revenue-overview';
import { StaffActivity } from './components/staff-activity';
import { TopAreas } from './components/top-areas';

export function AdminAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<TabKey>('home');
  const [range, setRange] = React.useState<RevenueRange>('monthly');
  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  const period = React.useMemo(() => monthYear(new Date()), []);
  const totalAccounts = data ? data.connectionStatus.reduce((sum, slice) => sum + slice.count, 0) : 0;
  const totalServices = data ? data.services.reduce((sum, slice) => sum + slice.count, 0) : 0;

  const onTab = (key: TabKey) => {
    setTab(key);
    if (key === 'home')
      router.back();
    else
      comingSoon(key.charAt(0).toUpperCase() + key.slice(1));
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="px-3 pt-1 pb-2">
          <AnalyticsTopBar period={period} onBack={() => router.back()} onPeriod={() => comingSoon('Period picker')} />
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
                  <RevenueOverview revenue={data.revenue} range={range} onRange={setRange} />
                  <CollectionsSummary data={data} />
                  <DonutCard
                    variant="status"
                    title="Connection Status"
                    slices={data.connectionStatus}
                    total={totalAccounts}
                    caption="Total Connections"
                    onDetails={() => comingSoon('Connection status')}
                  />
                  <DonutCard
                    variant="service"
                    title="Service Distribution"
                    slices={data.services}
                    total={totalServices}
                    caption="Connections"
                    onDetails={() => comingSoon('Service distribution')}
                  />
                  <TopAreas areas={data.areas} onPress={area => comingSoon(area.name)} />
                  <StaffActivity rows={data.staff} onViewAll={() => comingSoon('Staff roster')} />
                  <RecentCustomers
                    rows={data.recentCustomers}
                    onViewAll={() => comingSoon('Customers')}
                    onPress={row => comingSoon(row.name)}
                  />
                  <PromoBanner />
                </MotiView>
              </ScrollView>
            )}

      <BottomNav active={tab} onSelect={onTab} bottomInset={insets.bottom} />
    </View>
  );
}
