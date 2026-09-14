import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Text } from '@/components/ui';

export type StepHeaderProps = {
  currentStep: number;
  totalSteps?: number;
  title: string;
  subtitle: string;
  onBack?: () => void;
};

export function StepHeader({
  currentStep,
  totalSteps = 6,
  title,
  subtitle,
  onBack,
}: StepHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-b border-orange-100/60 bg-[#FFF9F5] dark:border-neutral-800 dark:bg-neutral-900"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      {/* Top Header Row with Back Button, Center Title, and Step Progress Pill */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Pressable
          accessibilityRole="button"
          onPress={onBack || (() => router.back())}
          className="size-9 items-center justify-center rounded-full border border-orange-200/50 bg-white active:bg-orange-50 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={18} color={colors.neutral[800]} />
        </Pressable>

        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
          Add Customer
        </Text>

        <Text className="text-xs font-extrabold text-[#F95716]">
          {currentStep}
          /
          {totalSteps}
        </Text>
      </View>

      {/* 6-Segment Orange Progress Bar */}
      <View className="flex-row items-center gap-1.5 px-4 py-1.5">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum <= currentStep;
          return (
            <View
              key={stepNum}
              className={`h-2 flex-1 rounded-full ${
                isCompleted ? 'bg-[#F95716]' : 'bg-[#FDE4D4] dark:bg-neutral-800'
              }`}
            />
          );
        })}
      </View>

      {/* Section Title & Subtitle */}
      <View className="px-4 pt-1.5 pb-3">
        <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">{subtitle}</Text>
      </View>
    </View>
  );
}
