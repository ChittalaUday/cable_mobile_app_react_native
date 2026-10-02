/** Mirrors `src/constants/billing.ts` in cable-backend. */

/**
 * What a doorstep visit ended in. The server decides which one it was from the
 * amount against the balance it read under lock — the app never sends it, so
 * the two sides cannot disagree about whether a payment was "full".
 */
export const COLLECTION_OUTCOMES = ['full', 'partial', 'none', 'refund', 'others'] as const;
export type CollectionOutcome = (typeof COLLECTION_OUTCOMES)[number];

export const MAX_COLLECTION_AMOUNT = '99000.00';

/** How the money changed hands. Absent on a visit that collected nothing. */
/** Methods offered and accepted for a new collection. */
export const PAYMENT_METHODS = ['cash', 'upi'] as const;
export type PaymentEntryMethod = (typeof PAYMENT_METHODS)[number];

/** Legacy values remain renderable on immutable historical receipts. */
export const STORED_PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'cheque'] as const;
export type PaymentMethod = (typeof STORED_PAYMENT_METHODS)[number];

/**
 * How each method is labelled on a button. Kept beside the vocabulary so the
 * collect and recharge screens cannot drift into calling the same method two
 * different things. Not an array, so the parity check leaves it alone.
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentEntryMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
};
