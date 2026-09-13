import type { NativeScrollEvent, NativeSyntheticEvent, RefreshControlProps } from 'react-native';
import type { ConnectionAccount, ConsolidatedCustomer } from '@/types/customer-connection';
import { Search01Icon, UserAdd01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, TextInput } from 'react-native';

import { CustomerConnectionCard } from '@/components/common/customer-connection-card';
import { SectionHeader } from '@/components/common/shell';
import { colors, Pressable, ScrollView, Text, View } from '@/components/ui';
import { useConsolidatedCustomers } from '@/lib/hooks/use-admin-dashboard';
import { AddCustomerModal } from './add-customer-modal';

type FilterType = 'all' | 'active' | 'multi' | 'pending';
const PAGE_SIZE = 15;

export type CustomersViewProps = {
  onRecharge?: (connection: ConnectionAccount) => void;
  onRaiseTicket?: (cust: ConsolidatedCustomer, conn: ConnectionAccount) => void;
  nearBottomTrigger?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  initialAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
};

function CustomerSearchBar({ query, onChange }: { query: string; onChange: (text: string) => void }) {
  return (
    <View className="flex-row items-center rounded-xl border border-border bg-card px-3 py-2">
      <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} />
      <TextInput
        value={query}
        onChangeText={onChange}
        placeholder="Search customer name, phone, STB serial, VC card..."
        placeholderTextColor={colors.neutral[400]}
        className="ml-2 flex-1 text-sm font-medium text-foreground"
      />
    </View>
  );
}

function CustomerFilterChipsBar({ filter, onSelect }: { filter: FilterType; onSelect: (key: FilterType) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {[
        { key: 'all', label: 'All' },
        { key: 'active', label: 'Active' },
        { key: 'multi', label: 'Multi-Box (2+)' },
        { key: 'pending', label: 'Pending' },
      ].map(item => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          onPress={() => onSelect(item.key as FilterType)}
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

function CustomerListContent({
  isPending,
  filteredCustomers,
  displayedCustomers,
  query,
  hasMore,
  onRecharge,
  onRaiseTicket,
}: {
  isPending: boolean;
  filteredCustomers: ConsolidatedCustomer[];
  displayedCustomers: ConsolidatedCustomer[];
  query: string;
  hasMore: boolean;
  onRecharge?: (connection: ConnectionAccount) => void;
  onRaiseTicket?: (cust: ConsolidatedCustomer, conn: ConnectionAccount) => void;
}) {
  if (isPending) {
    return (
      <View className="items-center justify-center gap-2 py-14">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text className="text-sm font-semibold text-muted-foreground">Fetching live customer & connection records...</Text>
      </View>
    );
  }

  if (filteredCustomers.length === 0) {
    return (
      <View className="items-center justify-center gap-2 px-4 py-14">
        <Text className="text-base font-bold text-foreground">No customers found</Text>
        <Text className="text-center text-xs text-muted-foreground">
          {query
            ? `No customer or box details matched "${query}".`
            : 'No customer records are available for this filter.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {displayedCustomers.map(cust => (
        <CustomerConnectionCard
          key={cust.id}
          customer={cust}
          onRecharge={onRecharge}
          onRaiseTicket={onRaiseTicket}
        />
      ))}
      {hasMore && (
        <View className="flex-row items-center justify-center gap-2 py-4">
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text className="text-xs font-semibold text-muted-foreground">
            {`Loading more customers (${displayedCustomers.length} of ${filteredCustomers.length} shown)...`}
          </Text>
        </View>
      )}
    </>
  );
}

// eslint-disable-next-line max-lines-per-function
export function CustomersView({
  onRecharge,
  onRaiseTicket,
  nearBottomTrigger = 0,
  onScroll,
  refreshControl,
  initialAddModalOpen = false,
  onCloseAddModal,
}: CustomersViewProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [displayLimit, setDisplayLimit] = React.useState(PAGE_SIZE);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const { data: customers = [], isPending, refetch } = useConsolidatedCustomers();
  const lastTriggerRef = React.useRef(0);

  const addModalVisible = initialAddModalOpen || isAddModalOpen;

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setDisplayLimit(PAGE_SIZE);
  };

  const handleFilterChange = (nextFilter: FilterType) => {
    setFilter(nextFilter);
    setDisplayLimit(PAGE_SIZE);
  };

  const filteredCustomers = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return customers.filter((cust) => {
      if (filter === 'active' && cust.status !== 'active') {
        return false;
      }
      if (filter === 'pending' && cust.status !== 'pending') {
        return false;
      }
      if (filter === 'multi' && cust.connections.length < 2) {
        return false;
      }

      if (!term) {
        return true;
      }

      const nameMatch = cust.name.toLowerCase().includes(term);
      const phoneMatch = cust.phone.includes(term);
      const addressMatch = cust.address.toLowerCase().includes(term);
      const connMatch = cust.connections.some(
        conn =>
          (conn.stbNumber && conn.stbNumber.toLowerCase().includes(term))
          || (conn.vcNumber && conn.vcNumber.toLowerCase().includes(term))
          || conn.packageName.toLowerCase().includes(term),
      );

      return nameMatch || phoneMatch || addressMatch || connMatch;
    });
  }, [customers, query, filter]);

  const displayedCustomers = React.useMemo(
    () => filteredCustomers.slice(0, displayLimit),
    [filteredCustomers, displayLimit],
  );

  const hasMore = displayedCustomers.length < filteredCustomers.length;

  if (nearBottomTrigger > 0 && nearBottomTrigger !== lastTriggerRef.current) {
    lastTriggerRef.current = nearBottomTrigger;
    if (displayedCustomers.length < filteredCustomers.length) {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, filteredCustomers.length));
    }
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    onCloseAddModal?.();
  };

  return (
    <View className="flex-1 bg-surface">
      <AddCustomerModal
        visible={addModalVisible}
        onClose={handleCloseModal}
        onSuccess={() => refetch()}
      />

      <View className="z-10 gap-2.5 border-b border-border/40 bg-surface px-4 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <SectionHeader icon={UserGroupIcon} tint="blue" title="Customers & Lines" />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/add-customer')}
            className="shrink-0 flex-row items-center gap-1 rounded-lg bg-primary-500 px-2.5 py-1.5 active:bg-primary-600"
          >
            <HugeiconsIcon icon={UserAdd01Icon} size={14} color="#ffffff" />
            <Text className="text-[11px] font-extrabold text-white">Add</Text>
          </Pressable>
        </View>

        <CustomerSearchBar query={query} onChange={handleQueryChange} />
        <CustomerFilterChipsBar filter={filter} onSelect={handleFilterChange} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-2.5 px-3 pt-2.5 pb-6"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        refreshControl={refreshControl}
      >
        <CustomerListContent
          isPending={isPending}
          filteredCustomers={filteredCustomers}
          displayedCustomers={displayedCustomers}
          query={query}
          hasMore={hasMore}
          onRecharge={onRecharge}
          onRaiseTicket={onRaiseTicket}
        />
      </ScrollView>
    </View>
  );
}
