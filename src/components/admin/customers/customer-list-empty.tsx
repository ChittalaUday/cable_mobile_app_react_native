import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { colors, Pressable, Text, View } from '@/components/ui';

export function CustomerListEmpty({
  error,
  isPending,
  needsMoreCharacters,
  onRetry,
  query,
}: {
  error: boolean;
  isPending: boolean;
  needsMoreCharacters: boolean;
  onRetry: () => void;
  query: string;
}) {
  const { t } = useTranslation();
  if (isPending) {
    return (
      <View className="items-center justify-center gap-2 py-14">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text className="text-sm font-semibold text-muted-foreground">
          {t('customers_list.fetching')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center justify-center gap-3 px-4 py-14">
        <Text className="text-base font-bold text-foreground">{t('customers_list.error')}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} className="rounded-lg bg-primary-500 px-4 py-2">
          <Text className="text-sm font-bold text-white">{t('customers_list.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (needsMoreCharacters) {
    return (
      <View className="items-center justify-center px-4 py-14">
        <Text className="text-center text-sm text-muted-foreground">{t('customers_list.search_more_chars')}</Text>
      </View>
    );
  }

  return (
    <View className="items-center justify-center gap-2 px-4 py-14">
      <Text className="text-base font-bold text-foreground">{t('customers_list.no_customers')}</Text>
      <Text className="text-center text-xs text-muted-foreground">
        {query ? t('customers_list.search_no_results', { query }) : t('customers_list.no_customers_desc')}
      </Text>
    </View>
  );
}
