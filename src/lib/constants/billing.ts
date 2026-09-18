/** Mirrors `src/constants/billing.ts` in cable-backend. */

/**
 * What a doorstep visit ended in. The server decides which one it was from the
 * amount against the balance it read under lock — the app never sends it, so
 * the two sides cannot disagree about whether a payment was "full".
 */
export const COLLECTION_OUTCOMES = ['full', 'partial', 'none', 'refund', 'others'] as const;
export type CollectionOutcome = (typeof COLLECTION_OUTCOMES)[number];

/** How the money changed hands. Absent on a visit that collected nothing. */
export const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'cheque'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
