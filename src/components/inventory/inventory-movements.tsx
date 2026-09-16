import {
  Download01Icon,
  Exchange01Icon,
  File01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  colors,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useInventoryMovements } from '@/lib/hooks/api/use-inventory';

export function InventoryMovementsScreen() {
  const { data: movements, isLoading } = useInventoryMovements();

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Stock Movements"
        subtitle="Audit trail of all inventory transactions"
        showBack
        withSafeArea
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-3" showsVerticalScrollIndicator={false}>
        {isLoading
          ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            )
          : movements && movements.length > 0
            ? (
                <Card className="gap-1 border border-border p-2">
                  {movements.map((mov, idx) => (
                    <View
                      key={mov.id}
                      className={`flex-row items-center justify-between p-3 ${
                        idx > 0 ? 'border-t border-border/50' : ''
                      }`}
                    >
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="size-10 items-center justify-center rounded-xl bg-muted">
                          {mov.movementType === 'customer_issue'
                            ? (
                                <HugeiconsIcon icon={Upload01Icon} size={18} color={colors.warning[600]} strokeWidth={2} />
                              )
                            : mov.movementType === 'inward'
                              ? (
                                  <HugeiconsIcon icon={Download01Icon} size={18} color={colors.success[600]} strokeWidth={2} />
                                )
                              : (
                                  <HugeiconsIcon icon={Exchange01Icon} size={18} color={colors.primary[600]} strokeWidth={2} />
                                )}
                        </View>
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-foreground capitalize">
                              {mov.movementType.replace('_', ' ')}
                            </Text>
                            <Text className="text-xs font-semibold text-primary-600">
                              (
                              {mov.quantity}
                              {' '}
                              units)
                            </Text>
                          </View>
                          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                            {mov.notes ?? `${mov.itemName} (${mov.itemCode ?? 'SKU'})`}
                          </Text>
                          {(mov.fromLocationName || mov.toLocationName) && (
                            <Text className="text-[11px] font-medium text-foreground">
                              {mov.fromLocationName ?? 'Stock'}
                              {' '}
                              →
                              {mov.toLocationName ?? 'Customer/Site'}
                            </Text>
                          )}
                          <Text className="text-[11px] text-muted-foreground">
                            By:
                            {' '}
                            {mov.performedByName ?? 'Staff'}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-[11px] text-muted-foreground">
                        {new Date(mov.createdAt).toLocaleDateString()}
                        {' '}
                        {new Date(mov.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </Card>
              )
            : (
                <Card className="items-center justify-center border border-border p-10">
                  <HugeiconsIcon icon={File01Icon} size={36} color={colors.neutral[400]} strokeWidth={1.5} />
                  <Text className="mt-2 text-sm font-medium text-muted-foreground">No stock movement logs recorded</Text>
                </Card>
              )}
      </ScrollView>
    </View>
  );
}
