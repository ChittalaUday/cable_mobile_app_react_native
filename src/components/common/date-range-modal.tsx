import * as React from 'react';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarMonth } from '@/components/common/calendar-month';
import { Button, Text, View } from '@/components/ui';

type Props = {
  visible: boolean;
  /** Inclusive local days, `YYYY-MM-DD`. */
  from: string | null;
  to: string | null;
  onApply: (from: string | null, to: string | null) => void;
  onClose: () => void;
};

/**
 * A month grid for picking a range without a native picker: tap a first day,
 * tap a last day (or the same one for a single day), Apply. Tapping again
 * starts over.
 */
export function DateRangeModal({ visible, from, to, onApply, onClose }: Props) {
  if (!visible)
    return null;

  return <VisibleDateRange from={from} onApply={onApply} onClose={onClose} to={to} />;
}

function VisibleDateRange({ from, to, onApply, onClose }: Omit<Props, 'visible'>) {
  const insets = useSafeAreaInsets();
  const [start, setStart] = React.useState<string | null>(from);
  const [end, setEnd] = React.useState<string | null>(to);
  const [month, setMonth] = React.useState(() => {
    const anchor = from === null ? new Date() : new Date(`${from}T00:00:00`);
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const pick = (key: string) => {
    if (start === null || end !== null) {
      setStart(key);
      setEnd(null);
    }
    else if (key < start) {
      setEnd(start);
      setStart(key);
    }
    else {
      setEnd(key);
    }
  };

  return (
    <Modal animationType="slide" transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl border-t border-border bg-surface px-5 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }} testID="date-range-modal">
          <Text className="text-xl font-extrabold text-foreground">Pick dates</Text>
          <Text className="mb-3 text-xs text-muted-foreground">
            {start === null ? 'Tap the first day' : end === null ? 'Tap the last day, or Apply for just this day' : `${start} to ${end}`}
          </Text>

          <CalendarMonth
            locale="en-IN"
            month={month}
            nextMonthLabel="Next month"
            onMonthChange={setMonth}
            onSelect={pick}
            previousMonthLabel="Previous month"
            selectionEnd={end}
            selectionStart={start}
          />

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancel" variant="outline" size="lg" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button label="Apply" size="lg" disabled={start === null} onPress={() => onApply(start, end ?? start)} testID="date-range-apply" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
