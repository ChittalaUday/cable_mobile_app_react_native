import { liveSocketHeaders, liveSocketUrl, MAX_FRAME_BYTES, upgradeFailureStatus, validateLiveMessage } from './live-protocol';

const RUN = '2f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const JPEG = '/9j/4AAQ'; // FF D8 FF E0 00 10
const NONE = { frame: 0, activity: 0 };

function frame(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: 'frame',
    version: 1,
    runId: RUN,
    sequence: 5,
    capturedAt: '2026-10-10T10:00:00.000Z',
    contentType: 'image/jpeg',
    width: 1280,
    height: 720,
    data: JPEG,
    ...overrides,
  });
}

function activity(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: 'activity',
    version: 1,
    runId: RUN,
    sequence: 12,
    attemptNumber: 1,
    level: 'info',
    code: 'report_parsed',
    metadata: { rowCount: 7, durationMs: 900 },
    createdAt: '2026-10-10T10:00:01.000Z',
    ...overrides,
  });
}

describe('liveSocketUrl and headers', () => {
  it('derives ws from http and wss from https', () => {
    expect(liveSocketUrl('http://192.168.1.9:5050/api/v1', RUN)).toBe(`ws://192.168.1.9:5050/api/v1/job-runs/${RUN}/live`);
    expect(liveSocketUrl('https://api.example.com/api/v1/', RUN)).toBe(`wss://api.example.com/api/v1/job-runs/${RUN}/live`);
  });

  it('sends the bearer token and tenant', () => {
    expect(liveSocketHeaders('tok', 'ten')).toEqual({ 'Authorization': 'Bearer tok', 'X-Tenant-Id': 'ten' });
  });

  it('reads a refused upgrade from the native error text', () => {
    expect(upgradeFailureStatus('Expected HTTP 101 response but was \'404 Not Found\'')).toBe(404);
    expect(upgradeFailureStatus('Expected HTTP 101 response but was \'401 Unauthorized\'')).toBe(401);
    expect(upgradeFailureStatus('Network is unreachable')).toBeNull();
    expect(upgradeFailureStatus(undefined)).toBeNull();
  });
});

describe('validateLiveMessage', () => {
  it('accepts ready, status and error messages', () => {
    expect(validateLiveMessage(JSON.stringify({ type: 'ready', version: 1, runId: RUN, status: 'running' }), RUN, NONE)).toEqual({ type: 'ready', status: 'running' });
    expect(validateLiveMessage(JSON.stringify({ type: 'status', status: 'succeeded', terminal: true }), RUN, NONE)).toEqual({ type: 'status', status: 'succeeded', terminal: true });
    expect(validateLiveMessage(JSON.stringify({ type: 'error', code: 'RUN_NOT_FOUND', message: 'gone' }), RUN, NONE)).toEqual({ type: 'error', code: 'RUN_NOT_FOUND' });
  });

  it('turns a valid frame into a JPEG data URI with its metadata', () => {
    expect(validateLiveMessage(frame(), RUN, NONE)).toEqual({
      type: 'frame',
      frame: { uri: `data:image/jpeg;base64,${JPEG}`, sequence: 5, width: 1280, height: 720, capturedAt: '2026-10-10T10:00:00.000Z' },
    });
  });

  it('accepts a valid activity and copies it as a run event', () => {
    expect(validateLiveMessage(activity(), RUN, NONE)).toEqual({
      type: 'activity',
      event: { sequence: 12, attemptNumber: 1, level: 'info', code: 'report_parsed', metadata: { rowCount: 7, durationMs: 900 }, createdAt: '2026-10-10T10:00:01.000Z' },
    });
  });

  it('drops anything but numbers and booleans from activity metadata', () => {
    const message = validateLiveMessage(activity({ metadata: { rowCount: 7, customerName: 'x', nested: { a: 1 }, ok: true } }), RUN, NONE);

    expect(message).toMatchObject({ event: { metadata: { rowCount: 7, ok: true } } });
    expect(JSON.stringify(message)).not.toContain('customerName');
  });

  it.each([
    ['an unsupported version', frame({ version: 2 })],
    ['another run', frame({ runId: '00000000-0000-4000-8000-000000000000' })],
    ['a PNG', frame({ data: 'iVBORw0K' })],
    ['a non-JPEG content type', frame({ contentType: 'image/png' })],
    ['invalid base64', frame({ data: '/9j/4AA*' })],
    ['an unpadded length', frame({ data: '/9j/4AA' })],
    ['an empty payload', frame({ data: '' })],
    ['zero width', frame({ width: 0 })],
    ['an oversized height', frame({ height: 4097 })],
    ['a fractional width', frame({ width: 12.5 })],
    ['an invalid timestamp', frame({ capturedAt: 'yesterday' })],
    ['a missing timestamp', frame({ capturedAt: undefined })],
    ['a zero sequence', frame({ sequence: 0 })],
    ['a string sequence', frame({ sequence: '5' })],
    ['an oversized payload', frame({ data: `/9j/${'A'.repeat(Math.ceil(MAX_FRAME_BYTES / 3) * 4)}` })],
    ['an activity with another run', activity({ runId: 'nope' })],
    ['an activity with a bad level', activity({ level: 'fatal' })],
    ['an activity with a long code', activity({ code: 'x'.repeat(81) })],
    ['an activity with a bad date', activity({ createdAt: 'later' })],
    ['an activity with a bad attempt', activity({ attemptNumber: 0 })],
    ['an activity with array metadata', activity({ metadata: [1] })],
    ['malformed JSON', '{"type":'],
    ['a JSON array', '[]'],
    ['an unknown message type', JSON.stringify({ type: 'cursor', x: 1 })],
    ['a missing type', JSON.stringify({ version: 1 })],
  ])('ignores %s', (_name, raw) => {
    expect(validateLiveMessage(raw, RUN, NONE)).toBeNull();
  });

  it('ignores non-text messages', () => {
    expect(validateLiveMessage(new ArrayBuffer(8), RUN, NONE)).toBeNull();
    expect(validateLiveMessage(null, RUN, NONE)).toBeNull();
  });

  it('drops duplicate and regressed frames and activities against independent cursors', () => {
    expect(validateLiveMessage(frame({ sequence: 5 }), RUN, { frame: 5, activity: 0 })).toBeNull();
    expect(validateLiveMessage(frame({ sequence: 4 }), RUN, { frame: 5, activity: 0 })).toBeNull();
    expect(validateLiveMessage(frame({ sequence: 6 }), RUN, { frame: 5, activity: 99 })).not.toBeNull();
    expect(validateLiveMessage(activity({ sequence: 12 }), RUN, { frame: 0, activity: 12 })).toBeNull();
    expect(validateLiveMessage(activity({ sequence: 11 }), RUN, { frame: 0, activity: 12 })).toBeNull();
    expect(validateLiveMessage(activity({ sequence: 13 }), RUN, { frame: 99, activity: 12 })).not.toBeNull();
  });
});
