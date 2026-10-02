import type { Collection } from '@/lib/hooks/api/use-payments';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Card } from '@/components/common/shell';
import { Button, colors, Text } from '@/components/ui';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';

/** The last step: the money is on the books, printed or not. */
export function StepDone({ receipt, onPrintAgain, onFinish }: {
  receipt: Collection;
  onPrintAgain: () => void;
  onFinish: () => void;
}) {
  const printed = useRechargeStore(state => state.printed);

  return (
    <>
      <Card className="items-center gap-1.5 border border-border p-6">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={56} color={colors.primary[600]} strokeWidth={1.8} />
        <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Payment recorded
        </Text>
        <Text testID="recharge-recorded-total" className="text-3xl font-black text-foreground">
          {rupeesExact(receipt.totalCollected)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {`Receipt ${receipt.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`}
        </Text>
        <Text className={`text-[11px] font-bold ${printed ? 'text-green-600' : 'text-muted-foreground'}`}>
          {printed ? 'Printed' : 'Not printed — print it any time from the receipts list'}
        </Text>
      </Card>

      <Button label="Done" onPress={onFinish} className="bg-primary-600" testID="recharge-finish" />
      <Button
        label={printed ? 'Print another copy' : 'Print receipt'}
        variant="outline"
        onPress={onPrintAgain}
        testID="recharge-print-again"
      />
    </>
  );
}
