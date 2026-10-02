# Headful (device) E2E flows

Maestro drives the real app on a simulator/emulator. Unlike the Jest suite these
flows hit the **live REST API and PostgreSQL database**, so they need a seeded local backend.

## Prerequisites

```bash
pnpm install-maestro                 # once
cd ../cable-backend && pnpm db:seed  # admin/staff logins and role grants
pnpm ios   # or: pnpm android — a dev build must be installed and running
```

Seeded operator accounts:

| Account                 | Role     | Lands on          |
| ----------------------- | -------- | ----------------- |
| `admin@sscn.com`        | admin    | Operator panel    |
| `suresh.staff@sscn.com` | staff    | Staff dashboard   |

## Running

```bash
pnpm e2e-test                                  # whole suite, in config order
maestro test .maestro/app/packages-crud.yaml -e APP_ID=<bundle id>   # one flow
maestro test .maestro/ --include-tags=packages -e APP_ID=<bundle id> # by tag
```

For a non-default Metro port or build variant, also pass `DEV_SERVER` and
`DEV_SCHEME` (for example `http://10.0.2.2:8083` and `satyaCable.preview`).

Tags: `auth`, `admin`, `customer`, `staff`, `search`, `packages`, `customers`,
`rbac`. `util` is excluded from suite runs — those files are `runFlow` helpers.

## Layout

| Flow                            | Covers                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| `auth/onboarding`               | First-launch cover, login screen, first-launch-only behaviour |
| `auth/login-with-validation`    | Empty submit, bad password, sign-up mismatch, success         |
| `auth/guest-login`              | Anonymous sign-in lands on the customer dashboard             |
| `app/admin-dashboard`           | KPIs, quick actions, bottom nav, activity feed                |
| `app/global-search`             | appRegistry search, per-permission actions, deep link         |
| `app/packages-crud`             | Packages create / read / filter / update / delete             |
| `app/packages-permissions`      | Staff can read the catalogue but not mutate it                |
| `app/add-customer-flow`         | 3-screen Add Customer wizard + per-step validation            |
| `app/plans-on-customers`        | A plan (price − discount) becomes a customer's line           |
| `app/payments-race-ui`          | Second device pays/refunds mid-flow; stale screen; double tap |
| `app/visits-mark`               | Not-available visit with GPS → timeline → Visits list         |
| `app/customer-dashboard`        | Subscriber view, no operator surface                          |
| `app/staff-dashboard`           | Field-staff collections view                                  |
| `app/profile-and-signout`       | Profile screen, sign out, session really cleared              |

## Payments: races, duplicates and the books

Run both, in this order, whenever the money path changes:

```bash
# backend (cable-backend), against the same API the app uses
pnpm qa:payments                 # races + duplicates + refunds via the API, then ledger/balance/audit invariants
pnpm qa:payments --burst=25      # harder races
pnpm qa:payments --check-only    # invariants only, over the whole tenant (no writes)

# app, on a device/emulator wired to that backend
maestro test .maestro/app/payments-race-ui.yaml -e APP_ID=com.udaychittala.satyacablenetwork.development \
  -e DEV_SERVER=http://10.0.2.2:8081 -e DEV_SCHEME=satyaCable.development
```

`payments-race-ui` uses `utils/payments-qa.js` as a second device (straight
to `API_URL`, default `http://localhost:5050`): it collects and refunds while
the phone has the customer open, and the flow asserts the screens end on the
server's numbers — after a refresh, after a stale recharge screen pays, and
after a triple-tapped Record (one receipt). Both scripts create fresh
`QA …` customers every run; receipts are append-only, so use a dev tenant.

## Notes

- Flows are self-contained: each starts with `clearState` + login, so they can
  run individually and in any order.
- `packages-crud` deletes the packages it creates; `plans-on-customers` retires its plan (a plan with a live line cannot be deleted).
  `add-customer-flow` and `plans-on-customers` leave a test **customer**
  behind — there is no delete-customer UI yet. Run them against a dev tenant.
