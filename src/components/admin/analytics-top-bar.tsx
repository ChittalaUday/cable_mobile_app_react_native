import { ArrowLeft01Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { colors, Pressable, Text, View } from '@/components/ui';

export function AnalyticsTopBar({ period, onBack, onPeriod }: { period: string; onBack: () => void; onPeriod: () => void }) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} className="size-9 items-center justify-center">
        <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.charcoal[900]} strokeWidth={2.2} />
      </Pressable>
      <Text className="flex-1 text-[17px] font-bold text-foreground">Dashboard</Text>
      <Pressable accessibilityRole="button" onPress={onPeriod} className="flex-row items-center gap-2 rounded-xl bg-card px-3 py-2">
        <HugeiconsIcon icon={Calendar03Icon} size={16} color={colors.primary[600]} strokeWidth={2.2} />
        <Text className="text-[13px] font-semibold text-charcoal-800">{period}</Text>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} color={colors.neutral[400]} strokeWidth={2.4} style={{ transform: [{ rotate: '-90deg' }] }} />
      </Pressable>
    </View>
  );
}
