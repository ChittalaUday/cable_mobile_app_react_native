import type { RefreshControlProps } from 'react-native';
import type { ConnectionAccount, ConsolidatedCustomer } from '@/types/customer-connection';
import { Search01Icon, UserAdd01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, TextInput } from 'react-native';

import { CustomerConnectionCard } from '@/components/common/customer-connection-card';
import { SectionHeader } from '@/components/common/shell';
import { colors, Pressable, ScrollView, Text, View } from '@/components/ui';
import { useConsolidatedCustomers } from '@/lib/hooks/api/use-admin-dashboard';
import { AddCustomerModal } from './add-customer-modal';

type FilterType = 'all' | 'active' | 'multi' | 'pending';

export type CustomersViewProps = {
  onRecharge?: (connection: ConnectionAccount) => void;
  onRaiseTicket?: (cust: ConsolidatedCustomer, conn: ConnectionAccount) => void;
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

function CustomerListEmpty({ isPending, query }: { isPending: boolean; query: string }) {
  if (isPending) {
    return (
      <View className="items-center justify-center gap-2 py-14">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text className="text-sm font-semibold text-muted-foreground">
          Fetching live customer & connection records...
        </Text>
      </View>
    );
  }

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

export function CustomersView({
  onRecharge,
  onRaiseTicket,
  refreshControl,
  initialAddModalOpen = false,
  onCloseAddModal,
}: CustomersViewProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const { data: customers = [], isPending, refetch } = useConsolidatedCustomers();

  const addModalVisible = initialAddModalOpen || isAddModalOpen;

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

        <CustomerSearchBar query={query} onChange={setQuery} />
        <CustomerFilterChipsBar filter={filter} onSelect={setFilter} />
      </View>

      <FlashList
        data={filteredCustomers}
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
        refreshControl={refreshControl}
        ListEmptyComponent={<CustomerListEmpty isPending={isPending} query={query} />}
      />

    </View>
  );
}
