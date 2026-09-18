import { HugeiconsIcon } from '@hugeicons/react-native';
import { MotiView } from 'moti';
import * as React from 'react';

import { Vibration } from 'react-native';
import { ActivityIndicator, Pressable, Text, View } from '@/components/ui';

type Icon = React.ComponentProps<typeof HugeiconsIcon>['icon'];

export type KeyTone = 'accent' | 'colour' | 'neutral' | 'power';

/** The handset's own palette — a dark moulded body, not the app's card surface. */
export const PAD = {
  bodyTop: '#2A2A30',
  bodyBottom: '#141418',
  face: '#3A3A40',
  faceEdge: '#4C4C54',
  facePressed: '#FF6C00',
  label: '#F2F2F7',
  labelMuted: '#9A9AA2',
  power: '#FF453A',
  powerFace: '#3A2326',
  accent: '#FF6C00',
} as const;

const TONE_STYLE: Record<KeyTone, { bg: string; border: string; fg: string }> = {
  neutral: { bg: PAD.face, border: PAD.faceEdge, fg: PAD.label },
  power: { bg: PAD.powerFace, border: '#6B2F33', fg: PAD.power },
  accent: { bg: PAD.accent, border: '#FF8933', fg: '#FFFFFF' },
  colour: { bg: 'transparent', border: 'transparent', fg: PAD.label },
};

/**
 * One key on the moulded pad.
 *
 * An IR press has no local consequence — the only confirmation is an appliance
 * across the room reacting a beat later, and nothing at all if the codes are
 * wrong. So the key answers for itself: it sinks under the finger and buzzes on
 * contact. `Vibration` rather than a haptics dependency because the emitter is
 * Android-only anyway, and that is exactly where a bare millisecond buzz works.
 */
export function RemoteKey({
  label,
  icon,
  tone = 'neutral',
  shape = 'circle',
  swatch,
  disabled,
  pending,
  iconSize = 21,
  size,
  height,
  onPress,
  className = '',
}: {
  label: string;
  icon?: Icon;
  tone?: KeyTone;
  shape?: 'circle' | 'pill' | 'wide';
  swatch?: string;
  disabled: boolean;
  pending: boolean;
  iconSize?: number;
  /**
   * Diameter of a circular key. Left out, the key fills its flex cell and
   * stays round on its own — which is what keeps a grid from overflowing on a
   * narrow screen.
   */
  size?: number;
  /** Height of a pill or wide key. Defaults to 44. */
  height?: number;
  onPress: () => void;
  className?: string;
}) {
  const [pressed, setPressed] = React.useState(false);
  const style = TONE_STYLE[tone];

  const round = shape === 'circle';
  const shapeClass = round ? '' : shape === 'wide' ? 'flex-1' : 'min-w-[74px] flex-1';
  // A round key with no diameter sizes itself from the cell it sits in: flex
  // for the width, aspect ratio for the height. RN clamps a large radius to
  // half the box, so one value keeps it circular at whatever size it lands on.
  const box = round
    ? (size === undefined ? { flex: 1, aspectRatio: 1 } : { width: size, height: size })
    : { height: height ?? 44 };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        setPressed(true);
        // 10ms is a tick, not a rumble: it reads as the click of a moulded key.
        Vibration.vibrate(10);
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      className={`${shapeClass} ${className}`}
      style={{ ...box, opacity: disabled ? 0.35 : 1 }}
    >
      <MotiView
        animate={{ scale: pressed ? 0.9 : 1 }}
        transition={{ type: 'spring', damping: 13, stiffness: 340, mass: 0.35 }}
        style={{ flex: 1 }}
      >
        <View
          className="size-full items-center justify-center overflow-hidden"
          style={{
            borderRadius: round ? 9999 : 16,
            backgroundColor: swatch ?? (pressed ? PAD.facePressed : style.bg),
            borderWidth: tone === 'colour' ? 0 : 1,
            borderColor: pressed ? PAD.facePressed : style.border,
          }}
        >
          {pending
            ? <ActivityIndicator size="small" color={tone === 'accent' ? '#FFFFFF' : PAD.label} />
            : icon
              ? (
                  <HugeiconsIcon
                    icon={icon}
                    size={iconSize}
                    color={pressed ? '#FFFFFF' : style.fg}
                    strokeWidth={2.1}
                  />
                )
              : (
                  <Text
                    numberOfLines={1}
                    className={round ? 'text-lg font-semibold' : 'text-center text-xs font-semibold'}
                    style={{ color: pressed ? '#FFFFFF' : style.fg }}
                  >
                    {label}
                  </Text>
                )}
        </View>
      </MotiView>
    </Pressable>
  );
}
