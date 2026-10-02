import type { PaymentEntryMethod } from '@/lib/api/types';
import { create } from 'zustand';
import { MAX_COLLECTION_AMOUNT } from '@/lib/constants/billing';
import { newCollectionReference } from '@/lib/hooks/api/use-payments';
import { clear as clearPendingReference, get as getPendingReference } from '@/lib/payments/pending-reference';
import { isPaymentAmount } from '@/lib/utils/payment-amount';

/**
 * Where the collector is in the flow.
 *
 * Ordered, and always walked forwards: the plan is settled before an amount is
 * typed, and the amount is settled before money is recorded, because each step
 * decides what the next one is even allowed to show.
 */
export const STEPS = ['plan', 'amount', 'done'] as const;
export type Step = (typeof STEPS)[number];

/** Which piece of hardware an equipment charge is about. */
export type EquipmentTarget
  = | { kind: 'existing'; customerEquipmentId: string }
    | { kind: 'issue'; catalogId: string };

/** What the money is for. Each books a different kind of receipt. */
export type ChargeKind = 'subscription' | 'equipment';

/**
 * The steps a charge actually walks.
 *
 * Equipment is its own flow. A set-top box is charged for whether or not the
 * customer's plan is touched, and the receipt it books never moves the
 * subscription balance, so there is no plan to settle first.
 */
export function stepsFor(charge: ChargeKind): readonly Step[] {
  return charge === 'equipment' ? ['amount', 'done'] : STEPS;
}

export type RechargeState = {
  customerId: string | null;
  /** The line every step of this flow acts on. */
  subscriptionId: string | null;
  step: Step;
  charge: ChargeKind;

  target: EquipmentTarget | null;
  serialNumber: string;
  amount: string;
  method: PaymentEntryMethod;
  notes: string;
  /** Which of the tenant's handles the QR is drawn from; null takes the default. */
  upiAccountId: string | null;

  /** The receipt the flow produced, once the money is recorded. */
  receiptId: string | null;
  printed: boolean;

  /**
   * The idempotency key for this attempt, minted when the flow opens and kept
   * across retries, so a tap that times out and is tapped again records one
   * payment rather than two.
   */
  reference: string;

  begin: (input: { customerId: string; subscriptionId?: string }) => void;
  goTo: (step: Step) => void;
  next: () => void;
  back: () => void;
  setCharge: (charge: ChargeKind) => void;
  setSubscription: (subscriptionId: string) => void;
  setTarget: (target: EquipmentTarget | null) => void;
  setField: <K extends 'serialNumber' | 'amount' | 'method' | 'notes' | 'upiAccountId'>(
    key: K,
    value: RechargeState[K],
  ) => void;
  recorded: (receiptId: string, submitted?: { customerId: string; charge: ChargeKind }) => void;
  markPrinted: () => void;
  reset: (discard?: boolean) => void;
};

const BLANK = {
  customerId: null,
  subscriptionId: null,
  step: 'plan' as Step,
  charge: 'subscription' as ChargeKind,
  target: null,
  serialNumber: '',
  amount: '',
  method: 'cash' as PaymentEntryMethod,
  notes: '',
  upiAccountId: null,
  receiptId: null,
  printed: false,
};

/** Money as whole paise, so a running total never drifts the way rupees do. */
export function paise(value: string | number): number {
  return Math.round(Number(value || 0) * 100);
}

/**
 * The recharge flow, held in one place.
 *
 * It spans three steps and a printer handshake, and the receipt has to survive
 * the step that produced it, so it cannot live in any one screen's state. It is
 * deliberately not React Query cache either: until the moment it is recorded,
 * none of this exists on the server.
 */
export const useRechargeStore = create<RechargeState>(set => ({
  ...BLANK,
  reference: newCollectionReference(),

  begin: ({ customerId, subscriptionId }) => set({
    ...BLANK,
    customerId,
    subscriptionId: subscriptionId ?? null,
    reference: getPendingReference(customerId, 'dues').reference,
  }),

  goTo: step => set({ step }),

  next: () => set((state) => {
    const walk = stepsFor(state.charge);
    const at = walk.indexOf(state.step);

    return { step: walk[Math.min(at + 1, walk.length - 1)]! };
  }),

  back: () => set((state) => {
    const walk = stepsFor(state.charge);
    const at = walk.indexOf(state.step);

    return { step: walk[Math.max(at - 1, 0)]! };
  }),

  // Switching to equipment off the plan step leaves the collector standing on a
  // step that flow no longer has, so it moves them to the one it starts on.
  setCharge: charge => set((state) => {
    const kind = charge === 'equipment' ? 'equipment' : 'dues';

    return {
      charge,
      reference: state.customerId === null ? state.reference : getPendingReference(state.customerId, kind).reference,
      step: stepsFor(charge).includes(state.step) ? state.step : stepsFor(charge)[0]!,
    };
  }),
  setSubscription: subscriptionId => set({ subscriptionId }),
  setTarget: target => set({ target }),
  setField: (key, value) => set({ [key]: value } as Pick<RechargeState, typeof key>),

  recorded: (receiptId, submitted) => set((state) => {
    const customerId = submitted?.customerId ?? state.customerId;
    const charge = submitted?.charge ?? state.charge;
    if (customerId !== null) {
      const kind = charge === 'equipment' ? 'equipment' : 'dues';
      clearPendingReference(customerId, kind);
    }

    return { receiptId, step: 'done' };
  }),
  markPrinted: () => set({ printed: true }),

  reset: (discard = false) => set((state) => {
    if (discard && state.customerId !== null) {
      const kind = state.charge === 'equipment' ? 'equipment' : 'dues';
      clearPendingReference(state.customerId, kind);
    }

    return { ...BLANK, reference: newCollectionReference() };
  }),
}));

/** True once the flow holds enough to record money. */
export function canRecord(state: RechargeState): boolean {
  const amount = paise(state.amount);
  if (!isPaymentAmount(state.amount) || !Number.isFinite(amount) || amount <= 0 || amount > paise(MAX_COLLECTION_AMOUNT))
    return false;

  return state.charge === 'subscription' || state.target !== null;
}

/** True once anything has been entered that would be lost by leaving. */
export function hasUnsavedWork(state: RechargeState): boolean {
  if (state.receiptId !== null)
    return false;

  return state.amount.trim() !== ''
    || state.notes.trim() !== ''
    || state.serialNumber.trim() !== ''
    || state.target !== null
    || state.step !== stepsFor(state.charge)[0];
}
