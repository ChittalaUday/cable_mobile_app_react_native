import type { RemoteDeviceType, RemoteSummary } from '@/lib/api/types';
import { Alert02Icon, SatelliteIcon, Tv01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { colors, Input, Pressable, Text, View } from '@/components/ui';

const DEVICE_TYPES: { type: RemoteDeviceType; icon: typeof Tv01Icon }[] = [
  { type: 'tv', icon: Tv01Icon },
  { type: 'stb', icon: SatelliteIcon },
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

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q)
      return remotes;
    return remotes.filter(r => r.brand.toLowerCase().includes(q) || r.model.toLowerCase().includes(q));
  }, [remotes, search]);

  const brands = React.useMemo(() => {
    const grouped = new Map<string, RemoteSummary[]>();
    for (const remote of filtered)
      grouped.set(remote.brand, [...(grouped.get(remote.brand) ?? []), remote]);
    return [...grouped.entries()];
  }, [filtered]);

  return (
    <View className="gap-4">
      <Input
        placeholder={t('remote.search_placeholder')}
        value={search}
        onChangeText={setSearch}
        testID="remote-search-input"
      />
      <View className="flex-row gap-2 rounded-2xl border border-border bg-card p-2">
        {DEVICE_TYPES.map(({ type, icon }) => {
          const active = deviceType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onDeviceType(type)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl p-3 ${active ? 'bg-primary-500' : ''}`}
            >
              <HugeiconsIcon icon={icon} size={18} color={active ? '#FFFFFF' : colors.neutral[500]} strokeWidth={2.2} />
              <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-muted-foreground'}`}>
                {t(`remote.device_types.${type}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {brands.length === 0
        ? (
            <View className="items-center gap-1 rounded-2xl border border-border bg-card p-6">
              <Text className="text-center text-muted-foreground">{t('remote.empty')}</Text>
            </View>
          )
        : brands.map(([brand, models]) => (
            <View key={brand} className="gap-2">
              <Text className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{brand}</Text>
              <View className="overflow-hidden rounded-2xl border border-border bg-card">
                {models.map((remote, index) => (
                  <Pressable
                    key={remote.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${remote.brand} ${remote.model}`}
                    onPress={() => onSelect(remote)}
                    className={`flex-row items-center gap-3 p-4 active:bg-primary-50 ${index > 0 ? 'border-t border-border' : ''}`}
                  >
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text className="font-semibold text-foreground">{remote.model}</Text>
                      <Text className="text-xs text-muted-foreground">
                        {t('remote.button_count', { count: remote.buttonCount })}
                        {remote.isTenantOwned ? ` · ${t('remote.learned')}` : ''}
                      </Text>
                    </View>
                    {/* The flag a technician needs before trusting a code set at a customer's box. */}
                    {remote.verified
                      ? null
                      : (
                          <View className="flex-row items-center gap-1 rounded-lg bg-orange-50 px-2 py-1">
                            <HugeiconsIcon icon={Alert02Icon} size={13} color="#C2410C" strokeWidth={2.4} />
                            <Text className="text-[11px] font-bold text-orange-700">{t('remote.unverified')}</Text>
                          </View>
                        )}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
    </View>
  );
}
