import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { IconSvgElement } from '@hugeicons/react-native';
import type { Location } from '@/lib/api/types';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Add01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  FolderMinusIcon,
  PencilEdit02Icon,
  ToggleOffIcon,
  ToggleOnIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { colors, Modal, Pressable, Text, View } from '@/components/ui';

export type LocationAction
  = | 'add-child'
    | 'edit'
    | 'toggle-active'
    | 'collapse'
    | 'collapse-parent'
    | 'delete';

type Entry = {
  key: LocationAction;
  label: string;
  hint: string;
  icon: IconSvgElement;
  danger?: boolean;
};

/**
 * What can be done to one node of the tree.
 *
 * A row has no room for six controls, so they live behind one button and open
 * here. Two of them exist because the tree is one long flat list: once a group
 * with hundreds of children is open, scrolling back up to its header to close
 * it is the slowest thing on the screen, so it can be closed — or its parent
 * closed — from any row inside it.
 *
 * "Delete" only appears on a leaf: the API refuses to remove a node that still
 * has children, and offering an action that always fails is worse than not
 * offering it.
 */
export function LocationActionsSheet({
  ref,
  location,
  isExpanded,
  hasParent,
  onSelect,
}: {
  ref: React.RefObject<BottomSheetModal | null>;
  location: Location | null;
  isExpanded: boolean;
  hasParent: boolean;
  onSelect: (action: LocationAction) => void;
}) {
  const isLeaf = (location?.childCount ?? 0) === 0;

  const actions: Entry[] = [
    ...(isExpanded
      ? [{
          key: 'collapse' as const,
          label: 'Close this group',
          hint: `Collapse ${location?.name ?? 'this node'} and everything under it`,
          icon: FolderMinusIcon,
        }]
      : []),
    ...(hasParent
      ? [{
          key: 'collapse-parent' as const,
          label: 'Close parent group',
          hint: 'Collapse the group this sits in and jump back up to it',
          icon: ArrowUp01Icon,
        }]
      : []),
    {
      key: 'add-child',
      label: 'Add sub-location',
      hint: `Create a location inside ${location?.name ?? 'this node'}`,
      icon: Add01Icon,
    },
    {
      key: 'edit',
      label: 'Edit location',
      hint: 'Rename, change the code or the address',
      icon: PencilEdit02Icon,
    },
    {
      key: 'toggle-active',
      label: location?.isActive ? 'Deactivate' : 'Activate',
      hint: location?.isActive
        ? 'Keeps the node, but stops it being offered'
        : 'Puts the node back in service',
      icon: location?.isActive ? ToggleOffIcon : ToggleOnIcon,
    },
    ...(isLeaf
      ? [{
          key: 'delete' as const,
          label: 'Delete location',
          hint: 'Permanent, and only possible while nothing sits under it',
          icon: Delete02Icon,
          danger: true,
        }]
      : []),
  ];

  return (
    <Modal ref={ref} snapPoints={['60%', '100%']} title={location?.name ?? 'Location'}>
      {/* Scrolls, because the list grows with what the node supports. */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
      >
        {location?.path
          ? (
              <Text className="pb-3 text-xs text-muted-foreground" numberOfLines={3}>
                {location.path}
              </Text>
            )
          : null}

        {actions.map(action => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            onPress={() => onSelect(action.key)}
            className="flex-row items-center gap-3 rounded-2xl px-2 py-3 active:bg-muted/40"
          >
            <View
              className={`size-10 items-center justify-center rounded-xl ${
                action.danger ? 'dark:bg-danger-950/60 bg-danger-50' : 'bg-muted'
              }`}
            >
              <HugeiconsIcon
                icon={action.icon}
                size={19}
                color={action.danger ? colors.danger[500] : colors.neutral[600]}
                strokeWidth={2}
              />
            </View>
            <View className="flex-1">
              <Text className={`text-sm font-bold ${action.danger ? 'text-danger-600' : 'text-foreground'}`}>
                {action.label}
              </Text>
              <Text className="text-xs text-muted-foreground">{action.hint}</Text>
            </View>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </Modal>
  );
}
