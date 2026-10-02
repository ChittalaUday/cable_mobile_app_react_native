import * as React from 'react';

import { CollectionsList } from '@/components/payments/collections-list';
import { FocusAwareStatusBar, SafeAreaView, Text, View } from '@/components/ui';

/** The officer's own round. The office's rollup lives on the admin tab; the totals are on Home. */
export default function StaffPaymentsTab() {
  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <CollectionsList
        basePath="/staff"
        mineOnly
        header={<Text className="px-4 pt-2 pb-3 text-xl font-bold text-foreground">My Collections</Text>}
      />
    </View>
  );
}
