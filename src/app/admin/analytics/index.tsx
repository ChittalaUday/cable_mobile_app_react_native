import type { TabKey } from '@/components/common/shell';
import type { RevenueRange } from '@/lib/hooks/api/use-admin-dashboard';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { RefreshControl } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnalyticsTopBar } from '@/components/admin/analytics-top-bar';
import { CollectionsSummary } from '@/components/admin/collections-summary';
import { DonutCard } from '@/components/admin/donut-card';
import { RecentCustomers } from '@/components/admin/recent-customers';
import { RevenueOverview } from '@/components/admin/revenue-overview';
import { StaffActivity } from '@/components/admin/staff-activity';
import { TopAreas } from '@/components/admin/top-areas';
import { BottomNav, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';
import { monthYear } from '@/lib/utils/admin-format';

/** Where each bottom-tab lands, since this screen sits on top of the tab bar. */
const TAB_ROUTES = {
  home: '/admin',
  customers: '/admin/(tabs)/customers',
  payments: '/admin/(tabs)/payments',
  remote: '/admin/(tabs)/remote',
  more: '/admin/(tabs)/more',
} as const satisfies Record<TabKey, string>;

const RANGES: RevenueRange[] = ['daily', 'weekly', 'monthly'];

/** The period control cycles rather than opening a picker: three ranges, one tap. */
function next(range: RevenueRange): RevenueRange {
  return RANGES[(RANGES.indexOf(range) + 1) % RANGES.length]!;
}

export function AdminAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<TabKey>('home');
  const [range, setRange] = React.useState<RevenueRange>('monthly');
  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  const period = React.useMemo(() => monthYear(new Date()), []);
  const totalAccounts = data ? data.connectionStatus.reduce((sum, slice) => sum + slice.count, 0) : 0;
  const totalServices = data ? data.services.reduce((sum, slice) => sum + slice.count, 0) : 0;

  // The analytics screen is pushed over the tabs rather than being one of them,
  // so every tab here means "go back to the tab bar, on that tab".
  const onTab = (key: TabKey) => {
    setTab(key);
    router.dismissTo(TAB_ROUTES[key]);
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="px-3 pt-1 pb-2">
          <AnalyticsTopBar period={period} onBack={() => router.back()} onPeriod={() => setRange(next(range))} />
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
                    onDetails={() => router.push('/admin/(tabs)/customers')}
                  />
                  <DonutCard
                    variant="service"
                    title="Service Distribution"
                    slices={data.services}
                    total={totalServices}
                    caption="Connections"
                    onDetails={() => router.push('/admin/services')}
                  />
                  <TopAreas areas={data.areas} onPress={() => router.push('/admin/locations')} />
                  <StaffActivity rows={data.staff} onViewAll={() => router.push('/admin/staff')} />
                  <RecentCustomers
                    rows={data.recentCustomers}
                    onViewAll={() => router.push('/admin/(tabs)/customers')}
                    onPress={row => router.push({ pathname: '/admin/customers/[id]', params: { id: row.id } })}
                  />
                </MotiView>
              </ScrollView>
            )}

      <BottomNav active={tab} onSelect={onTab} bottomInset={insets.bottom} />
    </View>
  );
}

export default AdminAnalyticsScreen;
