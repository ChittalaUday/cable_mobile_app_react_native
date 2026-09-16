import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { colors, Pressable, SafeAreaView, Text, View } from '@/components/ui';

export type ScreenHeaderProps = {
  /** Main screen title displayed prominently. */
  title: string;
  /** Optional secondary subtitle or counter. */
  subtitle?: string;
  /** Whether to show the navigation back button. Default: false. */
  showBack?: boolean;
  /** Custom onBack handler. Defaults to router.back(). */
  onBack?: () => void;
  /** Slot for action buttons on the right side of the header. */
  rightAction?: React.ReactNode;
  /** Optional content rendered below the header row (search bar, filter tabs, etc.). */
  children?: React.ReactNode;
  /** Optional extra classes on the header container. */
  className?: string;
  /** Whether to wrap the header with top SafeAreaView. Default: false. */
  withSafeArea?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  children,
  className = '',
  withSafeArea = false,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
    else {
      router.back();
    }
  };

  const content = (
    <View className={`px-4 py-3 ${className}`}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          {showBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={handleBack}
              className="size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card active:bg-muted"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
            </Pressable>
          )}
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
              {title}
            </Text>
            {subtitle
              ? (
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {subtitle}
                  </Text>
                )
              : null}
          </View>
        </View>

        {rightAction
          ? (
              <View className="shrink-0 flex-row items-center gap-2">
                {rightAction}
              </View>
            )
          : null}
      </View>

      {children ? <View className="mt-2.5">{children}</View> : null}
    </View>
  );

  if (withSafeArea) {
    return (
      <SafeAreaView edges={['top']} className="bg-card">
        {content}
      </SafeAreaView>
    );
  }

  return content;
}
