/**
 * HAND-TYPED stand-in for the per-provider Hard sync contract, until the backend's
 * OpenAPI carries it. After `pnpm api:sync` the generated schema already has these
 * fields, `WithProvider` becomes a no-op, and the two hand-written shapes below can
 * be replaced by `ApiResponse<'/api/v1/automations/providers'>` and
 * `ApiBody<'/api/v1/automations/customer-sync/runs', 'post'>` in contracts.ts.
 */
type ProviderFields = { providerId: string | null; providerName: string | null };

/** Adds the provider fields to a generated run shape unless it already has them. */
export type WithProvider<T> = T & Omit<ProviderFields, keyof T>;

/** Adds the optional `providerId` filter to a generated query unless it already has it. */
export type WithProviderQuery<T> = T & Omit<{ providerId?: string }, keyof T>;

export type AutomationProvider = { providerId: string; name: string; code: string | null; enabled: boolean };
export type AutomationProviderList = { items: AutomationProvider[] };
export type StartCustomerSyncBody = { providerId: string };
