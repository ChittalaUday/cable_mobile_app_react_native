import type { paths } from './schema.generated';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Operation<Path extends keyof paths, Verb extends Method> = NonNullable<paths[Path][Verb]>;

/** Projections of generated schemas, without another copy of the wire shape. */
export type ApiResponse<Path extends keyof paths, Verb extends Method = 'get', Code extends number = 200>
  = Operation<Path, Verb> extends { responses: infer Responses }
    ? Code extends keyof Responses
      ? Responses[Code] extends { content: { 'application/json': infer Data } } ? Data : never
      : never
    : never;

export type ApiBody<Path extends keyof paths, Verb extends Method>
  = Operation<Path, Verb> extends { requestBody?: { content: { 'application/json': infer Body } } } ? Body : never;

export type ApiQuery<Path extends keyof paths>
  = Operation<Path, 'get'> extends { parameters: { query?: infer Query } }
    // Pagination defaults are applied by the server, so callers may omit them.
    ? Omit<NonNullable<Query>, 'page' | 'limit'> & Partial<Pick<NonNullable<Query>, Extract<keyof NonNullable<Query>, 'page' | 'limit'>>>
    : never;

type GeneratedJobRunPage = ApiResponse<'/api/v1/job-runs'>;
export type JobRunQuery = ApiQuery<'/api/v1/job-runs'>;
export type JobRunSummary = GeneratedJobRunPage['items'][number];
export type JobRunPage = GeneratedJobRunPage;
export type JobRunStatus = JobRunSummary['status'];
export type JobRunDetail = ApiResponse<'/api/v1/job-runs/{id}'>;
export type JobAttempt = JobRunDetail['attempts'][number];
export type JobRunEvent = JobRunDetail['events'][number];
export type StartCustomerSyncResponse = ApiResponse<'/api/v1/automations/customer-sync/runs', 'post', 202>;
export type StartCustomerSyncBody = ApiBody<'/api/v1/automations/customer-sync/runs', 'post'>;
export type StartInstantRefreshResponse = ApiResponse<'/api/v1/automations/instant-refresh', 'post', 202>;
export type StartInstantRefreshBody = ApiBody<'/api/v1/automations/instant-refresh', 'post'>;
export type InstantRefreshStatus = ApiResponse<'/api/v1/automations/instant-refresh/{id}'>;
export type StartActivationBody = ApiBody<'/api/v1/automations/act-activation', 'post'>;
export type ActivationDecisionBody = ApiBody<'/api/v1/automations/act-activation/{id}/decision', 'post'>;
export type ActivationRunResponse = ApiResponse<'/api/v1/automations/act-activation', 'post', 202>;
export type ActivationStatus = ApiResponse<'/api/v1/automations/act-activation/{id}'>;
export type ActivationBill = NonNullable<ActivationStatus['bill']>;
export type AutomationProviderList = ApiResponse<'/api/v1/automations/providers'>;
export type AutomationProvider = AutomationProviderList['items'][number];
