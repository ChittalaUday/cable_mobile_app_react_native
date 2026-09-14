import * as React from 'react';

import { MoreView } from '@/components/admin/more-view';
import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';

export function AdminMoreTab() {
  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <MoreView />
    </View>
  );
}

export default AdminMoreTab;
