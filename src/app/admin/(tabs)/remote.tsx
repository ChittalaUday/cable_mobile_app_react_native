import * as React from 'react';

import { RemoteControl } from '@/components/remote/remote-control';
import { FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';

export default function AdminRemoteTab() {
  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="p-4 pb-8"
      >
        <RemoteControl />
      </ScrollView>
    </View>
  );
}
