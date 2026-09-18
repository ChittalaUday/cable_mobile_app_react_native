import * as React from 'react';
import { ScreenHeader } from '@/components/common/shell';
import { CollectionsList } from '@/components/payments/collections-list';
import { View } from '@/components/ui';

export default function StaffReceiptsRoute() {
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Receipts" subtitle="Your round" showBack withSafeArea />
      <CollectionsList basePath="/staff" mineOnly />
    </View>
  );
}
