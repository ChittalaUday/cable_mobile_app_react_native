import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Location } from '@/lib/api/types';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  Home01Icon,
  Location01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import {
  ActivityIndicator,
  colors,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useLocationLevel } from '@/lib/hooks/api/use-locations';

/**
 * Picks a parent by walking the tree down, a level at a time.
 *
 * A flat list of every location is unusable once a tenant has a few hundred of
 * them, and it throws away the one thing that makes the choice obvious — that
 * "Block C" only means something under "Sri Sai Apartments". So this drills:
 * tap a place to go inside it, and stop wherever the new location belongs.
 *
 * Only one level is loaded at a time, and it pages like the tree does.
 */
/** The path walked so far; tapping a crumb goes back to that level. */
function Breadcrumb({ trail, onJump }: { trail: Location[]; onJump: (next: Location[]) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-border"
      contentContainerClassName="items-center gap-1 px-4 py-2.5"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => onJump([])}
        className={`flex-row items-center gap-1 rounded-lg px-2 py-1 ${trail.length === 0 ? 'bg-muted' : ''}`}
      >
        <HugeiconsIcon icon={Home01Icon} size={14} color={colors.neutral[600]} strokeWidth={2} />
        <Text className="text-xs font-semibold text-foreground">Top level</Text>
      </Pressable>

      {trail.map((step, index) => (
        <View key={step.id} className="flex-row items-center gap-1">
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} color={colors.neutral[400]} />
          <Pressable
            accessibilityRole="button"
            onPress={() => onJump(trail.slice(0, index + 1))}
            className={`rounded-lg px-2 py-1 ${index === trail.length - 1 ? 'bg-muted' : ''}`}
          >
            <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
              {step.name}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function PickerRow({
  item,
  onOpen,
  onChoose,
}: {
  item: Location;
  onOpen: () => void;
  onChoose: () => void;
}) {
  const canDrill = item.childCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={canDrill ? `Open ${item.name}` : `Choose ${item.name}`}
      // Somewhere to go means go there; a leaf is the choice itself.
      onPress={canDrill ? onOpen : onChoose}
      className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-muted/40"
    >
      <View className="size-8 items-center justify-center rounded-lg bg-muted">
        <HugeiconsIcon
          icon={canDrill ? Folder01Icon : Location01Icon}
          size={15}
          color={canDrill ? colors.neutral[600] : '#12B76A'}
          strokeWidth={2}
        />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
          {canDrill ? (item.childCount === 1 ? '1 inside' : `${item.childCount} inside`) : 'Nothing inside'}
          {item.code ? ` · ${item.code}` : ''}
        </Text>
      </View>

      {canDrill
        ? <HugeiconsIcon icon={ArrowRight01Icon} size={17} color={colors.neutral[400]} strokeWidth={2} />
        : null}
    </Pressable>
  );
}

export function LocationPickerSheet({
  ref,
  onSelect,
  describeLevel,
}: {
  ref: React.RefObject<BottomSheetModal | null>;
  /** `null` means the new location sits at the top of the tree. */
  onSelect: (parent: Location | null) => void;
  /** What the new location would be called under this parent, if anything. */
  describeLevel?: (parent: Location | null) => string | undefined;
}) {
  // The path walked so far; the last entry is the level being shown.
  const [trail, setTrail] = React.useState<Location[]>([]);
  const current = trail.at(-1) ?? null;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLocationLevel({
    variables: { parentId: current?.id ?? null },
  });

  const items = React.useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  const level = describeLevel?.(current);

  const choose = (parent: Location | null) => {
    onSelect(parent);
    setTrail([]);
  };

  return (
    <Modal ref={ref} snapPoints={['75%', '100%']} title="Choose parent location">
      <View className="flex-1">
        <Breadcrumb trail={trail} onJump={setTrail} />

        {isLoading
          ? (
              <View className="flex-1 items-center justify-center py-10">
                <ActivityIndicator color={colors.primary[500]} />
              </View>
            )
          : (
              <BottomSheetFlatList
                data={items}
                keyExtractor={(item: Location) => item.id}
                // The sheet is a fixed height; without this the list sizes to
                // its content and shoves the footer off the bottom.
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                onEndReachedThreshold={0.6}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage)
                    void fetchNextPage();
                }}
                ListFooterComponent={
                  isFetchingNextPage
                    ? <ActivityIndicator className="py-3" size="small" color={colors.primary[500]} />
                    : null
                }
                ListEmptyComponent={(
                  <Text className="px-2 py-8 text-center text-xs text-muted-foreground">
                    {current
                      ? `Nothing inside ${current.name} yet — it can still be the parent.`
                      : 'No locations yet. The first one goes at the top level.'}
                  </Text>
                )}
                renderItem={({ item }: { item: Location }) => (
                  <PickerRow
                    item={item}
                    onOpen={() => setTrail([...trail, item])}
                    onChoose={() => choose(item)}
                  />
                )}
              />
            )}

        {/* Stop here: the new location goes inside whatever is open. */}
        <View className="border-t border-border px-4 pt-3 pb-6">
          {level
            ? (
                <Text className="pb-2 text-center text-[11px] text-muted-foreground">
                  {`It will be created as a ${level}`}
                </Text>
              )
            : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(current)}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 active:bg-primary-700"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color="#ffffff" strokeWidth={2.4} />
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {current ? `Add inside ${current.name}` : 'Add at top level'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
