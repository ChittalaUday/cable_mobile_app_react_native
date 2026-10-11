import type { JobRunDetail, JobRunSummary } from '@/lib/api/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { httpResponse } from '@/test/http';
import { ACTIVE_POLL_MS, jobRunKeys, useAutomationProviders, useJobRun, useJobRuns, useStartCustomerSync } from './use-job-runs';

const mockAuth = { tenantId: 'tenant-a' as string | null, status: 'signIn' as string };
const mockGet = jest.fn<Promise<unknown>, unknown[]>();
const mockPost = jest.fn<Promise<unknown>, unknown[]>();

jest.mock('@/lib/api/client', () => ({
  client: {
    get: async (...args: unknown[]): Promise<unknown> => mockGet(...args),
    post: async (...args: unknown[]): Promise<unknown> => mockPost(...args),
  },
}));
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: { use: { tenantId: () => mockAuth.tenantId, status: () => mockAuth.status } },
}));

function run(overrides: Partial<JobRunSummary> = {}): JobRunSummary {
  return {
    id: 'run-1',
    jobName: 'automation.act-total-customer',
    status: 'running',
    trigger: 'manual',
    progress: 10,
    progressMessage: null,
    result: null,
    queuedAt: '2026-10-10T10:00:00.000Z',
    startedAt: '2026-10-10T10:00:01.000Z',
    finishedAt: null,
    providerId: 'prov-1',
    providerName: 'ACT Hyderabad',
    ...overrides,
  };
}

const detail = (overrides: Partial<JobRunDetail> = {}): JobRunDetail => ({ ...run(), attempts: [], events: [], ...overrides });

let queryClient: QueryClient;
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: 0 } } });
  mockAuth.tenantId = 'tenant-a';
  mockAuth.status = 'signIn';
  mockGet.mockReset();
  mockPost.mockReset();
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('jobRunKeys', () => {
  it('scopes every key to the tenant', () => {
    expect(jobRunKeys.list('a', { limit: 5 })).not.toEqual(jobRunKeys.list('b', { limit: 5 }));
    expect(jobRunKeys.detail('a', 'run-1')).toEqual(['job-runs', 'a', 'detail', 'run-1']);
    expect(jobRunKeys.list('a', {}).slice(0, 3)).toEqual(jobRunKeys.lists('a'));
  });
});

describe('useJobRuns', () => {
  it('serializes filters, drops undefined ones and forwards the abort signal', async () => {
    mockGet.mockResolvedValue(httpResponse({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 }));

    const { result } = renderHook(() => useJobRuns({ status: 'failed', limit: 20, jobName: undefined }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/job-runs', { params: { limit: 20, status: 'failed' }, signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('asks again while a run is active and stops once all are terminal', async () => {
    jest.useFakeTimers();
    const page = (status: JobRunSummary['status']) => httpResponse({ items: [run({ status })], page: 1, limit: 50, total: 1, totalPages: 1 });
    mockGet.mockResolvedValueOnce(page('running')).mockResolvedValueOnce(page('succeeded')).mockResolvedValue(page('succeeded'));

    const { result } = renderHook(() => useJobRuns(), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.status).toBe('running'));
    await advance(ACTIVE_POLL_MS);
    await waitFor(() => expect(result.current.data?.items[0]?.status).toBe('succeeded'));
    await advance(ACTIVE_POLL_MS * 3);

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('does not fetch before auth has hydrated', () => {
    mockAuth.status = 'idle';
    renderHook(() => useJobRuns(), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('useAutomationProviders', () => {
  const providers = { items: [{ providerId: 'prov-1', name: 'ACT Hyderabad', code: 'ACT-HYD', enabled: true }] };

  it('loads the tenant providers and forwards the abort signal', async () => {
    mockGet.mockResolvedValue(httpResponse(providers));

    const { result } = renderHook(() => useAutomationProviders(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(providers);
    expect(mockGet).toHaveBeenCalledWith('/automations/providers', { signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('is keyed by tenant and waits for auth', () => {
    expect(jobRunKeys.providers('a')).not.toEqual(jobRunKeys.providers('b'));
    mockAuth.status = 'idle';
    renderHook(() => useAutomationProviders(), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('useJobRun', () => {
  it('is disabled without an id or a tenant', () => {
    renderHook(() => useJobRun(undefined), { wrapper });
    mockAuth.tenantId = null;
    renderHook(() => useJobRun('run-1'), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('polls a running run and stops at a terminal status', async () => {
    jest.useFakeTimers();
    mockGet.mockResolvedValueOnce(httpResponse(detail({ status: 'running' }))).mockResolvedValue(httpResponse(detail({ status: 'failed' })));

    const { result } = renderHook(() => useJobRun('run-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe('running'));
    await advance(ACTIVE_POLL_MS);
    await waitFor(() => expect(result.current.data?.status).toBe('failed'));
    await advance(ACTIVE_POLL_MS * 4);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledWith('/job-runs/run-1', { signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('keeps the cached detail when a refresh fails', async () => {
    mockGet.mockResolvedValueOnce(httpResponse(detail({ status: 'succeeded' }))).mockRejectedValueOnce(new Error('offline'));

    // Spread so every field is observed: React Query only re-renders for the ones read.
    const { result } = renderHook(() => ({ ...useJobRun('run-1') }), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe('succeeded'));
    await act(async () => result.current.refetch());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data?.status).toBe('succeeded');
  });
});

describe('useStartCustomerSync', () => {
  it.each([false, true])('posts the providerId and resolves identically when reused is %s', async (reused) => {
    mockPost.mockResolvedValue(httpResponse({ run: run({ id: 'run-9', status: 'queued' }), reused }));
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useStartCustomerSync(), { wrapper });
    const response = await act(async () => result.current.mutateAsync({ providerId: 'prov-1' }));

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/automations/customer-sync/runs', { providerId: 'prov-1' });
    expect(response).toMatchObject({ run: { id: 'run-9' }, reused });
    expect(queryClient.getQueryData<JobRunDetail>(jobRunKeys.detail('tenant-a', 'run-9'))).toMatchObject({ id: 'run-9', attempts: [], events: [] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: jobRunKeys.lists('tenant-a') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: jobRunKeys.providers('tenant-a') });
  });

  it('does not overwrite a fuller cached detail', async () => {
    const full = detail({ id: 'run-9', events: [{ sequence: 1, attemptNumber: 1, level: 'info', code: 'browser_started', metadata: {}, createdAt: '2026-10-10T10:00:00.000Z' }] });
    queryClient.setQueryData(jobRunKeys.detail('tenant-a', 'run-9'), full);
    mockPost.mockResolvedValue(httpResponse({ run: run({ id: 'run-9' }), reused: true }));

    const { result } = renderHook(() => useStartCustomerSync(), { wrapper });
    await act(async () => result.current.mutateAsync({ providerId: 'prov-1' }));

    expect(queryClient.getQueryData(jobRunKeys.detail('tenant-a', 'run-9'))).toBe(full);
  });

  it('never retries a failed start', async () => {
    mockPost.mockRejectedValue(Object.assign(new Error('down'), { response: { status: 503 } }));

    const { result } = renderHook(() => useStartCustomerSync(), { wrapper });
    await act(async () => result.current.mutateAsync({ providerId: 'prov-1' }).catch(() => undefined));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
