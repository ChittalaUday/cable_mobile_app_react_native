import type { JobRunEvent } from '@/lib/api/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as React from 'react';
import { AppState } from 'react-native';
import { MAX_RECONNECTS, reconnectDelay, useJobLiveStream } from './use-job-live-stream';

const RUN = '2f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const JPEG_A = '/9j/4AAQ';
const JPEG_B = '/9j/4AAR';

const mockCreds = { token: 'token-1' as string | null, tenant: 'tenant-a' as string | null };
const mockSetItem = jest.fn();

jest.mock('env', () => ({ __esModule: true, default: { EXPO_PUBLIC_API_URL: 'https://api.test/api/v1' } }));
jest.mock('@/lib/api/client', () => ({ devHostUrl: (url: string) => url }));
jest.mock('@/lib/auth/utils', () => ({
  getToken: () => (mockCreds.token === null ? null : { access: mockCreds.token, refresh: 'r' }),
  getTenantId: () => mockCreds.tenant,
}));
jest.mock('@/lib/storage', () => ({ setItem: (...args: unknown[]) => mockSetItem(...args) as unknown, getItem: () => null }));
jest.mock('@/lib/hooks/api/use-job-runs', () => ({ jobRunKeys: { detail: (tenant: string | null, id: string) => ['detail', tenant, id] } }));

type Handler<T> = ((event: T) => void) | null;
class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: Handler<unknown> = null;
  onmessage: Handler<{ data: unknown }> = null;
  onerror: Handler<{ message?: string }> = null;
  onclose: Handler<{ code: number }> = null;
  closeCalls = 0;

  constructor(readonly url: string, readonly protocols: unknown, readonly options: { headers: Record<string, string> }) {
    FakeSocket.instances.push(this);
  }

  close() {
    this.closeCalls += 1;
  }

  send(message: unknown, runId: string = RUN) {
    this.onmessage?.({ data: JSON.stringify({ version: 1, runId, ...(message as object) }) });
  }

  ready() {
    this.send({ type: 'ready', status: 'running' });
  }

  frame(sequence: number, data = JPEG_A) {
    this.send({ type: 'frame', sequence, capturedAt: '2026-10-10T10:00:00.000Z', contentType: 'image/jpeg', width: 800, height: 600, data });
  }

  activity(sequence: number, code = 'browser_started', metadata: Record<string, number | boolean> = {}) {
    this.send({ type: 'activity', sequence, attemptNumber: 1, level: 'info', code, metadata, createdAt: '2026-10-10T10:00:02.000Z' });
  }

  drop(code = 1006) {
    this.onclose?.({ code });
  }
}

function tick(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1]!;

function persisted(sequence: number, code = 'browser_started'): JobRunEvent {
  return {
    sequence,
    attemptNumber: 1,
    level: 'info',
    code,
    metadata: {},
    createdAt: '2026-10-10T10:00:00.000Z',
  };
}

let queryClient: QueryClient;
let appStateHandler: ((state: string) => void) | null = null;
let removeAppState: jest.Mock;
const originalWebSocket = globalThis.WebSocket;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

type Props = { runId?: string; enabled?: boolean; terminal?: boolean; persistedEvents?: JobRunEvent[] };
function mount(initial: Props = {}) {
  return renderHook((props: Props) => useJobLiveStream({
    runId: RUN,
    enabled: true,
    terminal: false,
    persistedEvents: [],
    ...props,
  }), { wrapper, initialProps: initial });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(1);
  FakeSocket.instances = [];
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  mockCreds.token = 'token-1';
  mockCreds.tenant = 'tenant-a';
  mockSetItem.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  removeAppState = jest.fn();
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (state: string) => void) => {
    appStateHandler = handler;
    return { remove: removeAppState };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
  globalThis.WebSocket = originalWebSocket;
});

describe('reconnectDelay', () => {
  it('doubles from one second, is capped at thirty and is jittered between half and full', () => {
    expect([1, 2, 3, 4, 5, 6].map(attempt => reconnectDelay(attempt, 1))).toEqual([1000, 2000, 4000, 8000, 16_000, 30_000]);
    expect(reconnectDelay(20, 1)).toBe(30_000);
    expect(reconnectDelay(3, 0)).toBe(2000);
  });
});

describe('connecting', () => {
  it('opens a wss socket for the run with the current bearer token and tenant', () => {
    const { result } = mount();

    expect(FakeSocket.instances).toHaveLength(1);
    expect(last().url).toBe(`wss://api.test/api/v1/job-runs/${RUN}/live`);
    expect(last().options).toEqual({ headers: { 'Authorization': 'Bearer token-1', 'X-Tenant-Id': 'tenant-a' } });
    expect(result.current.phase).toBe('connecting');
  });

  it('goes live on ready and keeps only the newest frame', () => {
    const { result } = mount();
    act(() => last().ready());
    act(() => last().frame(1, JPEG_A));
    act(() => last().frame(2, JPEG_B));
    act(() => last().frame(2, JPEG_A));
    act(() => last().frame(1, JPEG_A));

    expect(result.current.phase).toBe('live');
    expect(result.current.frame).toMatchObject({ uri: `data:image/jpeg;base64,${JPEG_B}`, sequence: 2, width: 800, height: 600 });
  });

  it('ignores invalid, foreign and unknown messages', () => {
    const { result } = mount();
    act(() => last().ready());
    act(() => last().send({ type: 'frame', sequence: 1, capturedAt: '2026-10-10T10:00:00.000Z', contentType: 'image/png', width: 1, height: 1, data: JPEG_A }));
    act(() => last().frame(1, JPEG_A));
    act(() => last().send({ type: 'frame', sequence: 2, capturedAt: 'x', contentType: 'image/jpeg', width: 1, height: 1, data: JPEG_B }, 'another-run'));
    act(() => last().send({ type: 'hologram', data: 1 }));

    expect(result.current.frame?.sequence).toBe(1);
  });

  it('does nothing when disabled, when there is no run, or when the run is already terminal', () => {
    const { result, rerender } = mount({ enabled: false });
    rerender({ runId: '' });
    rerender({ runId: RUN, enabled: true, terminal: true });

    expect(FakeSocket.instances).toHaveLength(0);
    expect(result.current).toMatchObject({ phase: 'ended', frame: null });
  });

  it('cannot connect without credentials', () => {
    mockCreds.token = null;
    const { result } = mount();

    expect(FakeSocket.instances).toHaveLength(0);
    expect(result.current.phase).toBe('error');
  });
});

describe('activity', () => {
  it('shows REST and live activity once, ascending, ignoring regressed live activity that REST will backfill', () => {
    const { result, rerender } = mount({ persistedEvents: [persisted(1, 'run_queued'), persisted(3, 'portal_login_started')] });
    act(() => last().ready());
    act(() => last().activity(5, 'report_parsed', { rowCount: 3, durationMs: 100 }));
    act(() => last().activity(3, 'browser_started'));
    act(() => last().activity(4, 'report_navigation_started'));

    expect(result.current.events.map(event => [event.sequence, event.code])).toEqual([
      [1, 'run_queued'],
      [3, 'portal_login_started'],
      [5, 'report_parsed'],
    ]);

    // The REST refetch that follows brings the skipped event in, in order.
    rerender({ persistedEvents: [persisted(1, 'run_queued'), persisted(3, 'portal_login_started'), persisted(4, 'report_navigation_started')] });

    expect(result.current.events.map(event => event.sequence)).toEqual([1, 3, 4, 5]);
  });

  it('keeps activity after the socket ends and shows persisted events with no socket at all', () => {
    const { result } = mount({ terminal: true, persistedEvents: [persisted(2), persisted(1)] });

    expect(result.current.events.map(event => event.sequence)).toEqual([1, 2]);
  });

  it('accepts frames again after a retry attempt restarts their numbering', () => {
    const { result } = mount();
    act(() => last().ready());
    act(() => last().frame(9));
    act(() => last().activity(10, 'attempt_started', { maxAttempts: 2 }));
    act(() => last().frame(1, JPEG_B));

    expect(result.current.frame).toMatchObject({ sequence: 1, uri: `data:image/jpeg;base64,${JPEG_B}` });
  });
});

describe('reconnecting', () => {
  it('drops the picture, waits a bounded jittered delay and reconnects with the newest credentials', () => {
    const { result } = mount();
    act(() => last().ready());
    act(() => last().frame(1));
    const first = last();
    mockCreds.token = 'token-2';
    mockCreds.tenant = 'tenant-b';

    act(() => first.drop());

    expect(result.current).toMatchObject({ phase: 'reconnecting', frame: null });
    tick(999);
    expect(FakeSocket.instances).toHaveLength(1);
    tick(1);
    expect(FakeSocket.instances).toHaveLength(2);
    expect(last().options.headers).toEqual({ 'Authorization': 'Bearer token-2', 'X-Tenant-Id': 'tenant-b' });
  });

  it('refetches the run detail on every ready, so events before it or missed while offline are backfilled', () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    mount();
    act(() => last().ready());
    expect(invalidate).toHaveBeenCalledTimes(1);

    act(() => last().drop());
    tick(1000);
    act(() => last().ready());

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['detail', 'tenant-a', RUN] });
  });

  it('doubles the delay on repeated failures and gives up after the cap', () => {
    const { result } = mount();
    for (let attempt = 1; attempt <= MAX_RECONNECTS; attempt++) {
      const before = FakeSocket.instances.length;
      act(() => last().drop());
      const delay = reconnectDelay(attempt, 1);
      tick(delay - 1);
      expect(FakeSocket.instances).toHaveLength(before);
      tick(1);
      expect(FakeSocket.instances).toHaveLength(before + 1);
    }
    act(() => last().drop());

    expect(result.current.phase).toBe('error');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('starts the backoff over after a successful ready', () => {
    mount();
    act(() => last().drop());
    tick(1000);
    act(() => last().drop());
    tick(2000);
    act(() => last().ready());
    act(() => last().drop());
    tick(1000);

    expect(FakeSocket.instances).toHaveLength(4);
  });

  it('retries after the server reports live view unavailable', () => {
    mount();
    act(() => last().send({ type: 'error', code: 'LIVE_UNAVAILABLE', message: 'later' }));
    act(() => last().drop(1011));
    tick(1000);

    expect(FakeSocket.instances).toHaveLength(2);
  });
});

describe('stopping for good', () => {
  it.each([401, 403, 404])('does not retry a refused upgrade (%s)', (status) => {
    const { result } = mount();
    act(() => last().onerror?.({ message: `Expected HTTP 101 response but was '${status} Refused'` }));
    act(() => last().drop());
    tick(60_000);

    expect(FakeSocket.instances).toHaveLength(1);
    expect(result.current.phase).toBe('error');
  });

  it('does not retry a policy close or a vanished run', () => {
    mount();
    act(() => last().drop(1008));
    tick(60_000);
    expect(FakeSocket.instances).toHaveLength(1);

    const { result: vanishedResult } = mount();
    act(() => last().send({ type: 'error', code: 'RUN_NOT_FOUND', message: 'gone' }));
    tick(60_000);

    expect(FakeSocket.instances).toHaveLength(2);
    expect(vanishedResult.current.phase).toBe('error');
  });

  it('ends on a terminal status message: closes, drops the picture and refetches', () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = mount();
    const socket = last();
    act(() => socket.ready());
    act(() => socket.frame(1));
    act(() => socket.send({ type: 'status', status: 'succeeded', terminal: true }));
    act(() => socket.drop(1000));
    tick(60_000);

    expect(result.current).toMatchObject({ phase: 'ended', frame: null });
    expect(socket.closeCalls).toBeGreaterThan(0);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['detail', 'tenant-a', RUN] });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('closes when the run turns terminal while a reconnect is pending', () => {
    const { result, rerender } = mount();
    act(() => last().drop());
    rerender({ terminal: true });
    tick(60_000);

    expect(FakeSocket.instances).toHaveLength(1);
    expect(result.current.phase).toBe('ended');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('closes and releases the picture in the background, and reconnects on return', () => {
    const { result } = mount();
    const socket = last();
    act(() => socket.ready());
    act(() => socket.frame(1));

    act(() => appStateHandler?.('background'));

    expect(socket.closeCalls).toBeGreaterThan(0);
    expect(result.current).toMatchObject({ phase: 'idle', frame: null });
    expect(jest.getTimerCount()).toBe(0);

    act(() => appStateHandler?.('active'));
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('closes everything on unmount', () => {
    const { unmount } = mount();
    const socket = last();
    act(() => socket.drop());
    unmount();
    tick(60_000);

    expect(FakeSocket.instances).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
    expect(removeAppState).toHaveBeenCalled();
    expect(socket.onmessage).toBeNull();
  });

  it('closes the socket on unmount while live', () => {
    const { unmount } = mount();
    const socket = last();
    act(() => socket.ready());
    unmount();

    expect(socket.closeCalls).toBeGreaterThan(0);
  });
});

describe('where the picture goes', () => {
  it('never reaches storage, the query cache or the console', () => {
    const logs = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error'), jest.spyOn(console, 'info')];
    const setQueryData = jest.spyOn(queryClient, 'setQueryData');
    const { result } = mount();
    act(() => last().ready());
    act(() => last().frame(1, JPEG_B));

    expect(result.current.frame?.uri).toContain(JPEG_B);
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(setQueryData).not.toHaveBeenCalled();
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map(query => query.state.data))).not.toContain(JPEG_B);
    for (const log of logs)
      expect(JSON.stringify(log.mock.calls)).not.toContain(JPEG_B);
  });
});
