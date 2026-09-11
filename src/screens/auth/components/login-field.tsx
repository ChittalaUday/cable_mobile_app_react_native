/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { IconSvgElement } from '@hugeicons/react-native';
import type { TextInputProps } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { I18nManager, TextInput } from 'react-native';

import { colors, View } from '@/components/ui';

type LoginFieldProps = {
  icon: IconSvgElement;
  right?: React.ReactNode;
} & TextInputProps;

export function LoginField({ icon, right, ...inputProps }: LoginFieldProps) {
  return (
    <View className="h-12 flex-row items-center gap-3 rounded-2xl bg-neutral-100 px-4 dark:bg-neutral-800">
      <HugeiconsIcon icon={icon} size={20} color={colors.neutral[500]} strokeWidth={1.8} />
      <TextInput
        placeholderTextColor={colors.neutral[400]}
        className="font-inter h-full flex-1 text-[15px] font-medium text-foreground"
        style={{
          textAlign: I18nManager.isRTL ? 'right' : 'left',
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
          includeFontPadding: false,
        }}
        {...inputProps}
      />
      {right}
    </View>
  );
}
