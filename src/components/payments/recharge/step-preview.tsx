import type { Collection } from '@/lib/hooks/api/use-payments';
import type { Printer } from '@/lib/printer/use-printer';
import * as React from 'react';
import { Button, Text } from '@/components/ui';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { ALLOW_SKIP_PRINTING, ReceiptPreview, useReceiptPrint } from '../receipt-print';

/**
 * Step four: the paper, approved before it is printed.
 *
 * Drawn from the recorded receipt — the API call is what opened the steps after
 * the amount — so nothing here prints money the server has not booked.
 */
export function StepPreview({ receipt, printer, planName, onSkip }: {
  receipt: Collection;
  printer: Printer;
  planName: string | null;
  onSkip: () => void;
}) {
  const upiAccountId = useRechargeStore(state => state.upiAccountId);
  const markPrinted = useRechargeStore(state => state.markPrinted);
  const { input, print } = useReceiptPrint(receipt, printer, upiAccountId, planName);
  const printing = printer.phase === 'printing';

  return (
    <>
      <ReceiptPreview input={input} />

      {printer.error !== null && (
        <Text className="px-1 text-xs font-semibold text-red-600">{printer.error}</Text>
      )}

      <Button
        label={printing ? 'Printing…' : (input.copy ?? 1) > 1 ? `Print duplicate (copy ${input.copy})` : 'Print receipt'}
        disabled={printing}
        onPress={async () => {
          if (await print())
            markPrinted();
        }}
        className="bg-primary-600"
        testID="recharge-print"
      />

      {ALLOW_SKIP_PRINTING && (
        <Button
          label="Skip printing"
          variant="ghost"
          size="sm"
          disabled={printing}
          onPress={onSkip}
          testID="recharge-skip-print"
        />
      )}
    </>
  );
}
