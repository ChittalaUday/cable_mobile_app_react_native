import type { BarcodeScanningResult } from 'expo-camera';
import {
  ArrowRight01Icon,
  Camera01Icon,
  FlashIcon,
  Package01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  Button,
  colors,
  Input,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { lookupInventory, useInventoryStock } from '@/lib/hooks/api/use-inventory';

type Tab = 'scan' | 'search';

export function IssueScanSearchScreen({ basePath, customer }: {
  basePath: '/admin/inventory' | '/staff/inventory';
  /**
   * Set when the flow started from a customer's page, in which case step 2 is
   * already answered and picking the item is the whole job — an engineer who
   * opened a subscriber to fit their box should not have to find them again.
   */
  customer?: { id: string; name: string; code: string };
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>('scan');
  const [search, setSearch] = React.useState('');
  const [manualSerial, setManualSerial] = React.useState('');
  const [torchOn, setTorchOn] = React.useState(false);
  const [isProcessingScan, setIsProcessingScan] = React.useState(false);
  const [scanMessage, setScanMessage] = React.useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const { data: stockItems, isLoading } = useInventoryStock();

  const filteredItems = stockItems?.filter(
    item => item.availableStock > 0 && (
      item.name.toLowerCase().includes(search.toLowerCase())
      || (item.code && item.code.toLowerCase().includes(search.toLowerCase()))
    ),
  );

  const handleSelectItem = (
    item: { id: string; name: string; code: string | null },
    serial?: string,
    equipmentId?: string,
  ) => {
    const params = {
      catalogId: item.id,
      equipmentId: equipmentId ?? '',
      itemName: item.name,
      itemCode: item.code ?? '',
      serialNumber: serial ?? '',
    };

    router.push(customer === undefined
      ? { pathname: `${basePath}/issue/customer`, params }
      : {
          pathname: `${basePath}/issue/confirm`,
          params: { ...params, customerId: customer.id, customerName: customer.name, customerCode: customer.code },
        });
  };

  const processLookup = async (queryStr: string) => {
    const q = queryStr.trim();
    if (!q || isProcessingScan)
      return;

    setIsProcessingScan(true);
    setScanMessage(null);

    try {
      const results = await lookupInventory(q);
      if (results && results.length > 0) {
        const match = results[0]!;

        if (match.availableStock < 1 || (match.type === 'equipment' && match.inventoryStatus !== 'available')) {
          setScanMessage(
            match.type === 'equipment' && match.inventoryStatus === 'allocated'
              ? `${match.serialNumber ?? q} is already assigned to a customer.`
              : `${match.itemName} is not available in stock.`,
          );
          return;
        }

        handleSelectItem(
          {
            id: match.catalogId,
            name: match.itemName,
            code: match.itemCode,
          },
          match.serialNumber ?? (match.type === 'equipment' ? q : ''),
          match.type === 'equipment' ? match.id : undefined,
        );
      }
      else {
        setScanMessage(`No item found matching "${q}". Select an item below or inward it.`);
      }
    }
    catch (err) {
      setScanMessage(err instanceof Error ? err.message : 'Inventory lookup failed. Please try again.');
    }
    finally {
      setIsProcessingScan(false);
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (result.data) {
      processLookup(result.data);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title={customer === undefined ? 'Issue to Customer' : `Issue to ${customer.name}`}
        subtitle="Scan serial code or select item"
        showBack
        withSafeArea
      />

      <View className="p-4 pb-2">
        {/* Segmented Toggle: Scan | Search */}
        <View className="flex-row rounded-xl bg-neutral-200/80 p-1">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'scan' }}
            onPress={() => setTab('scan')}
            className={`flex-1 items-center rounded-lg py-2 ${tab === 'scan' ? 'bg-primary-600' : ''}`}
          >
            <Text className={`text-xs font-bold ${tab === 'scan' ? 'text-white' : 'text-neutral-600'}`}>
              Scan Serial Code
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'search' }}
            onPress={() => setTab('search')}
            className={`flex-1 items-center rounded-lg py-2 ${tab === 'search' ? 'bg-primary-600' : ''}`}
          >
            <Text className={`text-xs font-bold ${tab === 'search' ? 'text-white' : 'text-neutral-600'}`}>
              Search Catalog
            </Text>
          </Pressable>
        </View>
      </View>

      {tab === 'scan' && (
        <ScrollView className="flex-1" contentContainerClassName="p-4 pb-12 gap-4">
          {/* Camera Scan Box */}
          <View className="h-80 w-full overflow-hidden rounded-3xl border border-border bg-black">
            {!permission && (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={colors.primary[500]} />
              </View>
            )}

            {permission && !permission.granted && (
              <View className="flex-1 items-center justify-center p-6 text-center">
                <View className="size-16 items-center justify-center rounded-2xl bg-neutral-800">
                  <HugeiconsIcon icon={Camera01Icon} size={32} color={colors.primary[500]} strokeWidth={2} />
                </View>
                <Text className="mt-4 text-center text-sm font-bold text-white">Camera Access Required</Text>
                <Text className="mt-1 text-center text-xs text-neutral-400">
                  Allow camera permission to scan equipment serial codes and barcodes quickly.
                </Text>
                <View className="mt-4 w-48">
                  <Button
                    label="Enable Camera"
                    className="bg-primary-600"
                    onPress={() => requestPermission()}
                  />
                </View>
              </View>
            )}

            {permission && permission.granted && (
              <View className="flex-1">
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  enableTorch={torchOn}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'ean13', 'code128', 'code39', 'upc_a', 'upc_e'],
                  }}
                  onBarcodeScanned={isProcessingScan ? undefined : onBarcodeScanned}
                />

                {/* Viewfinder Target Overlay */}
                <View className="pointer-events-none absolute inset-0 items-center justify-center">
                  <View className="size-52 rounded-2xl border-2 border-primary-500 bg-transparent" />
                  <Text className="mt-3 text-xs font-medium text-white/90 drop-shadow-sm">
                    Align serial code or barcode inside frame
                  </Text>
                </View>

                {/* Torch Toggle Button */}
                <View className="absolute top-4 right-4">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTorchOn(prev => !prev)}
                    className={`size-10 items-center justify-center rounded-full ${
                      torchOn ? 'bg-primary-600' : 'bg-black/60'
                    }`}
                  >
                    <HugeiconsIcon icon={FlashIcon} size={20} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                </View>

                {/* Processing Overlay */}
                {isProcessingScan && (
                  <View className="absolute inset-0 items-center justify-center bg-black/60">
                    <ActivityIndicator size="large" color={colors.primary[500]} />
                    <Text className="mt-2 text-xs font-bold text-white">Looking up inventory...</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Feedback/Error Banner */}
          {scanMessage && (
            <Card className="border border-warning-200 bg-warning-50 p-3">
              <Text className="text-xs text-warning-800">{scanMessage}</Text>
              <View className="mt-2 flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScanMessage(null)}
                  className="rounded-lg bg-warning-200 px-3 py-1.5"
                >
                  <Text className="text-xs font-bold text-warning-900">Scan Again</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setScanMessage(null);
                    setTab('search');
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5"
                >
                  <Text className="text-xs font-bold text-foreground">Select from Search</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {/* Manual Input Fallback */}
          <Card className="gap-2 border border-border p-3.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-foreground">Manual Serial Code Lookup</Text>
              <Text className="text-[10px] font-medium text-muted-foreground">Default: Serial</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 rounded-xl border border-border bg-card px-3 py-1">
                <Input
                  value={manualSerial}
                  onChangeText={setManualSerial}
                  placeholder="Enter serial code (or barcode)..."
                  className="text-xs text-foreground"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
              <Button
                label={isProcessingScan ? '...' : 'Lookup Serial'}
                disabled={!manualSerial.trim() || isProcessingScan}
                className="bg-primary-600 px-4"
                onPress={() => processLookup(manualSerial)}
              />
            </View>
            <Text className="text-[10px] text-muted-foreground">
              Equipment is matched by serial code by default. Barcode lookup is optional.
            </Text>
          </Card>
        </ScrollView>
      )}

      {tab === 'search' && (
        <View className="flex-1 gap-3 p-4">
          <View className="rounded-xl border border-border bg-card px-3 py-1">
            <View className="flex-row items-center gap-2">
              <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search by item name or code..."
                className="flex-1 border-0 bg-transparent text-sm text-foreground"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
            {isLoading
              ? (
                  <View className="items-center py-10">
                    <ActivityIndicator color={colors.primary[600]} />
                  </View>
                )
              : filteredItems && filteredItems.length > 0
                ? (
                    <Card className="gap-1 border border-border p-2">
                      {filteredItems.map((item, index) => (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          onPress={() => handleSelectItem(item)}
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
                              <Text className="text-xs text-muted-foreground">{item.code ?? 'SKU'}</Text>
                            </View>
                          </View>

                          <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
                        </Pressable>
                      ))}
                    </Card>
                  )
                : (
                    <Card className="items-center justify-center border border-border p-8">
                      <Text className="text-sm text-muted-foreground">No items match your search</Text>
                    </Card>
                  )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
