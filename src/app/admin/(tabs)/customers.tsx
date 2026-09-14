import * as React from 'react';

import { CustomersView } from '@/components/admin/customers-view';
import { comingSoon } from '@/components/common/shell';
import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';

export function AdminCustomersTab() {
  const [addModalOpen, setAddModalOpen] = React.useState(false);

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <CustomersView
        initialAddModalOpen={addModalOpen}
        onCloseAddModal={() => setAddModalOpen(false)}
        onRecharge={conn => comingSoon(`Recharge ${conn.packageName}`)}
        onRaiseTicket={(_cust, conn) => comingSoon(`Ticket for ${conn.stbNumber ?? conn.serviceTypeName}`)}
      />
    </View>
  );
}

export default AdminCustomersTab;
