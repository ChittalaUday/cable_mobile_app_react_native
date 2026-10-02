import type { CollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { dialogs } from '@/components/common/dialogs';

const WHY: Record<Exclude<CollectionFix['status'], 'ready'>, string> = {
  locating: 'Still finding your location. Wait a moment, then record again.',
  denied: 'Location permission is off for this app. Allow it in Settings — a payment cannot be recorded without where it was collected.',
  unavailable: 'The phone has no location fix. Check that location is on, step near a window or outside, and record again.',
};

/**
 * Whether a payment may go: only with a position. Otherwise it says why and
 * starts looking again, so the next tap usually succeeds.
 */
export function ensureFix<F extends CollectionFix & { retry: () => void }>(fix: F): fix is Extract<F, { status: 'ready' }> {
  if (fix.status === 'ready')
    return true;

  void dialogs.notify('Location needed', WHY[fix.status]);
  if (fix.status !== 'locating')
    fix.retry();
  return false;
}
