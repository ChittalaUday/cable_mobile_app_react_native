import * as React from 'react';

import { CollectionsSummary } from '@/components/admin/collections-summary';
import { LoadError, Loading } from '@/components/common/shell';
import { CollectionsList } from '@/components/payments/collections-list';
import { FocusAwareStatusBar, SafeAreaView, Text, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';

export function AdminPaymentsTab() {
  const { data, isPending, error, refetch } = useAdminDashboard();

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />

      {/* One scrolling surface: the rollup rides on top of the book it adds up,
          so pulling to refresh refreshes both and neither fights for height. */}
      <CollectionsList
        basePath="/admin"
        header={(
          <View className="gap-4 p-4">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-foreground">Payments & Collections</Text>
              <Text className="text-sm text-muted-foreground">Monitor daily collection batches and staff dues</Text>
            </View>
            {isPending
              ? <Loading />
              : error || !data
                ? <LoadError message={error?.message} onRetry={refetch} />
                : <CollectionsSummary data={data} />}
          </View>
        )}
      />
    </View>
  );
}

export default AdminPaymentsTab;
