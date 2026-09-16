import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Exchange01Icon,
  Package01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Card, ScreenHeader } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import {
  ActivityIndicator,
  colors,
  Pressable,
  ScrollView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import { useInventoryDashboard } from '@/lib/hooks/api/use-inventory';

export function InventoryDashboardScreen({ basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const router = useRouter();
  const locationPicker = useModal();
  const [selectedLocation, setSelectedLocation] = React.useState<string | undefined>(undefined);
  const [locationLabel, setLocationLabel] = React.useState('All Locations');

  const { data: dashboard, isLoading } = useInventoryDashboard({
    variables: selectedLocation ? { locationId: selectedLocation } : undefined,
  });

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Inventory Dashboard"
        subtitle="Overview & key metrics"
        showBack
        withSafeArea
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-12 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Location selector dropdown button wired to geo.locations */}
        <Pressable
          accessibilityRole="button"
          onPress={locationPicker.present}
          className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
        >
          <View className="flex-row items-center gap-2">
            <View className="size-2 rounded-full bg-primary-600" />
            <Text className="text-sm font-semibold text-foreground">
              {dashboard?.locationName ?? locationLabel}
            </Text>
          </View>
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} color={colors.neutral[500]} strokeWidth={2} />
        </Pressable>

        <LocationPickerSheet
          ref={locationPicker.ref}
          title="Select Stock Location"
          confirmLabel={current => (current ? `Filter by ${current.name}` : 'All Locations')}
          onSelect={(loc) => {
            locationPicker.dismiss();
            setSelectedLocation(loc?.id);
            setLocationLabel(loc?.name ?? 'All Locations');
          }}
        />

        {isLoading
          ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            )
          : (
              <>
                {/* 2x2 Metric Cards Grid */}
                <View className="flex-row gap-3">
                  {/* Total Items */}
                  <Card className="flex-1 border border-border bg-card p-3.5">
                    <View className="flex-row items-center justify-between">
                      <View className="size-8 items-center justify-center rounded-lg bg-orange-50">
                        <HugeiconsIcon icon={ArrowUp01Icon} size={16} color={colors.primary[600]} strokeWidth={2.4} />
                      </View>
                      <Text className="text-xs font-semibold text-primary-600">Total</Text>
                    </View>
                    <Text className="mt-2 text-2xl font-black text-foreground">
                      {dashboard?.totalItems?.toLocaleString() ?? '0'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Total Items</Text>
                  </Card>

                  {/* In Stock */}
                  <Card className="flex-1 border border-border bg-card p-3.5">
                    <View className="flex-row items-center justify-between">
                      <View className="size-8 items-center justify-center rounded-lg bg-success-50">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} color={colors.success[600]} strokeWidth={2.4} />
                      </View>
                      <Text className="text-xs font-semibold text-success-600">Available</Text>
                    </View>
                    <Text className="mt-2 text-2xl font-black text-foreground">
                      {dashboard?.inStock?.toLocaleString() ?? '0'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">In Stock</Text>
                  </Card>
                </View>

                <View className="flex-row gap-3">
                  {/* Issued */}
                  <Card className="flex-1 border border-border bg-card p-3.5">
                    <View className="flex-row items-center justify-between">
                      <View className="size-8 items-center justify-center rounded-lg bg-warning-50">
                        <HugeiconsIcon icon={Upload01Icon} size={16} color={colors.warning[600]} strokeWidth={2.4} />
                      </View>
                      <Text className="text-xs font-semibold text-warning-600">Assigned</Text>
                    </View>
                    <Text className="mt-2 text-2xl font-black text-foreground">
                      {dashboard?.issued?.toLocaleString() ?? '0'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Issued</Text>
                  </Card>

                  {/* In Transit */}
                  <Card className="flex-1 border border-border bg-card p-3.5">
                    <View className="flex-row items-center justify-between">
                      <View className="size-8 items-center justify-center rounded-lg bg-purple-50">
                        <HugeiconsIcon icon={Exchange01Icon} size={16} color="#7C4DFF" strokeWidth={2.4} />
                      </View>
                      <Text className="text-xs font-semibold text-[#7C4DFF]">In Van</Text>
                    </View>
                    <Text className="mt-2 text-2xl font-black text-foreground">
                      {dashboard?.inTransit?.toLocaleString() ?? '0'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">In Transit</Text>
                  </Card>
                </View>

                {/* Low Stock Items Section */}
                <View className="mt-2">
                  <View className="flex-row items-center justify-between px-1 pb-2">
                    <Text className="text-base font-bold text-foreground">Low Stock Items</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`${basePath}/stock`)}
                      className="flex-row items-center gap-1"
                    >
                      <Text className="text-xs font-semibold text-primary-600">View All</Text>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.primary[600]} strokeWidth={2} />
                    </Pressable>
                  </View>

                  <Card className="gap-2 border border-border p-3">
                    {dashboard?.lowStockItems && dashboard.lowStockItems.length > 0
                      ? (
                          dashboard.lowStockItems.map((item, idx) => (
                            <Pressable
                              key={item.id}
                              accessibilityRole="button"
                              onPress={() => router.push(`${basePath}/item/${item.id}`)}
                              className={`flex-row items-center justify-between py-2 ${
                                idx > 0 ? 'border-t border-border/50' : ''
                              }`}
                            >
                              <View className="flex-row items-center gap-3">
                                <View className="size-10 items-center justify-center rounded-lg bg-muted">
                                  <HugeiconsIcon icon={Package01Icon} size={20} color={colors.neutral[700]} strokeWidth={1.8} />
                                </View>
                                <View>
                                  <Text className="text-sm font-bold text-foreground">{item.name}</Text>
                                  <Text className="text-xs text-muted-foreground">{item.code ?? 'SKU'}</Text>
                                </View>
                              </View>
                              <View className="rounded-full bg-danger-50 px-2.5 py-1">
                                <Text className="text-xs font-bold text-danger-600">
                                  {item.availableStock}
                                  {' '}
                                  left
                                </Text>
                              </View>
                            </Pressable>
                          ))
                        )
                      : (
                          <Text className="py-2 text-center text-xs text-muted-foreground">No low stock alerts</Text>
                        )}
                  </Card>
                </View>

                {/* Recent Movements Section */}
                <View className="mt-2">
                  <View className="flex-row items-center justify-between px-1 pb-2">
                    <Text className="text-base font-bold text-foreground">Recent Movements</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`${basePath}/movements`)}
                      className="flex-row items-center gap-1"
                    >
                      <Text className="text-xs font-semibold text-primary-600">View All</Text>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.primary[600]} strokeWidth={2} />
                    </Pressable>
                  </View>

                  <Card className="gap-2 border border-border p-3">
                    {dashboard?.recentMovements && dashboard.recentMovements.length > 0
                      ? (
                          dashboard.recentMovements.map((mov, idx) => (
                            <View
                              key={mov.id}
                              className={`flex-row items-center justify-between py-2 ${
                                idx > 0 ? 'border-t border-border/50' : ''
                              }`}
                            >
                              <View className="flex-1 flex-row items-center gap-3">
                                <View className="size-10 items-center justify-center rounded-lg bg-muted">
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
                                  <Text className="text-sm font-bold text-foreground capitalize">
                                    {mov.movementType.replace('_', ' ')}
                                  </Text>
                                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                                    {mov.fromLocationName || mov.toLocationName
                                      ? `${mov.fromLocationName ?? 'Stock'} → ${mov.toLocationName ?? mov.targetName ?? 'Customer'}`
                                      : (mov.targetName ?? `${mov.itemName} (${mov.quantity} units)`)}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-[11px] text-muted-foreground">
                                {new Date(mov.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                          ))
                        )
                      : (
                          <Text className="py-2 text-center text-xs text-muted-foreground">No recent movements</Text>
                        )}
                  </Card>
                </View>
              </>
            )}
      </ScrollView>
    </View>
  );
}
