import type { PressableProps } from 'react-native';
import type { VariantProps } from 'tailwind-variants';
import * as React from 'react';
import { Pressable } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from './text';

const pill = tv({
  slots: {
    container: 'items-center justify-center rounded-full border active:opacity-80',
    label: 'text-xs font-bold',
  },
  variants: {
    selected: {
      true: {
        container: 'border-primary-600 bg-primary-600',
        label: 'text-white',
      },
      false: {
        container: 'border-border bg-card',
        label: 'text-foreground',
      },
    },
    size: {
      sm: { container: 'px-3 py-1.5' },
      md: { container: 'px-3.5 py-2' },
    },
    variant: {
      neutral: {},
      soft: {},
      solid: {},
    },
    disabled: {
      true: { container: 'opacity-50' },
    },
  },
  compoundVariants: [
    {
      selected: true,
      variant: 'soft',
      class: {
        container: 'border-primary-500 bg-primary-50 dark:bg-primary-950/40',
        label: 'text-primary-700 dark:text-primary-300',
      },
    },
    {
      selected: true,
      variant: 'neutral',
      class: {
        container: 'border-foreground bg-foreground',
        label: 'text-background',
      },
    },
  ],
  defaultVariants: {
    disabled: false,
    selected: false,
    size: 'md',
    variant: 'solid',
  },
});

type PillVariants = VariantProps<typeof pill>;
type Props = {
  label: string;
  textClassName?: string;
} & PillVariants & Omit<PressableProps, 'accessibilityState' | 'children' | 'disabled'>;

export function Pill({ accessibilityRole = 'button', className = '', disabled = false, label, selected = false, size = 'md', testID, textClassName = '', variant = 'solid', ...props }: Props) {
  const styles = pill({ disabled, selected, size, variant });

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityRole === 'checkbox' ? { checked: selected } : { selected }}
      className={styles.container({ className })}
      disabled={disabled}
      testID={testID}
      {...props}
    >
      <Text className={styles.label({ className: textClassName })} testID={testID ? `${testID}-label` : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
