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
    <Card className="p-3.5">
      <SectionHeader icon={Location01Icon} tint="orange" title="Top Areas by Customers" />
      {areas.length === 0
        ? <Text className="mt-4 text-xs text-muted-foreground">No customer addresses on file yet.</Text>
        : (
            <View className="mt-2">
              {areas.map((area, index) => (
                <Pressable key={area.id} accessibilityRole="button" onPress={() => onPress(area)} className="flex-row items-center gap-2.5 py-2.5">
                  <View className="size-6 items-center justify-center rounded-full bg-neutral-100">
                    <Text className="text-[10px] font-semibold text-charcoal-600">{index + 1}</Text>
                  </View>
                  <Text className="w-[74px] text-xs text-charcoal-800" numberOfLines={1}>{area.name}</Text>
                  <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                    <View className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max((area.count / peak) * 100, 6)}%` }} />
                  </View>
                  <Text className="w-10 text-right text-xs font-semibold text-foreground">{grouped(area.count)}</Text>
                  <Text className="w-7 text-right text-[10px] text-muted-foreground">
                    {area.share}
                    %
                  </Text>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.neutral[400]} strokeWidth={2.2} />
                </Pressable>
              ))}
            </View>
          )}
    </Card>
  );
}
