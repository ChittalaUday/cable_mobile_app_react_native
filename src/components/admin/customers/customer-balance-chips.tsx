import type { CustomerBalanceFilter } from '@/lib/hooks/common/use-customer-filters';
import * as React from 'react';
import { Pressable, Text, View } from '@/components/ui';

const OPTIONS: { key: CustomerBalanceFilter; label: string; tint: string }[] = [
  { key: 'any', label: 'All', tint: 'bg-primary-500 border-primary-500' },
  { key: 'due', label: 'Due', tint: 'bg-red-600 border-red-600' },
  { key: 'advance', label: 'Advance', tint: 'bg-green-600 border-green-600' },
  { key: 'clear', label: 'All clear', tint: 'bg-neutral-600 border-neutral-600' },
];

/** Splits the list by connection balance, coloured the way the card shows it. */
export function CustomerBalanceChips({ value, onChange }: {
  value: CustomerBalanceFilter;
  onChange: (value: CustomerBalanceFilter) => void;
}) {
  return (
    <View className="flex-row gap-1.5" accessibilityRole="radiogroup">
      {OPTIONS.map(option => (
        <Pressable
          key={option.key}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === option.key }}
          onPress={() => onChange(option.key)}
          testID={`customers-balance-${option.key}`}
          className={`flex-1 items-center rounded-lg border py-1.5 ${value === option.key ? option.tint : 'border-border bg-card'}`}
        >
          <Text className={`text-[11px] font-extrabold ${value === option.key ? 'text-white' : 'text-foreground'}`}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
