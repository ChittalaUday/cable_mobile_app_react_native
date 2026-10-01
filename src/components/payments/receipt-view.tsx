import type { Collection } from '@/lib/hooks/api/use-payments';
import { CheckmarkCircle02Icon, Rotate01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { dialogs } from '@/components/common/dialogs';
import { Card, LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { Button, colors, ScrollView, Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { useCollection, useReverseCollection } from '@/lib/hooks/api/use-payments';
import { usePermissions } from '@/lib/hooks/common/use-permissions';

const rupees = (value: string | number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OUTCOME_LABEL: Record<Collection['outcome'], string> = {
  full: 'Paid in full',
  partial: 'Part payment',
  none: 'Nothing collected',
  refund: 'Reversal',
  others: 'Other',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export function ReceiptView({ id }: { id: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { hasScope } = usePermissions();
  const { mutate: reverse, isPending: isReversing } = useReverseCollection();

  // Fetched by id, so a receipt older than the first page of the list still
  // opens. The server decides whether this caller may see it at all.
  const { data: receipt, isPending, error, refetch } = useCollection({ variables: { id } });

  if (isPending)
    return <Loading />;

  if (error !== null && error !== undefined) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="Receipt" showBack withSafeArea />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-sm text-muted-foreground">That receipt is not one you can see.</Text>
        </View>
      </View>
    );
  }

  if (receipt === undefined)
    return <LoadError onRetry={refetch} />;

  const isReversed = receipt.reversedById !== null;
  const isEquipment = receipt.customerEquipmentId !== null;
  // Only a tenant-wide grant may unwind a receipt — a collector correcting
  // their own round is exactly what the rule is there to stop.
  const canReverse = hasScope(PERMISSIONS.PAYMENTS_UPDATE, 'ALL')
    && !isReversed
    && receipt.outcome !== 'refund';

  const submitReversal = (reason: string) => {
    reverse({ id: receipt.id, reason }, {
      onSuccess: () => refetch(),
      onError: failure => void dialogs.notify('Not reversed', failure.message),
    });
  };

  // Both platforms ask for the reason now. This used to branch on `Platform`
  // because `Alert.prompt` is iOS-only, so Android recorded every reversal
  // under one canned sentence — an audit trail that said nothing.
  const confirmReverse = async () => {
    const reason = await dialogs.prompt({
      title: 'Reverse this receipt',
      message: 'The original stays on the record and both are audited. Say why:',
      confirmLabel: 'Reverse',
      prompt: { placeholder: 'Collected twice by mistake' },
    });

    if (reason !== null)
      submitReversal(reason);
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Receipt" subtitle={receipt.customerName ?? receipt.customerCode ?? 'Customer'} showBack withSafeArea />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-4">
        <Card className="items-center gap-1 border border-border p-5">
          <HugeiconsIcon
            icon={receipt.outcome === 'refund' ? Rotate01Icon : CheckmarkCircle02Icon}
            size={32}
            color={receipt.outcome === 'none' ? colors.neutral[400] : colors.primary[500]}
            strokeWidth={1.8}
          />
          <Text className="text-3xl font-black text-foreground">{rupees(receipt.totalCollected)}</Text>
          <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {OUTCOME_LABEL[receipt.outcome]}
          </Text>
          {isReversed && (
            <Text className="mt-1 rounded-full bg-danger-50 px-3 py-1 text-[11px] font-bold text-danger-600 dark:bg-danger-950/40">
              Reversed
            </Text>
          )}
        </Card>

        <Card className="border border-border p-4">
          <Row
            label={isEquipment ? t('recharge.equipment') : 'Account'}
            value={isEquipment ? (receipt.equipment?.serialNumber ?? receipt.equipment?.itemName ?? '—') : (receipt.serviceAccountNumber ?? '—')}
          />
          <Row label={isEquipment ? t('recharge.equipment_payment') : 'Dues paid'} value={rupees(receipt.duesPaid)} />
          {Number(receipt.accessoryAmount) !== 0 && <Row label="Accessories" value={rupees(receipt.accessoryAmount)} />}
          {!isEquipment && <Row label="Balance after" value={rupees(receipt.balanceAfter)} />}
          <Row label="Method" value={receipt.method ?? '—'} />
          <Row label="Collected by" value={receipt.collectorName ?? '—'} />
          <Row label="When" value={new Date(receipt.collectedAt).toLocaleString('en-IN')} />
          {receipt.locationPath != null && <Row label="Area" value={receipt.locationPath} />}
        </Card>

        {receipt.accessories.length > 0 && (
          <Card className="border border-border p-4">
            <Text className="pb-1 text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Accessories</Text>
            {receipt.accessories.map(item => (
              <Row key={item.catalogId} label={`${item.name} × ${item.quantity}`} value={rupees(item.amount)} />
            ))}
          </Card>
        )}

        {receipt.reason != null && (
          <Card className="border border-border p-4">
            <Text className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Reason</Text>
            <Text className="pt-1 text-sm text-foreground">{receipt.reason}</Text>
          </Card>
        )}

        {canReverse && (
          <Button
            label={isReversing ? 'Reversing…' : 'Reverse this receipt'}
            variant="outline"
            disabled={isReversing}
            onPress={confirmReverse}
          />
        )}

        <Button label="Done" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}
