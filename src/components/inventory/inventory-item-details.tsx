import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  CircleLock01Icon,
  MoreVerticalIcon,
  Package01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { dialogs } from '@/components/common/dialogs';
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
import { useCreateApprovalRequest, useInventoryItem } from '@/lib/hooks/api/use-inventory';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export function InventoryItemDetailsScreen({
  id,
  basePath,
}: {
  id: string;
  basePath: '/admin/inventory' | '/staff/inventory';
}) {
  const router = useRouter();
  const role = useAuthStore.use.role();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const { data: item, isLoading } = useInventoryItem({ variables: { id } });

  // Approval request modal state for staff
  const approvalModal = useModal();
  const [requestReason, setRequestReason] = React.useState('');
  const [proposedName, setProposedName] = React.useState('');

  const { mutate: submitApproval, isPending: isSubmittingRequest } = useCreateApprovalRequest();

  const handleOpenEdit = () => {
    if (isAdmin) {
      void dialogs.notify('Edit Item', 'Admin direct editing is available in the item catalog.');
    }
    else {
      setProposedName(item?.name ?? '');
      approvalModal.present();
    }
  };

  const handleRequestSubmit = () => {
    if (!requestReason.trim()) {
      void dialogs.notify('Required', 'Please enter a reason for this modification request.');
      return;
    }

    submitApproval(
      {
        payload: {
          requestType: 'update_item',
          targetItemId: id,
          proposedData: { name: proposedName },
          reason: requestReason.trim(),
        },
      },
      {
        onSuccess: () => {
          approvalModal.dismiss();
          setRequestReason('');
          void dialogs.notify('Request Submitted', 'Your change request has been sent to the administrator for review and approval.');
        },
        onError: (err) => {
          void dialogs.notify('Error', err.message ?? 'Failed to submit request');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-6">
        <Text className="text-center text-muted-foreground">Item not found</Text>
        <Button label="Go Back" variant="outline" className="mt-4" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Item Details"
        subtitle={item.name}
        showBack
        withSafeArea
        rightAction={(
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenEdit}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card active:bg-muted"
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={20} color={colors.neutral[800]} strokeWidth={2} />
          </Pressable>
        )}
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-4" showsVerticalScrollIndicator={false}>
        {/* Hero Device Card */}
        <Card className="items-center justify-center border border-border bg-neutral-900 p-8">
          <View className="size-20 items-center justify-center rounded-2xl bg-neutral-800">
            <HugeiconsIcon icon={Package01Icon} size={42} color={colors.primary[500]} strokeWidth={1.6} />
          </View>
          <Text className="mt-4 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            {item.brand ?? 'Satya Network'}
          </Text>
        </Card>

        {/* Title and Status */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-xl font-black text-foreground">{item.name}</Text>
            <Text className="text-sm font-semibold text-muted-foreground">{item.code ?? 'SKU-000'}</Text>
          </View>
          <View className="rounded-full bg-success-50 px-3 py-1">
            <Text className="text-xs font-bold text-success-700">In Stock</Text>
          </View>
        </View>

        {/* Role permission info banner for Staff */}
        {!isAdmin && (
          <View className="flex-row items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
            <HugeiconsIcon icon={CircleLock01Icon} size={18} color={colors.primary[600]} strokeWidth={2} />
            <Text className="flex-1 text-xs text-primary-900">
              Staff access: You can issue this item. Catalog modifications require administrator approval.
            </Text>
          </View>
        )}

        {/* Specifications Table */}
        <Card className="border border-border p-3.5">
          <Text className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Specifications
          </Text>

          <View className="divide-y divide-border/60">
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-muted-foreground">Item Type</Text>
              <Text className="text-xs font-bold text-foreground capitalize">{item.itemType}</Text>
            </View>
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-muted-foreground">Serial No.</Text>
              <Text className="text-xs font-bold text-foreground">
                {item.isBundle ? `Kit of ${item.bundleContents.length}` : 'Single unit'}
              </Text>
            </View>
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-muted-foreground">Total Stock</Text>
              <Text className="text-xs font-bold text-foreground">{item.totalStock}</Text>
            </View>
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-muted-foreground">Available</Text>
              <Text className="text-xs font-bold text-success-600">{item.availableStock}</Text>
            </View>
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-muted-foreground">Issued</Text>
              <Text className="text-xs font-bold text-foreground">{item.issuedStock}</Text>
            </View>
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-muted-foreground">Location</Text>
              <Text className="text-xs font-bold text-foreground">
                {item.locationName ?? 'Not Assigned'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Description */}
        <Card className="border border-border p-3.5">
          <Text className="mb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Description
          </Text>
          <Text className="text-xs/relaxed text-foreground">
            {item.description ?? 'Standard inventory equipment unit.'}
          </Text>
        </Card>

        {/* Serialized units preview if available */}
        {item.units && item.units.length > 0 && (
          <Card className="border border-border p-3.5">
            <Text className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Sample Serialized Units (
              {item.units.length}
              )
            </Text>
            <View className="gap-2">
              {item.units.slice(0, 3).map((u, i) => (
                <View key={u.id} className="flex-row items-center justify-between rounded-lg bg-muted/50 p-2">
                  <View className="flex-1 pr-2">
                    <Text className="font-mono text-xs font-medium text-foreground">
                      {u.serialNumber ?? `Unit #${i + 1}`}
                    </Text>
                    {u.locationName && (
                      <Text className="text-[10px] text-muted-foreground">{u.locationName}</Text>
                    )}
                  </View>
                  <Text className="text-[11px] text-muted-foreground capitalize">{u.inventoryStatus}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Actions */}
        <View className="flex-row gap-3 pt-2">
          <Button
            label="View Stock"
            variant="outline"
            className="flex-1"
            onPress={() => router.push(`${basePath}/stock`)}
          />
          <Button
            label="Issue Item"
            className="flex-1 bg-primary-600"
            onPress={() =>
              router.push({
                pathname: `${basePath}/issue/customer`,
                params: { catalogId: item.id, itemName: item.name, itemCode: item.code ?? '' },
              })}
          />
        </View>
      </ScrollView>

      {/* Staff Change Approval Request Modal */}
      <Modal
        ref={approvalModal.ref}
        snapPoints={['70%']}
        title="Request Catalog Change"
      >
        <BottomSheetScrollView contentContainerClassName="p-4 pb-10 gap-4" showsVerticalScrollIndicator={false}>
          <Text className="text-xs text-muted-foreground">
            Staff cannot directly modify item details. Please provide a reason for the administrator to review.
          </Text>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-foreground">Item Name</Text>
            <Input
              value={proposedName}
              onChangeText={setProposedName}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-foreground">Reason for Modification</Text>
            <Input
              value={requestReason}
              onChangeText={setRequestReason}
              placeholder="e.g. Updating name to match latest supplier shipment"
              className="h-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
              multiline
            />
          </View>

          <Button
            label={isSubmittingRequest ? 'Submitting...' : 'Submit to Admin for Approval'}
            className="bg-primary-600"
            disabled={isSubmittingRequest}
            onPress={handleRequestSubmit}
          />
        </BottomSheetScrollView>
      </Modal>
    </View>
  );
}
