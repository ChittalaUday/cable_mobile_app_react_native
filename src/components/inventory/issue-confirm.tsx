import type { EquipmentOwnership } from '@/lib/api/types';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Package01Icon,
  QrCodeIcon,
  UserIcon,
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
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { useIssueEquipment } from '@/lib/hooks/api/use-inventory';

const OWNERSHIP_OPTIONS: { label: string; value: EquipmentOwnership }[] = [
  { label: 'On Loan', value: 'tenant_provided' },
  { label: 'Security Deposit', value: 'deposit' },
  { label: 'Customer Owned / Sold', value: 'customer_owned' },
  { label: 'Rental', value: 'rental' },
];

export function IssueConfirmScreen({
  catalogId,
  itemName,
  itemCode,
  serialNumber: initialSerial,
  customerId,
  customerName,
  customerCode,
  basePath,
}: {
  catalogId: string;
  itemName: string;
  itemCode: string;
  serialNumber?: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  basePath: '/admin/inventory' | '/staff/inventory';
}) {
  const router = useRouter();
  const [serialNumber, setSerialNumber] = React.useState(initialSerial || '');
  const [ownershipIndex, setOwnershipIndex] = React.useState(0);
  const [selectedSubIndex, setSelectedSubIndex] = React.useState<number>(0);

  const { data: customerData, isLoading: isLoadingCustomer } = useCustomer({
    variables: { id: customerId },
  });

  const subscriptions = customerData?.subscriptions ?? [];
  const selectedSubscription = subscriptions[selectedSubIndex] ?? null;

  const { mutate: issueEquipment, isPending } = useIssueEquipment();

  const handleConfirm = () => {
    issueEquipment(
      {
        payload: {
          catalogId,
          customerId,
          subscriptionId: selectedSubscription?.id,
          serialNumber: serialNumber.trim() || undefined,
          ownershipType: OWNERSHIP_OPTIONS[ownershipIndex]!.value,
          chargedAmount: OWNERSHIP_OPTIONS[ownershipIndex]!.value === 'customer_owned' ? '250.00' : '0.00',
          depositAmount: OWNERSHIP_OPTIONS[ownershipIndex]!.value === 'deposit' ? '500.00' : '0.00',
        },
      },
      {
        onSuccess: (res) => {
          router.push({
            pathname: `${basePath}/issue/success`,
            params: {
              itemName,
              serialNumber: res.serialNumber ?? serialNumber,
              customerName,
              customerCode,
            },
          });
        },
        onError: (err) => {
          Alert.alert('Issue Failed', err?.message ?? 'Could not issue equipment');
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Confirm Issue"
        subtitle="Step 3: Verify terms and assign equipment"
        showBack
        withSafeArea
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-4" showsVerticalScrollIndicator={false}>
        {/* Selected Item Preview Card */}
        <Card className="flex-row items-center gap-3 border border-border p-3.5">
          <View className="size-12 items-center justify-center rounded-xl bg-neutral-900">
            <HugeiconsIcon icon={Package01Icon} size={24} color={colors.primary[500]} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">{itemName}</Text>
            <Text className="text-xs text-muted-foreground">{itemCode || 'SKU-001'}</Text>
          </View>
        </Card>

        {/* Serial Number input with scanner button */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-foreground">Serial Code (Default)</Text>
            <Text className="text-[10px] font-medium text-muted-foreground">Barcode optional</Text>
          </View>
          <View className="flex-row items-center rounded-xl border border-border bg-card px-3 py-1">
            <Input
              value={serialNumber}
              onChangeText={setSerialNumber}
              className="flex-1 border-0 bg-transparent font-mono text-sm text-foreground"
              placeholder="e.g. SN123456789 (or barcode)"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`${basePath}/issue/scan`)}
              className="p-1"
            >
              <HugeiconsIcon icon={QrCodeIcon} size={20} color={colors.primary[600]} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Assign To Customer Card */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Assign to</Text>
          <Card className="flex-row items-center justify-between border border-border p-3.5">
            <View className="flex-row items-center gap-3">
              <View className="size-10 items-center justify-center rounded-full bg-orange-50">
                <HugeiconsIcon icon={UserIcon} size={20} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">{customerName}</Text>
                <Text className="text-xs text-muted-foreground">{customerCode}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Subscription (Optional) */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Subscription (Optional)</Text>
          {isLoadingCustomer
            ? (
                <View className="items-center rounded-xl border border-border bg-card p-3">
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                </View>
              )
            : subscriptions.length > 0
              ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedSubIndex(i => (i + 1) % (subscriptions.length + 1))}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-semibold text-foreground">
                        {selectedSubscription
                          ? `${selectedSubscription.service?.name ?? 'Subscription'} (${selectedSubscription.serviceAccountNumber})`
                          : 'None / Standalone Assignment'}
                      </Text>
                      {selectedSubscription?.package?.name && (
                        <Text className="text-xs text-muted-foreground">{selectedSubscription.package.name}</Text>
                      )}
                    </View>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[400]} strokeWidth={2} />
                  </Pressable>
                )
              : (
                  <View className="rounded-xl border border-border bg-card px-4 py-3">
                    <Text className="text-sm text-muted-foreground">None (No subscriptions on account)</Text>
                  </View>
                )}
        </View>

        {/* Ownership Type */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Ownership Type</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOwnershipIndex(idx => (idx + 1) % OWNERSHIP_OPTIONS.length)}
            className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
          >
            <Text className="text-sm font-semibold text-foreground">
              {OWNERSHIP_OPTIONS[ownershipIndex]!.label}
            </Text>
            <HugeiconsIcon icon={ArrowDown01Icon} size={16} color={colors.neutral[500]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Confirm Button */}
        <View className="pt-4">
          <Button
            label={isPending ? 'Confirming...' : 'Confirm Issue'}
            disabled={isPending}
            className="bg-primary-600"
            onPress={handleConfirm}
          />
        </View>
      </ScrollView>
    </View>
  );
}
