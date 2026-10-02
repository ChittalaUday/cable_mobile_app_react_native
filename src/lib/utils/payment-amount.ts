import { MAX_COLLECTION_AMOUNT } from '@/lib/constants/billing';

/** Match the API's decimal-string format before converting money for display. */
export function isPaymentAmount(value: string): boolean {
  return /^\d{1,10}(\.\d{1,2})?$/.test(value.trim()) && Number(value) <= Number(MAX_COLLECTION_AMOUNT);
}
