import type { Mark } from './coverage-marks';
import type { Location } from '@/lib/api/types';
import type { CoverageBounds } from '@/lib/hooks/common/use-location-tree';
import { Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import * as React from 'react';

import { Card, Loading } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';
import { useLocationTree } from '@/lib/hooks/common/use-location-tree';
import { useTreeExpansion } from '@/lib/hooks/common/use-tree-expansion';
import { effectiveMark, nextMarks } from './coverage-marks';
import { LoadMoreRow, LocationRow } from './location-tree';

/**
 * The location tree with a coverage tick per row.
 *
 * Shared by the standalone coverage screen and the second step of adding a
 * provider, because the rules are not obvious enough to be worth explaining
 * twice: a tick covers everything inside, an inherited tick is hollow, and any
 * one child can still be dropped on its own.
 */
function CoverageIntro({ blurb, served, excluded }: { blurb: string; served: number; excluded: number }) {
  return (
    <View className="pb-2">
      <Card className="mb-2 flex-row gap-2.5 border border-border p-3">
        <HugeiconsIcon icon={InformationCircleIcon} size={18} color={colors.primary[600]} strokeWidth={2} />
        <View className="flex-1">
          <Text className="text-xs/4 text-muted-foreground">
            {`${blurb} Ticking a place covers everything inside it, so its sub-locations come along automatically — shown as a `}
            <Text className="font-bold text-emerald-600">hollow tick</Text>
            {'. Any one of them can still be dropped on its own: tap it to mark it '}
            <Text className="font-bold text-danger-600">not served</Text>
            , and tap again to hand it back. Mark nothing and it is sold everywhere the level above allows — which is why only the places that level reaches are listed here.
          </Text>
        </View>
      </Card>

      <View className="flex-row gap-2">
        <View className="flex-1 rounded-xl border border-border bg-card px-3 py-2">
          <Text className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Areas served
          </Text>
          <Text className="text-base font-bold text-emerald-600">{served}</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border bg-card px-3 py-2">
          <Text className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Gaps carved out
          </Text>
          <Text className="text-base font-bold text-danger-600">{excluded}</Text>
        </View>
      </View>
    </View>
  );
}

export function CoveragePicker({
  marks,
  onChange,
  blurb,
  bounds,
}: {
  marks: ReadonlyMap<string, Mark>;
  onChange: (next: Map<string, Mark>) => void;
  blurb: string;
  /** The level above, whose reach this one cannot exceed. */
  bounds?: CoverageBounds;
}) {
  const { expanded, toggle } = useTreeExpansion();
  const tree = useLocationTree(expanded, bounds);

  const cycle = React.useCallback(
    (node: Location) => onChange(nextMarks(node, marks)),
    [marks, onChange],
  );

  const served = [...marks.values()].filter(mark => mark === 'served').length;
  const excluded = marks.size - served;

  const accessory = React.useCallback((location: Location) => {
    const { mark, inherited } = effectiveMark(location, marks);

    // An inherited tick is drawn hollow: it is real coverage, but it comes from
    // the parent, and clearing the parent takes it away.
    const tone = mark === 'served'
      ? (inherited ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' : 'border-emerald-500 bg-emerald-500')
      : mark === 'excluded'
        ? (inherited ? 'border-danger-400 bg-danger-50 dark:bg-danger-950/50' : 'border-danger-500 bg-danger-500')
        : 'border-border bg-card';

    const glyph = inherited
      ? (mark === 'served' ? colors.success[600] : colors.danger[500])
      : '#ffffff';

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: mark === 'served' }}
        accessibilityLabel={`${location.name}: ${mark ?? 'not set'}${inherited ? ', from its parent' : ''}`}
        onPress={() => cycle(location)}
        hitSlop={8}
        className={`size-7 items-center justify-center rounded-lg border ${tone}`}
      >
        {mark === 'served'
          ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} color={glyph} strokeWidth={2.8} />
          : mark === 'excluded'
            ? <HugeiconsIcon icon={Cancel01Icon} size={14} color={glyph} strokeWidth={2.8} />
            : null}
      </Pressable>
    );
  }, [marks, cycle]);

  if (tree.isLoading)
    return <Loading />;

  return (
    <FlashList
      data={tree.rows}
      keyExtractor={row => row.key}
      getItemType={row => row.kind}
      // The marks live outside `data`, so a recycled row would otherwise keep
      // the tick of whatever node it used to show.
      extraData={marks}
      contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.6}
      onEndReached={tree.onEndReached}
      ListHeaderComponent={<CoverageIntro blurb={blurb} served={served} excluded={excluded} />}
      renderItem={({ item }) => (item.kind === 'more'
        ? <LoadMoreRow row={item} onPress={() => tree.loadMore(item.parentKey)} />
        : (
            <LocationRow
              node={item.node}
              depth={item.depth}
              isOpen={expanded.has(item.node.id)}
              isGroupEnd={item.isGroupEnd}
              onToggle={toggle}
              onMenu={cycle}
              renderAccessory={accessory}
            />
          ))}
    />
  );
}
