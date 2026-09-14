import type { AxiosAdapter } from 'axios';

const mockStore = new Map<string, string>();

jest.mock('@/lib/storage', () => ({
  getItem: (key: string) => {
    const raw = mockStore.get(key);
    return raw ? JSON.parse(raw) : null;
  },
  setItem: (key: string, value: unknown) => mockStore.set(key, JSON.stringify(value)),
  removeItem: (key: string) => mockStore.delete(key),
}));

jest.mock('env', () => ({ __esModule: true, default: { EXPO_PUBLIC_API_URL: 'https://api.test', EXPO_PUBLIC_VERSION: '1.0.0' } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'device-1' }));

// The refresh call deliberately bypasses the instance, so it is the bare
// `axios.post` that has to be intercepted here.
const mockRefreshCalls: string[] = [];
let mockRefreshResponse: () => Promise<{ data: unknown }> = async () => ({
  data: { accessToken: 'access-2', refreshToken: 'refresh-2' },
});

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      ...actual.default,
      create: actual.default.create.bind(actual.default),
      post: (_url: string, body: { refreshToken: string }) => {
        mockRefreshCalls.push(body.refreshToken);
        return mockRefreshResponse();
      },
    },
  };
});

function expiredThenOk(): { adapter: AxiosAdapter; calls: string[] } {
  const calls: string[] = [];

  const adapter: AxiosAdapter = async (config) => {
    const auth = String(config.headers?.Authorization ?? '');
    calls.push(auth);

    if (auth === 'Bearer access-1') {
      const error = new Error('expired') as Error & { response?: unknown; config?: unknown };
      error.config = config;
      error.response = { status: 401, data: { code: 'AUTH_TOKEN_EXPIRED' } };
      throw error;
    }

    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };

  return { adapter, calls };
}

describe('api client refresh', () => {
  beforeEach(() => {
    jest.resetModules();
    mockStore.clear();
    mockRefreshCalls.length = 0;
    mockRefreshResponse = async () => ({ data: { accessToken: 'access-2', refreshToken: 'refresh-2' } });
    mockStore.set('token', JSON.stringify({ access: 'access-1', refresh: 'refresh-1' }));
  });

  it('refreshes once for a burst of expired requests, and retries them all', async () => {
    const { client } = require('./client');
    const { adapter, calls } = expiredThenOk();
    client.defaults.adapter = adapter;

    // Six screens mounting at once is the normal case, not an edge case.
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => client.get(`/thing-${i}`)),
    );

    expect(results.every(r => r.data.ok)).toBe(true);

    /*
     * The rotation on the server invalidates the token it was given, and
     * replaying one revokes the whole session — so a second refresh with the
     * same token would sign the user out. Exactly one call, with the stored
     * token, is the only safe outcome.
     */
    expect(mockRefreshCalls).toEqual(['refresh-1']);

    // Every request tried once with the stale token and once with the new one.
    expect(calls.filter(a => a === 'Bearer access-1')).toHaveLength(6);
    expect(calls.filter(a => a === 'Bearer access-2')).toHaveLength(6);
  });

  it('stores both halves of the rotated pair', async () => {
    const { client } = require('./client');
    const { adapter } = expiredThenOk();
    client.defaults.adapter = adapter;

    await client.get('/thing');

    expect(JSON.parse(mockStore.get('token')!)).toEqual({ access: 'access-2', refresh: 'refresh-2' });
  });

  it('signs out once when the refresh itself is rejected', async () => {
    const { client, setSessionExpiredHandler } = require('./client');
    const expired = jest.fn();
    setSessionExpiredHandler(expired);

    mockRefreshResponse = async () => {
      throw new Error('refresh rejected');
    };

    const { adapter } = expiredThenOk();
    client.defaults.adapter = adapter;

    await expect(client.get('/thing')).rejects.toThrow();

    expect(expired).toHaveBeenCalledTimes(1);
    expect(mockStore.has('token')).toBe(false);
  });

  it('does not try to refresh when there is no refresh token', async () => {
    mockStore.set('token', JSON.stringify({ access: 'access-1', refresh: '' }));

    const { client } = require('./client');
    const { adapter } = expiredThenOk();
    client.defaults.adapter = adapter;

    await expect(client.get('/thing')).rejects.toThrow();
    expect(mockRefreshCalls).toEqual([]);
  });

  it('leaves a non-auth failure alone', async () => {
    const { client } = require('./client');

    client.defaults.adapter = (async (config) => {
      const error = new Error('boom') as Error & { response?: unknown; config?: unknown };
      error.config = config;
      error.response = { status: 500, data: { code: 'INTERNAL' } };
      throw error;
    }) as AxiosAdapter;

    await expect(client.get('/thing')).rejects.toThrow();

    // A 500 is not a reason to throw the session away.
    expect(mockRefreshCalls).toEqual([]);
    expect(mockStore.has('token')).toBe(true);
  });
});
