import type { JobRunSummary } from '@/lib/api/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import i18n from '@/lib/i18n';
import { AutomationRunsScreen } from './automation-runs-screen';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockStart = jest.fn();
const mockScopes: Record<string, string> = {};
let mockList: { data?: unknown; isPending?: boolean; isRefetching?: boolean; error?: Error | null } = {};
let mockStartPending = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/lib/hooks/common/use-permissions', () => ({
  usePermissions: () => ({
    hasScope: (key: string, required: string) => (mockScopes[key] === 'ALL' ? true : mockScopes[key] === required),
  }),
}));
jest.mock('@/lib/hooks/api/use-job-runs', () => ({
  useJobRuns: () => ({ isPending: false, isRefetching: false, error: null, refetch: mockRefetch, ...mockList }),
  useStartCustomerSync: () => ({ mutateAsync: mockStart, isPending: mockStartPending }),
}));

function run(overrides: Partial<JobRunSummary> = {}): JobRunSummary {
  return {
    id: 'run-1',
    jobName: 'automation.act-total-customer',
    status: 'succeeded',
    progress: 100,
    progressMessage: null,
    result: { downloadedRows: 1200, created: 3, updated: 10, unchanged: 1187, warnings: [] },
    queuedAt: '2026-10-02T14:29:00',
    startedAt: '2026-10-02T14:30:00',
    finishedAt: '2026-10-02T14:33:05',
    ...overrides,
  };
}

const page = (items: JobRunSummary[]) => ({ items, page: 1, limit: 50, total: items.length, totalPages: 1 });

beforeEach(async () => {
  mockPush.mockReset();
  mockRefetch.mockReset();
  mockStart.mockReset();
  mockStartPending = false;
  mockList = { data: page([run()]) };
  for (const key of Object.keys(mockScopes))
    delete mockScopes[key];
  await act(async () => i18n.changeLanguage('en'));
});

describe('automation run history', () => {
  it('lists runs with status, times, duration and safe counts', () => {
    render(<AutomationRunsScreen />);

    expect(screen.getByText('Automations')).toBeTruthy();
    expect(screen.getByText('Succeeded')).toBeTruthy();
    expect(screen.getByText('Started 02 Oct 2026, 02:30 PM')).toBeTruthy();
    expect(screen.getByText('Took 3m 05s')).toBeTruthy();
    expect(screen.getByText('1200 rows · 3 new · 10 updated · 1187 unchanged')).toBeTruthy();
  });

  it('opens a run when its row is pressed', () => {
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByTestId('run-row-run-1'));

    expect(mockPush).toHaveBeenCalledWith('/admin/automations/run-1');
  });

  it('renders in Telugu', async () => {
    await act(async () => i18n.changeLanguage('te'));
    render(<AutomationRunsScreen />);

    expect(screen.getByText('ఆటోమేషన్లు')).toBeTruthy();
    expect(screen.getByText('విజయవంతం')).toBeTruthy();
    expect(screen.getByText('పట్టిన సమయం 3m 05s')).toBeTruthy();
    expect(screen.getByLabelText('రన్‌ను తెరవండి, విజయవంతం')).toBeTruthy();
  });

  it('shows a loading indicator before the first page', () => {
    mockList = { data: undefined, isPending: true };
    render(<AutomationRunsScreen />);

    expect(screen.queryByText('No runs yet')).toBeNull();
    expect(screen.queryByText('Could not load runs')).toBeNull();
  });

  it('offers a retry when the first load fails', () => {
    mockList = { data: undefined, error: new Error('boom') };
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('Could not load runs')).toBeTruthy();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('explains an empty history', () => {
    mockList = { data: page([]) };
    render(<AutomationRunsScreen />);

    expect(screen.getByText('No runs yet')).toBeTruthy();
    expect(screen.getByText('Runs appear here once a sync is scheduled or started.')).toBeTruthy();
  });

  it('keeps cached runs and says the refresh failed', () => {
    mockList = { data: page([run()]), error: new Error('offline') };
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByTestId('runs-refresh-error'));

    expect(screen.getByText('Succeeded')).toBeTruthy();
    expect(screen.getByText('Could not refresh. Showing the last loaded runs — tap to retry.')).toBeTruthy();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes by pulling', () => {
    render(<AutomationRunsScreen />);
    const list = screen.getByTestId('runs-list');
    act(() => {
      (list.props as { refreshControl: { props: { onRefresh: () => void } } }).refreshControl.props.onRefresh();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('hard sync action', () => {
  it('is hidden without jobs.run', () => {
    render(<AutomationRunsScreen />);

    expect(screen.queryByText('Hard sync customers')).toBeNull();
  });

  it('is hidden when jobs.run is below ALL scope', () => {
    mockScopes['jobs.run'] = 'LOCATION';
    render(<AutomationRunsScreen />);

    expect(screen.queryByText('Hard sync customers')).toBeNull();
  });

  it.each([false, true])('opens the returned run when reused is %s', async (reused) => {
    mockScopes['jobs.run'] = 'ALL';
    mockStart.mockResolvedValue({ run: run({ id: 'run-7', status: 'queued' }), reused });
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByText('Hard sync customers'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/automations/run-7'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Could not start the sync. Try again.')).toBeNull();
  });

  it('cannot be tapped again while starting', () => {
    mockScopes['jobs.run'] = 'ALL';
    mockStartPending = true;
    render(<AutomationRunsScreen />);

    expect(screen.getByText('Starting…')).toBeTruthy();
    fireEvent.press(screen.getByTestId('hard-sync'));
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('opens the active run instead of starting another', () => {
    mockScopes['jobs.run'] = 'ALL';
    mockList = { data: page([run({ id: 'run-5', status: 'running', finishedAt: null }), run()]) };
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByText('Open the current run'));

    expect(mockStart).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/admin/automations/run-5');
  });

  it.each([
    [503, 'The sync worker is not available right now. Try again in a minute.'],
    [403, 'You are not allowed to start a sync.'],
    [500, 'Could not start the sync. Try again.'],
  ])('says so in words when the start fails with %s', async (status, message) => {
    mockScopes['jobs.run'] = 'ALL';
    mockStart.mockRejectedValue(Object.assign(new Error('x'), { response: { status } }));
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByText('Hard sync customers'));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('is localized in Telugu', async () => {
    await act(async () => i18n.changeLanguage('te'));
    mockScopes['jobs.run'] = 'ALL';
    render(<AutomationRunsScreen />);

    expect(screen.getByText('కస్టమర్లను హార్డ్ సింక్ చేయండి')).toBeTruthy();
    expect(screen.getByText('ACT పోర్టల్ నుండి తాజా కస్టమర్ జాబితాను ఇప్పుడే తీసుకుంటుంది.')).toBeTruthy();
  });
});
