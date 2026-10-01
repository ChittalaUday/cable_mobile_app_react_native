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
        header={(
          <View className="gap-1 p-4">
            <Text className="text-2xl font-bold text-foreground">My Collections</Text>
            <Text className="text-sm text-muted-foreground">Every receipt you have issued, newest first</Text>
          </View>
        )}
      />
    </View>
  );
}
