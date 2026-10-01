import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { CustomerDetailsView } from '@/components/customer/customer-details-view';
import { colors, FocusAwareStatusBar, Pressable, Text, View } from '@/components/ui';
import { useCustomer } from '@/lib/hooks/api/use-customers';

/**
 * One customer, fully resolved, for whoever is allowed to open them.
 *
 * `role` decides what the page offers to do next, not what it shows: the server
 * already refuses anything outside the caller's reach, and answers 404 rather
 * than 403 for a customer in somebody else's area.
 */
export function CustomerDetailScreen({ customerId, role }: {
  customerId: string | undefined;
  role: 'admin' | 'staff' | 'customer';
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    data: customer,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useCustomer({
    variables: { id: customerId ?? '' },
    enabled: Boolean(customerId),
  });

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface px-6">
        <FocusAwareStatusBar />
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text className="text-sm font-semibold text-muted-foreground">
          {t('customer_details.title')}
          ...
        </Text>
      </View>
    );
  }

  if (error || !customer) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface px-6">
        <FocusAwareStatusBar />
        <Text className="text-base font-bold text-foreground">
          {t('customer_details.not_found')}
        </Text>
        <Text className="text-center text-xs text-muted-foreground">
          {error?.message || t('customer_details.not_found_desc')}
        </Text>
        <View className="mt-4 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="rounded-xl border border-border bg-card px-4 py-2 active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Text className="text-xs font-bold text-foreground">Back</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => refetch()}
            className="rounded-xl bg-primary-500 px-4 py-2 active:bg-primary-600"
          >
            <Text className="text-xs font-bold text-white">{t('customer_details.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <CustomerDetailsView
        customer={customer}
        role={role}
        onBack={() => router.back()}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />
    </View>
  );
}
