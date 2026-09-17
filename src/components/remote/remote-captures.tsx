import type { RemoteCapture } from '@/lib/api/types';
import { CirclePowerIcon, RemoteControlIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, colors, Pressable, Text, View } from '@/components/ui';

type CategoryKey = 'all' | 'digits' | 'media' | 'nav' | 'power_vol';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'power_vol', label: 'Power & Vol' },
  { key: 'nav', label: 'Nav & Menu' },
  { key: 'digits', label: '0-9' },
  { key: 'media', label: 'Media & Extra' },
];

function categorizeCapture(capture: RemoteCapture): CategoryKey {
  const k = (capture.buttonKey || capture.buttonName).toLowerCase();
  if (k.startsWith('digit_') || /^\d$/.test(capture.buttonName))
    return 'digits';
  if (k.includes('power') || k.includes('mute') || k.includes('volume') || k.includes('audio'))
    return 'power_vol';
  if (
    k.includes('up')
    || k.includes('down')
    || k.includes('left')
    || k.includes('right')
    || k === 'ok'
    || k === 'menu'
    || k === 'back'
    || k === 'exit'
    || k === 'guide'
    || k === 'info'
    || k.includes('page')
  ) {
    return 'nav';
  }
  return 'media';
}

export function RemoteCapturesView({
  captures,
  disabled,
  sending,
  onPress,
}: {
  captures: RemoteCapture[];
  disabled: boolean;
  sending: string | null;
  onPress: (capture: RemoteCapture) => void;
}) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryKey>('all');

  const filteredCaptures = React.useMemo(() => {
    if (selectedCategory === 'all')
      return captures;
    return captures.filter(c => categorizeCapture(c) === selectedCategory);
  }, [captures, selectedCategory]);

  const firstProtocol = captures[0]?.protocol ?? 'IR';
  const firstAddress = captures[0]?.address ?? '0x0';

  return (
    <View className="gap-3">
      {/* Capture info badge */}
      <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
        <View className="flex-row items-center gap-2">
          <HugeiconsIcon icon={RemoteControlIcon} size={16} color={colors.primary[600]} strokeWidth={2.2} />
          <Text className="text-xs font-semibold text-foreground">
            {t('remote.capture_count', { count: captures.length })}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="rounded-md border border-border bg-surface px-2 py-0.5">
            <Text className="font-mono text-[10px] font-bold text-muted-foreground">
              {firstProtocol}
            </Text>
          </View>
          <View className="rounded-md border border-border bg-surface px-2 py-0.5">
            <Text className="font-mono text-[10px] font-bold text-muted-foreground">
              ADDR:
              {' '}
              {firstAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Category filter pills */}
      <View className="flex-row flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedCategory(cat.key)}
              className={`rounded-lg border px-2.5 py-1.5 ${
                active
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-border bg-card'
              }`}
            >
              <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-muted-foreground'}`}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Captures grid */}
      <View className="flex-row flex-wrap gap-2">
        {filteredCaptures.map((capture) => {
          const isPending = sending === (capture.buttonKey || capture.id);
          const isPower = (capture.buttonKey || capture.buttonName).toLowerCase().includes('power');
          const displayLabel = t(`remote.keys.${capture.buttonKey}`, { defaultValue: capture.buttonName });

          return (
            <Pressable
              key={capture.id}
              accessibilityRole="button"
              accessibilityLabel={`${displayLabel} ${capture.command}`}
              accessibilityState={{ disabled }}
              disabled={disabled || sending !== null}
              onPress={() => onPress(capture)}
              className={`min-h-[58px] min-w-[30%] flex-1 basis-[30%] items-center justify-center rounded-xl border p-2.5 ${
                isPower
                  ? 'border-red-200 bg-red-50 active:bg-red-100'
                  : 'border-border bg-card active:bg-primary-50'
              } disabled:opacity-50`}
            >
              {isPending
                ? (
                    <ActivityIndicator size="small" color={colors.primary[600]} />
                  )
                : (
                    <View className="items-center gap-0.5">
                      <View className="flex-row items-center gap-1">
                        {isPower
                          ? (
                              <HugeiconsIcon icon={CirclePowerIcon} size={15} color="#DC2626" strokeWidth={2.2} />
                            )
                          : null}
                        <Text
                          numberOfLines={1}
                          className={`text-center text-xs font-bold ${
                            isPower ? 'text-red-700' : 'text-foreground'
                          }`}
                        >
                          {displayLabel}
                        </Text>
                      </View>
                      <Text className="font-mono text-[10px] text-muted-foreground">
                        {capture.command}
                      </Text>
                    </View>
                  )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
