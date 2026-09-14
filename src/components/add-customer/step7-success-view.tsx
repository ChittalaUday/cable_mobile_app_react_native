import { Copy01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Pressable, Text } from '@/components/ui';
import { IMAGES } from '@/constants/assets';
import { useAddCustomerStore } from '@/lib/hooks/stores/use-add-customer-store';

export function Step7SuccessView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createdCustomerId = useAddCustomerStore(state => state.createdCustomerId);
  const resetForm = useAddCustomerStore(state => state.resetForm);
  const setCurrentStep = useAddCustomerStore(state => state.setCurrentStep);

  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddAnother = () => {
    resetForm();
    setCurrentStep(1);
  };

  const handleViewDetails = () => {
    router.push('/admin/customers/add/details');
  };

  return (
    <View className="items-center" style={{ paddingTop: Math.max(insets.top + 10, 20) }}>
      <View className="my-4 size-60 items-center justify-center">
        <Image
          source={IMAGES.addCustomerSuccessTechnician}
          className="size-full"
          resizeMode="contain"
        />
      </View>

      <Text className="text-center text-2xl font-extrabold text-neutral-900 dark:text-white">
        Customer Added Successfully!
      </Text>

      <View className="mt-4 w-full items-center justify-between rounded-2xl border border-orange-200 bg-[#FFF5EE] p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
        <Text className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
          Customer ID
        </Text>
        <View className="mt-1 flex-row items-center gap-2.5">
          <Text className="text-2xl font-extrabold text-[#F95716] dark:text-orange-400">
            {createdCustomerId || 'SSCN00101'}
          </Text>
          <Pressable
            onPress={handleCopy}
            className="size-8 items-center justify-center rounded-xl border border-orange-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
          >
            <HugeiconsIcon
              icon={Copy01Icon}
              size={16}
              color={copied ? colors.success[500] : '#F95716'}
            />
          </Pressable>
        </View>
      </View>

      <Text className="mt-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
        All details have been saved successfully.
      </Text>

      <View className="mt-6 w-full gap-y-3">
        <Pressable
          onPress={handleAddAnother}
          className="items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <Text className="text-xs font-extrabold text-neutral-800 dark:text-white">
            + Add Another Customer
          </Text>
        </Pressable>

        <Pressable
          onPress={handleViewDetails}
          className="items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <Text className="text-xs font-extrabold text-neutral-800 dark:text-white">
            📄 View Customer Details
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
