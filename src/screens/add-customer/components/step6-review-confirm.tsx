import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Pressable, Text } from '@/components/ui';
import { useAddCustomerStore } from '../use-add-customer-store';

export function Step6ReviewConfirm() {
  const store = useAddCustomerStore();
  const { step1, step3, step4, step5, setCurrentStep } = store;

  return (
    <View className="gap-y-4">
      <ReviewSectionCard
        title="Customer Information"
        onEdit={() => setCurrentStep(1)}
        items={[
          { label: 'Name', value: step1.name || 'Ramesh Kumar' },
          { label: 'Mobile', value: step1.phone || '9876543210' },
          { label: 'Alternate', value: step1.alternatePhone || '-' },
          { label: 'Address', value: step1.address || 'Mandapeta' },
          { label: 'Area', value: step1.area || 'Mandapeta' },
          { label: 'Type', value: step1.customerType || 'Individual' },
        ]}
      />

      <ReviewSectionCard
        title="Services & Packages"
        onEdit={() => setCurrentStep(2)}
        items={[
          { label: 'Cable TV', value: `${step3.packageCable} (₹${step3.packageCablePrice}/month)` },
          { label: 'Connection Date', value: step5.connectionDate || '12 Sep 2026' },
        ]}
      />

      <ReviewSectionCard
        title="Device Details"
        onEdit={() => setCurrentStep(4)}
        items={[
          { label: 'Serial Number', value: step4.stbNumber || 'STB123456789' },
          { label: 'VC Number', value: step4.vcNumber || 'VC987654' },
          { label: 'Model', value: step4.deviceModel || 'Tata Play HD' },
          { label: 'Installation Date', value: step4.installationDate || '12 Sep 2026' },
        ]}
      />

      <ReviewSectionCard
        title="Additional Information"
        onEdit={() => setCurrentStep(5)}
        items={[
          { label: 'Category', value: step5.categoryLocality || 'Mandapeta' },
          { label: 'Status', value: step5.status === 'active' ? 'Active' : 'Inactive' },
          { label: 'Due Date', value: `${step5.dueDate}st of every month` },
          { label: 'Notes', value: step5.notes || '-' },
        ]}
      />
    </View>
  );
}

function ReviewSectionCard({
  title,
  onEdit,
  items,
}: {
  title: string;
  onEdit: () => void;
  items: { label: string; value: string }[];
}) {
  return (
    <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="mb-3 flex-row items-center justify-between border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
        <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{title}</Text>
        <Pressable
          onPress={onEdit}
          className="flex-row items-center rounded-lg bg-[#FFF2EB] px-2.5 py-1 dark:bg-orange-950/40"
        >
          <HugeiconsIcon icon={PencilEdit02Icon} size={14} color="#F95716" />
          <Text className="ml-1 text-[11px] font-bold text-[#F95716] dark:text-orange-400">Edit</Text>
        </Pressable>
      </View>

      <View className="gap-y-1.5">
        {items.map(item => (
          <View key={item.label} className="flex-row justify-between">
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</Text>
            <Text className="max-w-[60%] text-right text-xs font-semibold text-neutral-800 dark:text-white">
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
