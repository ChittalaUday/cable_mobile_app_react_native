import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';

import { Greeting, OperatorHeader } from '@/components/admin/operator-header';
import { GlobalSearchModal } from '@/components/common/global-search-modal';
import { QuickActionsFab } from '@/components/common/quick-actions-fab';
import { LoadError, Loading } from '@/components/common/shell';
import { RemoteShortcut } from '@/components/remote/remote-shortcut';
import { TodaysRound } from '@/components/staff/todays-round';
import { colors, FocusAwareStatusBar, Pressable, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import { useStaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';

/**
 * The field officer's home: what to do next, then how the round is going.
 *
 * Customers, Payments, Visits and More are tabs now, so nothing here repeats
 * them as tiles; quick actions are the shortcuts into the work itself.
 */
export function StaffDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore.use.user();
  const [searchVisible, setSearchVisible] = React.useState(false);
  const { data: dashboard, isPending, isRefetching, error, refetch } = useStaffDashboard();

  const now = React.useMemo(() => new Date(), []);
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'Field Officer').split(' ')[0];

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />

      <GlobalSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />

      {isPending
        ? <Loading />
        : dashboard === undefined
          ? <LoadError message={error?.message} onRetry={refetch} />
          : (
              <ScrollView
                className="flex-1"
                contentContainerClassName="gap-2.5 px-3 pt-2 pb-24"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
              >
                <MotiView
                  from={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300 }}
                  className="gap-2.5"
                >
                  <OperatorHeader subtitle="Field Officer" onSearch={() => setSearchVisible(true)} />
                  <Greeting greeting={greeting(now)} name={firstName} />
                  {error && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void refetch()}
                      className="rounded-xl border border-warning-200 bg-warning-50 p-3 dark:border-warning-800 dark:bg-warning-900/40"
                    >
                      <Text className="text-xs font-semibold text-warning-700 dark:text-warning-300">{t('staff_dashboard.refresh_failed')}</Text>
                    </Pressable>
                  )}
                  <Pressable accessibilityRole="button" testID="collected-today" onPress={() => router.push('/staff/collections')}>
                    <View className="gap-1 rounded-2xl bg-charcoal-900 p-5">
                      <Text className="text-sm font-semibold text-primary-300">{t('staff_dashboard.collected_today')}</Text>
                      <Text selectable className="text-4xl font-bold text-white">{`₹${dashboard.personal.today.toFixed(2)}`}</Text>
                      <Text className="text-charcoal-300">{`${dashboard.personal.todayReceipts} ${dashboard.personal.todayReceipts === 1 ? 'receipt' : 'receipts'} · Tap for details`}</Text>
                    </View>
                  </Pressable>
                  <TodaysRound basePath="/staff" compact />
                  <RemoteShortcut />
                </MotiView>
              </ScrollView>
            )}
      <QuickActionsFab />
    </View>
  );
}

export default StaffDashboardScreen;
