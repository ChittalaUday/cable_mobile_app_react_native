import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Package01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Card, ScreenHeader } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import {
  ActivityIndicator,
  colors,
  Input,
  Pressable,
  ScrollView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import { useInventoryStock } from '@/lib/hooks/api/use-inventory';

type FilterTab = 'all' | 'in_stock' | 'low_stock';

export function InventoryStockListScreen({ basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const router = useRouter();
  const locationPicker = useModal();
  const [filter, setFilter] = React.useState<FilterTab>('all');
  const [search, setSearch] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState<string | undefined>(undefined);
  const [locationLabel, setLocationLabel] = React.useState('All Locations');

  const { data: stockItems, isLoading } = useInventoryStock({
    variables: {
      locationId: selectedLocation,
      status: filter,
      search: search.trim() || undefined,
    },
  });

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Stock & Locations"
        subtitle="Current levels across storage points"
        showBack
        withSafeArea
      />

      <View className="gap-3 p-4 pb-2">
        {/* Warehouse / Location Selector wired to geo.locations */}
        <Pressable
          accessibilityRole="button"
          onPress={locationPicker.present}
          className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
        >
          <View className="flex-row items-center gap-2">
            <View className="size-2 rounded-full bg-primary-600" />
            <Text className="text-sm font-semibold text-foreground">{locationLabel}</Text>
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

        {/* Filter Tabs */}
        <View className="flex-row gap-2">
          {(
            [
              { key: 'all', label: 'All Items' },
              { key: 'in_stock', label: 'In Stock' },
              { key: 'low_stock', label: 'Low Stock' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                onPress={() => setFilter(tab.key)}
                className={`flex-1 items-center rounded-xl py-2.5 ${
                  active ? 'bg-primary-600' : 'border border-border bg-card'
                }`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-muted-foreground'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Search input */}
        <View className="rounded-xl border border-border bg-card px-3 py-1">
          <View className="flex-row items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search items..."
              className="flex-1 border-0 bg-transparent text-sm text-foreground"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12 gap-2"
        showsVerticalScrollIndicator={false}
      >
        {isLoading
          ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            )
          : stockItems && stockItems.length > 0
            ? (
                <Card className="gap-1 border border-border p-2">
                  {stockItems.map((item, index) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => router.push(`${basePath}/item/${item.id}`)}
                      className={`flex-row items-center justify-between rounded-xl p-3 active:bg-muted/40 ${
                        index > 0 ? 'border-t border-border/50' : ''
                      }`}
                    >
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="size-11 items-center justify-center rounded-xl bg-muted">
                          <HugeiconsIcon icon={Package01Icon} size={22} color={colors.neutral[700]} strokeWidth={1.8} />
                        </View>
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View className="mt-0.5 flex-row items-center gap-2">
                            <Text className="text-xs text-muted-foreground">{item.code ?? 'SKU-000'}</Text>
                            {item.locationName && (
                              <View className="rounded-sm bg-muted px-1.5 py-0.5">
                                <Text className="text-[10px] font-medium text-neutral-600">{item.locationName}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <View
                          className={`rounded-full px-2.5 py-1 ${
                            item.availableStock <= 10 ? 'bg-danger-50' : 'bg-success-50'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              item.availableStock <= 10 ? 'text-danger-600' : 'text-success-700'
                            }`}
                          >
                            {item.availableStock}
                            {' '}
                            in stock
                          </Text>
                        </View>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
                      </View>
                    </Pressable>
                  ))}
                </Card>
              )
            : (
                <Card className="items-center justify-center border border-border p-8">
                  <Text className="text-sm font-medium text-muted-foreground">No stock items found</Text>
                </Card>
              )}
      </ScrollView>
    </View>
  );
}
