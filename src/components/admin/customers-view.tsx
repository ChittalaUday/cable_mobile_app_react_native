import type { RefreshControlProps } from 'react-native';
import type { TintKey } from '@/components/common/shell';
import type { CustomerListFilter } from '@/lib/hooks/common/use-customer-filters';
import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { Add01Icon, Home01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Avatar, Segmented, StatusPill, TINT } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';
import { useCustomerFilters } from '@/lib/hooks/common/use-customer-filters';
import { useCustomerResults } from '@/lib/hooks/common/use-customer-results';
import { dayMonthYear, planRupees } from '@/lib/utils/admin-format';
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

function Chip({ tint, testID, children }: { tint: TintKey; testID?: string; children: string }) {
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: TINT[tint].bg }} testID={testID}>
      <Text className="text-[11px] font-semibold" style={{ color: TINT[tint].fg }} numberOfLines={1}>{children}</Text>
    </View>
  );
}

/** The date the first of the customer's services runs out, or null until a provider has dated one. */
function soonestExpiry(customer: ConsolidatedCustomer): { date: Date; lapsed: boolean } | null {
  const times = customer.connections
    .map(connection => (connection.expiryDate === undefined ? Number.NaN : new Date(connection.expiryDate).getTime()))
    .filter(time => !Number.isNaN(time));
  if (times.length === 0)
    return null;
  const date = new Date(Math.min(...times));
  return { date, lapsed: date.getTime() < Date.now() };
}

/** Header: who they are and their status. Body: where they are, then the provider, expiry and balance chips. */
function CustomerRow({ customer, onPress }: { customer: ConsolidatedCustomer; onPress: () => void }) {
  const { t } = useTranslation();
  const providers = [...new Set(customer.connections.map(connection => connection.providerName).filter(Boolean))];
  const expiry = soonestExpiry(customer);
  const hasChips = providers.length > 0 || expiry !== null || customerBalancePaise(customer) !== 0;
  const hasBody = Boolean(customer.locationPath) || Boolean(customer.address) || hasChips;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-border bg-card active:opacity-70"
    >
      <View className={`flex-row items-center gap-3 px-3.5 pt-3.5 ${hasBody ? '' : 'pb-3.5'}`}>
        <Avatar name={customer.name} />
        <View className="flex-1 gap-0.5">
          <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>{customer.name}</Text>
          {customer.phone ? <Text className="text-[13px] text-muted-foreground">{customer.phone}</Text> : null}
        </View>
        <StatusPill status={customer.status} />
      </View>

      {hasBody
        ? (
            <View className="gap-2 px-3.5 pt-2 pb-3.5">
              {customer.locationPath
                ? (
                    <View className="flex-row items-start gap-1.5">
                      <View className="pt-0.5"><HugeiconsIcon icon={Location01Icon} size={14} color="#98A2B3" /></View>
                      <Text className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={2} testID={`customer-location-${customer.id}`}>{customer.locationPath}</Text>
                    </View>
                  )
                : null}
              {customer.address
                ? (
                    <View className="flex-row items-start gap-1.5">
                      <View className="pt-0.5"><HugeiconsIcon icon={Home01Icon} size={14} color="#98A2B3" /></View>
                      <Text className="flex-1 text-[13px] text-muted-foreground" numberOfLines={2} testID={`customer-address-${customer.id}`}>{customer.address}</Text>
                    </View>
                  )
                : null}
              {hasChips
                ? (
                    <View className="flex-row flex-wrap items-center gap-2">
                      {providers.map(name => <Chip key={name} tint="blue" testID={`customer-provider-${customer.id}`}>{name}</Chip>)}
                      {expiry !== null
                        ? (
                            <Chip tint={expiry.lapsed ? 'red' : 'orange'} testID={`customer-expiry-${customer.id}`}>
                              {t(expiry.lapsed ? 'customers_list.expired' : 'customers_list.expires', { date: dayMonthYear(expiry.date) })}
                            </Chip>
                          )
                        : null}
                      <BalanceTag customer={customer} />
                    </View>
                  )
                : null}
            </View>
          )
        : null}
    </Pressable>
  );
}

function customerBalancePaise(customer: ConsolidatedCustomer): number {
  return customer.connections.reduce((total, connection) => total + Math.round(connection.balance * 100), 0);
}

/** What the customer owes across their connections — due in red, advance in green, nothing when clear. */
function BalanceTag({ customer }: { customer: ConsolidatedCustomer }) {
  const paise = customerBalancePaise(customer);
  if (paise === 0)
    return null;

  const due = paise > 0;
  return (
    <Chip tint={due ? 'red' : 'green'} testID={`customer-balance-${customer.id}`}>
      {`${planRupees(Math.abs(paise) / 100)} ${due ? 'due' : 'advance'}`}
    </Chip>
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
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
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
