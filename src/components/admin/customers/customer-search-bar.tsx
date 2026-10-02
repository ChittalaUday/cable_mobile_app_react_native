import { PreferenceHorizontalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';
import { colors, Pressable, ThemedIcon, View } from '@/components/ui';

export function CustomerSearchBar({
  query,
  onChange,
  onOpenFilters,
  hasActiveFilters,
}: {
  query: string;
  onChange: (text: string) => void;
  onOpenFilters: () => void;
  hasActiveFilters: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1 flex-row items-center rounded-xl border border-border bg-card px-3 py-2">
        <ThemedIcon icon={Search01Icon} size={18} colorClassName="text-muted-foreground" />
        <TextInput
          value={query}
          onChangeText={onChange}
          placeholder={t('customers_list.search_placeholder')}
          testID="customer-search-input"
          placeholderTextColor={colors.neutral[400]}
          className="ml-2 flex-1 text-sm font-medium text-foreground"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('customers_list.open_filters')}
        onPress={onOpenFilters}
        className={`size-10 items-center justify-center rounded-xl border ${
          hasActiveFilters
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
            : 'border-border bg-card active:bg-muted/40'
        }`}
      >
        <HugeiconsIcon
          icon={PreferenceHorizontalIcon}
          size={18}
          color={hasActiveFilters ? colors.primary[500] : colors.neutral[600]}
        />
        {hasActiveFilters
          ? (
              <View className="absolute top-2 right-2 size-2 rounded-full bg-primary-500" />
            )
          : null}
      </Pressable>
    </View>
  );
}
