import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Input, Pressable, Select, Text } from '@/components/ui';
import { useAddCustomerStore } from '../use-add-customer-store';

const localityOptions = [
  { label: 'Mandapeta', value: 'Mandapeta' },
  { label: 'Vijayawada Main', value: 'Vijayawada Main' },
  { label: 'Rajahmundry Sector 2', value: 'Rajahmundry Sector 2' },
  { label: 'Kakinada Town', value: 'Kakinada Town' },
];

const dueDateOptions = [
  { label: '1st of every month', value: '1' },
  { label: '5th of every month', value: '5' },
  { label: '10th of every month', value: '10' },
  { label: '15th of every month', value: '15' },
];

export function Step5AdditionalInfo() {
  const step5 = useAddCustomerStore(state => state.step5);
  const setStep5 = useAddCustomerStore(state => state.setStep5);

  return (
    <View className="gap-y-4">
      <Select
        label="Category / Locality"
        options={localityOptions}
        value={step5.categoryLocality}
        onSelect={val => setStep5({ categoryLocality: String(val) })}
      />

      <Input
        label="Connection Date"
        placeholder="YYYY-MM-DD"
        value={step5.connectionDate}
        onChangeText={connectionDate => setStep5({ connectionDate })}
      />

      <View>
        <Text className="mb-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
          Status
        </Text>
        <View className="flex-row items-center gap-3">
          {[
            { id: 'active', label: '✓ Active', activeStyle: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
            { id: 'inactive', label: 'Inactive', activeStyle: 'border-neutral-400 bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-white' },
          ].map((st) => {
            const isSelected = step5.status === st.id;
            return (
              <Pressable
                key={st.id}
                onPress={() => setStep5({ status: st.id as 'active' | 'inactive' })}
                className={`flex-1 items-center justify-center rounded-2xl border px-4 py-3.5 ${
                  isSelected
                    ? st.activeStyle
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    isSelected
                      ? st.id === 'active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-800 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {st.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Select
        label="Monthly Payment Due Date"
        options={dueDateOptions}
        value={step5.dueDate}
        onSelect={val => setStep5({ dueDate: String(val) })}
      />

      <Input
        label="Notes"
        placeholder="Any special notes (optional)"
        value={step5.notes}
        onChangeText={notes => setStep5({ notes })}
      />

      <View className="mt-1 flex-row items-center rounded-xl border border-orange-200 bg-[#FFF5EE] p-3.5 dark:border-orange-900/50 dark:bg-orange-950/30">
        <HugeiconsIcon icon={InformationCircleIcon} size={18} color="#F95716" />
        <Text className="ml-2.5 flex-1 text-xs font-medium text-orange-900 dark:text-orange-300">
          Monthly due date will help in tracking payments and generating reminders.
        </Text>
      </View>
    </View>
  );
}
