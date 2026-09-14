import type { Location } from '@/lib/api/types';
import type { TreeRow } from '@/lib/hooks/common/use-location-tree';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Folder01Icon,
  FolderOpenIcon,
  Location01Icon,
  MoreVerticalIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { ActivityIndicator, colors, Pressable, Text, View } from '@/components/ui';

/**
 * One row of the flattened tree.
 *
 * Indentation is the only thing that carries depth, so a row is a fixed shape
 * whatever level it sits at — which is what lets the whole tree recycle through
 * one virtualised list instead of nesting a scroll view per level.
 */

/**
 * Depth costs width, and a phone has ~360dp of it.
 *
 * Each level is 12dp, and past the fifth the indent stops growing — a name has
 * to stay readable at the bottom of a deep tree, and the folder icon says as
 * much about nesting as another step of padding would. At the cap this leaves
 * roughly 160dp for the name on the narrowest common screen.
 */
const INDENT = 12;
const MAX_INDENT_DEPTH = 5;

function indentOf(depth: number) {
  return Math.min(depth, MAX_INDENT_DEPTH) * INDENT;
}

/**
 * The corners and spacing a row gets from where it sits in its group.
 *
 * One card per top-level branch, not one per row: a group is a single unbroken
 * surface however deep it runs, rounded at the top where it opens and at the
 * bottom where it closes, with the margin between groups rather than between
 * every line.
 */
function shapeOf(depth: number, isGroupEnd: boolean) {
  const corners = [
    depth === 0 ? 'rounded-t-xl' : '',
    isGroupEnd ? 'rounded-b-xl' : '',
  ].filter(Boolean).join(' ');

  return { corners, spacing: isGroupEnd ? 'mb-2.5' : '' };
}

/**
 * The second line of a row.
 *
 * Depth costs width, so the category drops out below the second level — by
 * then the row's position says what it is.
 */
function metaOf(
  node: Location,
  depth: number,
  categoryName?: (categoryId: string) => string | undefined,
) {
  return [
    depth < 2 ? categoryName?.(node.categoryId) : null,
    node.childCount > 0 ? (node.childCount === 1 ? '1 sub' : `${node.childCount} subs`) : null,
    node.code,
    node.isActive ? null : 'Inactive',
  ].filter(Boolean).join(' · ');
}

export function LocationRow({
  node,
  depth,
  isOpen,
  isGroupEnd = true,
  isHighlighted = false,
  busy = false,
  onPress,
  onToggle,
  onMenu,
  renderAccessory,
  categoryName,
}: {
  node: Location;
  depth: number;
  isOpen: boolean;
  /** Closes a top-level group, so it rounds off and carries the gap below it. */
  isGroupEnd?: boolean;
  /** Overrides what tapping the row body does; the ⋮ always opens the menu. */
  onPress?: () => void;
  /** The node a search just opened the tree onto. */
  isHighlighted?: boolean;
  /** Its chain is still loading, after a tap on a search result. */
  busy?: boolean;
  onToggle: (id: string) => void;
  onMenu: (location: Location) => void;
  renderAccessory?: (location: Location) => React.ReactNode;
  categoryName?: (categoryId: string) => string | undefined;
}) {
  const hasChildren = node.childCount > 0;
  const { corners, spacing } = shapeOf(depth, isGroupEnd);

  return (
    <View
      className={`flex-row items-center gap-1.5 py-2 pr-1 ${corners} ${spacing} ${
        isHighlighted ? 'dark:bg-primary-950/50 bg-primary-50' : 'bg-card'
      }`}
      style={{ paddingLeft: indentOf(depth) }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={hasChildren ? `${isOpen ? 'Collapse' : 'Expand'} ${node.name}` : node.name}
        disabled={!hasChildren || busy}
        onPress={() => onToggle(node.id)}
        hitSlop={6}
        className="size-7 items-center justify-center"
      >
        {busy
          ? <ActivityIndicator size="small" color={colors.primary[500]} />
          : hasChildren
            ? (
                <HugeiconsIcon
                  icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
                  size={16}
                  color={colors.neutral[500]}
                  strokeWidth={2.4}
                />
              )
            : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        // Without an override: open a branch, and fall back to the menu for a
        // leaf, which has nothing to open.
        onPress={onPress ?? (() => (hasChildren ? onToggle(node.id) : onMenu(node)))}
        onLongPress={() => onMenu(node)}
        className="flex-1 flex-row items-center gap-2 py-0.5"
      >
        <View
          className={`size-7 items-center justify-center rounded-lg ${
            hasChildren ? 'bg-muted' : 'bg-green-50 dark:bg-green-950'
          }`}
        >
          <HugeiconsIcon
            icon={hasChildren ? (isOpen ? FolderOpenIcon : Folder01Icon) : Location01Icon}
            size={15}
            color={hasChildren ? colors.neutral[600] : '#12B76A'}
            strokeWidth={2}
          />
        </View>

        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
            {node.name}
          </Text>
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            {metaOf(node, depth, categoryName)}
          </Text>
        </View>
      </Pressable>

      {renderAccessory
        ? renderAccessory(node)
        : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Options for ${node.name}`}
              onPress={() => onMenu(node)}
              hitSlop={10}
              className="size-7 items-center justify-center rounded-lg"
            >
              <HugeiconsIcon icon={MoreVerticalIcon} size={18} color={colors.neutral[500]} strokeWidth={2} />
            </Pressable>
          )}
    </View>
  );
}

/** The trailing row of a level that has more pages behind it. */
export function LoadMoreRow({
  row,
  onPress,
}: {
  row: Extract<TreeRow, { kind: 'more' }>;
  onPress: () => void;
}) {
  const { corners, spacing } = shapeOf(row.depth, row.isGroupEnd);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Load ${row.remaining} more`}
      disabled={row.loading}
      onPress={onPress}
      className={`flex-row items-center gap-2 bg-card py-2.5 ${corners} ${spacing}`}
      style={{ paddingLeft: indentOf(row.depth) + 30 }}
    >
      {row.loading
        ? <ActivityIndicator size="small" color={colors.primary[500]} />
        : null}
      <Text className="text-xs font-semibold text-primary-600">
        {row.loading ? 'Loading…' : `Load ${row.remaining} more`}
      </Text>
    </Pressable>
  );
}

/** Open/closed node ids, and the toggles the tree calls. */
export function useTreeExpansion(initial: string[] = []) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(initial));

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id))
        next.delete(id);
      else
        next.add(id);
      return next;
    });
  }, []);

  const collapse = React.useCallback((id: string) => {
    setExpanded((prev) => {
      if (!prev.has(id))
        return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const expand = React.useCallback((ids: string[]) => {
    if (ids.length === 0)
      return;

    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids)
        next.add(id);
      return next;
    });
  }, []);

  const collapseMany = React.useCallback((ids: string[]) => {
    if (ids.length === 0)
      return;

    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids)
        next.delete(id);
      return next;
    });
  }, []);

  return {
    expanded,
    expand,
    toggle,
    collapse,
    collapseMany,
    collapseAll: React.useCallback(() => setExpanded(new Set()), []),
  };
}
