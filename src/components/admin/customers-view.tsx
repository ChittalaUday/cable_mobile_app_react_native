import type { RefreshControlProps } from 'react-native';
import type { CustomerListFilter } from '@/lib/hooks/common/use-customer-filters';
import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, RefreshControl } from 'react-native';
import { Avatar, Segmented, StatusPill } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';
import { useCustomerFilters } from '@/lib/hooks/common/use-customer-filters';
import { useCustomerResults } from '@/lib/hooks/common/use-customer-results';
import { planRupees } from '@/lib/utils/admin-format';
import { AddCustomerModal } from './add-customer-modal';
import { CustomerFilterModal } from './customer-filter-modal';
import { CustomerActiveFilters } from './customers/customer-active-filters';
import { CustomerListEmpty } from './customers/customer-list-empty';
import { CustomerSearchBar } from './customers/customer-search-bar';

export type CustomersViewProps = {
  /** Which role's routes a row opens — the same list serves the office and the round. */
  basePath: '/admin' | '/staff';
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

function CustomerRow({ customer, onPress }: { customer: ConsolidatedCustomer; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <Avatar name={customer.name} />
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>{customer.name}</Text>
        {customer.phone ? <Text className="text-[13px] text-muted-foreground">{customer.phone}</Text> : null}
        {customer.address ? <Text className="text-[13px] text-muted-foreground">{customer.address}</Text> : null}
      </View>
      <View className="items-end gap-1">
        <StatusPill status={customer.status} />
        <BalanceTag customer={customer} />
      </View>
    </Pressable>
  );
}

/** What the customer owes across their connections — due in red, advance in green, nothing when clear. */
function BalanceTag({ customer }: { customer: ConsolidatedCustomer }) {
  const paise = customer.connections.reduce((total, connection) => total + Math.round(connection.balance * 100), 0);
  if (paise === 0)
    return null;

  const due = paise > 0;
  return (
    <Text
      testID={`customer-balance-${customer.id}`}
      className={`text-xs font-extrabold ${due ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
      numberOfLines={1}
    >
      {`${planRupees(Math.abs(paise) / 100)} ${due ? 'due' : 'advance'}`}
    </Text>
  );
}

export function CustomersView({
  basePath,
  refreshControl,
}: CustomersViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
  const filters = useCustomerFilters();
  const results = useCustomerResults(filters.query, filters.filter, filters.modalFilters, filters.balance);

  const handleEndReached = () => {
    if (
      results.list.hasNextPage
      && !results.list.isFetchingNextPage
      && !results.list.isPending
      && results.items.length > 0
    ) {
      results.list.fetchNextPage();
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AddCustomerModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => results.refetch()}
      />

      <CustomerFilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters.modalFilters}
        onApply={filters.applyFilters}
        onReset={filters.resetFilters}
      />

      <View className="z-10 gap-3 bg-surface px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-foreground">{t('customers_list.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add customer"
            onPress={() => setIsAddModalOpen(true)}
            testID="customers-add-button"
            className="size-10 items-center justify-center rounded-xl bg-primary-500 active:bg-primary-600"
          >
            <HugeiconsIcon icon={Add01Icon} size={22} color="#ffffff" strokeWidth={2.4} />
          </Pressable>
        </View>

        <CustomerSearchBar
          query={filters.query}
          onChange={filters.setQuery}
          onOpenFilters={() => setIsFilterModalOpen(true)}
          hasActiveFilters={filters.hasActiveFilters}
        />

        <Segmented<CustomerListFilter>
          options={[
            { key: 'all', label: t('customers_list.all'), count: results.counts.all },
            { key: 'active', label: t('customers_list.active'), count: results.counts.active },
            { key: 'inactive', label: t('customers_list.inactive'), count: results.counts.inactive },
          ]}
          value={filters.activeChip}
          onChange={filters.selectChip}
        />

        {filters.hasActiveFilters
          ? <CustomerActiveFilters filters={filters.modalFilters} onClear={filters.clearFilter} />
          : null}
      </View>

      <FlashList
        data={results.items}
        keyExtractor={cust => cust.id}
        renderItem={({ item }) => (
          <CustomerRow customer={item} onPress={() => router.push(`${basePath}/customers/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-border/60" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          refreshControl || (
            <RefreshControl
              refreshing={results.isRefetching && !results.list.isFetchingNextPage}
              onRefresh={() => results.refetch()}
              tintColor={colors.primary[500]}
            />
          )
        }
        ListEmptyComponent={(
          <CustomerListEmpty
            error={results.isError}
            isPending={results.isPending}
            needsMoreCharacters={results.isSearchMode && !results.searchReady}
            onRetry={() => results.refetch()}
            query={filters.query}
          />
        )}
        ListFooterComponent={
          results.list.isFetchingNextPage
            ? (
                <View className="items-center justify-center py-4">
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                </View>
              )
            : null
        }
      />
    </View>
  );
}
