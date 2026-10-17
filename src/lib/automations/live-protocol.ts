import type { JobRunEvent } from '@/lib/api/contracts';

/**
 * Everything the app knows about the backend's `GET /job-runs/:id/live`
 * WebSocket lives here — URL, credentials, message shapes and their validation —
 * so a change to that contract is a change to this one file.
 *
 * The server sends text frames, each one JSON object:
 *   ready    { type, version, runId, status }
 *   frame    { type, version, runId, sequence, capturedAt, contentType: 'image/jpeg', width, height, data: base64 }
 *   activity { type, version, runId, sequence, attemptNumber, level, code, metadata, createdAt }
 *   status   { type, status, terminal }
 *   error    { type, code: 'LIVE_UNAVAILABLE' | 'RUN_NOT_FOUND', message }
 */

export const LIVE_PROTOCOL_VERSION = 1;
/** The backend's own ceiling for one frame (AUTOMATION_FRAME_MAX_BYTES is at most this). */
export const MAX_FRAME_BYTES = 5 * 1024 * 1024;
export const MAX_FRAME_DIMENSION = 4096;
/** Larger than any valid activity message (the backend caps them near 6 KiB). */
const MAX_ACTIVITY_CHARS = 8 * 1024;
const MAX_CONTROL_CHARS = 4 * 1024;

export type LiveCursors = { frame: number; activity: number };

export type LiveFrame = {
  /** `data:image/jpeg;base64,…`, held in component memory only. */
  uri: string;
  sequence: number;
  width: number;
  height: number;
  capturedAt: string;
};

export type ValidatedLiveMessage
  = | { type: 'ready'; status: string }
    | { type: 'frame'; frame: LiveFrame }
    | { type: 'activity'; event: JobRunEvent }
    | { type: 'status'; status: string; terminal: boolean }
    | { type: 'error'; code: string };

/** `https://api/x/api/v1` becomes `wss://api/x/api/v1/job-runs/<id>/live`. */
export function liveSocketUrl(apiBaseUrl: string, runId: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '').replace(/^http/i, 'ws')}/job-runs/${encodeURIComponent(runId)}/live`;
}

/** `https://api/x/api/v1` becomes `wss://api/x/api/v1/realtime`: `ready`, then `data-updated` each time a sync finishes. */
export function realtimeSocketUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '').replace(/^http/i, 'ws')}/realtime`;
}

/** The same credentials the Axios client sends, for the native socket's upgrade request. */
export function liveSocketHeaders(token: string, tenantId: string): Record<string, string> {
  return { 'Authorization': `Bearer ${token}`, 'X-Tenant-Id': tenantId };
}

type NativeSocketConstructor = new (url: string, protocols: string[] | null, options: { headers: Record<string, string> }) => WebSocket;

/** React Native's WebSocket takes upgrade headers as a third argument; the DOM typings do not know it. */
export function openLiveSocket(url: string, headers: Record<string, string>): WebSocket {
  return new (WebSocket as unknown as NativeSocketConstructor)(url, null, { headers });
}

/**
 * The HTTP status of a failed upgrade, when the native layer puts it in the
 * error text ("Expected HTTP 101 response but was '404 Not Found'"); null when it does not.
 */
export function upgradeFailureStatus(message: unknown): 401 | 403 | 404 | null {
  const match = typeof message === 'string' ? /\b(401|403|404)\b/.exec(message) : null;
  return match === null ? null : Number(match[1]) as 401 | 403 | 404;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isPositiveInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0;
const isDimension = (value: unknown): value is number => isPositiveInt(value) && value <= MAX_FRAME_DIMENSION;
const isDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && !Number.isNaN(new Date(value).getTime());
const LEVELS: ReadonlySet<unknown> = new Set(['info', 'warning', 'error']);
const BASE64 = /^[A-Z0-9+/]+={0,2}$/i;

/** The decoded size of a base64 string, without decoding it. */
function decodedBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

function validateFrame(message: Record<string, unknown>, cursors: LiveCursors): ValidatedLiveMessage | null {
  const { sequence, width, height, capturedAt, contentType, data } = message;
  if (!isPositiveInt(sequence) || sequence <= cursors.frame)
    return null;
  if (contentType !== 'image/jpeg' || !isDimension(width) || !isDimension(height) || !isDate(capturedAt))
    return null;
  // `/9j/` is the base64 of the JPEG signature FF D8 FF.
  if (typeof data !== 'string' || data.length % 4 !== 0 || data.length > Math.ceil(MAX_FRAME_BYTES / 3) * 4 || !data.startsWith('/9j/') || !BASE64.test(data))
    return null;
  if (decodedBytes(data) > MAX_FRAME_BYTES)
    return null;
  return { type: 'frame', frame: { uri: `data:image/jpeg;base64,${data}`, sequence, width, height, capturedAt } };
}

function validateActivity(message: Record<string, unknown>, cursors: LiveCursors): ValidatedLiveMessage | null {
  const { sequence, attemptNumber, level, code, metadata, createdAt } = message;
  if (!isPositiveInt(sequence) || sequence <= cursors.activity)
    return null;
  if (attemptNumber !== null && !isPositiveInt(attemptNumber))
    return null;
  if (!LEVELS.has(level) || typeof code !== 'string' || code === '' || code.length > 80 || !isDate(createdAt))
    return null;
  if (!isRecord(metadata) || Object.keys(metadata).length > 20)
    return null;
  const safe: Record<string, number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    // Only numbers and booleans exist in the contract; anything else is dropped, not kept for display.
    if ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean')
      safe[key] = value;
  }
  return { type: 'activity', event: { sequence, attemptNumber, level: level as JobRunEvent['level'], code, metadata: safe, createdAt } };
}

/**
 * Parses and checks one raw socket message for the run being watched. Returns
 * null for anything to ignore: malformed JSON, an unknown type or version
 * (forward compatibility), another run, an invalid or oversized frame, or a
 * frame/activity whose sequence is not past its own cursor.
 */
export function validateLiveMessage(raw: unknown, expectedRunId: string, cursors: LiveCursors): ValidatedLiveMessage | null {
  if (typeof raw !== 'string')
    return null;
  // Frames carry their own size cap; the rest are small.
  if (raw.length > Math.ceil(MAX_FRAME_BYTES / 3) * 4 + 1024)
    return null;
  let message: unknown;
  try {
    message = JSON.parse(raw);
  }
  catch {
    return null;
  }
  if (!isRecord(message) || typeof message.type !== 'string')
    return null;

  switch (message.type) {
    case 'frame':
    case 'activity':
    case 'ready': {
      if (message.version !== LIVE_PROTOCOL_VERSION || message.runId !== expectedRunId)
        return null;
      if (message.type === 'frame')
        return validateFrame(message, cursors);
      if (raw.length > MAX_ACTIVITY_CHARS)
        return null;
      if (message.type === 'activity')
        return validateActivity(message, cursors);
      return typeof message.status === 'string' ? { type: 'ready', status: message.status } : null;
    }
    case 'status':
      return raw.length <= MAX_CONTROL_CHARS && typeof message.status === 'string' && typeof message.terminal === 'boolean'
        ? { type: 'status', status: message.status, terminal: message.terminal }
        : null;
    case 'error':
      return raw.length <= MAX_CONTROL_CHARS && typeof message.code === 'string' ? { type: 'error', code: message.code } : null;
    default:
      return null;
  }
}
