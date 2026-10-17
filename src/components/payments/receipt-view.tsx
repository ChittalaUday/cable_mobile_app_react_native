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
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { useCollection, useReverseCollection } from '@/lib/hooks/api/use-payments';
import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { usePrinter } from '@/lib/printer/use-printer';
import { PrinterPanel, ReceiptPreview, useReceiptPrint } from './receipt-print';

const rupees = (value: string | number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OUTCOME_LABEL: Record<Collection['outcome'], string> = {
  full: 'Paid',
  partial: 'Partial',
  none: 'Not paid',
  due: 'Due',
  refund: 'Refund',
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

export function ReceiptView({ id, basePath = '/admin' }: { id: string; basePath?: '/admin' | '/staff' }) {
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

  // One dialog both confirms and asks the reason, so it has to say plainly what a reversal does: it cannot be
  // taken back, and it never reaches ACT. Both platforms ask for the reason (`Alert.prompt` is iOS-only, so
  // Android once recorded every reversal under one canned sentence: an audit trail that said nothing).
  const confirmReverse = async () => {
    const amount = rupees(receipt.totalCollected);
    const reason = await dialogs.prompt({
      title: 'Reverse this receipt?',
      message: [
        `This takes ${amount} back, as a refund:`,
        `• ${amount} goes back on the customer's account as unpaid.`,
        '• Any plan charge on this receipt comes off, and the line\'s cycle returns to where it was.',
        '• The original stays on record, marked Refunded, next to a new refund entry. Both are audited.',
        '• It cannot be undone. If this payment already activated or renewed the box on ACT, ACT is not changed.',
        '',
        'Say why:',
      ].join('\n'),
      confirmLabel: 'Reverse receipt',
      tone: 'danger',
      prompt: { placeholder: 'Collected twice by mistake' },
    });

    if (reason !== null)
      submitReversal(reason);
  };

  const reverseButton = canReverse
    ? <Button label={isReversing ? 'Reversing…' : 'Reverse this receipt'} variant="outline" disabled={isReversing} onPress={confirmReverse} testID="receipt-reverse" />
    : undefined;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Receipt" subtitle={receipt.customerName ?? receipt.customerCode ?? 'Customer'} showBack withSafeArea />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-4">
        <Card className="items-center gap-1 border border-border p-5">
          <HugeiconsIcon
            icon={receipt.outcome === 'refund' ? Rotate01Icon : CheckmarkCircle02Icon}
            size={32}
            color={receipt.outcome === 'none' || receipt.outcome === 'due' ? colors.neutral[400] : colors.primary[500]}
            strokeWidth={1.8}
          />
          <Text className="text-3xl font-black text-foreground">{rupees(receipt.totalCollected)}</Text>
          <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {OUTCOME_LABEL[receipt.outcome]}
          </Text>
          {isReversed && (
            <Text className="mt-1 rounded-full bg-danger-50 px-3 py-1 text-[11px] font-bold text-danger-600 dark:bg-danger-950/40">
              Refunded
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

        {!isReversed && receipt.outcome !== 'refund'
          ? <Reprint receipt={receipt}>{reverseButton}</Reprint>
          : reverseButton}

        <Button label="View customer details" variant="outline" onPress={() => router.push(`${basePath}/customers/${receipt.customerId}`)} testID="receipt-view-customer" />

        <Button label="Done" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

/**
 * Printing after the round, from the receipt itself. Opened on a tap so merely
 * viewing a receipt never raises the Bluetooth permission prompt; every print
 * after the first is stamped a duplicate. `children` (the reverse button) sits beside the print button, and
 * under the printer panel once that is open.
 */
function Reprint({ receipt, children }: { receipt: Collection; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const printer = usePrinter();
  // The receipt names its line, not its plan; the customer's lines say which plan that is.
  const { data: customer } = useCustomer({ variables: { id: receipt.customerId }, enabled: open && receipt.subscriptionId !== null });
  const planName = customer?.subscriptions.find(line => line.id === receipt.subscriptionId)?.plan.name ?? null;
  const { input, copies, print } = useReceiptPrint(receipt, printer, null, planName);
  const printed = copies > 0;

  if (!open) {
    return (
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label={printed ? 'Print a duplicate' : 'Print receipt'}
            variant="outline"
            onPress={() => {
              setOpen(true);
              void printer.refresh();
            }}
            testID="receipt-print-open"
          />
        </View>
        {children !== undefined && <View className="flex-1">{children}</View>}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-xs text-muted-foreground">
        {printed ? `Printed ${copies} time${copies === 1 ? '' : 's'} on this phone.` : 'Not printed on this phone yet.'}
      </Text>
      <ReceiptPreview input={input} />
      <PrinterPanel printer={printer} />
      {printer.connectedAddress !== null && (
        <Button
          label={printer.phase === 'printing' ? 'Printing…' : printed ? `Print duplicate (copy ${copies + 1})` : 'Print receipt'}
          disabled={printer.phase === 'printing'}
          onPress={() => void print()}
          className="bg-primary-600"
          testID="receipt-print"
        />
      )}
      {children}
    </View>
  );
}
