import type { LocationRef } from '@/lib/api/types';
import { Add01Icon, Cancel01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { Card } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import { colors, Pressable, Text, useModal, View } from '@/components/ui';

/**
 * The areas a person or a crew reaches, edited as a list.
 *
 * A grant covers the node **and everything beneath it**, so an apartment is one
 * chip rather than one per door — which is why this is a short list of coarse
 * places and not a tree of checkboxes. Picking walks the same tree the location
 * screens do, so there is one mental model for "where", not two.
 *
 * `inherited` is shown but never editable: those come from the crew, and the
 * only honest way to remove one is on the team. Showing them anyway is the
 * point — without it an admin removes every chip here and cannot understand why
 * the person still reaches the area.
 */
export function AreaGrants({
  value,
  onChange,
  inherited = [],
  inheritedFrom,
}: {
  value: LocationRef[];
  onChange: (next: LocationRef[]) => void;
  inherited?: LocationRef[];
  /** The crew the inherited areas come from, named so the note can point at it. */
  inheritedFrom?: string | null;
}) {
  const picker = useModal();

  const toggle = (node: LocationRef) => onChange(
    value.some(area => area.id === node.id)
      ? value.filter(area => area.id !== node.id)
      : [...value, { id: node.id, name: node.name, path: node.path }],
  );

  const remove = (id: string) => onChange(value.filter(area => area.id !== id));

  return (
    <View className="gap-2">
      <LocationPickerSheet
        ref={picker.ref}
        mode="multi"
        title="Areas granted"
        selected={value}
        onToggle={toggle}
        emptyHint="Nothing selected — they reach only what their team grants"
      />

      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-bold text-foreground">Areas</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose areas"
          onPress={picker.present}
          className="flex-row items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} color={colors.primary[600]} strokeWidth={2.4} />
          <Text className="text-xs font-bold text-primary-600">Choose</Text>
        </Pressable>
      </View>

      <Card className="gap-2 border border-border p-2.5">
        {value.length === 0
          ? (
              <Text className="py-2 text-xs text-muted-foreground">
                No areas granted. Without one, scoped lists come back empty rather than showing everything.
              </Text>
            )
          : value.map(area => (
              <View key={area.id} className="flex-row items-center gap-2.5">
                <View className="size-8 items-center justify-center rounded-lg bg-muted">
                  <HugeiconsIcon icon={Location01Icon} size={15} color={colors.neutral[600]} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{area.name}</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{area.path}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${area.name}`}
                  onPress={() => remove(area.id)}
                  hitSlop={10}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} color={colors.neutral[400]} strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
      </Card>

      {inherited.length > 0
        ? (
            <Card className="gap-2 border border-dashed border-border p-2.5">
              <Text className="text-xs font-bold text-muted-foreground">
                {inheritedFrom ? `Also reaches, via ${inheritedFrom}` : 'Also reaches, via their team'}
              </Text>
              {inherited.map(area => (
                <View key={area.id} className="flex-row items-center gap-2.5">
                  <View className="size-8 items-center justify-center rounded-lg bg-muted">
                    <HugeiconsIcon icon={Location01Icon} size={15} color={colors.neutral[400]} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-muted-foreground" numberOfLines={1}>{area.name}</Text>
                    <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{area.path}</Text>
                  </View>
                </View>
              ))}
              <Text className="text-[11px] text-muted-foreground">
                Edit these on the team — removing them here is not possible.
              </Text>
            </Card>
          )
        : null}
    </View>
  );
}
