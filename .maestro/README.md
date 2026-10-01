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
| `app/packages-on-customers`     | A plan becomes a customer's service on their card             |
| `app/customer-dashboard`        | Subscriber view, no operator surface                          |
| `app/staff-dashboard`           | Field-staff collections view                                  |
| `app/profile-and-signout`       | Profile screen, sign out, session really cleared              |

## Notes

- Flows are self-contained: each starts with `clearState` + login, so they can
  run individually and in any order.
- `packages-crud` and `packages-on-customers` delete the plans they create.
  `add-customer-flow` and `packages-on-customers` leave a test **customer**
  behind — there is no delete-customer UI yet. Run them against a dev tenant.
