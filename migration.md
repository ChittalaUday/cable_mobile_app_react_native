# Cable Mobile React Native migration

This directory is the Expo/React Native successor to the Flutter app.

## Run

```sh
pnpm install
pnpm type-check
pnpm lint
pnpm test
npx expo run:android --device
```

Copy `.env.example` to `.env` for a new environment and set `EXPO_PUBLIC_API_URL` to the backend `/api/v1` base URL.

## Migrated

- Backend email/password sign-in with rotating access and refresh tokens
- Backend membership-backed `admin`, `staff`, and `customer` role routing
- Consolidated Customer & Connection management (1 Customer : N STB/Fiber lines)
- Role-specific dashboard shells and navigation
- Existing orange/charcoal visual system, dark mode, and 200–300 ms transitions
- Firebase Analytics, Crashlytics, Performance, and App Check for mobile monitoring only

## Remaining native integrations

- Bluetooth receipt printing
- Barcode scanning
- Customer, package, tenant, access, registry, and device API routes
