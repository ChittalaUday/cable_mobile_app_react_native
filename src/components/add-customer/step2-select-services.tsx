import type { ServiceOption } from '@/lib/hooks/stores/use-add-customer-store';
import { InformationCircleIcon, Layers01Icon, Tv01Icon, Tv02Icon, Wifi01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { View } from 'react-native';
import { colors, Pressable, Text } from '@/components/ui';
import { useAddCustomerStore } from '@/lib/hooks/stores/use-add-customer-store';

const serviceCards: {
  id: ServiceOption;
  title: string;
  desc: string;
  icon: typeof Tv01Icon;
}[] = [
  { id: 'cable', title: 'Cable TV', desc: 'Live TV channels, movies and entertainment', icon: Tv01Icon },
  { id: 'broadband', title: 'Broadband Internet', desc: 'High speed internet', icon: Wifi01Icon },
  { id: 'iptv', title: 'IPTV / OTT', desc: 'Premium content & OTT apps', icon: Tv02Icon },
  { id: 'combo', title: 'Combo Plan', desc: 'TV + Internet + IPTV', icon: Layers01Icon },
];

export function Step2SelectServices() {
  const step2 = useAddCustomerStore(state => state.step2);
  const setStep2 = useAddCustomerStore(state => state.setStep2);

  const toggleService = (id: ServiceOption) => {
    const exists = step2.selectedServices.includes(id);
    let updated: ServiceOption[];

    if (exists) {
      if (step2.selectedServices.length === 1)
        return;
      updated = step2.selectedServices.filter(s => s !== id);
    }
    else {
      updated = [...step2.selectedServices, id];
    }

    setStep2({ selectedServices: updated });
  };

  return (
    <View className="gap-y-3.5">
      {serviceCards.map((card) => {
        const isSelected = step2.selectedServices.includes(card.id);
        return (
          <Pressable
            key={card.id}
            onPress={() => toggleService(card.id)}
            className={`flex-row items-center rounded-2xl border p-4 transition-all ${
              isSelected
                ? 'border-[#F95716] bg-[#FFF2EB] dark:border-orange-600 dark:bg-orange-950/40'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <View
              className={`size-11 items-center justify-center rounded-xl ${
                isSelected ? 'bg-[#F95716]' : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            >
              <HugeiconsIcon
                icon={card.icon}
                size={22}
                color={isSelected ? colors.white : '#F95716'}
              />
            </View>

            <View className="ml-3.5 flex-1 pr-2">
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                {card.title}
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {card.desc}
              </Text>
            </View>

            <View
              className={`size-5 items-center justify-center rounded-md border ${
                isSelected
                  ? 'border-[#F95716] bg-[#F95716]'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              {isSelected && <Text className="text-xs font-bold text-white">✓</Text>}
            </View>
          </Pressable>
        );
      })}

      <View className="mt-2 flex-row items-center rounded-xl border border-orange-200 bg-[#FFF5EE] p-3.5 dark:border-orange-900/50 dark:bg-orange-950/30">
        <HugeiconsIcon icon={InformationCircleIcon} size={18} color="#F95716" />
        <Text className="ml-2.5 flex-1 text-xs font-medium text-orange-900 dark:text-orange-300">
          You can select multiple services and configure packages for each.
        </Text>
      </View>
    </View>
  );
}
