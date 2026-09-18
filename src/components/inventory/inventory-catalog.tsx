import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Add01Icon,
  CircleLock01Icon,
  Package01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  Button,
  colors,
  Input,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import {
  useCreateApprovalRequest,
  useCreateCatalogItem,
  useInventoryStock,
} from '@/lib/hooks/api/use-inventory';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export function InventoryCatalogScreen({ basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const router = useRouter();
  const role = useAuthStore.use.role();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [search, setSearch] = React.useState('');
  const itemModal = useModal();

  // Form states
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [model, setModel] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [deposit, setDeposit] = React.useState('');
  const [reason, setReason] = React.useState('');

  const { data: stockItems, isLoading, refetch } = useInventoryStock();
  const { mutate: createItem, isPending: isCreating } = useCreateCatalogItem();
  const { mutate: requestApproval, isPending: isRequesting } = useCreateApprovalRequest();

  const filteredItems = stockItems?.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase())
      || (i.code && i.code.toLowerCase().includes(search.toLowerCase())),
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Item name is required.');
      return;
    }

    if (isAdmin) {
      createItem(
        {
          payload: {
            name: name.trim(),
            code: code.trim() || undefined,
            brand: brand.trim() || undefined,
            model: model.trim() || undefined,
            defaultSalePrice: price.trim() || '0',
            defaultDepositAmount: deposit.trim() || '0',
          },
        },
        {
          onSuccess: () => {
            itemModal.dismiss();
            resetForm();
            refetch();
            Alert.alert('Success', 'Item created in catalog successfully.');
          },
          onError: (err) => {
            Alert.alert('Error', err.message ?? 'Failed to create item');
          },
        },
      );
    }
    else {
      if (!reason.trim()) {
        Alert.alert('Required', 'Please provide a reason for requesting this item.');
        return;
      }
      requestApproval(
        {
          payload: {
            requestType: 'create_item',
            proposedData: {
              name: name.trim(),
              code: code.trim() || undefined,
              brand: brand.trim() || undefined,
              model: model.trim() || undefined,
              defaultSalePrice: price.trim() || '0',
            },
            reason: reason.trim(),
          },
        },
        {
          onSuccess: () => {
            itemModal.dismiss();
            resetForm();
            Alert.alert(
              'Request Submitted',
              'Your request to add this item has been sent to the administrator for approval.',
            );
          },
          onError: (err) => {
            Alert.alert('Error', err.message ?? 'Failed to submit approval request');
          },
        },
      );
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setBrand('');
    setModel('');
    setPrice('');
    setDeposit('');
    setReason('');
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Item Catalog"
        subtitle="Manage equipment models and definitions"
        showBack
        withSafeArea
        rightAction={(
          <Pressable
            accessibilityRole="button"
            onPress={() => itemModal.present()}
            className="size-9 items-center justify-center rounded-lg bg-primary-600 active:bg-primary-700"
          >
            <HugeiconsIcon icon={Add01Icon} size={18} color="#ffffff" strokeWidth={2.4} />
          </Pressable>
        )}
      />

      <View className="gap-3 p-4 pb-2">
        {/* Search */}
        <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-1">
          <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search items by name or SKU..."
            className="flex-1 py-1 text-sm text-foreground"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>

        {!isAdmin && (
          <View className="flex-row items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
            <HugeiconsIcon icon={CircleLock01Icon} size={18} color={colors.primary[600]} strokeWidth={2} />
            <Text className="flex-1 text-xs text-primary-900">
              Staff permissions: Catalog items cannot be modified directly. Tap + to request new items.
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerClassName="p-4 pb-12 gap-3" showsVerticalScrollIndicator={false}>
        {isLoading
          ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={colors.primary[600]} />
              </View>
            )
          : filteredItems && filteredItems.length > 0
            ? (
                <Card className="gap-2 border border-border p-3">
                  {filteredItems.map(item => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: `${basePath}/item/[id]`,
                          params: { id: item.id },
                        })}
                      className="flex-row items-center justify-between border-b border-border/40 py-2.5 last:border-b-0"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="size-10 items-center justify-center rounded-xl bg-orange-50">
                          <HugeiconsIcon icon={Package01Icon} size={22} color={colors.primary[600]} strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-foreground">{item.name}</Text>
                          <Text className="text-xs text-muted-foreground">
                            {item.code ?? 'SKU'}
                            {' '}
                            •
                            {item.brand ?? 'Generic'}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-xs font-bold text-foreground">
                          {Number(item.defaultSalePrice) > 0 ? `₹${item.defaultSalePrice}` : 'On Loan'}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">
                          {item.isBundle ? `Kit · ${item.bundleContents.length} items` : 'Unit'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </Card>
              )
            : (
                <Card className="items-center justify-center border border-border p-8">
                  <Text className="text-sm text-muted-foreground">No catalog items found</Text>
                </Card>
              )}
      </ScrollView>

      {/* Add or Request Item Modal */}
      <Modal
        ref={itemModal.ref}
        snapPoints={['85%']}
        title={isAdmin ? 'Add Catalog Item' : 'Request New Catalog Item'}
      >
        <BottomSheetScrollView contentContainerClassName="p-4 pb-12 gap-3" showsVerticalScrollIndicator={false}>
          <View className="gap-1">
            <Text className="text-xs font-semibold text-foreground">Item Name *</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. WiFi Router Dual Band"
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 gap-1">
              <Text className="text-xs font-semibold text-foreground">SKU / Code</Text>
              <Input
                value={code}
                onChangeText={setCode}
                placeholder="e.g. RTR-001"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-xs font-semibold text-foreground">Brand</Text>
              <Input
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g. TP-Link"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 gap-1">
              <Text className="text-xs font-semibold text-foreground">Sale Price (₹)</Text>
              <Input
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="numeric"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-xs font-semibold text-foreground">Deposit (₹)</Text>
              <Input
                value={deposit}
                onChangeText={setDeposit}
                placeholder="0.00"
                keyboardType="numeric"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </View>
          </View>

          {!isAdmin && (
            <View className="gap-1">
              <Text className="text-xs font-semibold text-foreground">Reason for Approval *</Text>
              <Input
                value={reason}
                onChangeText={setReason}
                placeholder="Why does the inventory need this item added?"
                className="h-16 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                multiline
              />
            </View>
          )}

          <View className="pt-3">
            <Button
              label={
                isCreating || isRequesting
                  ? 'Submitting...'
                  : isAdmin
                    ? 'Create Item'
                    : 'Submit for Approval'
              }
              className="bg-primary-600"
              disabled={isCreating || isRequesting}
              onPress={handleSubmit}
            />
          </View>
        </BottomSheetScrollView>
      </Modal>
    </View>
  );
}
