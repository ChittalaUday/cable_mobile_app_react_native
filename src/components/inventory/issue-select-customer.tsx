import {
  ArrowRight01Icon,
  Search01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
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
import { useCustomers } from '@/lib/hooks/api/use-customers';

export function IssueSelectCustomerScreen({
  catalogId,
  itemName,
  itemCode,
  serialNumber,
  equipmentId,
  basePath,
}: {
  catalogId: string;
  itemName: string;
  itemCode: string;
  serialNumber?: string;
  equipmentId?: string;
  basePath: '/admin/inventory' | '/staff/inventory';
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useCustomers({
    variables: { q: search.trim() || undefined },
  });

  const apiCustomers = data?.pages.flatMap(p => p.items) ?? [];

  const filteredCustomers = apiCustomers.filter((c) => {
    const s = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(s)
      || c.customerCode?.toLowerCase().includes(s)
      || c.phone?.includes(s)
    );
  });

  const handleSelectCustomer = (cust: { id: string; name: string | null; customerCode: string | null }) => {
    router.push({
      pathname: `${basePath}/issue/confirm`,
      params: {
        catalogId,
        itemName,
        itemCode,
        serialNumber: serialNumber ?? '',
        equipmentId: equipmentId ?? '',
        customerId: cust.id,
        customerName: cust.name ?? 'Customer',
        customerCode: cust.customerCode ?? '',
      },
    });
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Select Customer"
        subtitle="Step 2: Assign equipment to subscriber"
        showBack
        withSafeArea
      />

      <View className="p-4 pb-2">
        <View className="rounded-xl border border-border bg-card px-3 py-1">
          <View className="flex-row items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer by name, ID or phone..."
              className="flex-1 border-0 bg-transparent text-sm text-foreground"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-12 gap-2" showsVerticalScrollIndicator={false}>
        {isLoading
          ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            )
          : filteredCustomers.length > 0
            ? (
                <Card className="gap-1 border border-border p-2">
                  {filteredCustomers.map((cust, index) => (
                    <Pressable
                      key={cust.id}
                      accessibilityRole="button"
                      onPress={() => handleSelectCustomer(cust)}
                      className={`flex-row items-center justify-between rounded-xl p-3 active:bg-muted/40 ${
                        index > 0 ? 'border-t border-border/50' : ''
                      }`}
                    >
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="size-11 items-center justify-center rounded-full bg-orange-50">
                          <HugeiconsIcon icon={UserIcon} size={22} color={colors.primary[600]} strokeWidth={2} />
                        </View>
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-bold text-foreground">{cust.name ?? 'Customer'}</Text>
                          <Text className="text-xs text-muted-foreground">
                            {cust.customerCode ? `${cust.customerCode} ` : ''}
                            {cust.phone ? `• ${cust.phone}` : ''}
                          </Text>
                        </View>
                      </View>

                      <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
                    </Pressable>
                  ))}
                </Card>
              )
            : (
                <Card className="items-center justify-center border border-border p-8">
                  <Text className="text-sm font-semibold text-foreground">No Customers Found</Text>
                  <Text className="mt-1 text-center text-xs text-muted-foreground">
                    {search.trim() ? `No customer matches "${search.trim()}".` : 'No customers exist in this tenant yet.'}
                  </Text>
                </Card>
              )}
      </ScrollView>
    </View>
  );
}
