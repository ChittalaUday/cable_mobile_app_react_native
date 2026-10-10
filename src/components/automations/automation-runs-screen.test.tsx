import type { JobRunSummary } from '@/lib/api/contracts';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as React from 'react';
import i18n from '@/lib/i18n';
import { AutomationRunsScreen } from './automation-runs-screen';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockStart = jest.fn();
const mockScopes: Record<string, string> = {};
let mockList: { data?: unknown; isPending?: boolean; isRefetching?: boolean; error?: Error | null } = {};
let mockProviders: { data?: unknown; isPending?: boolean; error?: Error | null } = {};
const mockProvidersRefetch = jest.fn();
let mockStartPending = false;

type Provider = { providerId: string; name: string; code: string | null; enabled: boolean };
const provider = (overrides: Partial<Provider> = {}): Provider => ({ providerId: 'prov-1', name: 'ACT Hyderabad', code: 'ACT-HYD', enabled: true, ...overrides });

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/lib/hooks/common/use-permissions', () => ({
  usePermissions: () => ({
    hasScope: (key: string, required: string) => (mockScopes[key] === 'ALL' ? true : mockScopes[key] === required),
  }),
}));
jest.mock('@/lib/hooks/api/use-job-runs', () => ({
  useJobRuns: () => ({ isPending: false, isRefetching: false, error: null, refetch: mockRefetch, ...mockList }),
  useAutomationProviders: () => ({ isPending: false, error: null, refetch: mockProvidersRefetch, ...mockProviders }),
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
    providerId: 'prov-1',
    providerName: 'ACT Hyderabad',
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
  mockProviders = { data: { items: [provider()] } };
  mockProvidersRefetch.mockReset();
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

  it('names the provider on each run, with a generic fallback', () => {
    mockList = { data: page([run({ id: 'run-1' }), run({ id: 'run-2', providerId: null, providerName: null })]) };
    render(<AutomationRunsScreen />);

    expect(within(screen.getByTestId('run-row-run-1')).getByText('ACT Hyderabad')).toBeTruthy();
    expect(within(screen.getByTestId('run-row-run-2')).getByText('Provider')).toBeTruthy();
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

describe('providers and per-provider hard sync', () => {
  const sync = () => screen.getByTestId('hard-sync-prov-1');

  it('lists each provider with its code and state, and no global button', () => {
    mockProviders = { data: { items: [provider(), provider({ providerId: 'prov-2', name: 'ACT Warangal', code: null, enabled: false })] } };
    render(<AutomationRunsScreen />);

    expect(screen.getByText('Providers')).toBeTruthy();
    expect(within(screen.getByTestId('provider-prov-1')).getByText('ACT-HYD')).toBeTruthy();
    expect(within(screen.getByTestId('provider-prov-1')).getByText('Enabled')).toBeTruthy();
    expect(within(screen.getByTestId('provider-prov-2')).getByText('Disabled')).toBeTruthy();
    expect(screen.queryByTestId('hard-sync')).toBeNull();
  });

  it('hides every Hard sync button without jobs.run', () => {
    render(<AutomationRunsScreen />);

    expect(screen.getByTestId('provider-prov-1')).toBeTruthy();
    expect(screen.queryByTestId('hard-sync-prov-1')).toBeNull();
  });

  it('hides them when jobs.run is below ALL scope', () => {
    mockScopes['jobs.run'] = 'LOCATION';
    render(<AutomationRunsScreen />);

    expect(screen.queryByTestId('hard-sync-prov-1')).toBeNull();
  });

  it.each([false, true])('starts the pressed provider and opens the returned run when reused is %s', async (reused) => {
    mockScopes['jobs.run'] = 'ALL';
    mockProviders = { data: { items: [provider(), provider({ providerId: 'prov-2', name: 'ACT Warangal' })] } };
    mockStart.mockResolvedValue({ run: run({ id: 'run-7', status: 'queued', providerId: 'prov-2' }), reused });
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByTestId('hard-sync-prov-2'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/automations/run-7'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledWith({ providerId: 'prov-2' });
  });

  it('cannot be tapped again while starting', () => {
    mockScopes['jobs.run'] = 'ALL';
    mockStartPending = true;
    render(<AutomationRunsScreen />);

    fireEvent.press(sync());
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('is disabled with a hint when the provider account is disabled', () => {
    mockScopes['jobs.run'] = 'ALL';
    mockProviders = { data: { items: [provider({ enabled: false })] } };
    render(<AutomationRunsScreen />);
    fireEvent.press(sync());

    expect(screen.getByText('This provider\'s portal account is disabled.')).toBeTruthy();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('opens that provider\'s active run instead of starting another', () => {
    mockScopes['jobs.run'] = 'ALL';
    mockProviders = { data: { items: [provider(), provider({ providerId: 'prov-2', name: 'ACT Warangal' })] } };
    mockList = { data: page([run({ id: 'run-5', status: 'running', finishedAt: null, providerId: 'prov-1' })]) };
    render(<AutomationRunsScreen />);

    expect(within(screen.getByTestId('provider-prov-2')).getByText('Hard sync')).toBeTruthy();
    fireEvent.press(within(screen.getByTestId('provider-prov-1')).getByText('Open the current run'));

    expect(mockStart).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/admin/automations/run-5');
  });

  it('ignores another provider\'s active run and finished runs', () => {
    mockScopes['jobs.run'] = 'ALL';
    mockList = { data: page([run({ id: 'run-5', status: 'running', providerId: 'prov-9' }), run({ id: 'run-6', status: 'failed' })]) };
    render(<AutomationRunsScreen />);

    expect(screen.queryByText('Open the current run')).toBeNull();
  });

  it.each([
    [503, 'The sync worker is not available right now. Try again in a minute.'],
    [403, 'You are not allowed to start a sync.'],
    [404, 'This provider was not found. Pull to refresh and try again.'],
    [409, 'This provider has no enabled ACT portal account. Add or enable it first.'],
    [422, 'This provider has no enabled ACT portal account. Add or enable it first.'],
    [500, 'Could not start the sync. Try again.'],
  ])('says so in words when the start fails with %s', async (status, message) => {
    mockScopes['jobs.run'] = 'ALL';
    mockStart.mockRejectedValue(Object.assign(new Error('x'), { response: { status } }));
    render(<AutomationRunsScreen />);
    fireEvent.press(sync());

    expect(await screen.findByText(message)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('explains when there are no providers', () => {
    mockProviders = { data: { items: [] } };
    render(<AutomationRunsScreen />);

    expect(screen.getByText('No providers to sync')).toBeTruthy();
    expect(screen.getByText(/A provider appears here once it has an ACT portal account/)).toBeTruthy();
  });

  it('offers a retry when providers fail to load', () => {
    mockProviders = { data: undefined, error: new Error('boom') };
    render(<AutomationRunsScreen />);
    fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('Could not load providers')).toBeTruthy();
    expect(mockProvidersRefetch).toHaveBeenCalledTimes(1);
  });

  it('is localized in Telugu', async () => {
    await act(async () => i18n.changeLanguage('te'));
    mockScopes['jobs.run'] = 'ALL';
    render(<AutomationRunsScreen />);

    expect(screen.getByText('ప్రొవైడర్లు')).toBeTruthy();
    expect(screen.getByText('ఎనేబుల్')).toBeTruthy();
    expect(screen.getByText('హార్డ్ సింక్')).toBeTruthy();
    expect(screen.getByText('ఈ ప్రొవైడర్ తాజా కస్టమర్ జాబితాను ACT పోర్టల్ నుండి ఇప్పుడే తీసుకుంటుంది.')).toBeTruthy();
  });

  it('shows the empty-state explanation in Telugu', async () => {
    await act(async () => i18n.changeLanguage('te'));
    mockProviders = { data: { items: [] } };
    render(<AutomationRunsScreen />);

    expect(screen.getByText('సింక్ చేయడానికి ప్రొవైడర్లు లేరు')).toBeTruthy();
  });
});
