import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';

import { KpiGrid } from '@/components/admin/kpi-grid';
import { Greeting, OperatorHeader } from '@/components/admin/operator-header';
import { RecentActivity } from '@/components/admin/recent-activity';
import { GlobalSearchModal } from '@/components/common/global-search-modal';
import { QuickActionsFab } from '@/components/common/quick-actions-fab';
import { LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, Pressable, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { greeting } from '@/lib/utils/admin-format';

export function AdminHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore.use.user();
  const router = useRouter();
  const [searchVisible, setSearchVisible] = React.useState(false);

  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  const now = React.useMemo(() => new Date(), []);
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin').split(' ')[0];

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />

      <GlobalSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />

      {isPending
        ? <Loading />
        : !data
            ? <LoadError message={error?.message} onRetry={refetch} />
            : (
                <ScrollView
                  className="flex-1"
                  contentContainerClassName="gap-2.5 px-3 pt-2 pb-24"
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
                      <OperatorHeader onSearch={() => setSearchVisible(true)} />
                      <Greeting greeting={greeting(now)} name={firstName} />
                      {error && (
                        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void refetch()}
                            className="rounded-xl border border-warning-200 bg-warning-50 p-3"
                          >
                            <Text className="text-xs font-semibold text-warning-700">{t('admin_dashboard.refresh_failed')}</Text>
                          </Pressable>
                        </MotiView>
                      )}
                      <KpiGrid data={data} />
                      <RecentActivity rows={data.activity} onSeeAll={() => router.push('/admin/analytics')} />
                    </View>
                  </MotiView>
                </ScrollView>
              )}
      <QuickActionsFab />
    </View>
  );
}

export default AdminHomeScreen;
