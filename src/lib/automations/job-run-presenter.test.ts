import { PERMISSIONS } from '@/constants/permissions';
import openapi from '../../../api/openapi.json';
import { formatRunDuration, formatRunTime, isActiveRun, isTerminalRun, presentRunResult, presentRunStatus } from './job-run-presenter';

describe('generated automation contract', () => {
  const paths = openapi.paths as Record<string, Record<string, { responses: Record<string, unknown> }>>;

  it('has the history, detail and explicit start operations', () => {
    expect(paths['/api/v1/job-runs']?.get).toBeDefined();
    expect(paths['/api/v1/job-runs/{id}']?.get).toBeDefined();
    expect(paths['/api/v1/automations/customer-sync/runs']?.post?.responses['202']).toBeDefined();
  });

  it('exposes events and reused, and nothing that is private to the worker', () => {
    const detail = JSON.stringify(paths['/api/v1/job-runs/{id}']?.get);
    const start = JSON.stringify(paths['/api/v1/automations/customer-sync/runs']?.post);

    expect(detail).toContain('"events"');
    expect(start).toContain('"reused"');
    expect(start).toContain('"run"');
    for (const secret of ['"input"', 'workerId', 'password', 'stack', 'frame', 'customers"']) {
      expect(detail).not.toContain(secret);
      expect(start).not.toContain(secret);
    }
  });
});

describe('automation permissions', () => {
  it('uses the backend literals', () => {
    expect(PERMISSIONS.JOBS_VIEW).toBe('jobs.view');
    expect(PERMISSIONS.JOBS_RUN).toBe('jobs.run');
  });
});

describe('presentRunStatus', () => {
  it.each([
    ['queued', 'automations.status.queued', 'blue'],
    ['running', 'automations.status.running', 'orange'],
    ['succeeded', 'automations.status.succeeded', 'green'],
    ['failed', 'automations.status.failed', 'red'],
    ['cancelled', 'automations.status.cancelled', 'purple'],
    ['enqueue_failed', 'automations.status.enqueue_failed', 'red'],
  ])('maps %s', (status, key, tint) => {
    expect(presentRunStatus(status)).toEqual({ key, tint });
  });

  it('reads an unknown status as one generic label and not final', () => {
    expect(presentRunStatus('paused')).toEqual({ key: 'automations.status.unknown', tint: 'purple' });
    expect(isActiveRun('paused')).toBe(false);
    expect(isTerminalRun('paused')).toBe(false);
  });

  it('treats only queued and running as active', () => {
    expect(['queued', 'running'].every(isActiveRun)).toBe(true);
    expect(['succeeded', 'failed', 'cancelled', 'enqueue_failed'].every(isTerminalRun)).toBe(true);
    expect(isActiveRun('succeeded')).toBe(false);
  });
});

describe('formatRunTime', () => {
  it('formats a valid timestamp using the app date style', () => {
    expect(formatRunTime('2026-10-02T14:30:00')).toBe('02 Oct 2026, 02:30 PM');
  });

  it('gives null for missing and invalid values', () => {
    expect(formatRunTime(null)).toBeNull();
    expect(formatRunTime('not a date')).toBeNull();
  });
});

describe('formatRunDuration', () => {
  const start = '2026-10-02T10:00:00.000Z';
  it.each([
    ['2026-10-02T10:00:12.900Z', '12s'],
    ['2026-10-02T10:03:05.000Z', '3m 05s'],
    ['2026-10-02T11:02:59.000Z', '1h 02m'],
  ])('formats %s', (end, text) => {
    expect(formatRunDuration(start, end)).toBe(text);
  });

  it('gives null for open, reversed and invalid ranges', () => {
    expect(formatRunDuration(start, null)).toBeNull();
    expect(formatRunDuration(null, start)).toBeNull();
    expect(formatRunDuration(start, '2026-10-02T09:00:00.000Z')).toBeNull();
    expect(formatRunDuration('x', start)).toBeNull();
  });
});

describe('presentRunResult', () => {
  it('keeps only the reviewed counters and counts the warnings', () => {
    expect(presentRunResult({
      version: 1,
      downloadedRows: 1200,
      created: 3,
      updated: 10,
      unchanged: 1187,
      warnings: ['a stale cache message'],
      serviceExtensionReached: true,
      secret: 'x',
    })).toEqual({ downloadedRows: 1200, created: 3, updated: 10, unchanged: 1187, warnings: 1 });
  });

  it('has nothing to show for no result or an unrecognised one', () => {
    expect(presentRunResult(null)).toBeNull();
    expect(presentRunResult({ downloadedRows: 'many', other: 1 })).toBeNull();
  });
});
