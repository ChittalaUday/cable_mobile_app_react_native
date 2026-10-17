import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as React from 'react';
import { AppState } from 'react-native';
import { useRealtimeRefresh } from './use-realtime-refresh';

const mockAuth = { status: 'signIn' as string, tenantId: 'tenant-a' as string | null, token: 'token-1' as string | null };

jest.mock('env', () => ({ __esModule: true, default: { EXPO_PUBLIC_API_URL: 'https://api.test/api/v1' } }));
jest.mock('@/lib/api/client', () => ({ devHostUrl: (url: string) => url }));
jest.mock('@/lib/auth/utils', () => ({
  getToken: () => (mockAuth.token === null ? null : { access: mockAuth.token, refresh: 'r' }),
  getTenantId: () => mockAuth.tenantId,
}));
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: { use: { status: () => mockAuth.status, tenantId: () => mockAuth.tenantId } },
}));
// The reconnect policy lives beside the run's live view; only its numbers are needed here.
jest.mock('@/lib/hooks/common/use-job-live-stream', () => ({ MAX_RECONNECTS: 2, reconnectDelay: () => 1000 }));

type Handler<T> = ((event: T) => void) | null;
class FakeSocket {
  static instances: FakeSocket[] = [];
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

  send(message: unknown) {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
  }

  drop() {
    this.onclose?.({ code: 1006 });
  }
}

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1]!;
const originalWebSocket = globalThis.WebSocket;
let queryClient: QueryClient;
let invalidate: jest.SpyInstance;
let appStateHandler: ((state: string) => void) | null = null;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
const mount = () => renderHook(() => useRealtimeRefresh(), { wrapper });

beforeEach(() => {
  jest.useFakeTimers();
  Object.assign(mockAuth, { status: 'signIn', tenantId: 'tenant-a', token: 'token-1' });
  FakeSocket.instances = [];
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  queryClient = new QueryClient();
  invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (state: string) => void) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useRealtimeRefresh', () => {
  it('opens the realtime socket with the session\'s credentials once signed in', () => {
    mount();

    expect(FakeSocket.instances).toHaveLength(1);
    expect(last().url).toBe('wss://api.test/api/v1/realtime');
    expect(last().options.headers).toEqual({ 'Authorization': 'Bearer token-1', 'X-Tenant-Id': 'tenant-a' });
  });

  it('opens nothing while signed out', () => {
    mockAuth.status = 'signOut';
    mount();

    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('refetches every query when a sync finishes, and ignores everything else', () => {
    mount();

    last().send({ type: 'ready' });
    last().send({ type: 'something-else' });
    last().send('not json');
    expect(invalidate).not.toHaveBeenCalled();

    last().send({ type: 'data-updated' });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('reconnects after a drop, and refetches then since an update may have been missed', () => {
    mount();
    last().send({ type: 'ready' });

    last().drop();
    expect(FakeSocket.instances).toHaveLength(1);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(FakeSocket.instances).toHaveLength(2);
    last().send({ type: 'ready' });

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('gives up after too many reconnects, and does not retry a refused upgrade', () => {
    mount();
    for (let attempt = 0; attempt < 3; attempt++) {
      last().drop();
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    // The first socket plus two reconnects.
    expect(FakeSocket.instances).toHaveLength(3);

    FakeSocket.instances = [];
    mount();
    last().onerror?.({ message: 'Expected HTTP 101 response but was \'401 Unauthorized\'' });
    last().drop();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('closes the socket in the background and when signed out, and reopens it on return', () => {
    const view = mount();
    const first = last();

    act(() => appStateHandler?.('background'));
    expect(first.closeCalls).toBe(1);

    act(() => appStateHandler?.('active'));
    expect(FakeSocket.instances).toHaveLength(2);

    view.unmount();
    expect(last().closeCalls).toBe(1);
  });
});
