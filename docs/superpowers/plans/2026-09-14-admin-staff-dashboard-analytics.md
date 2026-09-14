# Admin and Staff Dashboard Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace admin and staff dashboard fixtures with separate APIs backed by tenant, location, user, and team-scoped data.

**Architecture:** Add staff attribution to ledger credits, then expose distinct admin and staff dashboard methods from one Fastify analytics module. The Expo app uses separate React Query hooks and preserves each role's existing route while replacing static data with localized live states.

**Tech Stack:** Fastify 5, TypeBox, Drizzle/PostgreSQL, Vitest, Expo SDK 54, React Query Kit, Jest, i18next.

**Spec:** `docs/superpowers/specs/2026-09-14-admin-dashboard-analytics-design.md`

## Global Constraints

- Retain existing source schemas and `analytics.tenant_customer_stats`.
- Add only nullable `crm.account_transactions.collected_by`; historical rows stay valid.
- Add no cache, worker, analytics snapshot table, or dependency.
- Admin and staff endpoints and DTOs remain distinct.
- Exclude complaints and ticket metrics.
- Use absolute `@/` imports and matching sorted English/Telugu keys.
- Do not add shadows or edit native projects.

---

### Task 1: Attribute ledger collections

**Files:**
- Modify: `/Users/udaychittala/exp/cable-backend/src/db/schema/crm/account-transactions.ts`
- Create: generated Drizzle migration and snapshot files under `/Users/udaychittala/exp/cable-backend/src/db/migrations/`
- Modify: `/Users/udaychittala/exp/cable-backend/src/db/schema/integrity.test.ts`

**Interfaces:**
- Consumes: `auth.users.id`.
- Produces: nullable `accountTransactions.collectedBy: string | null` indexed by tenant, collector, and transaction date.

- [ ] Write a failing integrity test inserting a collector, a deposit credit attributed to that user, and an unattributed historical credit; assert both round-trip and cross-tenant references are rejected.
- [ ] Run `pnpm test src/db/schema/integrity.test.ts` and verify it fails because `collectedBy` is absent.
- [ ] Add the nullable foreign key and `account_tx_tenant_collector_date_idx`, then run `pnpm db:generate`.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Separate admin and staff analytics endpoints

**Files:**
- Create: `/Users/udaychittala/exp/cable-backend/src/modules/analytics/analytics.api.test.ts`
- Create: `/Users/udaychittala/exp/cable-backend/src/modules/analytics/analytics.schema.ts`
- Create: `/Users/udaychittala/exp/cable-backend/src/modules/analytics/analytics.service.ts`
- Create: `/Users/udaychittala/exp/cable-backend/src/modules/analytics/analytics.controller.ts`
- Create: `/Users/udaychittala/exp/cable-backend/src/modules/analytics/analytics.routes.ts`
- Create: `/Users/udaychittala/exp/cable-backend/src/modules/analytics/analytics.types.ts`

**Interfaces:**
- Consumes: `Database`, `RequestAccess`, `tenantCustomerStats`, CRM/geo/tenancy tables, `reports.view`.
- Produces: `GET /analytics/admin-dashboard` and `GET /analytics/staff-dashboard`.

- [ ] Write failing Fastify-inject tests with two tenants, two teams, location grants, attributed and unattributed credits. Assert role separation, tenant/location isolation, admin aggregate literals, personal/team collection literals, null team behavior, and empty datasets.
- [ ] Run `pnpm test src/modules/analytics/analytics.api.test.ts` and verify both paths return 404.
- [ ] Define distinct TypeBox DTOs. Admin returns customer/connection KPIs, collection buckets, outstanding balances, service/area distributions, recent customers/activity, and `generatedAt`. Staff returns `personal`, nullable `team`, `workload`, `recentCollections`, and `generatedAt`; collection metrics contain today/week/month amounts and receipt counts.
- [ ] Implement `AnalyticsService.adminDashboard(access, now)` and `staffDashboard(access, now)`. Count only `deposit` credits as collections; admin includes all tenant credits, personal filters `collectedBy = access.userId`, and team joins the caller's `tenantMemberships.teamId` to active memberships. Staff workload uses granted location descendants. Execute independent aggregates with `Promise.all` and return decimal strings.
- [ ] Register the service decorator and both routes. Require `reports.view`; reject admin endpoint callers without role `admin`/`super_admin`, and staff endpoint callers without role `staff`, using existing domain errors.
- [ ] Re-run the focused tests, then `pnpm type-check && pnpm lint`.

### Task 3: Mobile API hooks and mapping

**Files:**
- Create: `src/lib/hooks/api/use-admin-dashboard.test.ts`
- Modify: `src/lib/hooks/api/use-admin-dashboard.ts`
- Create: `src/lib/hooks/api/use-staff-dashboard.test.ts`
- Create: `src/lib/hooks/api/use-staff-dashboard.ts`
- Modify: `src/lib/utils/admin-stats.ts`

**Interfaces:**
- Consumes: Task 2 DTOs and existing authenticated `client`.
- Produces: `useAdminDashboard`, `useStaffDashboard`, and numeric/timestamp presentation models.

- [ ] Write failing tests with complete literal DTOs; assert exact endpoint paths, decimal conversion, inactive connection grouping, relative dates, and separate personal/team values.
- [ ] Run both focused Jest files and verify failure because the admin hook is a fixture and staff hook is absent.
- [ ] Delete `placeholderDashboard`, fetch `/analytics/admin-dashboard`, and map its response. Add the staff hook fetching `/analytics/staff-dashboard`. Retain five-minute dashboard staleness.
- [ ] Remove fixture-only staff/ticket model fields after `rg` confirms no remaining callers.
- [ ] Re-run both focused tests and verify they pass.

### Task 4: Live localized admin and staff dashboards

**Files:**
- Create: `src/app/admin/dashboard.test.tsx`
- Create: `src/app/staff/dashboard.test.tsx`
- Modify: `src/app/admin/(tabs)/index.tsx`
- Modify: `src/app/admin/analytics/index.tsx`
- Modify: relevant `src/components/admin/*.tsx`
- Modify: `src/app/staff/index.tsx`
- Modify: `src/components/staff/staff-collections-card.tsx`
- Delete: `src/components/admin/staff-activity.tsx`
- Delete: `src/components/admin/promo-banner.tsx`
- Modify: `src/translations/en.json`
- Modify: `src/translations/te.json`

**Interfaces:**
- Consumes: Task 3 hooks.
- Produces: distinct live admin and staff dashboard experiences.

- [ ] Write failing screen tests for live values, initial loading/error/empty/content states, cached refresh errors, staff personal/team switching, no-team behavior, and English/Telugu copy.
- [ ] Run the focused Jest files and verify expected failures from hard-coded fixtures and labels.
- [ ] Update admin screens to show live customer, connection, outstanding, collection, chart, distribution, area, recent-customer, and activity values; remove unsupported promotional and staff-ranking content.
- [ ] Replace staff static content with personal/team segmented status, collection amounts/counts, scoped workload, recent personal collections, pull-to-refresh, and safe no-team/empty/error states.
- [ ] Add matching `admin_dashboard` and `staff_dashboard` dictionaries and use `useTranslation()` in every touched user-facing component.
- [ ] Run focused tests and `pnpm run lint:translations` until green.

### Task 5: Verify both repositories

**Files:** all changed files.

**Interfaces:** Produces a reviewable verified branch in each repository.

- [ ] Run `pnpm check-all` in `/Users/udaychittala/exp/cable-backend`.
- [ ] Run `pnpm check-all` in `/Users/udaychittala/exp/cable_mobile_app_react_native`.
- [ ] Run `git diff --check`, inspect `git status --short` and `git diff --stat` in both repositories, and confirm no fixtures, unrelated files, native edits, or generated build artifacts remain.
