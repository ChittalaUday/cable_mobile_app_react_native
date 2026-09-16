import type { RefreshControlProps } from 'react-native';
import type { CustomerFilterValues } from './customer-filter-modal';
import type { ConnectionAccount, ConsolidatedCustomer } from '@/types/customer-connection';
import {
  Cancel01Icon,
  PreferenceHorizontalIcon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { CustomerConnectionCard } from '@/components/common/customer-connection-card';
import { SectionHeader } from '@/components/common/shell';
import { colors, Pressable, ScrollView, Text, View } from '@/components/ui';
import {
  customerItemToConsolidated,
  useCustomers,
} from '@/lib/hooks/api/use-customers';
import { useLocations } from '@/lib/hooks/api/use-locations';
import { useDebounced } from '@/lib/hooks/common/use-debounced';
import { getDateRangeFromPreset } from '@/lib/utils/date-presets';
import { AddCustomerModal } from './add-customer-modal';
import { CustomerFilterModal } from './customer-filter-modal';

type FilterType = 'all' | 'active' | 'inactive' | 'multi' | 'pending';

export type CustomersViewProps = {
  onRecharge?: (connection: ConnectionAccount) => void;
  onRaiseTicket?: (cust: ConsolidatedCustomer, conn: ConnectionAccount) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  initialAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
};

function CustomerSearchBar({
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
        <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} />
        <TextInput
          value={query}
          onChangeText={onChange}
          placeholder={t('customers_list.search_placeholder')}
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

function CustomerFilterChipsBar({ filter, onSelect }: { filter: FilterType; onSelect: (key: FilterType) => void }) {
  const { t } = useTranslation();
  const chips: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('customers_list.all') },
    { key: 'active', label: t('customers_list.active') },
    { key: 'inactive', label: t('customers_list.inactive') },
    { key: 'multi', label: t('customers_list.multi') },
    { key: 'pending', label: t('customers_list.pending') },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {chips.map(item => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          onPress={() => onSelect(item.key)}
          className={`rounded-full px-3 py-1.5 ${
            filter === item.key
              ? 'bg-primary-500'
              : 'border border-border bg-card'
          }`}
        >
          <Text
            className={`text-xs font-extrabold ${
              filter === item.key ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function CustomerListEmpty({
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

function useCustomerResults(query: string, filter: FilterType, modalFilters: CustomerFilterValues) {
  const debouncedQuery = useDebounced(query.trim());
  const isSearchMode = debouncedQuery.length > 0;
  const searchReady = debouncedQuery.length >= 3;
  const status = modalFilters.status ?? (
    filter === 'active'
      ? ('active' as const)
      : filter === 'inactive'
        ? ('inactive' as const)
        : filter === 'pending'
          ? ('pending' as const)
          : undefined
  );
  const dateRange = React.useMemo(() => getDateRangeFromPreset(modalFilters.datePreset), [modalFilters.datePreset]);

  const list = useCustomers({
    variables: {
      q: searchReady ? debouncedQuery : undefined,
      status,
      locationId: modalFilters.locationId,
      serviceProviderId: modalFilters.serviceProviderId,
      createdFrom: dateRange.createdFrom,
      createdTo: dateRange.createdTo,
      multiBox: filter === 'multi' ? true : undefined,
    },
    enabled: !isSearchMode || searchReady,
  });

  const listed = list.data?.pages.flatMap(page => page.items).map(customerItemToConsolidated) ?? [];
  const items = isSearchMode && !searchReady ? [] : listed;

  return {
    items,
    isError: list.isError,
    isPending: (!isSearchMode || searchReady) && list.isPending,
    isRefetching: list.isRefetching,
    isSearchMode,
    list,
    refetch: list.refetch,
    searchReady,
  };
}

export function CustomersView({
  onRecharge,
  onRaiseTicket,
  refreshControl,
  initialAddModalOpen = false,
  onCloseAddModal,
}: CustomersViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [modalFilters, setModalFilters] = React.useState<CustomerFilterValues>({
    status: undefined,
    locationId: undefined,
    serviceProviderId: undefined,
    datePreset: 'all',
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);

  const hasActiveFilters = Boolean(
    modalFilters.status
    || modalFilters.locationId
    || modalFilters.serviceProviderId
    || (modalFilters.datePreset && modalFilters.datePreset !== 'all'),
  );

  const results = useCustomerResults(query, filter, modalFilters);
  const { data: locationsPage } = useLocations();

  const activeLocation = React.useMemo(() => {
    if (!modalFilters.locationId)
      return null;
    return locationsPage?.items?.find(l => l.id === modalFilters.locationId);
  }, [modalFilters.locationId, locationsPage?.items]);

  const activeLocationDisplay = activeLocation?.path || activeLocation?.name;

  const addModalVisible = initialAddModalOpen || isAddModalOpen;

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    onCloseAddModal?.();
  };

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
        visible={addModalVisible}
        onClose={handleCloseModal}
        onSuccess={() => results.refetch()}
      />

      <CustomerFilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={modalFilters}
        onApply={(f) => {
          setModalFilters(f);
          if (f.status) {
            setFilter(f.status);
          }
        }}
        onReset={() => {
          setModalFilters({ status: undefined, locationId: undefined, serviceProviderId: undefined, datePreset: 'all' });
          setFilter('all');
        }}
      />

      <View className="z-10 gap-2.5 border-b border-border/40 bg-surface px-4 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <SectionHeader icon={UserGroupIcon} tint="blue" title={t('customers_list.title')} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin/customers/add')}
            className="shrink-0 flex-row items-center gap-1 rounded-lg bg-primary-500 px-2.5 py-1.5 active:bg-primary-600"
          >
            <HugeiconsIcon icon={UserAdd01Icon} size={14} color="#ffffff" />
            <Text className="text-[11px] font-extrabold text-white">Add</Text>
          </Pressable>
        </View>

        <CustomerSearchBar
          query={query}
          onChange={setQuery}
          onOpenFilters={() => setIsFilterModalOpen(true)}
          hasActiveFilters={hasActiveFilters}
        />

        <CustomerFilterChipsBar
          filter={modalFilters.status ?? filter}
          onSelect={(key) => {
            setFilter(key);
            if (key === 'active' || key === 'inactive' || key === 'pending') {
              setModalFilters(prev => ({ ...prev, status: key }));
            }
            else if (key === 'all' || key === 'multi') {
              setModalFilters(prev => ({ ...prev, status: undefined }));
            }
          }}
        />

        {hasActiveFilters
          ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="flex-row gap-1.5 pt-0.5"
              >
                {modalFilters.status
                  ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setModalFilters(prev => ({ ...prev, status: undefined }));
                          setFilter('all');
                        }}
                        className="flex-row items-center gap-1 rounded-full border border-primary-500/40 bg-primary-50 px-2.5 py-1 dark:bg-primary-950/40"
                      >
                        <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                          {t('customers_list.filter_status')}
                          :
                          {modalFilters.status}
                        </Text>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.primary[500]} />
                      </Pressable>
                    )
                  : null}

                {modalFilters.locationId
                  ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setModalFilters(prev => ({ ...prev, locationId: undefined }))}
                        className="flex-row items-center gap-1 rounded-full border border-primary-500/40 bg-primary-50 px-2.5 py-1 dark:bg-primary-950/40"
                      >
                        <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400" numberOfLines={1}>
                          {activeLocationDisplay
                            ? `${t('customers_list.filter_location')}: ${activeLocationDisplay}`
                            : t('customers_list.filter_location')}
                        </Text>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.primary[500]} />
                      </Pressable>
                    )
                  : null}

                {modalFilters.serviceProviderId
                  ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setModalFilters(prev => ({ ...prev, serviceProviderId: undefined }))}
                        className="flex-row items-center gap-1 rounded-full border border-primary-500/40 bg-primary-50 px-2.5 py-1 dark:bg-primary-950/40"
                      >
                        <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                          {t('customers_list.filter_service_provider')}
                        </Text>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.primary[500]} />
                      </Pressable>
                    )
                  : null}

                {modalFilters.datePreset && modalFilters.datePreset !== 'all'
                  ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setModalFilters(prev => ({ ...prev, datePreset: 'all' }))}
                        className="flex-row items-center gap-1 rounded-full border border-primary-500/40 bg-primary-50 px-2.5 py-1 dark:bg-primary-950/40"
                      >
                        <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                          {t('customers_list.filter_created_date')}
                          :
                          {modalFilters.datePreset}
                        </Text>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.primary[500]} />
                      </Pressable>
                    )
                  : null}
              </ScrollView>
            )
          : null}
      </View>

      <FlashList
        data={results.items}
        keyExtractor={cust => cust.id}
        renderItem={({ item }) => (
          <CustomerConnectionCard
            customer={item}
            onRecharge={onRecharge}
            onRaiseTicket={onRaiseTicket}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 }}
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
            query={query}
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
