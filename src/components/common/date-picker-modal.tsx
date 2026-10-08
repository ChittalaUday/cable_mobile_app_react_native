import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarMonth } from '@/components/common/calendar-month';
import { Button, Text, View } from '@/components/ui';

type Props = {
  minimumDate?: string;
  onApply: (date: string) => void;
  onClose: () => void;
  value: string | null;
  visible: boolean;
};

function monthOf(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(year!, month! - 1, 1);
}

export function DatePickerModal({ minimumDate, onApply, onClose, value, visible }: Props) {
  if (!visible)
    return null;

  return <VisibleDatePicker minimumDate={minimumDate} onApply={onApply} onClose={onClose} value={value} />;
}

function VisibleDatePicker({ minimumDate, onApply, onClose, value }: Omit<Props, 'visible'>) {
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const anchor = value ?? minimumDate;
  const [month, setMonth] = React.useState(() => anchor === undefined ? new Date() : monthOf(anchor));
  const [selected, setSelected] = React.useState<string | null>(value);

  return (
    <Modal animationType="slide" transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-3xl border-t border-border bg-surface px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          testID="date-picker-modal"
        >
          <Text className="text-xl font-extrabold text-foreground">{t('date_picker.title')}</Text>
          <Text className="mb-3 text-xs text-muted-foreground">{t('date_picker.choose_future')}</Text>
          <CalendarMonth
            locale={i18n.resolvedLanguage?.startsWith('te') ? 'te-IN' : 'en-IN'}
            minimumDate={minimumDate}
            month={month}
            nextMonthLabel={t('date_picker.next_month')}
            onMonthChange={setMonth}
            onSelect={setSelected}
            previousMonthLabel={t('date_picker.previous_month')}
            selectionStart={selected}
            testIDPrefix="date-picker-"
          />
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <Button label={t('date_picker.cancel')} variant="outline" size="lg" onPress={onClose} testID="date-picker-cancel" />
            </View>
            <View className="flex-1">
              <Button label={t('date_picker.apply')} size="lg" disabled={selected === null} onPress={() => selected !== null && onApply(selected)} testID="date-picker-apply" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
