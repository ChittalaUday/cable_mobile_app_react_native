import type { ActivationDecisionBody, ActivationRunResponse, ActivationStatus, AutomationProviderList, InstantRefreshStatus, JobRunDetail, JobRunPage, JobRunQuery, StartActivationBody, StartCustomerSyncBody, StartCustomerSyncResponse, StartInstantRefreshBody, StartInstantRefreshResponse } from '@/lib/api/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api/client';
import { isActiveRun } from '@/lib/automations/job-run-presenter';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export type JobRunFilters = JobRunQuery;

/** How often a queued or running run is re-read; the live socket only makes it quicker. */
export const ACTIVE_POLL_MS = 5000;

/** A step changes every few seconds, and the person is watching it, so an ACT action is read more often than other runs. */
export const ACTIVATION_POLL_MS = 1500;

const START_PATH = '/automations/customer-sync/runs';
const REFRESH_PATH = '/automations/instant-refresh';
const ACTIVATION_PATH = '/automations/act-activation';

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

/**
 * Starts the ACT dashboard's Instant Refresh for one box a customer has. Never retried: a lost response
 * must not become a second refresh of the same box.
 */
export function useStartInstantRefresh() {
  return useMutation<StartInstantRefreshResponse, Error, StartInstantRefreshBody>({
    retry: false,
    mutationFn: async body => (await client.post<StartInstantRefreshResponse>(REFRESH_PATH, body)).data,
  });
}

/**
 * Where one refresh stands, for the person who started it (a field engineer cannot read job runs).
 * Polls until the run is over; a 4xx is an answer, so it is not asked again.
 */
export function useInstantRefreshStatus(runId: string | undefined) {
  const { tenantId, ready } = useReady();
  return useQuery<InstantRefreshStatus, Error>({
    queryKey: [...jobRunKeys.all(tenantId), 'instant-refresh', runId ?? ''],
    queryFn: async ({ signal }) => (await client.get<InstantRefreshStatus>(`${REFRESH_PATH}/${runId}`, { signal })).data,
    enabled: ready && runId !== undefined && runId !== '',
    refetchInterval: query => query.state.status === 'error' || !query.state.data || !isActiveRun(query.state.data.status) ? false : ACTIVE_POLL_MS,
  });
}

/** Starts activating (or renewing) one box on ACT. The run only reads ACT's offer and waits: it spends nothing until answered. Never retried. */
export function useStartActivation() {
  return useMutation<ActivationRunResponse, Error, StartActivationBody>({
    retry: false,
    mutationFn: async body => (await client.post<ActivationRunResponse>(ACTIVATION_PATH, body)).data,
  });
}

/** Answers what ACT offered a waiting run. An approval may spend the LCO wallet: never retried. */
export function useDecideActivation(runId: string | undefined) {
  const queryClient = useQueryClient();
  const { tenantId } = useReady();
  return useMutation<ActivationStatus, Error, ActivationDecisionBody>({
    retry: false,
    mutationFn: async body => (await client.post<ActivationStatus>(`${ACTIVATION_PATH}/${runId}/decision`, body)).data,
    onSuccess: (status) => {
      queryClient.setQueryData([...jobRunKeys.all(tenantId), 'act-activation', runId ?? ''], status);
    },
  });
}

/** Where an activation or renewal stands: its step, what ACT offered, the outcome. Polls until the run is over. */
export function useActivationStatus(runId: string | undefined) {
  const { tenantId, ready } = useReady();
  return useQuery<ActivationStatus, Error>({
    queryKey: [...jobRunKeys.all(tenantId), 'act-activation', runId ?? ''],
    queryFn: async ({ signal }) => (await client.get<ActivationStatus>(`${ACTIVATION_PATH}/${runId}`, { signal })).data,
    enabled: ready && runId !== undefined && runId !== '',
    refetchInterval: query => query.state.status === 'error' || !query.state.data || !isActiveRun(query.state.data.status) ? false : ACTIVATION_POLL_MS,
  });
}
