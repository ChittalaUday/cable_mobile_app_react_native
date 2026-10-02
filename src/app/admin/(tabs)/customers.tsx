import * as React from 'react';

import { CustomersView } from '@/components/admin/customers-view';
import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';

export function AdminCustomersTab() {
  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <CustomersView basePath="/admin" />
    </View>
  );
}

export default AdminCustomersTab;
