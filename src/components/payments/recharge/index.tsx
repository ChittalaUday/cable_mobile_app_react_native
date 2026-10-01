import type { RecordCollectionPayload, RecordEquipmentPaymentPayload } from '@/lib/hooks/api/use-payments';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { BackHandler } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { Button, View } from '@/components/ui';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import {
  useCollection,
  useRecordCollection,
  useRecordEquipmentPayment,
} from '@/lib/hooks/api/use-payments';
import {
  canRecord,
  hasUnsavedWork,
  paise,
  stepsFor,
  useRechargeStore,
} from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';
import { ChargePicker, StepTrail } from './parts';
import { StepAmount } from './step-amount';
import { StepDone } from './step-done';
import { StepPlan } from './step-plan';

/**
 * Recharge, as steps that each finish before the next begins.
 *
 * Subscription money walks plan, then amount, then receipt. The order is the
 * point: what the customer is on decides what they owe, what they owe decides
 * what is typed, and only then is money recorded. Equipment walks a shorter
 * road — it is sold against no plan at all, so it opens straight on the amount.
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
  const { data: customer, isPending, error, refetch } = useCustomer({ variables: { id: customerId } });

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
  const reset = useRechargeStore(state => state.reset);

  const { mutate: recordDues, isPending: isSavingDues } = useRecordCollection();
  const { mutate: recordEquipment, isPending: isSavingEquipment } = useRecordEquipmentPayment();
  const isSaving = isSavingDues || isSavingEquipment;

  // The receipt is re-read by id rather than kept from the mutation, so the
  // Done step draws the same row the receipts list will.
  const { data: receipt } = useCollection({
    variables: { id: receiptId ?? '' },
    enabled: receiptId !== null,
  });

  // A visit is one customer. Arriving at a different one — or coming back to
  // the same one after finishing — starts the flow over rather than resuming
  // somebody else's half-typed amount.
  React.useEffect(() => {
    if (storedCustomerId !== customerId)
      begin({ customerId, subscriptionId });
  }, [begin, customerId, storedCustomerId, subscriptionId]);

  const lines = customer?.subscriptions ?? [];
  // Derived, not synced: the picked line follows the data as it arrives without
  // an effect that could leave the screen showing a line the customer has not got.
  const line = lines.find(option => option.id === pickedId) ?? lines[0] ?? null;

  const leave = React.useCallback(async () => {
    const state = useRechargeStore.getState();

    if (hasUnsavedWork(state)) {
      const agreed = await dialogs.confirm({
        title: 'Leave this recharge?',
        message: 'The amount, the notes and anything picked here are cleared. Nothing has been recorded yet.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep going',
      });

      if (!agreed)
        return;
    }

    reset();
    router.back();
  }, [reset, router]);

  const handleBack = React.useCallback(async () => {
    const state = useRechargeStore.getState();
    const walk = stepsFor(state.charge);

    // Inside the flow, back is one step. On the step this charge opens on — or
    // once the money is recorded and there is nothing to step back into — it
    // leaves. Equipment opens on the amount, so for it that step is the exit.
    if (state.step !== 'done' && state.step !== walk[0]) {
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

  const finish = () => {
    const id = useRechargeStore.getState().receiptId;

    reset();
    router.replace(id === null ? `${basePath}/receipts` : `${basePath}/receipts/${id}`);
  };

  const record = () => {
    const state = useRechargeStore.getState();

    if (!canRecord(state)) {
      void dialogs.notify(
        paise(state.amount) <= 0 ? 'Enter an amount' : 'Pick the equipment',
        paise(state.amount) <= 0
          ? 'A payment has to carry the money the subscriber handed over.'
          : 'Say which unit this charge is for, or which one is being issued.',
      );
      return;
    }

    const common = {
      customerId,
      amount: (paise(state.amount) / 100).toFixed(2),
      method: state.method,
      reference: state.reference,
      // Hardware belongs to the customer, not to one of their lines, and the
      // server books it as a deposit that no subscription balance ever sees.
      ...(line === null || state.charge === 'equipment' ? {} : { subscriptionId: line.id }),
      ...(state.notes.trim() === '' ? {} : { notes: state.notes.trim() }),
    };

    const onError = (failure: Error) => void dialogs.notify(
      'Not recorded',
      failure.message || 'The payment was not recorded. Nothing was taken off the account.',
    );

    if (state.charge === 'subscription') {
      recordDues({ payload: common as RecordCollectionPayload }, {
        onSuccess: made => recorded(made.id),
        onError,
      });
      return;
    }

    const target = state.target!;
    const payload: RecordEquipmentPaymentPayload = {
      ...common,
      ...(target.kind === 'existing'
        ? { customerEquipmentId: target.customerEquipmentId }
        : {
            catalogId: target.catalogId,
            ...(state.serialNumber.trim() === '' ? {} : { serialNumber: state.serialNumber.trim() }),
          }),
    };

    recordEquipment({ payload }, { onSuccess: made => recorded(made.id), onError });
  };

  if (isPending)
    return <Loading />;

  if (error || !customer)
    return <LoadError message={error?.message} onRetry={refetch} />;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title={step === 'done' ? 'Receipt' : 'Recharge'}
        subtitle={customer.name ?? customer.customerCode ?? 'Customer'}
        showBack
        onBack={() => void handleBack()}
        withSafeArea
      >
        <View className="pt-3">
          <StepTrail step={step} charge={charge} />
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
        {step !== 'done' && <ChargePicker charge={charge} onChange={setCharge} />}

        {step === 'plan' && <StepPlan customer={customer} line={line} basePath={basePath} />}
        {step === 'amount' && <StepAmount customer={customer} line={line} />}
        {step === 'done' && (
          receipt === undefined
            ? <Loading />
            : <StepDone receipt={receipt} onFinish={finish} />
        )}

        {step === 'plan' && (
          <Button
            label="Next — enter the amount"
            onPress={next}
            className="bg-primary-600"
            testID="recharge-next"
          />
        )}

        {step === 'amount' && (
          <Button
            label={isSaving ? 'Recording…' : `Record ${rupeesExact(paise(amount) / 100)}`}
            disabled={isSaving}
            onPress={record}
            className="bg-primary-600"
            testID="recharge-submit"
          />
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
