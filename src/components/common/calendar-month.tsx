import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import * as React from 'react';

import { Pressable, Text, ThemedIcon, View } from '@/components/ui';
import { dayKey } from '@/lib/utils/round-filters';

const WEEKDAYS = [
  { key: 'sun', label: 'S' },
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
];

type Props = {
  locale: string;
  minimumDate?: string;
  month: Date;
  nextMonthLabel: string;
  onMonthChange: (month: Date) => void;
  onSelect: (date: string) => void;
  previousMonthLabel: string;
  selectionEnd?: string | null;
  selectionStart: string | null;
  testIDPrefix?: string;
};

export function CalendarMonth({ locale, minimumDate, month, nextMonthLabel, onMonthChange, onSelect, previousMonthLabel, selectionEnd = null, selectionStart, testIDPrefix = '' }: Props) {
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: first }, (_, index) => ({ date: null, key: `blank-${index}` })),
    ...Array.from({ length: days }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      return { date, key: dayKey(date) };
    }),
  ];
  const minimumMonth = minimumDate === undefined ? null : new Date(Number(minimumDate.slice(0, 4)), Number(minimumDate.slice(5, 7)) - 1, 1);
  const canGoPrevious = minimumMonth === null || month.getTime() > minimumMonth.getTime();
  const shift = (by: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const today = dayKey(new Date());

  return (
    <>
      <View className="flex-row items-center justify-between pb-2">
        <Pressable
          accessibilityLabel={previousMonthLabel}
          accessibilityRole="button"
          className="size-9 items-center justify-center rounded-full active:bg-muted disabled:opacity-35"
          disabled={!canGoPrevious}
          hitSlop={10}
          onPress={() => shift(-1)}
          testID={`${testIDPrefix}previous-month`}
        >
          <ThemedIcon icon={ArrowLeft01Icon} size={18} colorClassName="text-muted-foreground" />
        </Pressable>
        <Text className="text-[15px] font-bold text-foreground">
          {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          accessibilityLabel={nextMonthLabel}
          accessibilityRole="button"
          className="size-9 items-center justify-center rounded-full active:bg-muted"
          hitSlop={10}
          onPress={() => shift(1)}
          testID={`${testIDPrefix}next-month`}
        >
          <ThemedIcon icon={ArrowRight01Icon} size={18} colorClassName="text-muted-foreground" />
        </Pressable>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map(weekday => (
          <View key={weekday.key} className="flex-1 items-center py-1">
            <Text className="text-[11px] font-bold text-muted-foreground">{weekday.label}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((cell) => {
          const { date } = cell;
          if (date === null)
            return <View key={cell.key} style={{ width: `${100 / 7}%` }} />;

          const key = cell.key;
          const disabled = minimumDate !== undefined && key < minimumDate;
          const selected = key === selectionStart || key === selectionEnd;
          const inside = selectionStart !== null && selectionEnd !== null && key > selectionStart && key < selectionEnd;
          return (
            <View key={key} style={{ width: `${100 / 7}%` }} className={`items-center py-0.5 ${inside ? 'bg-primary-500/15' : ''}`}>
              <Pressable
                accessibilityLabel={key}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                className={`size-10 items-center justify-center rounded-full ${selected ? 'bg-primary-500' : ''} ${disabled ? 'opacity-35' : ''}`}
                disabled={disabled}
                onPress={() => onSelect(key)}
                testID={`${testIDPrefix}day-${key}`}
              >
                <Text className={`text-sm ${selected ? 'font-bold text-white' : key === today ? 'font-bold text-primary-600' : 'text-foreground'}`}>{date.getDate()}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </>
  );
}
