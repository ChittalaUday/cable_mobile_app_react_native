# Headful (device) E2E flows

Maestro drives the real app on a simulator/emulator. Unlike the Jest suite these
flows hit **live Firebase Auth and Firestore**, so they need a seeded dev project.

## Prerequisites

```bash
pnpm install-maestro                 # once
pnpm seed:users                      # admin/staff/customer logins
node scripts/seed-permissions.js     # permissionRegistry (incl. packages.*)
node scripts/seed-roles.js           # role -> permission+scope grants
node scripts/seed-app-registry.js    # global search entries (incl. packages)
pnpm ios   # or: pnpm android — a dev build must be installed and running
```

Seeded accounts (password from `SEED_PASSWORD`, default `Passw0rd!`):

| Account                 | Role     | Lands on          |
| ----------------------- | -------- | ----------------- |
| `admin@satyacable.dev`  | admin    | Operator panel    |
| `staff@satyacable.dev`  | staff    | Staff collections |
| `user@satyacable.dev`   | customer | My subscriptions  |

## Running

```bash
pnpm e2e-test                                  # whole suite, in config order
maestro test .maestro/app/packages-crud.yaml -e APP_ID=<bundle id>   # one flow
maestro test .maestro/ --include-tags=packages -e APP_ID=<bundle id> # by tag
```

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
