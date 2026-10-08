import type { CustomerDetail } from '@/lib/api/types';
import { dialogs } from '@/components/common/dialogs';
import { rupeesExact } from '@/lib/utils/admin-format';

/** How old the customer may be when a payment is sent before it is read again. */
export const FRESH_FOR_MS = 60_000;

type CustomerQuery = {
  dataUpdatedAt: number;
  refetch: () => Promise<{ data?: CustomerDetail }>;
};

/** Whether the customer was read too long ago to trust its balance at submit. */
export function isStale(query: Pick<CustomerQuery, 'dataUpdatedAt'>, now = Date.now()): boolean {
  return now - query.dataUpdatedAt >= FRESH_FOR_MS;
}

/**
 * Right before a payment goes from a stale screen (see `isStale`): the customer
 * is read again, and if the balance the collector was shown has moved since —
 * another phone collected meanwhile — they are asked before it goes. A failed
 * re-read lets it go: the server still has the final say. Callers check
 * `isStale` first, so a fresh screen submits without waiting on anything.
 */
export async function balanceStillAgreed(
  query: CustomerQuery,
  balanceOf: (customer: CustomerDetail) => number,
  shown: number,
): Promise<boolean> {
  const { data } = await query.refetch();
  if (data === undefined)
    return true;

  const current = balanceOf(data);
  if (Math.round(current * 100) === Math.round(shown * 100))
    return true;

  return dialogs.confirm({
    title: 'Balance changed',
    message: `The balance changed to ${rupeesExact(current)} since you opened this (it was ${rupeesExact(shown)}). Someone may have collected already. Continue anyway?`,
    tone: 'default',
    confirmLabel: 'Continue',
    cancelLabel: 'Review',
  });
}
