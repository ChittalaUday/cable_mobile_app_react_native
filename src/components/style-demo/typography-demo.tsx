import * as React from 'react';
import { Text, View } from '@/components/ui';

export function TypographyDemo() {
  return (
    <View className="gap-2">
      <Text className="text-3xl font-bold">Heading 1 (3XL)</Text>
      <Text className="text-2xl font-bold">Heading 2 (2XL)</Text>
      <Text className="text-xl font-semibold">Heading 3 (XL)</Text>
      <Text className="text-base">Body Base Text</Text>
      <Text className="text-sm text-muted-foreground">Small Muted Text</Text>
    </View>
  );
}
