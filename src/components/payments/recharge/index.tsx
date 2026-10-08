import type { CustomerDetail, CustomerSubscription } from '@/lib/api/types';
import type { RecordCollectionPayload, RecordEquipmentPaymentPayload, ReplaceEquipmentPayload } from '@/lib/hooks/api/use-payments';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { BackHandler } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { Button, View } from '@/components/ui';
import { MAX_COLLECTION_AMOUNT } from '@/lib/constants/billing';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import {
  listCollections,
  useCollection,
  useRecordCollection,
  useRecordEquipmentPayment,
  useReplaceEquipment,
} from '@/lib/hooks/api/use-payments';
import { fixPayload, useCollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { useRefetchOnFocus } from '@/lib/hooks/common/use-refetch-on-focus';
import {
  canRecord,
  hasUnsavedWork,
  isFreeSwap,
  isMarkedDue,
  paise,
  STEPS,
  useRechargeStore,
} from '@/lib/hooks/stores/use-recharge-store';
import { translate } from '@/lib/i18n/utils';
import { balanceStillAgreed, isStale } from '@/lib/payments/fresh-balance';
import { isPaymentReferenceConflict, isPaymentResultUnknown } from '@/lib/payments/payment-errors';
import { metadata as pendingMetadata, renew as renewPendingReference } from '@/lib/payments/pending-reference';
import { ensureFix } from '@/lib/payments/require-fix';
import { usePrinter } from '@/lib/printer/use-printer';
import { rupeesExact, shortDate } from '@/lib/utils/admin-format';
import { apiErrorMessage } from '@/lib/utils/api-error';
import { isPaymentAmount } from '@/lib/utils/payment-amount';
import { clearVisitFlow, completeVisitAfterPayment } from '@/lib/visits/visit-flow';
import { ChargePicker, StepTrail } from './parts';
import { StepAmount } from './step-amount';
import { StepDone } from './step-done';
import { StepEquipment } from './step-equipment';
import { StepPlan } from './step-plan';
import { StepPreview } from './step-preview';
import { StepPrinter } from './step-printer';

const at = (iso: string) => `${shortDate(new Date(iso))}, ${new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;

/**
 * Asks before a second "due" in a cycle that is already charged, naming when it
 * was marked due and by whom, plus any visits logged since. The history is a
 * nicety: if it cannot be read, the warning still shows without it.
 */
async function warnAlreadyDue(customerId: string, line: CustomerSubscription): Promise<boolean> {
  // ponytail: first page of the customer's receipts only; a cycle with 30+ receipts shows the newest.
  const page = await listCollections({ customerId, limit: 30 }).catch(() => null);
  const visits = [];
  for (const receipt of page?.items ?? []) {
    if (receipt.subscriptionId !== line.id)
      continue;
    if (receipt.outcome !== 'due' && receipt.outcome !== 'none')
      break;
    visits.push(receipt);
    if (receipt.outcome === 'due')
      break;
  }
  const history = visits.map(visit => `• ${visit.outcome === 'due' ? 'Marked due' : 'Visit logged'} ${at(visit.collectedAt)} by ${visit.collectorName ?? 'a collector'}`);

  return dialogs.confirm({
    title: visits.length > 1 ? `Already marked due · ${visits.length} times` : 'Already marked due',
    message: [
      `${line.plan.name} · ${line.serviceAccountNumber}`,
      `Plan ${rupeesExact(line.price)} already charged${line.chargedThrough === null ? '' : ` through ${shortDate(new Date(line.chargedThrough))}`}`,
      `Balance due: ${rupeesExact(line.outstandingBalance)}`,
      ...(history.length === 0 ? [] : ['', ...history]),
      '',
      'Recording again only logs a visit — nothing more is added to the balance.',
    ].join('\n'),
    tone: 'default',
    confirmLabel: 'Record visit',
    cancelLabel: 'Cancel',
  });
}

/**
 * Payment, as steps that each finish before the next begins.
 *
 * Select, then payment, then printer, preview and done. Select has two tabs:
 * Subscription (pick the connection, or change its subscription) and Equipment
 * (replace a unit the customer has, or add one). The payment step only takes
 * the money for what was picked — paper is printed from the recorded receipt,
 * never before it exists.
 *
 * All of it lives in `useRechargeStore` rather than here, because the receipt
 * has to outlive the step that produced it and the printer handshake that
 * follows.
 */
export function RechargeFlowScreen({ customerId, subscriptionId, basePath }: {
  customerId: string;
  /**
   * The connection the caller tapped Recharge on. Ignored when it is not one of
   * this customer's lines — the list card can carry a display key rather than a
   * subscription id, and the first line is a better answer than an empty screen.
   */
  subscriptionId?: string;
  basePath: '/admin' | '/staff';
}) {
  const router = useRouter();
  const customerQuery = useCustomer({ variables: { id: customerId } });
  const { data: customer, isPending, error, refetch } = customerQuery;
  useRefetchOnFocus(refetch);

  // Where the collector stands, asked once when the flow opens. Never blocks a receipt.
  const fix = useCollectionFix();
  const step = useRechargeStore(state => state.step);
  const charge = useRechargeStore(state => state.charge);
  const setCharge = useRechargeStore(state => state.setCharge);
  const storedCustomerId = useRechargeStore(state => state.customerId);
  const pickedId = useRechargeStore(state => state.subscriptionId);
  const receiptId = useRechargeStore(state => state.receiptId);
  const amount = useRechargeStore(state => state.amount);
  const begin = useRechargeStore(state => state.begin);
  const next = useRechargeStore(state => state.next);
  const stepBack = useRechargeStore(state => state.back);
  const recorded = useRechargeStore(state => state.recorded);
  const goTo = useRechargeStore(state => state.goTo);
  const reset = useRechargeStore(state => state.reset);
  // One printer for the steps after the amount, so a connection made on the
  // printer step is the one the preview prints through.
  const printer = usePrinter();

  const { mutate: recordDues, isPending: isSavingDues } = useRecordCollection();
  const { mutate: recordEquipment, isPending: isSavingEquipment } = useRecordEquipmentPayment();
  const { mutate: replaceEquipment, isPending: isReplacing } = useReplaceEquipment();
  const isSaving = isSavingDues || isSavingEquipment || isReplacing;
  const target = useRechargeStore(state => state.target);

  // The receipt is re-read by id rather than kept from the mutation, so the
  // Done step draws the same row the receipts list will.
  const { data: receipt } = useCollection({
    variables: { id: receiptId ?? '' },
    enabled: receiptId !== null,
  });

  // A visit is one customer. Arriving at a different one — or coming back to
  // the same one after finishing — starts the flow over rather than resuming
  // somebody else's half-typed amount.
  // Leaving without a payment — back, or a hard cancel — drops the visit that was
  // waiting on it; a recorded payment already finished it, so this is then a no-op.
  React.useEffect(() => clearVisitFlow, []);

  const openedRoute = React.useRef<string | null>(null);
  React.useEffect(() => {
    const routeKey = `${customerId}:${subscriptionId ?? ''}`;
    if (openedRoute.current === routeKey && storedCustomerId === customerId)
      return;
    openedRoute.current = routeKey;
    if (storedCustomerId !== customerId || (subscriptionId !== undefined && useRechargeStore.getState().subscriptionId !== subscriptionId))
      begin({ customerId, subscriptionId });
  }, [begin, customerId, storedCustomerId, subscriptionId]);

  const lines = customer?.subscriptions ?? [];
  // Derived, not synced: the picked line follows the data as it arrives without
  // an effect that could leave the screen showing a line the customer has not got.
  const line = lines.find(option => option.id === pickedId) ?? lines[0] ?? null;

  const leave = React.useCallback(async () => {
    const state = useRechargeStore.getState();

    let discard = false;
    if (hasUnsavedWork(state)) {
      const agreed = await dialogs.confirm({
        title: 'Leave this recharge?',
        message: translate('payment_errors.leave_message'),
        confirmLabel: 'Discard',
        cancelLabel: 'Keep going',
      });

      if (!agreed)
        return;
      discard = true;
    }

    reset(discard);
    router.back();
  }, [reset, router]);

  const handleBack = React.useCallback(async () => {
    const state = useRechargeStore.getState();
    // Inside the flow, back is one step. On the select step — or once the money
    // is recorded and there is nothing to step back into — it leaves.
    const floor = state.receiptId === null ? STEPS[0] : 'printer';
    if (state.step !== 'done' && state.step !== floor) {
      stepBack();
      return;
    }

    await leave();
  }, [leave, stepBack]);

  // The hardware back button means the same thing as the one in the header, so
  // it asks the same question rather than dropping the round silently. Only
  // while this screen is the one on top: the plan page pushes over it and has
  // its own back, which this would otherwise swallow.
  const isFocused = useIsFocused();
  React.useEffect(() => {
    if (!isFocused)
      return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void handleBack();
      return true;
    });

    return () => subscription.remove();
  }, [handleBack, isFocused]);

  // The done step already is the receipt; opening the receipt page after it
  // would show the same thing twice.
  const finish = () => {
    reset();
    router.back();
  };

  // A retry resends the same reference, so the balance check is not asked again.
  const record = async (retry = false) => {
    const state = useRechargeStore.getState();
    if (state.amount.trim() !== '' && (!isPaymentAmount(state.amount) || !Number.isFinite(paise(state.amount)) || paise(state.amount) > paise(MAX_COLLECTION_AMOUNT))) {
      void dialogs.notify(translate('payment_errors.invalid_amount_title'), translate('payment_errors.invalid_amount_message'));
      return;
    }

    if (!ensureFix(fix))
      return;

    if (!canRecord(state)) {
      void dialogs.notify(
        paise(state.amount) <= 0 ? 'Enter an amount' : 'Pick the equipment',
        paise(state.amount) <= 0
          ? 'A payment has to carry the money the subscriber handed over.'
          : 'Say which unit this charge is for, or which one is being issued.',
      );
      return;
    }

    // Nothing collected: the server books it as a no-payment visit, which takes
    // a reason and no method. The collector's note is the reason when there is one.
    // A free swap is the same, with the swap as its reason.
    const markedDue = isMarkedDue(state);
    const freeSwap = isFreeSwap(state);
    const common = {
      customerId,
      amount: (paise(state.amount) / 100).toFixed(2),
      reference: state.reference,
      ...(markedDue
        ? { reason: state.notes.trim() === '' ? 'Not paid — balance left due' : state.notes.trim() }
        : freeSwap ? {} : { method: state.method }),
      ...(state.notes.trim() === '' ? {} : { notes: state.notes.trim() }),
      // Pinned to the first attempt, so a retry of the same reference replays
      // byte-for-byte instead of looking like a different payment (409).
      ...pendingMetadata(customerId, state.charge === 'equipment' ? 'equipment' : 'dues', fixPayload(fix)),
    };

    const onError = (failure: Error) => {
      // Once the earlier attempt is known to be on the server (409) or the collector
      // has gone to check Receipts, the next submit is a new payment, not a retry.
      const renewReference = () => useRechargeStore.setState({
        reference: renewPendingReference(customerId, state.charge === 'equipment' ? 'equipment' : 'dues').reference,
      });
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
            void record(true);
          else
            viewReceipts();
        });
        return;
      }

      void dialogs.notify(
        'Not recorded',
        apiErrorMessage(failure, 'The payment was not recorded. Nothing was taken off the account.'),
      );
    };

    if (state.charge === 'subscription') {
      // Dues are always against a line: it fixes the package, price and balance
      // the server does the maths with. Null amount is "nothing paid, left due".
      if (line === null) {
        void dialogs.notify('No connection', 'This customer has no connection to collect dues against.');
        return;
      }
      // Another phone may have collected since this was opened.
      const shownLineId = line.id;
      const balanceOf = (fresh: CustomerDetail) => Number(fresh.subscriptions.find(option => option.id === shownLineId)?.outstandingBalance ?? fresh.outstandingBalance);
      if (!retry && isStale(customerQuery) && !await balanceStillAgreed(customerQuery, balanceOf, Number(line.outstandingBalance)))
        return;

      const payload: RecordCollectionPayload = { ...common, subscriptionId: line.id, amount: markedDue ? null : common.amount };
      const send = () => recordDues({ payload }, {
        onSuccess: (made) => {
          recorded(made.id, { customerId, charge: state.charge });
          // A visit waiting on this payment is done now — unless nothing was actually collected.
          if (!markedDue)
            void completeVisitAfterPayment(customerId, made.id, 'subscription');
        },
        onError,
      });

      // No plan to add means this cycle is already charged: it was marked due
      // (or paid) before, so a second "due" only logs a visit.
      if (markedDue && paise(line.nextPlanCharge) === 0) {
        void warnAlreadyDue(customerId, line).then((agreed) => {
          if (agreed)
            send();
        });
        return;
      }

      send();
      return;
    }

    const onSuccess = (made: { id: string }) => {
      recorded(made.id, { customerId, charge: state.charge });
      void completeVisitAfterPayment(customerId, made.id, 'equipment');
    };
    if (state.target?.kind === 'replace') {
      const payload: ReplaceEquipmentPayload = {
        ...common,
        amount: freeSwap ? null : common.amount,
        customerEquipmentId: state.target.customerEquipmentId,
      };
      replaceEquipment({ payload }, { onSuccess, onError });
      return;
    }

    const payload: RecordEquipmentPaymentPayload = {
      ...common,
      items: state.target!.units.map(unit => ({ catalogId: unit.catalogId, equipmentId: unit.equipmentId })),
    };

    recordEquipment({ payload }, { onSuccess, onError });
  };

  if (isPending)
    return <Loading />;

  if (error || !customer)
    return <LoadError message={error?.message} onRetry={refetch} />;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title={receiptId === null ? 'Payment' : 'Receipt'}
        subtitle={customer.name ?? customer.customerCode ?? 'Customer'}
        showBack
        onBack={() => void handleBack()}
        withSafeArea
      >
        <View className="pt-3">
          <StepTrail step={step} />
        </View>
      </ScreenHeader>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        {/* The two tabs of the select step — not asked again on the payment step. */}
        {step === 'plan' && (
          <ChargePicker
            charge={charge}
            onChange={(nextCharge) => {
              if (!isSaving)
                setCharge(nextCharge);
            }}
          />
        )}

        {step === 'plan' && charge === 'subscription' && <StepPlan customer={customer} line={line} basePath={basePath} />}
        {step === 'plan' && charge === 'equipment' && <StepEquipment customer={customer} basePath={basePath} />}
        {step === 'amount' && <StepAmount customer={customer} line={line} />}
        {step === 'printer' && (
          <StepPrinter printer={printer} onNext={next} onSkip={() => goTo('done')} />
        )}
        {(step === 'preview' || step === 'done') && receipt === undefined && <Loading />}
        {step === 'preview' && receipt !== undefined && (
          <StepPreview
            receipt={receipt}
            printer={printer}
            planName={charge === 'subscription' ? (line?.plan.name ?? null) : null}
            onSkip={() => goTo('done')}
          />
        )}
        {step === 'done' && receipt !== undefined && (
          <StepDone
            receipt={receipt}
            onPrintAgain={() => goTo(printer.connectedAddress === null ? 'printer' : 'preview')}
            onFinish={finish}
          />
        )}

        {step === 'plan' && (
          <Button
            label="Next — enter the payment"
            onPress={() => {
              if (charge === 'equipment' && target === null) {
                void dialogs.notify('Pick the equipment', 'Choose a unit to replace, or one to add.');
                return;
              }
              next();
            }}
            className="bg-primary-600"
            testID="recharge-next"
          />
        )}

        {step === 'amount' && (
          <Button
            label={isSaving ? 'Recording…' : isMarkedDue({ charge, amount }) ? 'Mark as due' : isFreeSwap({ charge, amount, target }) ? 'Record free swap' : `Record ${rupeesExact(paise(amount) / 100)}`}
            disabled={isSaving}
            onPress={() => void record()}
            className="bg-primary-600"
            testID="recharge-submit"
          />
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
