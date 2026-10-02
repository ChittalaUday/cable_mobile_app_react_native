/* eslint-disable react-refresh/only-export-components -- the print hook and the skip switch belong beside the pieces that use them. */
import type { Collection } from '@/lib/hooks/api/use-payments';
import type { ReceiptInput } from '@/lib/printer/receipt';
import type { Printer } from '@/lib/printer/use-printer';
import { PrinterIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { dialogs } from '@/components/common/dialogs';
import { Card, Loading } from '@/components/common/shell';
import { Button, colors, Text, View } from '@/components/ui';
import { chooseUpiAccount, useTenantUpiAccounts } from '@/lib/hooks/api/use-tenant-upi';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { copiesPrinted, notePrinted } from '@/lib/printer/print-log';
import { buildReceipt, previewReceipt, QR_MARKER, receiptUpiUri } from '@/lib/printer/receipt';
import { ChoiceRow, Field } from './recharge/parts';

/**
 * Whether a collector may finish a recharge without printing.
 *
 * ponytail: hard-coded on until the admin setting exists; read it from tenant
 * settings then.
 */
export const ALLOW_SKIP_PRINTING = true;

/**
 * One receipt, ready for paper: what it will say, and the call that prints it.
 *
 * The copy number comes from this handset's print log, so the second print of
 * the same receipt is stamped a duplicate wherever it is printed from.
 */
export function useReceiptPrint(receipt: Collection, printer: Printer, upiAccountId: string | null = null, planName: string | null = null) {
  const { data: upiAccounts } = useTenantUpiAccounts();
  const tenantId = useAuthStore.use.tenantId();
  const memberships = useAuthStore.use.memberships();
  const [copies, setCopies] = React.useState(() => copiesPrinted(receipt.id));
  // State updates land a frame late; a ref is what stops a double tap printing twice.
  const busy = React.useRef(false);

  // The operator's own name heads the paper, so a customer can see who took it.
  const businessName = memberships.find(member => member.tenantId === tenantId)?.tenantName
    ?? 'Satya Cable & Broadband';
  const input: ReceiptInput = {
    receipt,
    businessName,
    upi: chooseUpiAccount(upiAccounts, upiAccountId),
    planName,
    copy: copies + 1,
  };

  const print = async () => {
    if (busy.current)
      return false;
    busy.current = true;

    try {
      const ok = await printer.print(buildReceipt(input));
      if (ok) {
        setCopies(notePrinted(receipt.id));
        return true;
      }

      await dialogs.notify(
        'Not printed',
        'The printer did not take the receipt. The payment is recorded either way — try again, or print it later from the receipts list.',
      );
      return false;
    }
    finally {
      busy.current = false;
    }
  };

  return { input, copies, print };
}

/** The receipt as the paper will carry it, with the UPI code drawn where it prints. */
export function ReceiptPreview({ input }: { input: ReceiptInput }) {
  const lines = previewReceipt(input).split('\n');
  const at = lines.findIndex(line => line.trim() === QR_MARKER);
  const above = (at === -1 ? lines : lines.slice(0, at)).join('\n');
  const below = lines.slice(at + 1).join('\n');
  return (
    // Drawn as the paper strip: white, only as wide as its columns, in a real
    // monospace face so the padded rows line up the way the printer lays them.
    <View className="self-center rounded-md border border-border bg-white px-3 py-4">
      <Text testID="recharge-preview" selectable style={PAPER_TEXT}>{above}</Text>
      {input.upi !== null && at !== -1 && (
        <>
          <View className="items-center py-2">
            <View className="rounded-lg bg-white p-2">
              <QRCode value={receiptUpiUri(input.upi)} size={140} />
            </View>
          </View>
          <Text selectable style={PAPER_TEXT}>{below}</Text>
        </>
      )}
    </View>
  );
}

const PAPER_TEXT = {
  fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  fontSize: 11,
  lineHeight: 15,
  color: '#111',
} as const;

/** Everything the collector can do to get a printer connected, one panel per phase. */
export function PrinterPanel({ printer }: { printer: Printer }) {
  const { phase, devices, connectedAddress, error, lastAddress } = printer;

  if (phase === 'unsupported') {
    return (
      <Card className="border border-border p-4">
        <Text className="text-sm text-muted-foreground">
          {Platform.OS === 'ios'
            ? 'iPhone cannot talk to these Bluetooth receipt printers — Apple only allows it for certified hardware. Print from an Android handset.'
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
            <Card className="flex-row items-center gap-2 border border-border p-4">
              <HugeiconsIcon icon={PrinterIcon} size={18} color={colors.primary[600]} strokeWidth={2} />
              <Text className="flex-1 text-sm font-bold text-foreground">
                {devices.find(device => device.address === connectedAddress)?.name ?? connectedAddress}
              </Text>
              <Text testID="printer-connected" className="text-[11px] font-bold text-green-600">Connected</Text>
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
                    onPress={() => void printer.connect(device.address)}
                    testID={`recharge-printer-${device.address}`}
                  />
                ))}
              </View>
            )}
    </Field>
  );
}
