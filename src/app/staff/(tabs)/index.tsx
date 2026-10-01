import { MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';

import { Greeting, OperatorHeader } from '@/components/admin/operator-header';
import { GlobalSearchModal } from '@/components/common/global-search-modal';
import { QuickActionsFab } from '@/components/common/quick-actions-fab';
import { LoadError, Loading } from '@/components/common/shell';
import { StaffCollectionsCard } from '@/components/staff/staff-collections-card';
import { colors, FocusAwareStatusBar, Pressable, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import { useStaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';

/**
 * The field officer's home: what to do next, then how the round is going.
 *
 * Customers, Payments, Remote and More are tabs now, so nothing here repeats
 * them as tiles; quick actions are the shortcuts into the work itself.
 */
export function StaffDashboardScreen() {
  const { t } = useTranslation();
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
                      className="rounded-xl border border-warning-200 bg-warning-50 p-3"
                    >
                      <Text className="text-xs font-semibold text-warning-700">{t('staff_dashboard.refresh_failed')}</Text>
                    </Pressable>
                  )}
                  <StaffCollectionsCard dashboard={dashboard} />
                </MotiView>
              </ScrollView>
            )}
      <QuickActionsFab />
    </View>
  );
}

export default StaffDashboardScreen;
