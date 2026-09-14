# Admin Dashboard Analytics Design

## Goal

Replace the admin home and analytics screens' fixture data with one permission-aware backend dashboard response built from the existing PostgreSQL schema.

## Scope

The backend adds `GET /api/v1/analytics/dashboard`. The endpoint returns the complete data needed by both existing mobile screens: customer and connection KPIs, collections, revenue series, service distribution, top locations, recent customers, and recent activity.

Staff collection rankings and ticket metrics are excluded because no staff-attributed collection or ticket records exist. The mobile analytics screen removes that section instead of displaying invented values. The existing customer, subscription, transaction, location, and audit schemas remain because they are source-of-truth business data. The existing `analytics.tenant_customer_stats` view remains because it is a useful read aggregate; no new analytics tables, materialized views, Redis cache, scheduled worker, or dependencies are added.

## API Contract

`GET /api/v1/analytics/dashboard` requires `reports.view`. The permission's existing access scope is applied to customers and subscriptions:

- `ALL` includes the tenant.
- `LOCATION` and related location scopes include the granted location descendants.
- `OWN` includes only the signed-in customer's records when applicable.
- A caller with no reachable locations receives a successful empty dashboard.

The response contains:

- `customers`: total, active, inactive, pending, current-month growth, and an eight-month cumulative series.
- `connections`: total, active, inactive, suspended, cancelled, current-month growth, and an eight-month cumulative series.
- `collections`: credit totals for today, the current Sunday-based week, and the current month; a nine-point daily, weekly, and monthly series; month-over-month change.
- `outstanding`: the sum of positive customer outstanding balances and the number of customers owing money.
- `services`: connection counts and percentage share grouped by service.
- `areas`: connection counts and percentage share grouped by resolved installation location path, limited to the five largest.
- `recentCustomers`: the four newest visible customers.
- `activity`: the six newest visible customer creations and account transactions.
- `generatedAt`: the server timestamp so the response's time boundary is explicit.

Money is serialized as decimal strings. Counts and percentages are JSON numbers. Empty datasets return zero totals and empty lists, never a 404.

## Backend Design

A new `modules/analytics` module follows the existing route → controller → service structure. The service issues a small fixed set of aggregate queries using Drizzle and PostgreSQL grouping/window expressions. It reuses the customer module's established reach semantics rather than inventing a second scoping model. Queries always include `tenant_id`, soft-delete filters, and the caller's permitted reach.

The existing tenant customer view is used for `ALL` scope customer totals. Narrower scopes aggregate the underlying customer table because the tenant-wide view cannot safely answer location- or owner-scoped requests. Transaction collections use `credit`; debits are charges and are not counted as money collected. Revenue on the current UI is renamed to Collections so the displayed meaning matches the available ledger.

The route has a TypeBox response schema and standard error references. The analytics Fastify decorator is registered through the same plugin pattern used by current modules. No migration is needed unless implementation reveals a missing index in an explainable query; the existing tenant/date/status/location indexes cover the planned access paths.

## Mobile Design

`useAdminDashboard` calls `/analytics/dashboard` through the existing authenticated API client and maps decimal strings and server DTO names into a slimmer `AdminDashboard` UI model. Its fixture function and fixture-only staff/ticket fields are deleted.

The admin home keeps its current layout but displays live customer, connection, outstanding, and collection KPIs. The analytics page keeps collections charts, connection status, service distribution, top areas, recent customers, and activity; it removes staff activity and promotional filler. Pull-to-refresh continues to use React Query. Cached data remains visible during background refresh errors, while first load has loading, error/retry, empty, and content states.

All user-facing dashboard strings move to `admin_dashboard` translation keys in English and Telugu. Components use `useTranslation`; no English fallback fixtures remain.

## Error Handling

Authentication and permission failures use the backend's existing handlers. Database errors propagate to the standard error mapper and include the request ID. The client shows its existing retry state when the first request fails. If cached data exists and a refresh fails, the screen keeps the cached dashboard and exposes a non-blocking retry message.

## Testing

Backend API tests create two tenants and verify tenant isolation, `reports.view` enforcement, location scope, empty data, aggregate values, series buckets, and recent-record ordering using Fastify `inject()` and the existing test database utilities.

Mobile tests verify the API path and decimal mapping, initial failure/retry, empty rendering, cached-data refresh behavior, and English/Telugu dashboard text. Translation JSON is sorted with `pnpm run lint:translations`. Final verification runs focused tests first, followed by `pnpm check-all` in both repositories.

## Deliberate Limits

The endpoint computes live data on request. Add persisted analytics snapshots or a pg-boss refresh job only after measured query latency or reporting-history requirements make live aggregates insufficient. Staff collection rankings return when transactions record a collecting staff member. Ticket metrics return with the ticket module.
