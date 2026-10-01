import {
  ArrowDown01Icon,
  Location01Icon,
  Package01Icon,
  QrCodeIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { dialogs } from '@/components/common/dialogs';
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
  useInventoryStock,
  useInwardStock,
} from '@/lib/hooks/api/use-inventory';

export function InventoryReceiveScreen({ basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const router = useRouter();
  const locationPicker = useModal();

  const [selectedCatalogId, setSelectedCatalogId] = React.useState<string>('');
  const [selectedLocation, setSelectedLocation] = React.useState<{ id: string; name: string } | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);

  const [serialInput, setSerialInput] = React.useState('');
  const [serials, setSerials] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState('1');
  const [costPrice, setCostPrice] = React.useState('0');
  const [depositAmount, setDepositAmount] = React.useState('0');
  const [notes, setNotes] = React.useState('');

  const { data: stockItems } = useInventoryStock();
  const { mutate: inwardStock, isPending } = useInwardStock();

  const selectedItem = stockItems?.find(i => i.id === selectedCatalogId);

  const handleAddSerial = () => {
    const s = serialInput.trim();
    if (!s)
      return;
    if (serials.includes(s)) {
      void dialogs.notify('Duplicate', 'This serial number is already added to the list.');
      return;
    }
    setSerials(prev => [...prev, s]);
    setSerialInput('');
  };

  const handleRemoveSerial = (index: number) => {
    setSerials(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedCatalogId) {
      void dialogs.notify('Validation Error', 'Please select an item to receive.');
      return;
    }

    const qty = serials.length > 0 ? serials.length : Number.parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      void dialogs.notify('Validation Error', 'Please specify a valid quantity greater than zero.');
      return;
    }

    inwardStock(
      {
        payload: {
          catalogId: selectedCatalogId,
          locationId: selectedLocation?.id,
          quantity: qty,
          serialNumbers: serials.length > 0 ? serials : undefined,
          costPrice: costPrice.trim() || '0',
          depositAmount: depositAmount.trim() || '0',
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: (res) => {
          void dialogs
            .notify('Stock Received', `Successfully received ${res.quantity} unit(s) of ${selectedItem?.name ?? 'item'}.`)
            .then(() => router.replace(`${basePath}/stock`));
        },
        onError: (err) => {
          void dialogs.notify('Inward Failed', err?.message ?? 'Could not inward stock');
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Receive Stock"
        subtitle="Inward equipment into warehouse / vehicle"
        showBack
        withSafeArea
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-4" showsVerticalScrollIndicator={false}>
        {/* Item Selection */}
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
                  {selectedItem ? selectedItem.name : 'Select product to receive'}
                </Text>
                {selectedItem && (
                  <Text className="text-xs text-muted-foreground">{selectedItem.code ?? 'No code'}</Text>
                )}
              </View>
            </View>
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} strokeWidth={2} />
          </Pressable>

          {/* Inline Item Picker Dropdown */}
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
                          setCostPrice(item.defaultSalePrice ?? '0');
                          setDepositAmount(item.defaultDepositAmount ?? '0');
                        }}
                        className={`flex-row items-center justify-between rounded-lg p-2.5 active:bg-muted/40 ${
                          idx > 0 ? 'border-t border-border/40' : ''
                        }`}
                      >
                        <View>
                          <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                          <Text className="text-xs text-muted-foreground">{item.code ?? 'SKU'}</Text>
                        </View>
                        <Text className="text-xs font-bold text-primary-600 capitalize">
                          {item.isBundle ? 'Kit' : 'Unit'}
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

        {/* Destination Location */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Receiving Location</Text>
          <Pressable
            accessibilityRole="button"
            onPress={locationPicker.present}
            className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-lg bg-blue-50">
                <HugeiconsIcon icon={Location01Icon} size={20} color="#2563EB" strokeWidth={2} />
              </View>
              <Text className="text-sm font-semibold text-foreground">
                {selectedLocation ? selectedLocation.name : 'Central Warehouse (Default)'}
              </Text>
            </View>
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Serial Numbers (Serialized Tracking) */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-foreground">Serial Numbers (Default) / Barcodes</Text>
            <Text className="text-[10px] font-medium text-muted-foreground">Optional Tracking</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-xl border border-border bg-card px-3 py-1">
              <Input
                value={serialInput}
                onChangeText={setSerialInput}
                placeholder="Scan or enter serial code..."
                className="font-mono text-xs text-foreground"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <Button
              label="Add Serial"
              disabled={!serialInput.trim()}
              className="bg-primary-600 px-4"
              onPress={handleAddSerial}
            />
          </View>

          {/* Added Serials Chips */}
          {serials.length > 0 && (
            <View className="mt-2 flex-row flex-wrap gap-2">
              {serials.map((s, idx) => (
                <View
                  key={s}
                  className="flex-row items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1"
                >
                  <HugeiconsIcon icon={QrCodeIcon} size={14} color={colors.primary[600]} strokeWidth={2} />
                  <Text className="font-mono text-xs font-semibold text-primary-900">{s}</Text>
                  <Pressable accessibilityRole="button" onPress={() => handleRemoveSerial(idx)} className="ml-1">
                    <Text className="text-xs font-bold text-danger-600">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quantity (for batch or bulk) */}
        {serials.length === 0 && (
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
        )}

        {/* Financials: Cost & Deposit */}
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-foreground">Cost Price (₹)</Text>
            <View className="rounded-xl border border-border bg-card px-3 py-1">
              <Input
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="numeric"
                className="text-sm text-foreground"
              />
            </View>
          </View>

          <View className="flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-foreground">Deposit (₹)</Text>
            <View className="rounded-xl border border-border bg-card px-3 py-1">
              <Input
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
                className="text-sm text-foreground"
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Notes / Supplier Details</Text>
          <View className="rounded-xl border border-border bg-card px-3 py-1">
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. PO #1042 from Broadcom India"
              className="text-xs text-foreground"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        {/* Submit Inward Button */}
        <View className="pt-4">
          <Button
            label={isPending ? 'Logging Inward...' : 'Confirm Stock Receipt'}
            disabled={isPending || !selectedCatalogId}
            className="bg-primary-600"
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>

      {/* Location Modal */}
      <LocationPickerSheet
        ref={locationPicker.ref}
        title="Select Receiving Location"
        confirmLabel={current => (current ? `Receive at ${current.name}` : 'Central Warehouse (Default)')}
        onSelect={(loc) => {
          locationPicker.dismiss();
          setSelectedLocation(loc ? { id: loc.id, name: loc.name } : null);
        }}
      />
    </View>
  );
}
