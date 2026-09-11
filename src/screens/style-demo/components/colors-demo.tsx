import * as React from 'react';
import { Text, View } from '@/components/ui';

export function ColorsDemo() {
  return (
    <View className="flex-row flex-wrap gap-3">
      <View className="size-16 items-center justify-center rounded-xl bg-primary-500">
        <Text className="text-xs font-bold text-white">Primary</Text>
      </View>
      <View className="size-16 items-center justify-center rounded-xl bg-warning-500">
        <Text className="text-xs font-bold text-white">Warning</Text>
      </View>
      <View className="size-16 items-center justify-center rounded-xl bg-danger-500">
        <Text className="text-xs font-bold text-white">Danger</Text>
      </View>
      <View className="size-16 items-center justify-center rounded-xl bg-success-500">
        <Text className="text-xs font-bold text-white">Success</Text>
      </View>
    </View>
  );
}
