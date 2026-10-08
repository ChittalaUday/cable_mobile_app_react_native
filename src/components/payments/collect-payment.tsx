import type { CustomerSubscription, PaymentEntryMethod } from '@/lib/api/types';
import type { RecordCollectionPayload } from '@/lib/hooks/api/use-payments';
import type { CollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { CheckmarkCircle02Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { Card, LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import {
  Button,
  Input,
  Pill,
  Pressable,
  Text,
  ThemedIcon,
  View,
} from '@/components/ui';
import { MAX_COLLECTION_AMOUNT, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/constants/billing';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { useRecordCollection } from '@/lib/hooks/api/use-payments';
import { fixPayload, useCollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { translate } from '@/lib/i18n/utils';
import { isPaymentReferenceConflict, isPaymentResultUnknown } from '@/lib/payments/payment-errors';
import { clear as clearPendingReference, get as getPendingReference, metadata as pendingMetadata, renew as renewPendingReference } from '@/lib/payments/pending-reference';
import { ensureFix } from '@/lib/payments/require-fix';
import { rupeesExact as rupees } from '@/lib/utils/admin-format';
import { apiErrorMessage } from '@/lib/utils/api-error';
import { isPaymentAmount } from '@/lib/utils/payment-amount';

/**
 * The three outcomes a collector reports. `amount` is what changes between
 * them, so the server derives which one it was — these buttons only decide what
 * the field is pre-filled with and whether a reason is asked for.
 */
const OUTCOMES = [
  { id: 'full', label: 'Full' },
  { id: 'partial', label: 'Part' },
  { id: 'none', label: 'No payment' },
] as const;

type OutcomeChoice = (typeof OUTCOMES)[number]['id'];

/** Says plainly whether this receipt will carry a position, and how good it is. */
function fixLabel(fix: CollectionFix): string {
  switch (fix.status) {
    case 'locating':
      return 'Finding your location…';
    case 'ready':
      return `Location attached · accurate to ${Math.round(fix.gpsAccuracyM)} m`;
    case 'denied':
      return 'Location permission off — allow it to record this payment';
    case 'unavailable':
      return 'No location fix — turn location on to record this payment';
  }
}

/**
 * What the line owes if paid now: its balance plus the plan, when the server
 * says the cycle is due for charging. Display only — the server books the sum.
 */
function payable(subscription: CustomerSubscription): number {
  return Number(subscription.outstandingBalance) + Number(subscription.nextPlanCharge);
}

export function CollectPaymentScreen({ customerId, basePath }: {
  customerId: string;
  basePath: '/admin' | '/staff';
}) {
  const router = useRouter();
  const { data: customer, isPending, error, refetch } = useCustomer({ variables: { id: customerId } });
  const { mutate: record, isPending: isSaving } = useRecordCollection();
  const fix = useCollectionFix();

  const [outcome, setOutcome] = React.useState<OutcomeChoice>('full');
  const [typedAmount, setTypedAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentEntryMethod>('cash');
  const [subscriptionIndex, setSubscriptionIndex] = React.useState(0);
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [pendingReference, setPendingReference] = React.useState(() => getPendingReference(customerId, 'dues'));
  // Once the earlier attempt is known to be on the server (409) or the collector
  // has gone to check Receipts, the next submit is a new payment, not a retry.
  const renewReference = () => setPendingReference(renewPendingReference(customerId, 'dues'));

  const lines = customer?.subscriptions ?? [];
  const line = lines[subscriptionIndex] ?? null;
  const due = line === null ? Number(customer?.outstandingBalance ?? 0) : payable(line);

  // "Full" is whatever the chosen line owes and follows the line the collector
  // picks; only a part payment is typed. Derived rather than synced, so the
  // field cannot be left showing the previous line's balance.
  const amount = outcome === 'full' ? due.toFixed(2) : outcome === 'none' ? '0' : typedAmount;
  const takings = outcome === 'none' ? 0 : Number(amount || 0);

  const submit = () => {
    // Dues are always paid against a line; hardware has its own screen.
    if (line === null) {
      void dialogs.notify('No connection', 'This customer has no connection to collect dues against.');
      return;
    }
    if (!isPaymentAmount(amount) || !Number.isFinite(takings) || takings < 0 || Math.round(takings * 100) > Number(MAX_COLLECTION_AMOUNT) * 100) {
      void dialogs.notify(translate('payment_errors.invalid_amount_title'), translate('payment_errors.invalid_amount_message'));
      return;
    }
    if (!ensureFix(fix))
      return;
    if (outcome === 'none' && reason.trim() === '') {
      void dialogs.notify('Reason needed', 'Say why nothing was collected — it is the part of the round an operator actually reads.');
      return;
    }

    const payload: RecordCollectionPayload = {
      customerId,
      subscriptionId: line.id,
      // Null is "nothing paid": the server leaves the balance due.
      amount: outcome === 'none' ? null : Number(amount || 0).toFixed(2),
      reference: pendingReference.reference,
      ...(outcome === 'none' ? { reason: reason.trim() } : { method }),
      ...(notes.trim() === '' ? {} : { notes: notes.trim() }),
      // Required: ensureFix above refuses to send without one.
      ...pendingMetadata(customerId, 'dues', fixPayload(fix)),
    };

    record({ payload }, {
      onSuccess: (receipt) => {
        clearPendingReference(customerId, 'dues');
        router.replace(`${basePath}/receipts/${receipt.id}`);
      },
      onError: (failure) => {
        const viewReceipts = () => {
          renewReference();
          router.replace(`${basePath}/receipts`);
        };

        if (isPaymentReferenceConflict(failure)) {
          renewReference();
          void dialogs.confirm({
            title: translate('payment_errors.reference_conflict_title'),
            message: translate('payment_errors.reference_conflict_message'),
            tone: 'default',
            confirmLabel: translate('payment_errors.view_receipts'),
            cancelLabel: translate('payment_errors.close'),
          }).then((shouldViewReceipts) => {
            if (shouldViewReceipts)
              viewReceipts();
          });
          return;
        }

        if (isPaymentResultUnknown(failure)) {
          void dialogs.confirm({
            title: translate('payment_errors.unknown_result_title'),
            message: translate('payment_errors.unknown_result_message'),
            tone: 'default',
            confirmLabel: translate('payment_errors.retry'),
            cancelLabel: translate('payment_errors.view_receipts'),
          }).then((shouldRetry) => {
            if (shouldRetry)
              submit();
            else
              viewReceipts();
          });
          return;
        }

        void dialogs.notify('Not recorded', apiErrorMessage(failure, 'The payment was not recorded. Nothing was taken off the account.'));
      },
    });
  };

  if (isPending)
    return <Loading />;

  if (error || !customer)
    return <LoadError message={error?.message} onRetry={refetch} />;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Collect payment" subtitle={customer.name ?? customer.customerCode ?? 'Customer'} showBack withSafeArea />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <Card className="gap-1 border border-border p-4">
          <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Outstanding</Text>
          <Text className="text-3xl font-black text-foreground">{rupees(due)}</Text>
          {line !== null && Number(line.nextPlanCharge) > 0 && (
            <Text className="text-xs text-muted-foreground">
              {`${rupees(line.outstandingBalance)} owed + ${rupees(line.nextPlanCharge)} plan`}
            </Text>
          )}
          {customer.locationPath != null && (
            <Text className="text-xs text-muted-foreground">{customer.locationPath}</Text>
          )}
        </Card>

        {lines.length > 1 && (
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-foreground">Which connection</Text>
            <View className="gap-2">
              {lines.map((option, index) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: index === subscriptionIndex }}
                  onPress={() => setSubscriptionIndex(index)}
                  className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${index === subscriptionIndex ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-border bg-card'}`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold text-foreground">{option.service.name}</Text>
                    <Text className="text-xs text-muted-foreground">{option.serviceAccountNumber}</Text>
                  </View>
                  <Text className="text-sm font-bold text-foreground">{rupees(payable(option))}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Outcome</Text>
          <View className="flex-row gap-2">
            {OUTCOMES.map(option => (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: outcome === option.id }}
                onPress={() => setOutcome(option.id)}
                className={`flex-1 items-center rounded-xl border p-3 ${outcome === option.id ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'}`}
              >
                <Text className={`text-sm font-bold ${outcome === option.id ? 'text-white' : 'text-foreground'}`}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {outcome !== 'none'
          ? (
              <>
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-foreground">Amount collected</Text>
                  <Input
                    value={amount}
                    onChangeText={setTypedAmount}
                    editable={outcome === 'partial'}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    placeholder="0.00"
                    testID="collect-amount"
                  />
                </View>

                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-foreground">Paid by</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {PAYMENT_METHODS.map(option => (
                      <Pill
                        key={option}
                        accessibilityRole="radio"
                        label={PAYMENT_METHOD_LABELS[option]}
                        onPress={() => setMethod(option)}
                        selected={method === option}
                        variant="soft"
                      />
                    ))}
                  </View>
                </View>
              </>
            )
          : (
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Why nothing was collected</Text>
                <Input
                  value={reason}
                  onChangeText={setReason}
                  returnKeyType="done"
                  placeholder="Nobody home, asked to call back Friday…"
                  testID="collect-reason"
                />
              </View>
            )}

        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Notes (optional)</Text>
          <Input value={notes} onChangeText={setNotes} returnKeyType="done" placeholder="Anything the office should know" />
        </View>

        <Card className="flex-row items-center justify-between border border-border p-4">
          <Text className="text-sm font-semibold text-muted-foreground">Total to hand in</Text>
          <Text className="text-2xl font-black text-foreground">{rupees(takings)}</Text>
        </Card>

        <Button
          label={isSaving ? 'Recording…' : outcome === 'none' ? 'Record visit' : `Record ${rupees(takings)}`}
          disabled={isSaving}
          onPress={submit}
          className="bg-primary-600"
          testID="collect-submit"
        />

        <View className="flex-row items-center gap-2 px-1">
          <ThemedIcon icon={Location01Icon} size={14} strokeWidth={2} colorClassName="text-muted-foreground" />
          <Text className="flex-1 text-[11px] text-muted-foreground">{fixLabel(fix)}</Text>
        </View>

        <View className="flex-row items-start gap-2 px-1">
          <ThemedIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} colorClassName="text-muted-foreground" />
          <Text className="flex-1 text-[11px] text-muted-foreground">
            Once recorded, a receipt cannot be edited or deleted by anyone. A mistake is corrected by an admin posting a reversal, and both are kept.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
