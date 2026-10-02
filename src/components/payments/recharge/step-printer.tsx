import type { Printer } from '@/lib/printer/use-printer';
import * as React from 'react';
import { Button, Text } from '@/components/ui';
import { ALLOW_SKIP_PRINTING, PrinterPanel } from '../receipt-print';

/**
 * Step three: the money is recorded — get a printer ready before showing paper.
 *
 * Next stays shut until a printer is connected, so the preview never offers a
 * Print button that cannot work. Skip is the way out for a dead battery: the
 * payment is already on the books, and the receipts list can print it later.
 */
export function StepPrinter({ printer, onNext, onSkip }: {
  printer: Printer;
  onNext: () => void;
  onSkip: () => void;
}) {
  // Asked for once, as the step opens: nothing here works without the list.
  const { refresh } = printer;
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const ready = printer.connectedAddress !== null && printer.phase !== 'connecting';

  return (
    <>
      <PrinterPanel printer={printer} />

      {!ready && (
        <Text className="px-1 text-xs text-muted-foreground">
          Connect the receipt printer to continue.
        </Text>
      )}

      <Button
        label="Next — preview the receipt"
        disabled={!ready}
        onPress={onNext}
        className="bg-primary-600"
        testID="recharge-printer-next"
      />

      {ALLOW_SKIP_PRINTING && (
        <Button
          label="Skip printing"
          variant="ghost"
          size="sm"
          onPress={onSkip}
          testID="recharge-skip-print"
        />
      )}
    </>
  );
}
