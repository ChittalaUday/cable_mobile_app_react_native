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

Copy `.env.example` to `.env` for a new environment. The local `.env` already points at the same Firebase project as the Flutter app and is intentionally ignored by Git.

## Migrated

- Firebase email/password registration and sign-in
- Anonymous guest access
- Firestore-backed `admin`, `staff`, and `subscriber` role routing
- Role-specific dashboard shells and navigation
- Existing orange/charcoal visual system, dark mode, and 200–300 ms transitions
- Firebase Analytics and Crashlytics (configured in `app.config.ts`, `src/lib/analytics.ts`, `src/lib/crashlytics.ts`)

## Remaining native integrations

- Google sign-in
- Bluetooth receipt printing
- Barcode scanning
- App Check, Remote Config, and Cloudflare R2 uploads
