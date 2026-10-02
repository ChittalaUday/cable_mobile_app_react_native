import { storage } from '@/lib/storage';

const key = (receiptId: string) => `printer.copies.${receiptId}`;

/**
 * How many times this handset has printed a receipt, kept on the device so a
 * reprint — from the flow or from the receipts list later — is stamped as a
 * duplicate instead of passing for the original.
 *
 * ponytail: per device and never pruned (a few bytes a receipt); move it to the
 * server if copies have to be counted across handsets.
 */
export function copiesPrinted(receiptId: string): number {
  return storage.getNumber(key(receiptId)) ?? 0;
}

export function notePrinted(receiptId: string): number {
  const copies = copiesPrinted(receiptId) + 1;
  storage.set(key(receiptId), copies);
  return copies;
}
