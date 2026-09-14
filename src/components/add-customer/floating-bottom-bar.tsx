import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, Text } from '@/components/ui';

export type FloatingBottomBarProps = {
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function FloatingBottomBar({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel = 'Back',
  onSecondaryPress,
  loading = false,
  disabled = false,
}: FloatingBottomBarProps) {
  const insets = useSafeAreaInsets();

  const secText = secondaryLabel.includes('Back') && !secondaryLabel.includes('←')
    ? `← ${secondaryLabel}`
    : secondaryLabel;

  const primText = primaryLabel.includes('Next') && !primaryLabel.includes('→')
    ? `${primaryLabel} →`
    : primaryLabel;

  return (
    <View
      className="absolute inset-x-0 bottom-0 z-50 border-t border-orange-100/60 bg-[#FFF9F5] px-5 pt-3.5 dark:border-neutral-800 dark:bg-neutral-900"
      style={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}
    >
      <View className="flex-row items-center gap-3">
        {onSecondaryPress && (
          <Pressable
            accessibilityRole="button"
            onPress={onSecondaryPress}
            disabled={loading}
            className="flex-1 items-center justify-center rounded-2xl bg-[#FDEBE0] px-4 py-3.5 active:bg-orange-200 dark:bg-neutral-800"
          >
            <Text className="text-sm font-extrabold text-[#F95716] dark:text-orange-400">
              {secText}
            </Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryPress}
          disabled={disabled || loading}
          className={`flex-1 flex-row items-center justify-center rounded-2xl px-4 py-3.5 ${
            disabled || loading ? 'bg-orange-300 opacity-60' : 'bg-[#F95716] active:bg-orange-600'
          }`}
        >
          {loading
            ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              )
            : (
                <Text className="text-sm font-extrabold text-white">
                  {primText}
                </Text>
              )}
        </Pressable>
      </View>
    </View>
  );
}
