import { newCollectionReference } from '@/lib/hooks/api/use-payments';
import { getItem, removeItem, setItem } from '@/lib/storage';

export type PendingReferenceKind = 'dues' | 'equipment';

type CollectionMetadata = { latitude?: number; longitude?: number; gpsAccuracyM?: number };

export type PendingReference = {
  reference: string;
  startedAt: number;
  metadata?: CollectionMetadata;
};

const KEY_PREFIX = 'payments.pending-reference.';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function storageKey(customerId: string, kind: PendingReferenceKind): string {
  return `${KEY_PREFIX}${encodeURIComponent(customerId)}.${kind}`;
}

/** Returns the same idempotency key until the attempt is resolved or expires. */
export function get(customerId: string, kind: PendingReferenceKind): PendingReference {
  const key = storageKey(customerId, kind);
  const existing = getItem<PendingReference>(key);
  const now = Date.now();

  if (
    existing !== null
    && typeof existing.reference === 'string'
    && existing.reference !== ''
    && typeof existing.startedAt === 'number'
    && existing.startedAt <= now
    && now - existing.startedAt < MAX_AGE_MS
  ) {
    return existing;
  }

  const pending = { reference: newCollectionReference(), startedAt: now };
  void setItem(key, pending);
  return pending;
}

/** Removes an attempt after success or an explicit discard. */
export function clear(customerId: string, kind: PendingReferenceKind): void {
  void removeItem(storageKey(customerId, kind));
}

/** Keep GPS identical when a timed-out attempt is retried after reopening. */
export function metadata(customerId: string, kind: PendingReferenceKind, current: CollectionMetadata): CollectionMetadata {
  const pending = get(customerId, kind);
  if (pending.metadata !== undefined && pending.metadata !== null && typeof pending.metadata === 'object')
    return pending.metadata;
  const saved = { ...current };
  void setItem(storageKey(customerId, kind), { ...pending, metadata: saved });
  return saved;
}
