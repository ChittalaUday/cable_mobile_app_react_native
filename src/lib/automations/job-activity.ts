import type { JobRunEvent } from '@/lib/api/contracts';
import type { TxKeyPath } from '@/lib/i18n';

type Rule = {
  key: TxKeyPath;
  /** Metadata fields copied into the sentence; nothing else is ever read. */
  numbers?: readonly string[];
  /** A boolean that picks between two sentences. */
  flag?: { field: string; whenFalse: TxKeyPath };
};

// The reviewed event codes of the backend's job-run-event.ts, and the metadata each may show.
const RULES: Record<string, Rule> = {
  run_queued: { key: 'automations.activity.run_queued_scheduled', flag: { field: 'scheduled', whenFalse: 'automations.activity.run_queued_manual' } },
  attempt_started: { key: 'automations.activity.attempt_started', numbers: ['maxAttempts'] },
  attempt_retrying: { key: 'automations.activity.attempt_retrying', numbers: ['nextAttemptNumber', 'retryDelayMs'] },
  browser_started: { key: 'automations.activity.browser_started' },
  portal_login_started: { key: 'automations.activity.portal_login_started' },
  portal_authenticated: { key: 'automations.activity.portal_authenticated_reused', flag: { field: 'sessionReused', whenFalse: 'automations.activity.portal_authenticated_fresh' } },
  report_navigation_started: { key: 'automations.activity.report_navigation_started' },
  report_downloaded: { key: 'automations.activity.report_downloaded', numbers: ['byteCount', 'durationMs'] },
  report_parsed: { key: 'automations.activity.report_parsed', numbers: ['rowCount', 'durationMs'] },
  customers_sync_started: { key: 'automations.activity.customers_sync_started', numbers: ['rowCount'] },
  customers_synced: {
    key: 'automations.activity.customers_synced',
    numbers: ['rowCount', 'createdCount', 'updatedCount', 'unchangedCount', 'activeCount', 'inactiveCount', 'equipmentLinkedCount', 'serialConflictCount'],
  },
  cache_invalidated: { key: 'automations.activity.cache_invalidated_ok', flag: { field: 'succeeded', whenFalse: 'automations.activity.cache_invalidated_stale' } },
  service_extension_reached: { key: 'automations.activity.service_extension_reached' },
  manual_intervention_required: { key: 'automations.activity.manual_intervention_required' },
  run_succeeded: { key: 'automations.activity.run_succeeded', numbers: ['durationMs'] },
  run_failed: { key: 'automations.activity.run_failed_retryable', flag: { field: 'retryable', whenFalse: 'automations.activity.run_failed_final' } },
};

export type PresentedJobEvent = { key: TxKeyPath; values: Record<string, number | boolean> };

const UNKNOWN: PresentedJobEvent = { key: 'automations.activity.unknown', values: {} };

/**
 * The localized sentence for one event. Unknown codes, and known codes whose
 * metadata is not what was reviewed, become one generic line: metadata is never
 * printed, so a future backend field cannot leak onto the screen.
 */
export function presentJobEvent(event: Pick<JobRunEvent, 'code' | 'metadata'>): PresentedJobEvent {
  const rule = Object.hasOwn(RULES, event.code) ? RULES[event.code] : undefined;
  if (rule === undefined)
    return UNKNOWN;

  const metadata = event.metadata ?? {};
  const values: Record<string, number | boolean> = {};
  for (const field of rule.numbers ?? []) {
    const value = metadata[field];
    if (typeof value !== 'number' || !Number.isFinite(value))
      return UNKNOWN;
    values[field] = value;
  }
  // Whole seconds for the sentence, so milliseconds are never shown.
  if (typeof values.durationMs === 'number')
    values.seconds = Math.round(values.durationMs / 1000);
  if (typeof values.retryDelayMs === 'number')
    values.retrySeconds = Math.round(values.retryDelayMs / 1000);

  if (rule.flag === undefined)
    return { key: rule.key, values };
  const flag = metadata[rule.flag.field];
  if (typeof flag !== 'boolean')
    return UNKNOWN;
  values[rule.flag.field] = flag;
  return { key: flag ? rule.key : rule.flag.whenFalse, values };
}

const isSequence = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0;

/** Persisted and live events as one list: one row per sequence, persisted winning, ascending. */
export function mergeJobEvents(persisted: readonly JobRunEvent[], live: readonly JobRunEvent[]): JobRunEvent[] {
  const bySequence = new Map<number, JobRunEvent>();
  for (const event of live) {
    if (isSequence(event.sequence))
      bySequence.set(event.sequence, event);
  }
  for (const event of persisted) {
    if (isSequence(event.sequence))
      bySequence.set(event.sequence, event);
  }
  return [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
}
