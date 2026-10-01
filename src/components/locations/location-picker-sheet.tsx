import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Location, LocationRef } from '@/lib/api/types';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
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
 * The one way this app picks a place.
 *
 * Every location choice — a new node's parent, the areas a person is granted,
 * the part of a crew's patch one member covers — walks the same tree with the
 * same two affordances, because a tree that behaves differently on each screen
 * is a tree nobody learns once.
 *
 * The two affordances are deliberately separate targets, not one tap that
 * guesses: the ROW chooses the place, the OPEN button looks inside it. Guessing
 * from `childCount` is what made "tap Mandapeta" mean select here and navigate
 * there.
 *
 * `roots` bounds the tree — the crew's own areas become the top level, so a
 * narrowing cannot wander outside the patch the API would reject anyway.
 */

/** Hoisted: `Modal` memoises on this array, so a literal re-lays out the sheet. */
const SNAP_POINTS = ['75%', '100%'];

type PickerNode = LocationRef;

type BaseProps = {
  ref: React.RefObject<BottomSheetModal | null>;
  title?: string;
  /** Start the tree at these nodes instead of the tenant's roots. */
  roots?: LocationRef[];
};

type SingleProps = BaseProps & {
  mode?: 'single';
  /** `null` means the top of the tree — used when picking a parent. */
  onSelect: (node: Location | null) => void;
  /** What the new node would be called under this parent, if anything. */
  describeLevel?: (parent: Location | null) => string | undefined;
  /** The confirm button's label, given the node currently open. */
  confirmLabel?: (current: Location | null) => string;
};

type MultiProps = BaseProps & {
  mode: 'multi';
  selected: readonly LocationRef[];
  onToggle: (node: LocationRef) => void;
  /** Shown under the count, for whatever "none selected" means to the caller. */
  emptyHint?: string;
};

/** The path walked so far; tapping a crumb goes back to that level. */
function Breadcrumb({ trail, rootLabel, onJump }: {
  trail: PickerNode[];
  rootLabel: string;
  onJump: (next: PickerNode[]) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // `grow-0`, or this horizontal strip expands to fill the sheet and
      // pushes the list off the bottom of it.
      className="max-h-12 shrink-0 grow-0 border-b border-border"
      contentContainerClassName="items-center gap-1 px-4"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => onJump([])}
        className={`rounded-lg px-2 py-1 ${trail.length === 0 ? 'bg-muted' : ''}`}
      >
        <Text className="text-xs font-semibold text-foreground">{rootLabel}</Text>
      </Pressable>

      {trail.map((step, index) => (
        <View key={step.id} className="flex-row items-center gap-1">
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} color={colors.neutral[400]} />
          <Pressable
            accessibilityRole="button"
            onPress={() => onJump(trail.slice(0, index + 1))}
            className={`rounded-lg px-2 py-1 ${index === trail.length - 1 ? 'bg-muted' : ''}`}
          >
            <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>{step.name}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

/** One place: the row picks it, the button opens it. */
function PickerRow({ node, selected, multi, canOpen, onChoose, onOpen }: {
  node: PickerNode;
  selected: boolean;
  multi: boolean;
  canOpen: boolean;
  onChoose: () => void;
  onOpen: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2 border-b border-border/40">
      <Pressable
        accessibilityRole={multi ? 'checkbox' : 'radio'}
        accessibilityState={{ checked: selected, selected }}
        accessibilityLabel={`Choose ${node.name}`}
        onPress={onChoose}
        className="min-w-0 flex-1 flex-row items-center gap-3 py-3 pl-1 active:bg-muted/40"
      >
        <View className={`size-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-primary-600' : 'bg-muted'}`}>
          <HugeiconsIcon
            icon={selected ? CheckmarkCircle02Icon : Location01Icon}
            size={16}
            color={selected ? '#ffffff' : colors.neutral[600]}
            strokeWidth={2}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className={`text-sm font-bold ${selected ? 'text-primary-600' : 'text-foreground'}`}
            numberOfLines={1}
          >
            {node.name}
          </Text>
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{node.path}</Text>
        </View>
      </Pressable>

      {canOpen
        ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${node.name}`}
              onPress={onOpen}
              hitSlop={6}
              className="shrink-0 flex-row items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2"
            >
              <HugeiconsIcon icon={Folder01Icon} size={14} color={colors.neutral[600]} strokeWidth={2} />
              <Text className="text-[11px] font-bold text-foreground">Open</Text>
            </Pressable>
          )
        : null}
    </View>
  );
}

export function LocationPickerSheet(props: SingleProps | MultiProps) {
  const { ref, title, roots } = props;
  const multi = props.mode === 'multi';

  const [trail, setTrail] = React.useState<PickerNode[]>([]);
  const current = trail.at(-1) ?? null;

  /**
   * The full records behind the nodes walked, so single-select can hand its
   * caller a `Location` (it needs `schemaId`) while the tree itself only ever
   * deals in id/name/path — which is all `roots` can offer.
   */
  const fullById = React.useRef(new Map<string, Location>());

  const atBoundedTop = roots !== undefined && current === null;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLocationLevel({
    variables: { parentId: current?.id ?? null },
    // Bounded at the top there is nothing to fetch: `roots` IS the level.
    enabled: !atBoundedTop,
  });

  const rows = React.useMemo(() => {
    if (atBoundedTop)
      return (roots ?? []).map(node => ({ node, canOpen: true }));

    const items = data?.pages.flatMap(page => page.items) ?? [];
    for (const item of items)
      fullById.current.set(item.id, item);

    return items.map(item => ({
      node: { id: item.id, name: item.name, path: item.path, pathIds: item.pathIds },
      canOpen: item.childCount > 0,
    }));
  }, [atBoundedTop, roots, data]);

  const isSelected = (id: string) => (props.mode === 'multi'
    ? props.selected.some(area => area.id === id)
    : false);

  const choose = (node: PickerNode) => {
    if (props.mode === 'multi') {
      props.onToggle(node);
      return;
    }

    props.onSelect(fullById.current.get(node.id) ?? null);
    setTrail([]);
  };

  const confirmCurrent = () => {
    if (props.mode === 'multi')
      return;

    props.onSelect(current === null ? null : (fullById.current.get(current.id) ?? null));
    setTrail([]);
  };

  const currentFull = current === null ? null : (fullById.current.get(current.id) ?? null);
  const level = props.mode === 'multi' ? undefined : props.describeLevel?.(currentFull);

  return (
    <Modal ref={ref} snapPoints={SNAP_POINTS} title={title ?? (multi ? 'Choose areas' : 'Choose location')}>
      <View className="flex-1">
        <Breadcrumb trail={trail} rootLabel={roots ? 'Team areas' : 'Top level'} onJump={setTrail} />

        {isLoading && !atBoundedTop
          ? (
              <View className="flex-1 items-center justify-center py-10">
                <ActivityIndicator color={colors.primary[500]} />
              </View>
            )
          : (
              <BottomSheetFlatList
                data={rows}
                keyExtractor={(row: { node: PickerNode }) => row.node.id}
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
                      ? `Nothing inside ${current.name} — it can still be chosen itself.`
                      : roots
                        ? 'This team has no areas yet.'
                        : 'No locations yet.'}
                  </Text>
                )}
                renderItem={({ item }: { item: { node: PickerNode; canOpen: boolean } }) => (
                  <PickerRow
                    node={item.node}
                    multi={multi}
                    selected={isSelected(item.node.id)}
                    canOpen={item.canOpen}
                    onChoose={() => choose(item.node)}
                    onOpen={() => setTrail([...trail, item.node])}
                  />
                )}
              />
            )}

        <Footer
          multi={multi}
          count={props.mode === 'multi' ? props.selected.length : 0}
          hint={props.mode === 'multi' ? props.emptyHint : level}
          label={props.mode === 'multi'
            ? 'Done'
            : props.confirmLabel?.(currentFull)
              ?? (current ? `Choose ${current.name}` : 'Choose top level')}
          onPress={multi ? () => ref.current?.dismiss() : confirmCurrent}
        />
      </View>
    </Modal>
  );
}

function Footer({ multi, count, hint, label, onPress }: {
  multi: boolean;
  count: number;
  hint: string | undefined;
  label: string;
  onPress: () => void;
}) {
  return (
    <View className="shrink-0 border-t border-border px-4 pt-3 pb-6">
      {multi
        ? (
            <Text className="pb-2 text-center text-[11px] text-muted-foreground">
              {count === 0 ? (hint ?? 'Nothing selected') : `${count} selected`}
            </Text>
          )
        : hint
          ? <Text className="pb-2 text-center text-[11px] text-muted-foreground">{`It will be created as a ${hint}`}</Text>
          : null}

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 active:bg-primary-700"
      >
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color="#ffffff" strokeWidth={2.4} />
        <Text className="text-base font-bold text-white" numberOfLines={1}>{label}</Text>
      </Pressable>
    </View>
  );
}
