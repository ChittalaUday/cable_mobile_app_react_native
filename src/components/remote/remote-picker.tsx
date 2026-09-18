import type { RemoteDeviceType, RemoteSummary } from '@/lib/api/types';
import {
  ArrowRight01Icon,
  Cancel01Icon,
  SatelliteDishIcon,
  Search01Icon,
  ShieldKeyIcon,
  Tv01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';

import { colors, Pressable, Text, View } from '@/components/ui';

const DEVICE_TYPES: { type: RemoteDeviceType; icon: typeof Tv01Icon }[] = [
  { type: 'tv', icon: Tv01Icon },
  { type: 'stb', icon: SatelliteDishIcon },
];

/**
 * Picks a handset out of the library, filed under the appliance it drives.
 *
 * Televisions and set-top boxes are separate lists rather than one long one
 * because a technician already knows which of the two they are pointing at, and
 * within each the rows group by brand — which is how the box in front of them
 * is labelled.
 */
export function RemotePicker({ deviceType, onDeviceType, remotes, onSelect }: {
  deviceType: RemoteDeviceType;
  onDeviceType: (type: RemoteDeviceType) => void;
  remotes: RemoteSummary[];
  onSelect: (remote: RemoteSummary) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');

  const brands = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q
      ? remotes.filter(r => `${r.brand} ${r.model}`.toLowerCase().includes(q))
      : remotes;

    const grouped = new Map<string, RemoteSummary[]>();
    for (const remote of matches)
      grouped.set(remote.brand, [...(grouped.get(remote.brand) ?? []), remote]);
    return [...grouped.entries()];
  }, [remotes, search]);

  const total = brands.reduce((count, [, models]) => count + models.length, 0);

  return (
    <View className="gap-4">
      <SearchField value={search} onChange={setSearch} placeholder={t('remote.search_placeholder')} />

      <Segmented
        options={DEVICE_TYPES.map(({ type, icon }) => ({
          value: type,
          icon,
          label: t(`remote.device_types.${type}`),
        }))}
        value={deviceType}
        onChange={onDeviceType}
      />

      {total === 0
        ? (
            <View className="items-center gap-1.5 rounded-3xl border border-border bg-card px-6 py-10">
              <HugeiconsIcon icon={Search01Icon} size={26} color={colors.neutral[400]} strokeWidth={1.8} />
              <Text className="text-center text-sm font-semibold text-foreground">{t('remote.empty')}</Text>
              <Text className="text-center text-xs text-muted-foreground">{t('remote.empty_hint')}</Text>
            </View>
          )
        : brands.map(([brand, models], groupIndex) => (
            <MotiView
              key={brand}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              // Staggered so a long library reads as a list settling rather
              // than a wall appearing, capped so the last brand is not late.
              transition={{ type: 'timing', duration: 220, delay: Math.min(groupIndex, 6) * 35 }}
              className="gap-2"
            >
              <Text className="px-2 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                {brand}
              </Text>
              <View className="overflow-hidden rounded-3xl border border-border bg-card">
                {models.map((remote, index) => (
                  <RemoteRow
                    key={remote.id}
                    remote={remote}
                    first={index === 0}
                    onPress={() => onSelect(remote)}
                  />
                ))}
              </View>
            </MotiView>
          ))}
    </View>
  );
}

function RemoteRow({ remote, first, onPress }: {
  remote: RemoteSummary;
  first: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${remote.brand} ${remote.model}`}
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 active:bg-muted"
    >
      {/* Separators inset past the leading edge, the way a grouped iOS list does. */}
      {first ? null : <View className="absolute inset-x-0 top-0 left-4 h-px bg-border" />}

      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{remote.model}</Text>
        <Text className="text-xs text-muted-foreground">
          {t('remote.button_count', { count: remote.buttonCount })}
          {remote.isTenantOwned ? ` · ${t('remote.learned')}` : ''}
        </Text>
      </View>

      {/* The flag a technician needs before trusting a code set at a customer's box. */}
      {remote.verified
        ? (
            <View className="flex-row items-center gap-1 rounded-full bg-success-50 px-2 py-1">
              <HugeiconsIcon icon={ShieldKeyIcon} size={12} color={colors.success[700]} strokeWidth={2.4} />
              <Text className="text-[11px] font-bold text-success-700">{t('remote.verified')}</Text>
            </View>
          )
        : (
            <View className="rounded-full bg-warning-50 px-2 py-1">
              <Text className="text-[11px] font-bold text-warning-700">{t('remote.unverified')}</Text>
            </View>
          )}

      <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[400]} strokeWidth={2.4} />
    </Pressable>
  );
}

function SearchField({ value, onChange, placeholder }: {
  onChange: (next: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-1">
      <HugeiconsIcon icon={Search01Icon} size={17} color={colors.neutral[400]} strokeWidth={2.2} />
      <TextInput
        testID="remote-search-input"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[400]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        className="min-w-0 flex-1 py-2.5 text-[15px] text-foreground"
      />
      {value.length > 0
        ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => onChange('')}
              className="p-1"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={15} color={colors.neutral[400]} strokeWidth={2.4} />
            </Pressable>
          )
        : null}
    </View>
  );
}

/** An iOS segmented control: the selected pill slides, the track stays put. */
function Segmented<T extends string>({ options, value, onChange }: {
  onChange: (next: T) => void;
  options: { icon: typeof Tv01Icon; label: string; value: T }[];
  value: T;
}) {
  return (
    <View className="flex-row rounded-2xl bg-muted p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className="flex-1"
          >
            <MotiView
              animate={{ opacity: active ? 1 : 0 }}
              transition={{ type: 'timing', duration: 160 }}
              className="absolute inset-0 rounded-xl bg-card"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}
            />
            <View className="flex-row items-center justify-center gap-1.5 py-2.5">
              <HugeiconsIcon
                icon={option.icon}
                size={16}
                color={active ? colors.primary[600] : colors.neutral[500]}
                strokeWidth={2.2}
              />
              <Text className={`text-[13px] font-bold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
