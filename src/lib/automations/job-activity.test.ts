import type { JobRunEvent } from '@/lib/api/contracts';
import { mergeJobEvents, presentJobEvent } from './job-activity';

function event(sequence: number, overrides: Partial<JobRunEvent> = {}): JobRunEvent {
  return {
    sequence,
    attemptNumber: 1,
    level: 'info',
    code: 'browser_started',
    metadata: {},
    createdAt: '2026-10-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('presentJobEvent', () => {
  it.each([
    ['run_queued', { scheduled: true }, 'automations.activity.run_queued_scheduled', { scheduled: true }],
    ['run_queued', { scheduled: false }, 'automations.activity.run_queued_manual', { scheduled: false }],
    ['attempt_started', { maxAttempts: 2 }, 'automations.activity.attempt_started', { maxAttempts: 2 }],
    ['attempt_retrying', { retryDelayMs: 30_000, nextAttemptNumber: 2 }, 'automations.activity.attempt_retrying', { retryDelayMs: 30_000, nextAttemptNumber: 2, retrySeconds: 30 }],
    ['browser_started', {}, 'automations.activity.browser_started', {}],
    ['portal_login_started', {}, 'automations.activity.portal_login_started', {}],
    ['portal_authenticated', { sessionReused: true }, 'automations.activity.portal_authenticated_reused', { sessionReused: true }],
    ['portal_authenticated', { sessionReused: false }, 'automations.activity.portal_authenticated_fresh', { sessionReused: false }],
    ['report_navigation_started', {}, 'automations.activity.report_navigation_started', {}],
    ['report_downloaded', { byteCount: 2048, durationMs: 4400 }, 'automations.activity.report_downloaded', { byteCount: 2048, durationMs: 4400, seconds: 4 }],
    ['report_parsed', { rowCount: 7, durationMs: 900 }, 'automations.activity.report_parsed', { rowCount: 7, durationMs: 900, seconds: 1 }],
    ['customers_sync_started', { rowCount: 7 }, 'automations.activity.customers_sync_started', { rowCount: 7 }],
    ['cache_invalidated', { succeeded: false }, 'automations.activity.cache_invalidated_stale', { succeeded: false }],
    ['cache_invalidated', { succeeded: true }, 'automations.activity.cache_invalidated_ok', { succeeded: true }],
    ['service_extension_reached', {}, 'automations.activity.service_extension_reached', {}],
    ['manual_intervention_required', {}, 'automations.activity.manual_intervention_required', {}],
    ['run_succeeded', { durationMs: 61_000 }, 'automations.activity.run_succeeded', { durationMs: 61_000, seconds: 61 }],
    ['run_failed', { retryable: true }, 'automations.activity.run_failed_retryable', { retryable: true }],
    ['run_failed', { retryable: false }, 'automations.activity.run_failed_final', { retryable: false }],
  ])('maps %s %j', (code, metadata, key, values) => {
    expect(presentJobEvent({ code, metadata })).toEqual({ key, values });
  });

  it('maps customers_synced counters', () => {
    const metadata = { rowCount: 5, createdCount: 1, updatedCount: 2, unchangedCount: 2, activeCount: 4, inactiveCount: 1, equipmentLinkedCount: 3, serialConflictCount: 0 };
    expect(presentJobEvent({ code: 'customers_synced', metadata })).toEqual({ key: 'automations.activity.customers_synced', values: metadata });
  });

  it('copies only allowlisted fields and never extra metadata', () => {
    const presented = presentJobEvent({ code: 'report_parsed', metadata: { rowCount: 7, durationMs: 1000, customerName: 'Someone', path: '/tmp/x' } });

    expect(presented.values).toEqual({ rowCount: 7, durationMs: 1000, seconds: 1 });
  });

  it('falls back to one generic line for unknown codes without any metadata', () => {
    expect(presentJobEvent({ code: 'future_code', metadata: { token: 'secret' } })).toEqual({ key: 'automations.activity.unknown', values: {} });
    expect(presentJobEvent({ code: 'constructor', metadata: {} })).toEqual({ key: 'automations.activity.unknown', values: {} });
  });

  it('falls back when reviewed metadata is missing or the wrong type', () => {
    const unknown = { key: 'automations.activity.unknown', values: {} };
    expect(presentJobEvent({ code: 'report_parsed', metadata: { rowCount: 'many', durationMs: 1 } })).toEqual(unknown);
    expect(presentJobEvent({ code: 'run_failed', metadata: {} })).toEqual(unknown);
  });
});

describe('mergeJobEvents', () => {
  it('orders by numeric sequence, not text order', () => {
    expect(mergeJobEvents([event(10), event(2)], [event(9)]).map(e => e.sequence)).toEqual([2, 9, 10]);
  });

  it('shows an event once, persisted winning over live', () => {
    const merged = mergeJobEvents([event(3, { code: 'run_queued' })], [event(3, { code: 'browser_started' }), event(4)]);

    expect(merged.map(e => [e.sequence, e.code])).toEqual([[3, 'run_queued'], [4, 'browser_started']]);
  });

  it('drops events without a usable sequence', () => {
    expect(mergeJobEvents([event(0), event(1.5), event(Number.NaN)], [event(2)]).map(e => e.sequence)).toEqual([2]);
  });

  it('does not mutate its inputs', () => {
    const persisted = [event(2), event(1)];
    mergeJobEvents(persisted, []);

    expect(persisted.map(e => e.sequence)).toEqual([2, 1]);
  });
});
