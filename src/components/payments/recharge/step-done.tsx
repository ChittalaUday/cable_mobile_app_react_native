import type { Collection } from '@/lib/hooks/api/use-payments';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Card } from '@/components/common/shell';
import { ActivateAtActButton } from '@/components/customer/activate-at-act-button';
import { Button, colors, Text } from '@/components/ui';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';

/** A box ACT can be asked to update for the next cycle: renew it if the box has lapsed, activate it again if it is running and its plan is about to end. */
export type ActOffer = { id: string; action: 'renew' | 'activate' };

/** The last step: the money is on the books, printed or not. */
export function StepDone({ receipt, actOffers = [], onPrintAgain, onFinish }: {
  receipt: Collection;
  /** Boxes that can be updated on ACT now that the money is in, as they were before the payment changed anything. */
  actOffers?: ActOffer[];
  onPrintAgain: () => void;
  onFinish: () => void;
}) {
  const printed = useRechargeStore(state => state.printed);
  const actOnAct = useRechargeStore(state => state.actOnAct);
  // Only a payment that took money starts ACT by itself; a visit that collected nothing never does.
  const collected = receipt.customerEquipmentId === null && receipt.subscriptionId !== null && Number(receipt.totalCollected) > 0 && (receipt.outcome === 'full' || receipt.outcome === 'partial');
  const asked = actOnAct && collected;
  // A running box is offered only when the collector asked for it; a lapsed one's renewal always is.
  const offers = actOffers.filter(offer => offer.action === 'renew' || asked);

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

      {offers.length > 0 && (
        <Card className="gap-2 border border-border p-4">
          <Text className="text-sm font-bold text-foreground">
            {offers[0]!.action === 'renew' ? 'This box is inactive' : 'Activate for the next cycle'}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {offers[0]!.action === 'renew'
              ? 'Renew the box on ACT now. You will see the expired packages and confirm before anything is renewed.'
              : 'This plan is about to end. ACT will extend the box\'s packages. You will see what ACT offers and confirm before anything is spent.'}
            {' Admins are told when it is done.'}
          </Text>
          {offers.map((offer, index) => (
            <ActivateAtActButton
              key={offer.id}
              customerEquipmentId={offer.id}
              action={offer.action}
              // A payment that took money is the reason; without one the person is asked why, as a visit.
              {...(collected ? { collectionId: receipt.id } : { visit: { customerId: receipt.customerId, customerName: receipt.customerName, subscriptionId: receipt.subscriptionId } })}
              // One browser per provider: the first box starts now, any other waits for its own tap.
              autoStart={asked && index === 0}
            />
          ))}
        </Card>
      )}

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
