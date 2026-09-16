import {
  ArrowDown01Icon,
  Location01Icon,
  Package01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';
import { Card, ScreenHeader } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import {
  Button,
  colors,
  Input,
  Pressable,
  ScrollView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import {
  lookupInventory,
  useInventoryStock,
  useTransferStock,
} from '@/lib/hooks/api/use-inventory';
import { useStaff } from '@/lib/hooks/api/use-staff';

export function InventoryTransferScreen({ basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const router = useRouter();
  const fromPicker = useModal();
  const toPicker = useModal();

  const [fromLocation, setFromLocation] = React.useState<{ id: string; name: string } | null>(null);
  const [toLocation, setToLocation] = React.useState<{ id: string; name: string } | null>(null);
  const [toStaffId, setToStaffId] = React.useState<string | undefined>(undefined);
  const [destinationType, setDestinationType] = React.useState<'location' | 'van'>('location');

  const [selectedCatalogId, setSelectedCatalogId] = React.useState<string>('');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [equipmentId, setEquipmentId] = React.useState<string | undefined>(undefined);
  const [quantity, setQuantity] = React.useState('1');
  const [notes, setNotes] = React.useState('');

  const [staffModalOpen, setStaffModalOpen] = React.useState(false);
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);

  const { data: stockItems } = useInventoryStock();
  const { data: staffPage } = useStaff();
  const { mutate: transferStock, isPending } = useTransferStock();

  const staffMembers = staffPage?.items ?? [];
  const selectedItem = stockItems?.find(i => i.id === selectedCatalogId);
  const toStaff = staffMembers.find(s => s.id === toStaffId);

  const handleLookupSerial = async () => {
    const s = serialNumber.trim();
    if (!s)
      return;
    try {
      const results = await lookupInventory(s);
      if (results && results.length > 0) {
        const match = results[0]!;
        setSelectedCatalogId(match.catalogId);
        if (match.type === 'equipment') {
          setEquipmentId(match.id);
          if (match.locationId)
            setFromLocation({ id: match.locationId, name: match.locationName ?? 'Current Location' });
        }
        Alert.alert('Matched Item', `${match.itemName} (${match.itemCode ?? 'SKU'}) found in inventory.`);
      }
      else {
        Alert.alert('Not Found', `No equipment found with serial "${s}".`);
      }
    }
    catch (err) {
      Alert.alert('Lookup Failed', err instanceof Error ? err.message : 'Could not lookup equipment.');
    }
  };

  const handleSubmit = () => {
    if (!selectedCatalogId && !equipmentId) {
      Alert.alert('Validation Error', 'Please select an item or scan a serial number to transfer.');
      return;
    }

    if (destinationType === 'location' && !toLocation) {
      Alert.alert('Validation Error', 'Please select a destination location.');
      return;
    }

    if (destinationType === 'van' && !toStaffId) {
      Alert.alert('Validation Error', 'Please select a technician for staff van assignment.');
      return;
    }

    const qty = Number.parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Please specify a valid quantity.');
      return;
    }

    transferStock(
      {
        payload: {
          equipmentId,
          catalogId: selectedCatalogId || undefined,
          fromLocationId: fromLocation?.id,
          toLocationId: destinationType === 'location' ? toLocation?.id : undefined,
          toStaffId: destinationType === 'van' ? toStaffId : undefined,
          quantity: qty,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          Alert.alert(
            'Transfer Complete',
            `Successfully transferred stock to ${
              destinationType === 'van'
                ? (toStaff?.name ? `technician ${toStaff.name}` : 'Staff Van')
                : (toLocation?.name ?? 'new location')
            }.`,
            [
              {
                text: 'View Movements',
                onPress: () => router.replace(`${basePath}/movements`),
              },
            ],
          );
        },
        onError: (err) => {
          Alert.alert('Transfer Failed', err?.message ?? 'Could not transfer stock.');
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Transfer Stock"
        subtitle="Move equipment between locations or to staff"
        showBack
        withSafeArea
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-4" showsVerticalScrollIndicator={false}>
        {/* Serial Number Lookup (Optional / Fast Scan) */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-foreground">Serial Code (Default) / Barcode</Text>
            <Text className="text-[10px] font-medium text-muted-foreground">Optional Scan</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-xl border border-border bg-card px-3 py-1">
              <Input
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="Scan or enter equipment serial code..."
                className="font-mono text-xs text-foreground"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <Button
              label="Lookup Serial"
              disabled={!serialNumber.trim()}
              className="bg-primary-600 px-4"
              onPress={handleLookupSerial}
            />
          </View>
        </View>

        {/* Product / Item Selector */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Product / Item *</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setItemPickerOpen(prev => !prev)}
            className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-lg bg-orange-50">
                <HugeiconsIcon icon={Package01Icon} size={20} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">
                  {selectedItem ? selectedItem.name : 'Select item to move'}
                </Text>
                {selectedItem && (
                  <Text className="text-xs text-muted-foreground">{selectedItem.code ?? 'SKU'}</Text>
                )}
              </View>
            </View>
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} strokeWidth={2} />
          </Pressable>

          {itemPickerOpen && (
            <Card className="gap-1 border border-border p-2">
              {stockItems && stockItems.length > 0
                ? (
                    stockItems.map((item, idx) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setSelectedCatalogId(item.id);
                          setItemPickerOpen(false);
                        }}
                        className={`flex-row items-center justify-between rounded-lg p-2.5 active:bg-muted/40 ${
                          idx > 0 ? 'border-t border-border/40' : ''
                        }`}
                      >
                        <View>
                          <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                          <Text className="text-xs text-muted-foreground">{item.code ?? 'SKU'}</Text>
                        </View>
                        <Text className="text-xs font-bold text-primary-600">
                          {item.availableStock}
                          {' '}
                          in stock
                        </Text>
                      </Pressable>
                    ))
                  )
                : (
                    <Text className="p-3 text-xs text-muted-foreground">No items in catalog</Text>
                  )}
            </Card>
          )}
        </View>

        {/* Source Location */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">From Location</Text>
          <Pressable
            accessibilityRole="button"
            onPress={fromPicker.present}
            className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-lg bg-muted">
                <HugeiconsIcon icon={Location01Icon} size={20} color={colors.neutral[700]} strokeWidth={2} />
              </View>
              <Text className="text-sm font-semibold text-foreground">
                {fromLocation ? fromLocation.name : 'Central Warehouse (Default)'}
              </Text>
            </View>
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Destination Type Toggle: Location vs Staff Van */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Destination Type</Text>
          <View className="flex-row rounded-xl bg-neutral-200/80 p-1">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: destinationType === 'location' }}
              onPress={() => setDestinationType('location')}
              className={`flex-1 items-center rounded-lg py-2 ${
                destinationType === 'location' ? 'bg-primary-600' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  destinationType === 'location' ? 'text-white' : 'text-neutral-600'
                }`}
              >
                Warehouse / Sub-Store
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: destinationType === 'van' }}
              onPress={() => setDestinationType('van')}
              className={`flex-1 items-center rounded-lg py-2 ${
                destinationType === 'van' ? 'bg-primary-600' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  destinationType === 'van' ? 'text-white' : 'text-neutral-600'
                }`}
              >
                Technician / Staff Van
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Destination Destination Picker */}
        {destinationType === 'location'
          ? (
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">To Location *</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={toPicker.present}
                  className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="size-9 items-center justify-center rounded-lg bg-blue-50">
                      <HugeiconsIcon icon={Location01Icon} size={20} color="#2563EB" strokeWidth={2} />
                    </View>
                    <Text className="text-sm font-semibold text-foreground">
                      {toLocation ? toLocation.name : 'Select destination location'}
                    </Text>
                  </View>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} strokeWidth={2} />
                </Pressable>
              </View>
            )
          : (
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">To Technician / Van *</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStaffModalOpen(prev => !prev)}
                  className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="size-9 items-center justify-center rounded-lg bg-purple-50">
                      <HugeiconsIcon icon={UserIcon} size={20} color="#7C4DFF" strokeWidth={2} />
                    </View>
                    <Text className="text-sm font-semibold text-foreground">
                      {toStaff ? `${toStaff.name ?? 'Staff'} (${toStaff.roleId ?? 'tech'})` : 'Select technician'}
                    </Text>
                  </View>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} strokeWidth={2} />
                </Pressable>

                {staffModalOpen && (
                  <Card className="gap-1 border border-border p-2">
                    {staffMembers && staffMembers.length > 0
                      ? (
                          staffMembers.map((sm, idx) => (
                            <Pressable
                              key={sm.id}
                              accessibilityRole="button"
                              onPress={() => {
                                setToStaffId(sm.id);
                                setStaffModalOpen(false);
                              }}
                              className={`flex-row items-center justify-between rounded-lg p-2.5 active:bg-muted/40 ${
                                idx > 0 ? 'border-t border-border/40' : ''
                              }`}
                            >
                              <View>
                                <Text className="text-sm font-semibold text-foreground">{sm.name}</Text>
                                <Text className="text-xs text-muted-foreground">{sm.phone ?? sm.email}</Text>
                              </View>
                              <Text className="text-xs font-bold text-primary-600 capitalize">{sm.roleId}</Text>
                            </Pressable>
                          ))
                        )
                      : (
                          <Text className="p-3 text-xs text-muted-foreground">No staff members found</Text>
                        )}
                  </Card>
                )}
              </View>
            )}

        {/* Quantity */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Quantity</Text>
          <View className="rounded-xl border border-border bg-card px-3 py-1">
            <Input
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              className="text-sm text-foreground"
            />
          </View>
        </View>

        {/* Transfer Notes */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Transfer Notes</Text>
          <View className="rounded-xl border border-border bg-card px-3 py-1">
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Assigned to morning repair route"
              className="text-xs text-foreground"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        {/* Submit Transfer Button */}
        <View className="pt-4">
          <Button
            label={isPending ? 'Transferring...' : 'Execute Stock Transfer'}
            disabled={isPending || (!selectedCatalogId && !equipmentId)}
            className="bg-primary-600"
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>

      {/* From Location Modal */}
      <LocationPickerSheet
        ref={fromPicker.ref}
        title="Select Source Location"
        confirmLabel={current => (current ? `Transfer from ${current.name}` : 'Central Warehouse (Default)')}
        onSelect={(loc) => {
          fromPicker.dismiss();
          setFromLocation(loc ? { id: loc.id, name: loc.name } : null);
        }}
      />

      {/* To Location Modal */}
      <LocationPickerSheet
        ref={toPicker.ref}
        title="Select Destination Location"
        confirmLabel={current => (current ? `Transfer to ${current.name}` : 'Choose location')}
        onSelect={(loc) => {
          toPicker.dismiss();
          setToLocation(loc ? { id: loc.id, name: loc.name } : null);
        }}
      />
    </View>
  );
}
