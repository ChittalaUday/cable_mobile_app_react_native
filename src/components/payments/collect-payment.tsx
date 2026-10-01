import type { CustomerSubscription, PaymentEntryMethod } from '@/lib/api/types';
import type { RecordCollectionPayload } from '@/lib/hooks/api/use-payments';
import type { CollectionFix } from '@/lib/hooks/common/use-collection-fix';
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  Location01Icon,
  MinusSignIcon,
  Package01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { Card, LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import {
  Button,
  colors,
  Input,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/constants/billing';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { useInventoryStock } from '@/lib/hooks/api/use-inventory';
import { newCollectionReference, useRecordCollection } from '@/lib/hooks/api/use-payments';
import { fixPayload, useCollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { rupeesExact as rupees } from '@/lib/utils/admin-format';

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

type AccessoryLine = { catalogId: string; name: string; quantity: number; unitPrice: string };

/** Says plainly whether this receipt will carry a position, and how good it is. */
function fixLabel(fix: CollectionFix): string {
  switch (fix.status) {
    case 'locating':
      return 'Finding your location…';
    case 'ready':
      return `Location attached · accurate to ${Math.round(fix.gpsAccuracyM)} m`;
    case 'denied':
      return 'Location off — the receipt will not say where it was collected';
    case 'unavailable':
      return 'No location fix — the receipt will not say where it was collected';
  }
}

function lineDue(subscription: CustomerSubscription | null, fallback: string): string {
  return subscription === null ? fallback : subscription.outstandingBalance;
}

export function CollectPaymentScreen({ customerId, basePath }: {
  customerId: string;
  basePath: '/admin' | '/staff';
}) {
  const router = useRouter();
  const { data: customer, isPending, error, refetch } = useCustomer({ variables: { id: customerId } });
  const { data: catalog } = useInventoryStock();
  const { mutate: record, isPending: isSaving } = useRecordCollection();
  const fix = useCollectionFix();

  const [outcome, setOutcome] = React.useState<OutcomeChoice>('full');
  const [typedAmount, setTypedAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentEntryMethod>('cash');
  const [subscriptionIndex, setSubscriptionIndex] = React.useState(0);
  const [accessories, setAccessories] = React.useState<AccessoryLine[]>([]);
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [showCatalog, setShowCatalog] = React.useState(false);

  /**
   * Generated once per visit and kept across retries, so a tap that times out
   * and is tapped again records one payment rather than two.
   */
  const reference = React.useRef(newCollectionReference());

  const lines = customer?.subscriptions ?? [];
  const line = lines[subscriptionIndex] ?? null;
  const due = lineDue(line, customer?.outstandingBalance ?? '0');

  // "Full" is whatever the chosen line owes and follows the line the collector
  // picks; only a part payment is typed. Derived rather than synced, so the
  // field cannot be left showing the previous line's balance.
  const amount = outcome === 'full' ? Number(due).toFixed(2) : outcome === 'none' ? '0' : typedAmount;

  const accessoryTotal = accessories.reduce((total, item) => total + Number(item.unitPrice) * item.quantity, 0);
  const takings = (outcome === 'none' ? 0 : Number(amount || 0)) + accessoryTotal;

  const addAccessory = (item: { id: string; name: string; defaultSalePrice: string }) => {
    setShowCatalog(false);
    setAccessories((current) => {
      const existing = current.find(line => line.catalogId === item.id);

      return existing === undefined
        ? [...current, { catalogId: item.id, name: item.name, quantity: 1, unitPrice: Number(item.defaultSalePrice || 0).toFixed(2) }]
        : current.map(line => line.catalogId === item.id ? { ...line, quantity: line.quantity + 1 } : line);
    });
  };

  const step = (catalogId: string, by: number) => {
    setAccessories(current => current
      .map(line => line.catalogId === catalogId ? { ...line, quantity: line.quantity + by } : line)
      .filter(line => line.quantity > 0));
  };

  const submit = () => {
    if (outcome === 'none' && reason.trim() === '') {
      void dialogs.notify('Reason needed', 'Say why nothing was collected — it is the part of the round an operator actually reads.');
      return;
    }

    const payload: RecordCollectionPayload = {
      customerId,
      amount: outcome === 'none' ? '0' : Number(amount || 0).toFixed(2),
      reference: reference.current,
      ...(line !== null ? { subscriptionId: line.id } : {}),
      ...(outcome === 'none' ? { reason: reason.trim() } : { method }),
      ...(accessories.length > 0
        ? { accessories: accessories.map(({ catalogId, quantity, unitPrice }) => ({ catalogId, quantity, unitPrice })) }
        : {}),
      ...(notes.trim() === '' ? {} : { notes: notes.trim() }),
      // Sent when the phone had one. A receipt is never held up waiting for it.
      ...fixPayload(fix),
    };

    record({ payload }, {
      onSuccess: (receipt) => {
        router.replace(`${basePath}/receipts/${receipt.id}`);
      },
      onError: (failure) => {
        void dialogs.notify('Not recorded', failure.message || 'The payment was not recorded. Nothing was taken off the account.');
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
                  <Text className="text-sm font-bold text-foreground">{rupees(option.outstandingBalance)}</Text>
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
                      <Pressable
                        key={option}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: method === option }}
                        onPress={() => setMethod(option)}
                        className={`rounded-full border px-4 py-2 ${method === option ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-border bg-card'}`}
                      >
                        <Text className="text-xs font-bold text-foreground">{PAYMENT_METHOD_LABELS[option]}</Text>
                      </Pressable>
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
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-foreground">Accessories bought</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowCatalog(value => !value)}>
              <Text className="text-xs font-bold text-primary-600">{showCatalog ? 'Close' : 'Add'}</Text>
            </Pressable>
          </View>

          {accessories.map(item => (
            <View key={item.catalogId} className="flex-row items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                <Text className="text-xs text-muted-foreground">{`${rupees(item.unitPrice)} each`}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`} onPress={() => step(item.catalogId, -1)}>
                  <HugeiconsIcon icon={MinusSignIcon} size={18} color={colors.neutral[500]} strokeWidth={2} />
                </Pressable>
                <Text className="text-sm font-bold text-foreground">{item.quantity}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} onPress={() => step(item.catalogId, 1)}>
                  <HugeiconsIcon icon={Add01Icon} size={18} color={colors.primary[600]} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          ))}

          {showCatalog && (
            <View className="gap-1.5 rounded-xl border border-border bg-card p-2">
              {(catalog ?? []).length === 0
                ? <Text className="p-2 text-xs text-muted-foreground">Nothing in the catalogue yet.</Text>
                : (catalog ?? []).slice(0, 12).map(item => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => addAccessory(item)}
                      className="flex-row items-center justify-between rounded-lg p-2 active:bg-muted/40"
                    >
                      <View className="flex-row items-center gap-2">
                        <HugeiconsIcon icon={Package01Icon} size={16} color={colors.primary[500]} strokeWidth={1.8} />
                        <Text className="text-sm text-foreground">{item.name}</Text>
                      </View>
                      <Text className="text-xs font-semibold text-muted-foreground">{rupees(item.defaultSalePrice)}</Text>
                    </Pressable>
                  ))}
            </View>
          )}
        </View>

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
          <HugeiconsIcon icon={Location01Icon} size={14} color={colors.neutral[400]} strokeWidth={2} />
          <Text className="flex-1 text-[11px] text-muted-foreground">{fixLabel(fix)}</Text>
        </View>

        <View className="flex-row items-start gap-2 px-1">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color={colors.neutral[400]} strokeWidth={2} />
          <Text className="flex-1 text-[11px] text-muted-foreground">
            Once recorded, a receipt cannot be edited or deleted by anyone. A mistake is corrected by an admin posting a reversal, and both are kept.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
