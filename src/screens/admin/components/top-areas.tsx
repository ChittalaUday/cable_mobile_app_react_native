import type { AreaRow } from '@/lib/utils/admin-stats';
import { ArrowRight01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { Card, SectionHeader } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';
import { grouped } from '@/lib/utils/admin-format';

export function TopAreas({ areas, onPress }: { areas: AreaRow[]; onPress: (area: AreaRow) => void }) {
  const peak = Math.max(...areas.map(area => area.count), 1);
  return (
    <Card className="p-4">
      <SectionHeader icon={Location01Icon} tint="orange" title="Top Areas by Customers" />
      {areas.length === 0
        ? <Text className="mt-4 text-xs text-muted-foreground">No customer addresses on file yet.</Text>
        : (
            <View className="mt-3 gap-1">
              {areas.map((area, index) => (
                <Pressable key={area.id} accessibilityRole="button" onPress={() => onPress(area)} className="flex-row items-center gap-3 py-3">
                  <View className="size-7 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <Text className="text-xs font-bold text-foreground">{index + 1}</Text>
                  </View>
                  <Text className="w-24 text-sm font-bold text-foreground" numberOfLines={1}>{area.name}</Text>
                  <View className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <View className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max((area.count / peak) * 100, 6)}%` }} />
                  </View>
                  <Text className="w-12 text-right text-sm font-extrabold text-foreground">{grouped(area.count)}</Text>
                  <Text className="w-8 text-right text-xs font-semibold text-muted-foreground">
                    {area.share}
                    %
                  </Text>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[400]} strokeWidth={2.2} />
                </Pressable>
              ))}
            </View>
          )}
    </Card>
  );
}
