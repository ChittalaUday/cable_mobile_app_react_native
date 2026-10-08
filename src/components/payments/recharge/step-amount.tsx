import type { CustomerDetail, CustomerSubscription } from '@/lib/api/types';
import * as React from 'react';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '@/components/common/shell';
import { Input, Pill, Pressable, Text, View } from '@/components/ui';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/constants/billing';
import { useCustomerEquipment } from '@/lib/hooks/api/use-inventory';
import { chooseUpiAccount, useTenantUpiAccounts } from '@/lib/hooks/api/use-tenant-upi';
import { paise, useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { receiptUpiUri } from '@/lib/printer/receipt';
import { rupeesExact, shortDate } from '@/lib/utils/admin-format';
import { ChoiceRow, Field, SumRow } from './parts';

/**
 * Step two: what the money is for, how much, and how it arrived.
 *
 * The connection was settled on the previous step and is only restated here, as
 * a line of text — not as a second copy of the table. One place to choose, one
 * place to read back.
 */
export function StepAmount({ customer, line }: {
  customer: CustomerDetail;
  line: CustomerSubscription | null;
}) {
  const charge = useRechargeStore(state => state.charge);
  const target = useRechargeStore(state => state.target);
  const amount = useRechargeStore(state => state.amount);
  const method = useRechargeStore(state => state.method);
  const notes = useRechargeStore(state => state.notes);
  const upiAccountId = useRechargeStore(state => state.upiAccountId);
  const setField = useRechargeStore(state => state.setField);

  const { data: upiAccounts } = useTenantUpiAccounts();

  // Display only — the server does the booking. The plan chosen on step one is
  // this cycle's charge, added to what was already owed; the payment comes off.
  const duePaise = paise(line?.outstandingBalance ?? customer.outstandingBalance ?? 0);
  // The server says what the plan adds now: the price once the charged cycle
  // has run out, zero inside it (a second visit in the same month adds nothing).
  const planPaise = line === null ? 0 : paise(line.nextPlanCharge);
  const totalPaise = duePaise + planPaise;
  const payPaise = Math.max(0, paise(amount));
  const afterPaise = totalPaise - payPaise;

  const { data: held } = useCustomerEquipment({ variables: { customerId: customer.id } });
  // Picked on the select step; named again here so the collector sees what the money is for.
  const pickedItems = target?.kind === 'issue' ? target.units : [];
  const equipmentName = target?.kind === 'replace'
    ? held?.find(unit => unit.id === target.customerEquipmentId)?.itemName
    : pickedItems.map(item => item.name).join(', ');
  const listPaise = pickedItems.reduce((sum, item) => sum + paise(item.price), 0);
  const upi = chooseUpiAccount(upiAccounts, upiAccountId);

  return (
    <>
      {charge === 'subscription' && (
        <Card className="gap-1 border border-border p-4">
          <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Paying for
          </Text>
          <Text className="text-base font-extrabold text-foreground">
            {line === null ? (customer.name ?? 'This account') : line.plan.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {line === null ? 'Account balance' : `${line.serviceAccountNumber} • ${duePaise < 0 ? `${rupeesExact(-duePaise / 100)} advance` : `${rupeesExact(duePaise / 100)} due`}`}
          </Text>
        </Card>
      )}

      {charge === 'equipment' && (
        <Card className="gap-1 border border-border p-4">
          <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {target?.kind === 'replace' ? 'Replacing' : 'Adding'}
          </Text>
          <Text className="text-base font-extrabold text-foreground">{equipmentName || 'Equipment'}</Text>
          {pickedItems.length > 0 && (
            <Text className="text-xs text-muted-foreground">{`${pickedItems.length} item${pickedItems.length > 1 ? 's' : ''} • list price ${rupeesExact(listPaise / 100)}`}</Text>
          )}
        </Card>
      )}

      <Field label="Amount paid">
        <Input
          value={amount}
          onChangeText={value => setField('amount', value)}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder={charge === 'subscription' ? 'Leave empty if not paid' : target?.kind === 'replace' ? 'Leave empty for a free swap' : '0.00'}
          testID="recharge-amount"
        />
        {charge === 'subscription' && (
          <View className="flex-row flex-wrap gap-2">
            {[
              ...(line === null ? [] : [{ key: 'plan', label: `Plan ${rupeesExact(line.price)}`, value: line.price }]),
              ...(totalPaise > 0 ? [{ key: 'due', label: `Full due ${rupeesExact(totalPaise / 100)}`, value: (totalPaise / 100).toFixed(2) }] : []),
            ].map(chip => (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                onPress={() => setField('amount', Number(chip.value).toFixed(2))}
                className="rounded-full border border-border bg-card px-3 py-1.5 active:bg-muted/40"
              >
                <Text className="text-[11px] font-bold text-primary-600">{chip.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Field>

      <Field label="Paid by">
        <View className="flex-row flex-wrap gap-2">
          {PAYMENT_METHODS.map(option => (
            <Pill
              key={option}
              accessibilityRole="radio"
              label={PAYMENT_METHOD_LABELS[option]}
              onPress={() => setField('method', option)}
              selected={method === option}
              variant="soft"
            />
          ))}
        </View>
      </Field>

      {method === 'upi' && <UpiPanel upi={upi} accounts={upiAccounts ?? []} onPick={id => setField('upiAccountId', id)} />}

      <Field label="Notes (optional)">
        <Input
          value={notes}
          onChangeText={value => setField('notes', value)}
          returnKeyType="done"
          placeholder="Anything the office should know"
        />
      </Field>

      {charge === 'subscription'
        ? (
            <Card className="gap-2.5 border border-border p-4">
              {duePaise < 0
                ? <SumRow label="Advance in hand" value={rupeesExact(-duePaise / 100)} tone="credit" />
                : <SumRow label="Previous balance" value={rupeesExact(duePaise / 100)} />}
              {line !== null && (
                <SumRow
                  label={planPaise > 0
                    ? `Plan — ${line.plan.name}`
                    : `Plan — ${line.plan.name} (${rupeesExact(line.price)}, charged${line.chargedThrough === null ? '' : ` till ${shortDate(new Date(line.chargedThrough))}`})`}
                  value={`+ ${rupeesExact(planPaise / 100)}`}
                  testID="recharge-plan-charge"
                />
              )}
              <SumRow label="Total payable" value={rupeesExact(Math.max(0, totalPaise) / 100)} testID="recharge-total-payable" />
              <SumRow label="Paying now" value={`− ${rupeesExact(payPaise / 100)}`} />
              <View className="h-px bg-border" />
              {afterPaise < 0
                ? (
                    <SumRow
                      label="Advance after recharge"
                      value={rupeesExact(-afterPaise / 100)}
                      tone="credit"
                      testID="recharge-balance-after"
                    />
                  )
                : (
                    <SumRow
                      label="Balance after recharge"
                      value={rupeesExact(afterPaise / 100)}
                      tone="strong"
                      testID="recharge-balance-after"
                    />
                  )}
            </Card>
          )
        : (
            <Card className="gap-2.5 border border-border p-4">
              <SumRow
                label="Charging for equipment"
                value={rupeesExact(payPaise / 100)}
                tone="strong"
                testID="recharge-equipment-total"
              />
              <Text className="text-[11px] text-muted-foreground">
                Hardware is booked against the customer, not a connection, so no
                subscription balance moves.
              </Text>
            </Card>
          )}
    </>
  );
}

/**
 * The QR the customer scans, shown the moment UPI is chosen.
 *
 * No amount is encoded: the collector is watching the customer's phone, and a
 * pre-filled figure is one more thing that can disagree with what was typed
 * here. The amount recorded is the amount the collector enters, either way.
 */
function UpiPanel({ upi, accounts, onPick }: {
  upi: ReturnType<typeof chooseUpiAccount>;
  accounts: { id: string; upiId: string; payeeName: string; label: string | null }[];
  onPick: (id: string) => void;
}) {
  if (upi === null) {
    return (
      <Card className="border border-border p-4">
        <Text className="text-sm text-muted-foreground">
          No UPI handle is set up for this operator yet, so there is no code to show. An admin adds one in
          Settings. The payment can still be recorded as UPI.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="items-center gap-2 border border-border p-4">
      <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Scan to pay
      </Text>
      <View className="rounded-xl bg-white p-3">
        <QRCode value={receiptUpiUri(upi)} size={180} />
      </View>
      <Text className="text-sm font-bold text-foreground">{upi.upiId}</Text>
      <Text className="text-xs text-muted-foreground">{upi.payeeName}</Text>

      {accounts.length > 1 && (
        <View className="mt-1 w-full gap-2">
          <Text className="text-[11px] font-semibold text-muted-foreground">Collect into</Text>
          {accounts.map(account => (
            <ChoiceRow
              key={account.id}
              title={account.label ?? account.payeeName}
              subtitle={account.upiId}
              selected={account.id === upi.id}
              onPress={() => onPick(account.id)}
            />
          ))}
        </View>
      )}
    </Card>
  );
}
