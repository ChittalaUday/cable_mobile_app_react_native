import * as React from 'react';

import { CollectionsList } from '@/components/payments/collections-list';
import { FocusAwareStatusBar, SafeAreaView, Text, View } from '@/components/ui';
import { useAdminDashboard } from '@/lib/hooks/api/use-admin-dashboard';

export function AdminPaymentsTab() {
  // Only the dues figure: the receipts list carries its own collected total.
  const { data } = useAdminDashboard();

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <CollectionsList
        basePath="/admin"
        pending={data?.outstandingDues}
        header={<Text className="px-4 pt-2 pb-3 text-xl font-bold text-foreground">Payments</Text>}
      />
    </View>
  );
}

export default AdminPaymentsTab;
