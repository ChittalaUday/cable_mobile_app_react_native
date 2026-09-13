import type { BoxCategory } from '../use-add-customer-store';
import { QrCodeIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { View } from 'react-native';
import { Input, Pressable, Select, Text } from '@/components/ui';
import { useAddCustomerStore } from '../use-add-customer-store';

const modelOptions = [
  { label: 'Tata Play HD STB', value: 'Tata Play HD' },
  { label: 'Airtel Digital Box', value: 'Airtel Digital' },
  { label: 'NXT Digital STB', value: 'NXT Digital' },
  { label: 'Hathway Fiber ONT', value: 'Hathway Fiber' },
];

export function Step4DeviceDetails() {
  const step4 = useAddCustomerStore(state => state.step4);
  const setStep4 = useAddCustomerStore(state => state.setStep4);

  const handleScanSimulated = () => {
    const randomSerial = `STB${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomVc = `VC${Math.floor(10000000 + Math.random() * 90000000)}`;
    setStep4({ stbNumber: randomSerial, vcNumber: randomVc });
  };

  return (
    <View>
      <View className="mb-4 flex-row items-center gap-2">
        {[
          { id: 'stb', label: 'Set-top Box' },
          { id: 'ont', label: 'ONT / Router' },
          { id: 'iptv_device', label: 'IPTV Device' },
        ].map((tab) => {
          const isSelected = step4.activeDeviceTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setStep4({ activeDeviceTab: tab.id as BoxCategory })}
              className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 ${
                isSelected
                  ? 'border-[#F95716] bg-[#F95716] text-white'
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
              }`}
            >
              <Text
                className={`text-xs font-extrabold ${
                  isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleScanSimulated}
        className="mb-5 items-center justify-center rounded-2xl border border-dashed border-[#F95716]/60 bg-[#FFF2EB] p-4 dark:bg-orange-950/30"
      >
        <View className="size-10 items-center justify-center rounded-full bg-[#F95716]/10">
          <HugeiconsIcon icon={QrCodeIcon} size={22} color="#F95716" />
        </View>
        <Text className="mt-2 text-xs font-extrabold text-[#F95716] dark:text-orange-400">
          Scan Serial Number
        </Text>
        <Text className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          Use camera to scan or enter manually
        </Text>
      </Pressable>

      <View className="gap-y-4">
        <Input
          label="Set-top Box Serial Number *"
          placeholder="Enter serial number"
          value={step4.stbNumber}
          onChangeText={stbNumber => setStep4({ stbNumber })}
        />

        <Input
          label="VC Number"
          placeholder="Enter VC number"
          value={step4.vcNumber}
          onChangeText={vcNumber => setStep4({ vcNumber })}
        />

        <Select
          label="Device Model"
          options={modelOptions}
          value={step4.deviceModel}
          onSelect={val => setStep4({ deviceModel: String(val) })}
        />

        <Input
          label="Installation Date"
          placeholder="YYYY-MM-DD"
          value={step4.installationDate}
          onChangeText={installationDate => setStep4({ installationDate })}
        />
      </View>
    </View>
  );
}
