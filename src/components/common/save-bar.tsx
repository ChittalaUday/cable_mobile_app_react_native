import * as React from 'react';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from '@/components/ui';

/**
 * The primary action of a form screen, pinned above the keyboard.
 *
 * It floats with a margin on every side rather than sitting in a full-bleed bar
 * — the bar read as a second, heavier surface under the content. Being outside
 * the ScrollView, it needs `KeyboardStickyView` or the keyboard covers it just
 * as the last field is being filled in.
 */
export function SaveBar({
  label,
  busyLabel,
  busy = false,
  disabled = false,
  onPress,
  secondary,
}: {
  label: string;
  busyLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** An optional lighter action beside it, e.g. "Cancel". */
  secondary?: { label: string; onPress: () => void };
}) {
  const isBlocked = busy || disabled;

  return (
    <KeyboardStickyView>
      <SafeAreaView edges={['bottom']} className="bg-surface px-4 pt-2 pb-3">
        <View className="flex-row gap-2.5">
          {secondary
            ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={secondary.onPress}
                  className="flex-1 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3.5 active:bg-muted/40"
                >
                  <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                    {secondary.label}
                  </Text>
                </Pressable>
              )
            : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isBlocked, busy }}
            disabled={isBlocked}
            onPress={onPress}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 active:bg-primary-700 ${
              isBlocked ? 'opacity-60' : ''
            }`}
          >
            {busy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {busy ? (busyLabel ?? label) : label}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardStickyView>
  );
}
