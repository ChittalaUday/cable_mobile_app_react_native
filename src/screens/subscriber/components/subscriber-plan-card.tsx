import * as React from 'react';

import { Card } from '@/components/common/shell';
import { Text, View } from '@/components/ui';

type ContentProps = {
  title: string;
  tabs: readonly string[];
  hero: readonly [string, string, string];
  metrics: readonly (readonly [string, string])[];
};

export function SubscriberPlanCard({ content }: { content: ContentProps }) {
  return (
    <View className="gap-4">
      <View className="gap-2 rounded-2xl bg-primary-600 p-5">
        <Text className="text-sm font-semibold text-primary-100">{content.hero[0]}</Text>
        <Text selectable className="text-4xl font-bold text-white">{content.hero[1]}</Text>
        <Text className="text-primary-100">{content.hero[2]}</Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {content.metrics.map(([label, value]) => (
          <Card key={label} className="min-w-[46%] flex-1 gap-1 border border-border p-4">
            <Text className="text-sm text-muted-foreground">{label}</Text>
            <Text selectable className="text-xl font-bold text-foreground">{value}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}
