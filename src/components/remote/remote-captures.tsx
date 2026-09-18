import type { RemoteCapture } from '@/lib/api/types';
import { WirelessIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, colors, Pressable, Text, View } from '@/components/ui';
import { isPowerKey, KEY_ICONS, labelFor } from './keys';
import { PAD } from './remote-key';

type CategoryKey = 'all' | 'digits' | 'media' | 'nav' | 'power_vol';

const CATEGORIES: CategoryKey[] = ['all', 'power_vol', 'nav', 'digits', 'media'];

const NAV_KEYS = new Set(['up', 'down', 'left', 'right', 'ok', 'menu', 'back', 'exit', 'guide', 'info', 'home']);

function categorize(capture: RemoteCapture): CategoryKey {
  const key = (capture.buttonKey || capture.buttonName).toLowerCase();

  if (key.startsWith('digit_') || /^\d$/.test(capture.buttonName))
    return 'digits';
  if (isPowerKey(key) || key === 'mute' || key.startsWith('volume') || key === 'audio')
    return 'power_vol';
  if (NAV_KEYS.has(key) || key.startsWith('page_'))
    return 'nav';
  return 'media';
}

/**
 * The raw signals recorded off a real handset, one tile per capture.
 *
 * This is the technician's view rather than the customer's: each tile carries
 * the command byte it will put on the wire, because when a moulded key does
 * nothing the next question is always which code it actually sent.
 */
export function RemoteCapturesView({ captures, disabled, sending, onPress }: {
  captures: RemoteCapture[];
  disabled: boolean;
  onPress: (capture: RemoteCapture) => void;
  sending: string | null;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = React.useState<CategoryKey>('all');

  const shown = React.useMemo(
    () => (category === 'all' ? captures : captures.filter(c => categorize(c) === category)),
    [captures, category],
  );

  const protocol = captures[0]?.protocol ?? 'IR';
  const address = captures[0]?.address ?? '0x0';

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-3.5 py-3">
        <View className="flex-row items-center gap-2">
          <HugeiconsIcon icon={WirelessIcon} size={16} color={colors.primary[600]} strokeWidth={2.2} />
          <Text className="text-xs font-bold text-foreground">
            {t('remote.capture_count', { count: captures.length })}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Chip>{protocol}</Chip>
          <Chip>{`ADDR ${address}`}</Chip>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        {CATEGORIES.map((key) => {
          const active = category === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setCategory(key)}
              className={`rounded-full border px-3 py-1.5 ${
                active ? 'border-transparent bg-foreground' : 'border-border bg-card active:bg-muted'
              }`}
            >
              <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-muted-foreground'}`}>
                {t(`remote.categories.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap gap-2 rounded-3xl p-3" style={{ backgroundColor: PAD.bodyBottom }}>
        {shown.map((capture) => {
          const key = capture.buttonKey || capture.buttonName;
          const power = isPowerKey(key);
          const label = labelFor(t, capture.buttonKey, capture.buttonName);
          const icon = KEY_ICONS[key];

          return (
            <Pressable
              key={capture.id}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${capture.command}`}
              accessibilityState={{ disabled }}
              disabled={disabled || sending !== null}
              // Keyed exactly as the sender sets it, so the spinner lands on the
              // tile that was pressed.
              onPress={() => onPress(capture)}
              className="min-w-[30%] grow basis-0 items-center justify-center gap-1 rounded-2xl px-2 py-3"
              style={{
                backgroundColor: power ? PAD.powerFace : PAD.face,
                borderWidth: 1,
                borderColor: power ? '#6B2F33' : PAD.faceEdge,
                opacity: disabled ? 0.35 : 1,
              }}
            >
              {sending === key
                ? <ActivityIndicator size="small" color={PAD.label} />
                : (
                    <>
                      <View className="flex-row items-center gap-1.5">
                        {icon
                          ? (
                              <HugeiconsIcon
                                icon={icon}
                                size={14}
                                color={power ? PAD.power : PAD.label}
                                strokeWidth={2.2}
                              />
                            )
                          : null}
                        <Text
                          numberOfLines={1}
                          className="text-center text-xs font-bold"
                          style={{ color: power ? PAD.power : PAD.label }}
                        >
                          {label}
                        </Text>
                      </View>
                      <Text className="font-mono text-[10px]" style={{ color: PAD.labelMuted }}>
                        {capture.command}
                      </Text>
                    </>
                  )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-md border border-border bg-surface px-2 py-0.5">
      <Text className="font-mono text-[10px] font-bold text-muted-foreground">{children}</Text>
    </View>
  );
}
