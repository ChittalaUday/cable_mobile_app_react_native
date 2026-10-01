import type { Collection } from '@/lib/hooks/api/use-payments';
import { CheckmarkCircle02Icon, PrinterIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Platform } from 'react-native';
import { dialogs } from '@/components/common/dialogs';
import { Card, Loading } from '@/components/common/shell';
import { Button, colors, Text, View } from '@/components/ui';
import { chooseUpiAccount, useTenantUpiAccounts } from '@/lib/hooks/api/use-tenant-upi';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { buildReceipt, previewReceipt } from '@/lib/printer/receipt';
import { usePrinter } from '@/lib/printer/use-printer';
import { rupeesExact } from '@/lib/utils/admin-format';
import { ChoiceRow, Field } from './parts';

/**
 * Step three: the money is recorded, now get it onto paper.
 *
 * The receipt exists by the time this renders — the API call is what moved the
 * flow here. Nothing on this step can fail in a way that loses it, which is
 * why printing is offered rather than required: a dead printer battery must
 * not be able to strand a payment that is already on the books.
 */
export function StepDone({ receipt, onFinish }: { receipt: Collection; onFinish: () => void }) {
  const printed = useRechargeStore(state => state.printed);
  const markPrinted = useRechargeStore(state => state.markPrinted);
  const upiAccountId = useRechargeStore(state => state.upiAccountId);
  const { data: upiAccounts } = useTenantUpiAccounts();
  const tenantId = useAuthStore.use.tenantId();
  const memberships = useAuthStore.use.memberships();
  const printer = usePrinter();

  // The operator's own name heads the paper, so a customer can see who took it.
  const businessName = memberships.find(member => member.tenantId === tenantId)?.tenantName
    ?? 'Satya Cable & Broadband';
  const upi = chooseUpiAccount(upiAccounts, upiAccountId);
  const input = { receipt, businessName, upi } as const;

  // Asked for once, as the step opens. Everything the collector does here needs
  // the printer list, so there is nothing to gain by waiting for a tap.
  const { refresh } = printer;
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const send = async () => {
    const ok = await printer.print(buildReceipt(input));

    if (ok) {
      markPrinted();
      return;
    }

    await dialogs.notify(
      'Not printed',
      printer.error ?? 'The printer did not take the receipt. The payment is recorded either way.',
    );
  };

  const connectThenPrint = async (address: string) => {
    if (await printer.connect(address))
      await send();
  };

  return (
    <>
      <Card className="items-center gap-1.5 border border-border p-5">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={40} color={colors.primary[600]} strokeWidth={1.8} />
        <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Recorded
        </Text>
        <Text testID="recharge-recorded-total" className="text-3xl font-black text-foreground">
          {rupeesExact(receipt.totalCollected)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {`Receipt ${receipt.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`}
        </Text>
        {printed && (
          <Text className="text-[11px] font-bold text-green-600">Printed</Text>
        )}
      </Card>

      <Field label="Receipt preview">
        <Card className="border border-border p-3">
          <Text
            testID="recharge-preview"
            selectable
            className="font-mono text-[11px]/4 text-foreground"
          >
            {previewReceipt(input)}
          </Text>
        </Card>
      </Field>

      <PrinterPanel printer={printer} onConnect={connectThenPrint} onPrint={send} />

      <Button
        label={printed ? 'Done' : 'Skip printing and finish'}
        variant={printed ? 'default' : 'outline'}
        onPress={onFinish}
        className={printed ? 'bg-primary-600' : ''}
        testID="recharge-finish"
      />

      <Text className="px-1 text-[11px] text-muted-foreground">
        The payment is already on the books. Printing is optional — the receipt can be printed again from
        the receipts list.
      </Text>
    </>
  );
}

/** Everything the collector can do about the printer, in one panel per phase. */
function PrinterPanel({ printer, onConnect, onPrint }: {
  printer: ReturnType<typeof usePrinter>;
  onConnect: (address: string) => Promise<void>;
  onPrint: () => Promise<void>;
}) {
  const { phase, devices, connectedAddress, error, lastAddress } = printer;

  if (phase === 'unsupported') {
    return (
      <Card className="border border-border p-4">
        <Text className="text-sm text-muted-foreground">
          {Platform.OS === 'ios'
            ? 'iPhone cannot talk to these Bluetooth receipt printers — Apple only allows it for certified hardware. Print from an Android handset, or share the receipt from the receipts list.'
            : 'Bluetooth printing is not in this build. Install the latest build to print receipts.'}
        </Text>
      </Card>
    );
  }

  if (phase === 'checking')
    return <Loading />;

  if (phase === 'disabled' || phase === 'needs-permission') {
    return (
      <Card className="gap-3 border border-border p-4">
        <Text className="text-sm text-muted-foreground">
          {phase === 'disabled'
            ? 'Bluetooth is off. Turn it on to reach the printer.'
            : 'The app needs the Nearby devices permission to reach the printer.'}
        </Text>
        <Button label="Try again" variant="outline" onPress={() => void printer.refresh()} />
      </Card>
    );
  }

  // Sorted so the printer used last is first, then anything that says it is a
  // printer — a collector's round is the same printer every time.
  const ordered = [...devices].sort((a, b) => {
    if (a.address === lastAddress)
      return -1;
    if (b.address === lastAddress)
      return 1;

    return Number(b.isLikelyPrinter) - Number(a.isLikelyPrinter);
  });

  return (
    <Field label="Printer">
      {error !== null && (
        <Text className="text-xs font-semibold text-red-600">{error}</Text>
      )}

      {connectedAddress !== null
        ? (
            <Card className="gap-3 border border-border p-4">
              <View className="flex-row items-center gap-2">
                <HugeiconsIcon icon={PrinterIcon} size={18} color={colors.primary[600]} strokeWidth={2} />
                <Text className="flex-1 text-sm font-bold text-foreground">
                  {devices.find(device => device.address === connectedAddress)?.name ?? connectedAddress}
                </Text>
                <Text className="text-[11px] font-bold text-green-600">Connected</Text>
              </View>
              <Button
                label={phase === 'printing' ? 'Printing…' : 'Print receipt'}
                disabled={phase === 'printing'}
                onPress={() => void onPrint()}
                className="bg-primary-600"
                testID="recharge-print"
              />
            </Card>
          )
        : ordered.length === 0
          ? (
              <Card className="gap-3 border border-border p-4">
                <Text className="text-sm text-muted-foreground">
                  No paired printer. Pair it once in the phone's Bluetooth settings, then come back —
                  pairing is the system's job and it does it better than an app can.
                </Text>
                <Button label="Look again" variant="outline" onPress={() => void printer.refresh()} />
              </Card>
            )
          : (
              <View className="gap-2">
                {ordered.map(device => (
                  <ChoiceRow
                    key={device.address}
                    title={device.name}
                    subtitle={device.address === lastAddress ? 'Used last time' : device.address}
                    trailing={phase === 'connecting' ? '…' : 'Connect'}
                    disabled={phase === 'connecting'}
                    onPress={() => void onConnect(device.address)}
                    testID={`recharge-printer-${device.address}`}
                  />
                ))}
              </View>
            )}
    </Field>
  );
}
