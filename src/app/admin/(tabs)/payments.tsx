import * as React from 'react';
import { RefreshControl } from 'react-native';

import { CollectionsSummary } from '@/components/admin/collections-summary';
import { LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';

export function AdminPaymentsTab() {
  const { data, isPending, isRefetching, error, refetch } = useAdminDashboard();

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4"
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[600]}
          />
        )}
      >
        <View className="gap-1">
          <Text className="text-2xl font-bold text-foreground">Payments & Collections</Text>
          <Text className="text-sm text-muted-foreground">Monitor daily collection batches and staff dues</Text>
        </View>
        {isPending
          ? (
              <Loading />
            )
          : error || !data
            ? (
                <LoadError message={error?.message} onRetry={refetch} />
              )
            : (
                <CollectionsSummary data={data} />
              )}
      </ScrollView>
    </View>
  );
}

export default AdminPaymentsTab;
