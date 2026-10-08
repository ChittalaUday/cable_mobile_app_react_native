/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { PressableProps, View } from 'react-native';
import type { VariantProps } from 'tailwind-variants';
import * as React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { tv } from 'tailwind-variants';
import colors from './colors';
import { Text } from './text';

const button = tv({
  slots: {
    container: 'my-2 flex flex-row items-center justify-center rounded-md px-4',
    label: 'text-center',
    indicator: 'h-6 text-white',
  },

  variants: {
    variant: {
      // Brand orange in both themes. A `dark:` background here would beat any
      // `bg-*` a caller passes, which is how buttons went white-on-white in dark.
      default: {
        container: 'bg-primary-600',
        label: 'text-white',
        indicator: 'text-white',
      },
      secondary: {
        container: 'bg-primary-600',
        label: 'text-secondary-600 dark:text-secondary-600',
        indicator: 'text-white',
      },
      outline: {
        container: 'border border-border',
        label: 'text-foreground',
        indicator: 'text-foreground',
      },
      destructive: {
        container: 'bg-red-600',
        label: 'text-white',
        indicator: 'text-white',
      },
      ghost: {
        container: 'bg-transparent',
        label: 'text-foreground underline',
        indicator: 'text-foreground',
      },
      link: {
        container: 'bg-transparent',
        label: 'text-foreground',
        indicator: 'text-foreground',
      },
    },
    size: {
      default: {
        container: 'h-10 px-4',
      },
      lg: {
        container: 'h-12 px-4',
      },
      sm: {
        container: 'h-8 px-3',
        indicator: 'h-2',
      },
      icon: { container: 'size-9' },
    },
    disabled: {
      true: {
        container: 'opacity-50',
      },
    },
    fullWidth: {
      true: {
        container: '',
      },
      false: {
        container: 'self-center',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
    disabled: false,
    fullWidth: true,
    size: 'default',
  },
});

type ButtonVariants = VariantProps<typeof button>;
type Props = {
  label?: string;
  loading?: boolean;
  className?: string;
  textClassName?: string;
} & ButtonVariants & Omit<PressableProps, 'disabled'>;

export function Button({ ref, label: text, loading = false, variant = 'default', disabled = false, size = 'default', className = '', testID, textClassName = '', ...props }: Props & { ref?: React.RefObject<View | null> }) {
  const styles = React.useMemo(
    () => button({ variant, disabled, size }),
    [variant, disabled, size],
  );

  return (
    <Pressable
      disabled={disabled || loading}
      className={styles.container({ className })}
      {...props}
      ref={ref}
      testID={testID}
    >
      {loading
        ? (
            <ActivityIndicator
              size="small"
              className={styles.indicator()}
              color={variant === 'outline' || variant === 'ghost' || variant === 'link' ? colors.neutral[400] : '#fff'}
              testID={testID ? `${testID}-activity-indicator` : undefined}
            />
          )
        : props.children
          ? (
              props.children
            )
          : (
              <Text
                variant={size === 'lg' ? 'button-lg' : size === 'sm' ? 'button-sm' : 'button'}
                // One line, shrinking a little before it would wrap: a long label on a half-width button.
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                testID={testID ? `${testID}-label` : undefined}
                className={styles.label({ className: textClassName })}
              >
                {text}
              </Text>
            )}
    </Pressable>
  );
}
