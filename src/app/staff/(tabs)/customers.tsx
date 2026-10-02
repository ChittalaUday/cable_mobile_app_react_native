import * as React from 'react';

import { CustomersView } from '@/components/admin/customers-view';
import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';

/**
 * The collector's book, which is the same list the office reads — the server
 * narrows it to the areas this engineer covers, so nothing here filters by role.
 * A row opens the customer page, which is where payment and tickets start.
 */
export default function StaffCustomersRoute() {
  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <CustomersView basePath="/staff" />
    </View>
  );
}
