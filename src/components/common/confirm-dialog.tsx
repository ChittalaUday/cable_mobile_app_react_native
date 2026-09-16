import type { IconSvgElement } from '@hugeicons/react-native';
import { AlertCircleIcon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { ActivityIndicator, Modal } from 'react-native';

import { colors, Pressable, Text, View } from '@/components/ui';

type Tone = 'danger' | 'default';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  /** Defaults to "Delete" for the danger tone, "Confirm" otherwise. */
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  icon?: IconSvgElement;
  /** Keeps the dialog up with a spinner while the mutation runs. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The app's confirmation dialog, in place of `Alert.alert`.
 *
 * The native alert cannot be themed, cannot show the request it is waiting on,
 * and on iOS stacks a second sheet to ask "are you sure" — so a destructive
 * action read as two unrelated system pop-ups.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger';
  const label = confirmLabel ?? (isDanger ? 'Delete' : 'Confirm');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android back button and the scrim both mean "no".
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        disabled={busy}
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/60 px-8"
      >
        {/* Swallows taps so pressing the card itself does not dismiss it. */}
        <Pressable className="w-full max-w-sm rounded-3xl border border-border bg-card p-5">
          <View
            className={`size-12 items-center justify-center rounded-full ${
              isDanger ? 'bg-danger-50 dark:bg-danger-950/60' : 'bg-primary-50 dark:bg-primary-950/60'
            }`}
          >
            <HugeiconsIcon
              icon={icon ?? (isDanger ? Delete02Icon : AlertCircleIcon)}
              size={24}
              color={isDanger ? colors.danger[500] : colors.primary[600]}
              strokeWidth={2}
            />
          </View>

          <Text className="mt-3.5 text-lg font-bold text-foreground">{title}</Text>
          <Text className="mt-1.5 text-sm/5 text-muted-foreground">{message}</Text>

          <View className="mt-5 flex-row gap-2.5">
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              className="flex-1 items-center justify-center rounded-xl border border-border bg-surface py-3 active:bg-muted/40"
            >
              <Text className="text-sm font-bold text-foreground">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onConfirm}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
                isDanger ? 'bg-danger-500 active:bg-danger-600' : 'bg-primary-600 active:bg-primary-700'
              } ${busy ? 'opacity-70' : ''}`}
            >
              {busy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
              <Text className="text-sm font-bold text-white">{label}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
