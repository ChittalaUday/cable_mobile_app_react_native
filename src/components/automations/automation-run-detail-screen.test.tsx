import type { JobRunDetail, JobRunEvent } from '@/lib/api/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { AppState } from 'react-native';
import i18n from '@/lib/i18n';
import { AutomationRunDetailScreen } from './automation-run-detail-screen';

const RUN = '2f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const JPEG_A = '/9j/4AAQ';
const JPEG_B = '/9j/4AAR';

const mockRefetch = jest.fn();
let mockDetail: { data?: JobRunDetail; isPending?: boolean; isRefetching?: boolean; error?: Error | null } = {};

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('env', () => ({ __esModule: true, default: { EXPO_PUBLIC_API_URL: 'https://api.test/api/v1' } }));
jest.mock('@/lib/api/client', () => ({ devHostUrl: (url: string) => url }));
jest.mock('@/lib/auth/utils', () => ({ getToken: () => ({ access: 'token', refresh: 'r' }), getTenantId: () => 'tenant-a' }));
jest.mock('@/lib/hooks/api/use-job-runs', () => ({
  jobRunKeys: { detail: (tenant: string | null, id: string) => ['detail', tenant, id] },
  useJobRun: () => ({ isPending: false, isRefetching: false, error: null, refetch: mockRefetch, ...mockDetail }),
}));

class FakeSocket {
  static instances: FakeSocket[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onopen: unknown = null;
  onerror: unknown = null;
  onclose: unknown = null;
  closed = false;

  constructor() {
    FakeSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  send(message: object) {
    this.onmessage?.({ data: JSON.stringify({ version: 1, runId: RUN, ...message }) });
  }
}

function event(sequence: number, code: string, metadata: Record<string, number | boolean> = {}, level: JobRunEvent['level'] = 'info'): JobRunEvent {
  return {
    sequence,
    attemptNumber: 1,
    level,
    code,
    metadata,
    createdAt: `2026-10-02T14:30:${String(sequence).padStart(2, '0')}`,
  };
}

function detail(overrides: Partial<JobRunDetail> = {}): JobRunDetail {
  return {
    id: RUN,
    jobName: 'automation.act-total-customer',
    status: 'running',
    progress: 40,
    progressMessage: null,
    result: null,
    queuedAt: '2026-10-02T14:29:00',
    startedAt: '2026-10-02T14:30:00',
    finishedAt: null,
    providerId: 'prov-1',
    providerName: 'ACT Hyderabad',
    attempts: [],
    events: [],
    ...overrides,
  };
}

let queryClient: QueryClient;
let appStateHandler: ((state: string) => void) | null = null;

function mount() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AutomationRunDetailScreen id={RUN} />
    </QueryClientProvider>,
  );
}

// expo-image hands its source on as a list.
const frameUri = () => (screen.getByTestId('live-frame').props as { source: { uri: string }[] }).source[0]!.uri;
const socket = () => FakeSocket.instances[FakeSocket.instances.length - 1]!;

beforeEach(async () => {
  FakeSocket.instances = [];
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  mockRefetch.mockReset();
  mockDetail = { data: detail() };
  queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (state: string) => void) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
  await act(async () => i18n.changeLanguage('en'));
});

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
});

describe('run provider', () => {
  it('shows the provider name in the summary', () => {
    mount();

    expect(screen.getByTestId('run-provider').props.children).toBe('ACT Hyderabad');
  });

  it('falls back to a generic label when the run has no provider', () => {
    mockDetail = { data: detail({ providerId: null, providerName: null }) };
    mount();

    expect(screen.getByTestId('run-provider').props.children).toBe('Provider');
  });
});

describe('run detail states', () => {
  it('shows a loader first', () => {
    mockDetail = { data: undefined, isPending: true };
    mount();

    expect(screen.getByText('Loading this run…')).toBeTruthy();
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('offers a retry when the first load fails and opens no socket', () => {
    mockDetail = { data: undefined, error: new Error('x') };
    mount();
    fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('Could not load this run')).toBeTruthy();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('keeps cached detail and says the refresh failed', () => {
    mockDetail = { data: detail({ status: 'succeeded', finishedAt: '2026-10-02T14:33:05' }), error: new Error('offline') };
    mount();
    fireEvent.press(screen.getByTestId('detail-refresh-error'));

    expect(screen.getByText('Succeeded')).toBeTruthy();
    expect(screen.getByText('Could not refresh. Showing the last loaded details — tap to retry.')).toBeTruthy();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not stream a run the server refused', () => {
    mockDetail = { data: detail(), error: Object.assign(new Error('gone'), { response: { status: 404 } }) };
    mount();

    expect(FakeSocket.instances).toHaveLength(0);
  });
});

describe('an active run', () => {
  it('waits for the first picture, then shows only the newest one', () => {
    mount();

    expect(screen.getByTestId('live-phase')).toHaveTextContent('Connecting…');
    act(() => socket().send({ type: 'ready', status: 'running' }));
    expect(screen.getByTestId('live-phase')).toHaveTextContent('Live');
    expect(screen.getByText('Waiting for the first picture from the browser…')).toBeTruthy();

    act(() => socket().send({ type: 'frame', sequence: 1, capturedAt: '2026-10-02T14:30:01.000Z', contentType: 'image/jpeg', width: 800, height: 600, data: JPEG_A }));
    expect(frameUri()).toBe(`data:image/jpeg;base64,${JPEG_A}`);
    act(() => socket().send({ type: 'frame', sequence: 2, capturedAt: '2026-10-02T14:30:02.000Z', contentType: 'image/jpeg', width: 800, height: 600, data: JPEG_B }));

    expect(screen.getAllByTestId('live-frame')).toHaveLength(1);
    expect(frameUri()).toBe(`data:image/jpeg;base64,${JPEG_B}`);
    expect(screen.getByLabelText('Live picture of the browser running the sync')).toBeTruthy();
  });

  it('lists REST activity and live activity once, in order, below the preview and summary', () => {
    mockDetail = { data: detail({ events: [event(1, 'run_queued', { scheduled: false }), event(3, 'portal_login_started')] }) };
    mount();
    act(() => socket().send({ type: 'ready', status: 'running' }));
    act(() => socket().send({ type: 'activity', sequence: 4, attemptNumber: 1, level: 'info', code: 'report_parsed', metadata: { rowCount: 7, durationMs: 1200 }, createdAt: '2026-10-02T14:30:04' }));
    act(() => socket().send({ type: 'activity', sequence: 3, attemptNumber: 1, level: 'info', code: 'portal_login_started', metadata: {}, createdAt: '2026-10-02T14:30:03' }));

    expect(screen.getAllByTestId(/^activity-/).map(row => row.props.testID as string)).toEqual(['activity-1', 'activity-3', 'activity-4']);
    expect(screen.getByText('Run queued')).toBeTruthy();
    expect(screen.getByText('Report read: 7 rows')).toBeTruthy();
    expect(screen.getAllByText('Signing in to the ACT portal')).toHaveLength(1);

    const order = screen.getAllByText(/./).map(node => String(node.props.children));
    expect(order.indexOf('Live view')).toBeLessThan(order.indexOf('40% complete'));
    expect(order.indexOf('40% complete')).toBeLessThan(order.indexOf('Activity'));
    expect(order.indexOf('Activity')).toBeLessThan(order.indexOf('Signing in to the ACT portal'));
  });

  it('says plainly when the live view is unavailable but keeps the activity', () => {
    mockDetail = { data: detail({ events: [event(1, 'run_queued', { scheduled: true })] }) };
    mount();
    act(() => socket().send({ type: 'error', code: 'RUN_NOT_FOUND', message: 'x' }));

    expect(screen.getByText('The live view is unavailable. Activity below still updates.')).toBeTruthy();
    expect(screen.getByText('Scheduled run queued')).toBeTruthy();
  });

  it('closes the socket when the app goes to the background and when the screen unmounts', () => {
    const view = mount();
    const first = socket();
    act(() => appStateHandler?.('background'));
    expect(first.closed).toBe(true);

    act(() => appStateHandler?.('active'));
    const second = socket();
    expect(second).not.toBe(first);
    view.unmount();

    expect(second.closed).toBe(true);
  });

  it('shows the unknown-event fallback without printing metadata', () => {
    mockDetail = { data: detail({ events: [event(1, 'brand_new_code', { secret: 7 }), event(2, 'report_parsed', { rowCount: 'lots' as unknown as number, durationMs: 1 })] }) };
    mount();

    expect(screen.getAllByText('Activity recorded')).toHaveLength(2);
    expect(screen.queryByText(/secret/)).toBeNull();
    expect(screen.queryByText(/lots/)).toBeNull();
  });
});

describe('a finished run', () => {
  const finished = (overrides: Partial<JobRunDetail> = {}) => detail({
    status: 'failed',
    progress: 100,
    finishedAt: '2026-10-02T14:33:05',
    result: { downloadedRows: 12, created: 1, updated: 2, unchanged: 9, warnings: ['x'] },
    attempts: [
      { attemptNumber: 2, status: 'failed', safeErrorCode: 'PORTAL', safeErrorMessage: 'The portal did not respond', retryable: false, durationMs: 1000, metrics: {}, startedAt: '2026-10-02T14:32:00', finishedAt: '2026-10-02T14:33:05' },
      { attemptNumber: 1, status: 'failed', safeErrorCode: null, safeErrorMessage: null, retryable: true, durationMs: 1000, metrics: {}, startedAt: '2026-10-02T14:30:00', finishedAt: '2026-10-02T14:31:00' },
    ],
    events: [event(2, 'attempt_retrying', { retryDelayMs: 30_000, nextAttemptNumber: 2 }, 'warning'), event(1, 'attempt_started', { maxAttempts: 2 }), event(3, 'run_failed', { retryable: false }, 'error')],
    ...overrides,
  });

  it('reads entirely from REST: no socket, safe attempts, ordered activity, result counts', () => {
    mockDetail = { data: finished() };
    mount();

    expect(FakeSocket.instances).toHaveLength(0);
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('The live view is only shown while a run is active. The activity below is the full record.')).toBeTruthy();
    expect(screen.queryByTestId('live-phase')).toBeNull();
    expect(screen.getByText('12 rows · 1 new · 2 updated · 9 unchanged · 1 warnings')).toBeTruthy();
    expect(screen.getByText('Error: The portal did not respond')).toBeTruthy();
    expect(screen.getAllByTestId(/^attempt-/).map(row => row.props.testID as string)).toEqual(['attempt-1', 'attempt-2']);
    expect(screen.getAllByTestId(/^activity-/).map(row => row.props.testID as string)).toEqual(['activity-1', 'activity-2', 'activity-3']);
    expect(screen.getByText('Attempt failed. Retrying as attempt 2 in 30s')).toBeTruthy();
    expect(screen.getByText('The run failed')).toBeTruthy();
  });

  it('offers no retry, cancel, pause, resume or input controls', () => {
    mockDetail = { data: finished() };
    mount();

    expect(screen.queryByText(/retry\b|cancel|pause|resume|stop/i)).toBeNull();
    expect(screen.queryByTestId('hard-sync')).toBeNull();
  });

  it('renders the same run in Telugu, including a representative success, warning, failure and unknown event', async () => {
    await act(async () => i18n.changeLanguage('te'));
    mockDetail = { data: finished({ events: [event(1, 'run_queued', { scheduled: true }), event(2, 'attempt_retrying', { retryDelayMs: 30_000, nextAttemptNumber: 2 }, 'warning'), event(3, 'run_failed', { retryable: false }, 'error'), event(4, 'future_code')] }) };
    mount();

    expect(screen.getByText('విఫలమైంది')).toBeTruthy();
    expect(screen.getByText('షెడ్యూల్ చేసిన రన్ క్యూలో చేరింది')).toBeTruthy();
    expect(screen.getByText('ప్రయత్నం విఫలమైంది. 30 సెకన్లలో 2వ ప్రయత్నంగా మళ్లీ ప్రయత్నిస్తోంది')).toBeTruthy();
    expect(screen.getByText('రన్ విఫలమైంది')).toBeTruthy();
    expect(screen.getByText('కార్యకలాపం నమోదైంది')).toBeTruthy();
    expect(screen.getByText('రన్ నడుస్తున్నప్పుడు మాత్రమే లైవ్ వ్యూ కనిపిస్తుంది. కింద ఉన్న కార్యకలాపమే పూర్తి రికార్డు.')).toBeTruthy();
  });
});
