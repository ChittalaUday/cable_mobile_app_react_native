/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { TextProps, TextStyle } from 'react-native';
import type { TxKeyPath } from '@/lib/i18n';
import * as React from 'react';
import { I18nManager, Text as NNText, StyleSheet } from 'react-native';

import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';
import { translate } from '@/lib/i18n';

/**
 * Type styles by role, so a button label is the same size on every button and a
 * caption the same size on every card, instead of each screen picking a size.
 * With no `variant` the text keeps its plain body style.
 */
const text = tv({
  base: 'font-inter text-base font-normal text-black dark:text-white',
  variants: {
    variant: {
      'body': '',
      'caption': 'text-xs',
      'label': 'text-sm font-semibold',
      'title': 'text-lg font-bold',
      'button': 'text-sm font-semibold',
      'button-lg': 'text-base font-semibold',
      'button-sm': 'text-xs font-semibold',
    },
  },
});

export type TextVariant = NonNullable<Parameters<typeof text>[0]>['variant'];

type Props = {
  className?: string;
  tx?: TxKeyPath;
  variant?: TextVariant;
} & TextProps;

export function Text({
  className = '',
  style,
  tx,
  variant,
  children,
  ...props
}: Props) {
  const textStyle = React.useMemo(
    () =>
      twMerge(text({ variant }), className),
    [variant, className],
  );

  const nStyle = React.useMemo(
    () =>
      StyleSheet.flatten([
        {
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]) as TextStyle,
    [style],
  );
  return (
    <NNText className={textStyle} style={nStyle} {...props}>
      {tx ? translate(tx) : children}
    </NNText>
  );
}
