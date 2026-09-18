import * as React from 'react';
import { ScreenHeader } from '@/components/common/shell';
import { CollectionsList } from '@/components/payments/collections-list';
import { View } from '@/components/ui';

export default function AdminReceiptsRoute() {
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Receipts" subtitle="Every collection in your areas" showBack withSafeArea />
      <CollectionsList basePath="/admin" />
    </View>
  );
}
