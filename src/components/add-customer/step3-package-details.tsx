import { Add01Icon, Tv01Icon, Tv02Icon, Wifi01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { View } from 'react-native';

import { colors, Pressable, Text } from '@/components/ui';
import { useAddCustomerStore } from '@/lib/hooks/stores/use-add-customer-store';

const cablePackages = [
  { name: 'Basic', price: 199, desc: '100+ Channels' },
  { name: 'Standard', price: 299, desc: '200+ Channels + HD' },
  { name: 'Premium', price: 399, desc: '300+ Channels + HD + Regional' },
  { name: 'Custom Plan', price: 499, desc: 'Set custom package' },
];

export function Step3PackageDetails() {
  const step3 = useAddCustomerStore(state => state.step3);
  const setStep3 = useAddCustomerStore(state => state.setStep3);
  const setCurrentStep = useAddCustomerStore(state => state.setCurrentStep);

  const activeTab = step3.activeTab;

  return (
    <View>
      <View className="mb-4 flex-row items-center rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {[
          { id: 'cable', label: 'Cable TV', icon: Tv01Icon },
          { id: 'broadband', label: 'Internet', icon: Wifi01Icon },
          { id: 'iptv', label: 'IPTV', icon: Tv02Icon },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setStep3({ activeTab: tab.id as any })}
              className={`flex-1 flex-row items-center justify-center rounded-xl px-2 py-2.5 ${
                isActive ? 'bg-[#F95716]' : 'bg-transparent'
              }`}
            >
              <HugeiconsIcon
                icon={tab.icon}
                size={16}
                color={isActive ? colors.white : colors.neutral[500]}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-y-3">
        {cablePackages.map((pkg) => {
          const isSelected = step3.packageCable === pkg.name;
          return (
            <Pressable
              key={pkg.name}
              onPress={() =>
                setStep3({
                  packageCable: pkg.name,
                  packageCablePrice: pkg.price,
                })}
              className={`flex-row items-center justify-between rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-[#F95716] bg-[#FFF2EB] dark:border-orange-600 dark:bg-orange-950/40'
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
              }`}
            >
              <View className="flex-1 pr-3">
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                  {pkg.name}
                </Text>
                <Text className="mt-0.5 text-xs font-bold text-[#F95716] dark:text-orange-400">
                  ₹
                  {pkg.price}
                  {' '}
                  / month
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {pkg.desc}
                </Text>
              </View>

              <View
                className={`size-5 items-center justify-center rounded-full border ${
                  isSelected ? 'border-[#F95716] bg-[#F95716]' : 'border-neutral-400'
                }`}
              >
                {isSelected && <View className="size-2 rounded-full bg-white" />}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setCurrentStep(2)}
          className="mt-2 flex-row items-center justify-center rounded-2xl border border-dashed border-[#F95716]/60 bg-[#FFF2EB] py-3.5 dark:bg-orange-950/30"
        >
          <HugeiconsIcon icon={Add01Icon} size={18} color="#F95716" />
          <Text className="ml-2 text-xs font-extrabold text-[#F95716] dark:text-orange-400">
            + Add Another Service
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
