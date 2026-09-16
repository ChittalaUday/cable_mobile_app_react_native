import type { Href } from 'expo-router';
import type { AppRegistryItem } from '@/types/access';
import {
  Add01Icon,
  AlertCircleIcon,
  Analytics01Icon,
  Cancel01Icon,
  CreditCardIcon,
  Delete02Icon,
  PackageIcon,
  PencilEdit02Icon,
  Search01Icon,
  Settings02Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { InteractionManager, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors, Text, View } from '@/components/ui';

import { useAppSearch } from '@/lib/hooks/common/use-app-search';
import { useDismissKeyboardOnExit } from '@/lib/hooks/common/use-dismiss-keyboard';

export type GlobalSearchModalProps = {
  visible: boolean;
  onClose: () => void;
};

const ICON_MAP: Record<string, typeof Search01Icon> = {
  'users': UserGroupIcon,
  'user-plus': UserAdd01Icon,
  'alert-circle': AlertCircleIcon,
  'plus-circle': Add01Icon,
  'credit-card': CreditCardIcon,
  'dollar-sign': CreditCardIcon,
  'bar-chart': Analytics01Icon,
  'settings': Settings02Icon,
  'package': PackageIcon,
  'package-add': PackageIcon,
  'package-edit': PencilEdit02Icon,
  'package-delete': Delete02Icon,
};

export function GlobalSearchModal({ visible, onClose }: GlobalSearchModalProps) {
  useDismissKeyboardOnExit(visible);

  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const { results, isSearching } = useAppSearch(query);

  const onSelect = React.useCallback(
    (item: AppRegistryItem) => {
      onClose();
      setQuery('');
      if (!item.route)
        return;

      // Navigating while the modal is still dismissing is dropped on Android,
      // so wait for the dismiss animation to finish before pushing the route.
      InteractionManager.runAfterInteractions(() => {
        try {
          router.push(item.route as Href);
        }
        catch {
          console.warn(`Route ${item.route} not recognized`);
        }
      });
    },
    [router, onClose],
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 p-4 pt-14">
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {/* Header & Search Input */}
          <View className="flex-row items-center border-b border-border px-4 py-3">
            <HugeiconsIcon icon={Search01Icon} size={20} color={colors.neutral[400]} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search screens, actions, commands..."
              placeholderTextColor={colors.neutral[400]}
              className="ml-3 flex-1 text-base text-foreground"
            />
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          </View>

          {/* Search Results List */}
          <ScrollView className="max-h-96 min-h-45 p-2" keyboardShouldPersistTaps="handled">
            {results.length === 0
              ? (
                  <View className="items-center justify-center py-10">
                    <Text className="text-sm text-muted">
                      {isSearching ? 'No matching actions or screens found' : 'Type to search screens & quick actions'}
                    </Text>
                  </View>
                )
              : (
                  results.map((item) => {
                    const IconComponent = ICON_MAP[item.icon || ''] || Search01Icon;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        testID={`search-result-${item.key}`}
                        accessibilityRole="button"
                        accessibilityLabel={item.title}
                        onPress={() => onSelect(item)}
                        className="mb-1 flex-row items-center rounded-xl p-3 active:bg-neutral-100 dark:active:bg-neutral-800"
                      >
                        <View className="mr-3 items-center justify-center rounded-lg bg-primary-100 p-2 dark:bg-neutral-800">
                          <HugeiconsIcon icon={IconComponent} size={20} color={colors.primary[600]} />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
                            <Text className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 uppercase dark:bg-neutral-800 dark:text-neutral-300">
                              {item.type}
                            </Text>
                          </View>
                          {item.description
                            ? (
                                <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                                  {item.description}
                                </Text>
                              )
                            : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
