import {
  Package01Icon,
  QrCodeIcon,
  Search01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { RefreshControl } from 'react-native';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  colors,
  Input,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useCustomerEquipment } from '@/lib/hooks/api/use-inventory';

export function InventoryCustomerEquipmentScreen() {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'returned'>('all');

  const { data: records, isLoading, refetch, isRefetching } = useCustomerEquipment();

  const filteredRecords = React.useMemo(() => {
    if (!records)
      return [];
    return records.filter((r) => {
      const matchesStatus
        = statusFilter === 'all'
          || (statusFilter === 'active' && r.status === 'active')
          || (statusFilter === 'returned' && r.status !== 'active');

      const s = search.toLowerCase().trim();
      if (!s)
        return matchesStatus;

      const matchesSearch
        = r.customerName?.toLowerCase().includes(s)
          || r.customerCode?.toLowerCase().includes(s)
          || r.itemName?.toLowerCase().includes(s)
          || r.serialNumber?.toLowerCase().includes(s)
          || r.barcode?.toLowerCase().includes(s)
          || r.vcNumber?.toLowerCase().includes(s)
          || r.macAddress?.toLowerCase().includes(s);

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const activeCount = records?.filter(r => r.status === 'active').length ?? 0;
  const returnedCount = records?.filter(r => r.status !== 'active').length ?? 0;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Customer Equipment"
        subtitle={`${records?.length ?? 0} Assignments`}
        showBack
        withSafeArea
      />

      <View className="gap-2.5 p-4 pb-2">
        {/* Search Bar */}
        <View className="rounded-xl border border-border bg-card px-3 py-1">
          <View className="flex-row items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer, serial, item, or VC..."
              className="flex-1 border-0 bg-transparent text-sm text-foreground"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        {/* Filter Pills */}
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 ${
              statusFilter === 'all' ? 'bg-primary-600' : 'border border-border bg-card'
            }`}
          >
            <Text className={`text-xs font-bold ${statusFilter === 'all' ? 'text-white' : 'text-neutral-600'}`}>
              All (
              {records?.length ?? 0}
              )
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setStatusFilter('active')}
            className={`rounded-lg px-3 py-1.5 ${
              statusFilter === 'active' ? 'bg-primary-600' : 'border border-border bg-card'
            }`}
          >
            <Text className={`text-xs font-bold ${statusFilter === 'active' ? 'text-white' : 'text-neutral-600'}`}>
              Active (
              {activeCount}
              )
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setStatusFilter('returned')}
            className={`rounded-lg px-3 py-1.5 ${
              statusFilter === 'returned' ? 'bg-primary-600' : 'border border-border bg-card'
            }`}
          >
            <Text className={`text-xs font-bold ${statusFilter === 'returned' ? 'text-white' : 'text-neutral-600'}`}>
              Returned (
              {returnedCount}
              )
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-16 gap-3"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
      >
        {isLoading
          ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={colors.primary[600]} />
              </View>
            )
          : filteredRecords.length > 0
            ? (
                filteredRecords.map(item => (
                  <Card key={item.id} className="gap-3 border border-border p-4">
                    {/* Customer Header */}
                    <View className="flex-row items-center justify-between border-b border-border/50 pb-2.5">
                      <View className="flex-row items-center gap-2.5">
                        <View className="size-8 items-center justify-center rounded-full bg-orange-50">
                          <HugeiconsIcon icon={UserIcon} size={16} color={colors.primary[600]} strokeWidth={2} />
                        </View>
                        <View>
                          <Text className="text-sm font-bold text-foreground">
                            {item.customerName ?? 'Unknown Customer'}
                          </Text>
                          {item.customerCode && (
                            <Text className="text-xs text-muted-foreground">
                              {item.customerCode}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View
                        className={`rounded-full px-2.5 py-0.5 ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold capitalize ${
                            item.status === 'active' ? 'text-emerald-700' : 'text-muted-foreground'
                          }`}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {/* Hardware Details */}
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 gap-1 pr-2">
                        <Text className="text-sm font-semibold text-foreground">
                          {item.itemName}
                        </Text>
                        {item.itemCode && (
                          <Text className="text-xs text-muted-foreground">
                            Model / Code:
                            {' '}
                            {item.itemCode}
                          </Text>
                        )}

                        <View className="mt-1 flex-row items-center gap-1.5 rounded-lg border border-border/60 bg-surface p-2">
                          <HugeiconsIcon icon={QrCodeIcon} size={15} color={colors.neutral[500]} strokeWidth={2} />
                          <Text className="font-mono text-xs font-semibold text-foreground">
                            SN:
                            {' '}
                            {item.serialNumber}
                          </Text>
                        </View>
                      </View>

                      {/* Deposit & Ownership info */}
                      <View className="items-end gap-1">
                        <Text className="text-xs font-bold text-primary-600 capitalize">
                          {item.ownershipType ? item.ownershipType.replace('_', ' ') : 'Loan'}
                        </Text>

                      </View>
                    </View>

                    {/* Footer timestamps */}
                    <View className="flex-row items-center justify-between border-t border-border/40 pt-2">
                      <Text className="text-[11px] text-muted-foreground">
                        Assigned:
                        {' '}
                        {new Date(item.assignedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </Card>
                ))
              )
            : (
                <Card className="items-center justify-center border border-border p-10">
                  <View className="mb-2 size-14 items-center justify-center rounded-2xl bg-muted">
                    <HugeiconsIcon icon={Package01Icon} size={28} color={colors.neutral[400]} strokeWidth={1.8} />
                  </View>
                  <Text className="text-sm font-semibold text-foreground">No Equipment Found</Text>
                  <Text className="mt-1 text-center text-xs text-muted-foreground">
                    {search.trim()
                      ? `No assigned hardware matching "${search.trim()}".`
                      : 'No equipment has been issued to customers yet.'}
                  </Text>
                </Card>
              )}
      </ScrollView>
    </View>
  );
}
