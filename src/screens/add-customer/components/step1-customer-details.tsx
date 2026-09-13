import type { CustomerType } from '../use-add-customer-store';
import * as React from 'react';

import { View } from 'react-native';
import { Input, Pressable, Select, Text } from '@/components/ui';
import { useAddCustomerStore } from '../use-add-customer-store';

const areaOptions = [
  { label: 'Mandapeta Central', value: 'Mandapeta Central' },
  { label: 'Vijayawada North', value: 'Vijayawada North' },
  { label: 'Rajahmundry Line 4', value: 'Rajahmundry Line 4' },
  { label: 'Kakinada Main Road', value: 'Kakinada Main Road' },
  { label: 'Guntur Ring Road', value: 'Guntur Ring Road' },
];

export type Step1CustomerDetailsProps = {
  errors: { name?: string; phone?: string; address?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ name?: string; phone?: string; address?: string }>>;
};

export function Step1CustomerDetails({ errors, setErrors }: Step1CustomerDetailsProps) {
  const step1 = useAddCustomerStore(state => state.step1);
  const setStep1 = useAddCustomerStore(state => state.setStep1);

  return (
    <View className="gap-y-4">
      <Input
        label="Full Name *"
        placeholder="Enter customer name"
        value={step1.name}
        onChangeText={(name) => {
          setStep1({ name });
          if (errors.name)
            setErrors(prev => ({ ...prev, name: undefined }));
        }}
        error={errors.name}
      />

      <Input
        label="Mobile Number *"
        placeholder="10 digit mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        value={step1.phone}
        onChangeText={(phone) => {
          setStep1({ phone });
          if (errors.phone)
            setErrors(prev => ({ ...prev, phone: undefined }));
        }}
        error={errors.phone}
      />

      <Input
        label="Alternate Number"
        placeholder="Optional"
        keyboardType="phone-pad"
        maxLength={10}
        value={step1.alternatePhone}
        onChangeText={alternatePhone => setStep1({ alternatePhone })}
      />

      <Input
        label="Address *"
        placeholder="House no, Street, Area Landmark (optional)"
        value={step1.address}
        onChangeText={(address) => {
          setStep1({ address });
          if (errors.address)
            setErrors(prev => ({ ...prev, address: undefined }));
        }}
        error={errors.address}
      />

      <Select
        label="Area / Location *"
        options={areaOptions}
        value={step1.area}
        onSelect={val => setStep1({ area: String(val) })}
      />

      <View className="mt-1">
        <Text className="mb-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
          Customer Type
        </Text>
        <View className="flex-row items-center gap-3">
          {(['individual', 'business'] as CustomerType[]).map((type) => {
            const isSelected = step1.customerType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setStep1({ customerType: type })}
                className={`flex-1 flex-row items-center justify-center rounded-2xl border px-4 py-3.5 ${
                  isSelected
                    ? 'border-[#F95716] bg-[#FFF2EB] dark:bg-orange-950/40'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <View
                  className={`mr-2.5 size-4 items-center justify-center rounded-full border ${
                    isSelected ? 'border-[#F95716] bg-[#F95716]' : 'border-neutral-400'
                  }`}
                >
                  {isSelected && <View className="size-1.5 rounded-full bg-white" />}
                </View>
                <Text
                  className={`text-xs font-extrabold capitalize ${
                    isSelected ? 'text-[#F95716] dark:text-orange-400' : 'text-neutral-800 dark:text-white'
                  }`}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
