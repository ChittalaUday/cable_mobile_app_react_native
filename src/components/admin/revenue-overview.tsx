import type { AdminDashboard, RevenueRange } from '@/lib/utils/admin-stats';
import { ChartBarLineIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { RevenueBars } from '@/components/common/charts';
import { Card, NAVY, TINT } from '@/components/common/shell';
import { Pressable, Text, View } from '@/components/ui';

const RANGES: { key: RevenueRange; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export function RevenueOverview({ revenue, range, onRange }: {
  revenue: AdminDashboard['revenue'];
  range: RevenueRange;
  onRange: (range: RevenueRange) => void;
}) {
  return (
    <Card className="p-3.5">
      <View className="flex-row items-center gap-2.5">
        <View className="size-7 items-center justify-center rounded-lg" style={{ backgroundColor: TINT.orange.bg }}>
          <HugeiconsIcon icon={ChartBarLineIcon} size={16} color={TINT.orange.fg} strokeWidth={2.2} />
        </View>
        <Text className="flex-1 text-[15px] font-bold text-foreground">Revenue Overview</Text>
        <View className="flex-row rounded-xl bg-neutral-100 p-0.5">
          {RANGES.map(option => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: option.key === range }}
              onPress={() => onRange(option.key)}
              className="rounded-[10px] px-2.5 py-1.5"
              style={option.key === range ? { backgroundColor: NAVY } : undefined}
            >
              <Text className={`text-[11px] font-semibold ${option.key === range ? 'text-white' : 'text-muted-foreground'}`}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="mt-4">
        <RevenueBars bars={revenue[range]} />
      </View>
    </Card>
  );
}
