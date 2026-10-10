import type { TintKey } from '@/components/common/shell';
import type { JobRunStatus, JobRunSummary } from '@/lib/api/contracts';
import type { TxKeyPath } from '@/lib/i18n';
import { dateTime } from '@/lib/utils/admin-format';

const STATUS: Record<JobRunStatus, { key: TxKeyPath; tint: TintKey; active: boolean }> = {
  queued: { key: 'automations.status.queued', tint: 'blue', active: true },
  running: { key: 'automations.status.running', tint: 'orange', active: true },
  succeeded: { key: 'automations.status.succeeded', tint: 'green', active: false },
  failed: { key: 'automations.status.failed', tint: 'red', active: false },
  cancelled: { key: 'automations.status.cancelled', tint: 'purple', active: false },
  enqueue_failed: { key: 'automations.status.enqueue_failed', tint: 'red', active: false },
};

const UNKNOWN_STATUS = { key: 'automations.status.unknown', tint: 'purple', active: false } as const;

/** A status this build does not know (a newer backend) reads as one generic label. */
export function presentRunStatus(status: string): { key: TxKeyPath; tint: TintKey } {
  const known = (STATUS as Record<string, (typeof STATUS)[JobRunStatus]>)[status] ?? UNKNOWN_STATUS;
  return { key: known.key, tint: known.tint };
}

/** Queued or running: the run is still moving, so it is polled and may stream. */
export function isActiveRun(status: string): boolean {
  return (STATUS as Record<string, (typeof STATUS)[JobRunStatus]>)[status]?.active === true;
}

/** A known finished status; an unknown one is not assumed final. */
export function isTerminalRun(status: string): boolean {
  return (STATUS as Record<string, (typeof STATUS)[JobRunStatus]>)[status]?.active === false;
}

/** `02 Oct 2026, 08:22 PM`, or null for a missing or unparseable timestamp. */
export function formatRunTime(iso: string | null | undefined): string | null {
  if (iso == null || Number.isNaN(new Date(iso).getTime()))
    return null;
  return dateTime(iso);
}

/** `12s`, `3m 05s`, `1h 02m`; null unless both ends are valid and ordered. */
export function formatRunDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (startedAt === null || finishedAt === null)
    return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0)
    return null;
  const total = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (total < 60)
    return `${total}s`;
  if (total < 3600)
    return `${Math.floor(total / 60)}m ${pad(total % 60)}s`;
  return `${Math.floor(total / 3600)}h ${pad(Math.floor((total % 3600) / 60))}m`;
}

export type RunResultCounts = { downloadedRows?: number; created?: number; updated?: number; unchanged?: number; warnings?: number };

const COUNT_FIELDS = ['downloadedRows', 'created', 'updated', 'unchanged'] as const;

/** Only the reviewed counters of a run's result; anything else in it is never shown. */
export function presentRunResult(result: JobRunSummary['result']): RunResultCounts | null {
  if (result == null)
    return null;
  const counts: RunResultCounts = {};
  for (const field of COUNT_FIELDS) {
    const value = result[field];
    if (typeof value === 'number' && Number.isFinite(value))
      counts[field] = value;
  }
  if (Array.isArray(result.warnings))
    counts.warnings = result.warnings.length;
  return Object.keys(counts).length === 0 ? null : counts;
}

/** The localized line for a failed Hard sync start; the backend's own wording is not shown. */
export function startFailureKey(error: unknown): TxKeyPath {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 401 || status === 403)
    return 'automations.start_denied';
  if (status === 503)
    return 'automations.start_unavailable';
  return 'automations.start_failed';
}
