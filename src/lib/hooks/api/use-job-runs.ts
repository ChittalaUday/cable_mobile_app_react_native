import type { AutomationProviderList, JobRunDetail, JobRunPage, JobRunQuery, StartCustomerSyncBody, StartCustomerSyncResponse } from '@/lib/api/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api/client';
import { isActiveRun } from '@/lib/automations/job-run-presenter';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export type JobRunFilters = JobRunQuery;

/** How often a queued or running run is re-read; the live socket only makes it quicker. */
export const ACTIVE_POLL_MS = 5000;

const START_PATH = '/automations/customer-sync/runs';

/** Every key carries the tenant, so switching tenant can never show another tenant's runs. */
export const jobRunKeys = {
  all: (tenantId: string | null) => ['job-runs', tenantId] as const,
  lists: (tenantId: string | null) => [...jobRunKeys.all(tenantId), 'list'] as const,
  list: (tenantId: string | null, filters: JobRunFilters) => [...jobRunKeys.lists(tenantId), filters] as const,
  providers: (tenantId: string | null) => [...jobRunKeys.all(tenantId), 'providers'] as const,
  detail: (tenantId: string | null, id: string) => [...jobRunKeys.all(tenantId), 'detail', id] as const,
};

// eslint-disable-next-line react/no-unnecessary-use-prefix -- reads the zustand selector hooks
function useReady() {
  const tenantId = useAuthStore.use.tenantId();
  const status = useAuthStore.use.status();
  return { tenantId, ready: status === 'signIn' && tenantId !== null };
}

/** Run history, newest first. Polls while any run on the page is still active. */
export function useJobRuns(filters: JobRunFilters = {}) {
  const { tenantId, ready } = useReady();
  const params = Object.fromEntries(Object.entries({ limit: 50, ...filters }).filter(([, value]) => value !== undefined));
  return useQuery<JobRunPage, Error>({
    queryKey: jobRunKeys.list(tenantId, params),
    queryFn: async ({ signal }) => (await client.get<JobRunPage>('/job-runs', { params, signal })).data,
    enabled: ready,
    refetchInterval: query => query.state.data?.items.some(run => isActiveRun(run.status)) ? ACTIVE_POLL_MS : false,
  });
}

/** The tenant's providers that have a portal account: what Hard sync can target. */
export function useAutomationProviders() {
  const { tenantId, ready } = useReady();
  return useQuery<AutomationProviderList, Error>({
    queryKey: jobRunKeys.providers(tenantId),
    queryFn: async ({ signal }) => (await client.get<AutomationProviderList>('/automations/providers', { signal })).data,
    enabled: ready,
  });
}

/** One run with its attempts and sanitized events. Polls until the run is terminal. */
export function useJobRun(id: string | undefined) {
  const { tenantId, ready } = useReady();
  return useQuery<JobRunDetail, Error>({
    queryKey: jobRunKeys.detail(tenantId, id ?? ''),
    queryFn: async ({ signal }) => (await client.get<JobRunDetail>(`/job-runs/${id}`, { signal })).data,
    enabled: ready && id !== undefined && id !== '',
    // A 4xx is an answer (not found, no access): do not keep asking.
    refetchInterval: query => query.state.status === 'error' || !query.state.data || !isActiveRun(query.state.data.status) ? false : ACTIVE_POLL_MS,
  });
}

/**
 * Starts the ACT customer hard sync for one provider, or finds the run already doing it. `reused`
 * is only navigation context: both answers carry the run to open. Never retried,
 * so a lost response cannot turn into a second POST.
 */
export function useStartCustomerSync() {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore.use.tenantId();
  return useMutation<StartCustomerSyncResponse, Error, StartCustomerSyncBody>({
    retry: false,
    mutationFn: async body => (await client.post<StartCustomerSyncResponse>(START_PATH, body)).data,
    onSuccess: ({ run }) => {
      // A placeholder until the detail fetch lands; an existing (fuller) detail is left alone.
      queryClient.setQueryData<JobRunDetail>(
        jobRunKeys.detail(tenantId, run.id),
        existing => existing ?? { ...run, attempts: [], events: [] },
      );
      void queryClient.invalidateQueries({ queryKey: jobRunKeys.lists(tenantId) });
      void queryClient.invalidateQueries({ queryKey: jobRunKeys.providers(tenantId) });
    },
  });
}
