> Satya Cable & Broadband mobile application.

## What: Technology Stack

- **Expo SDK 54** with React Native 0.81.5 - Managed React Native development
- **TypeScript** - Strict type safety throughout
- **Expo Router 6** - File-based routing (like Next.js)
- **TailwindCSS** via Uniwind/Nativewind - Utility-first styling for React Native
- **Zustand** - Lightweight global state management
- **React Query** - Server state and data fetching
- **TanStack Form + Zod** - Type-safe form handling and validation
- **MMKV** - Encrypted local storage
- **Jest + React Testing Library** - Unit testing

## What: Project Structure

```
src/
├── app/              # Expo Router routes (admin/(tabs, customers, services, packages, locations), staff/, customer/, (auth)/)
├── components/       # UI primitives (ui/), common/ and domain widgets (admin, auth, customer, etc.)
├── lib/              # Pre-configured utilities (api, auth, i18n, storage, hooks, stores)
├── translations/     # i18n files (en.json, te.json)
└── global.css        # TailwindCSS configuration

Root Files:
├── env.ts           # Environment config (CUSTOMIZE bundle IDs, API URLs)
├── app.config.ts    # Expo configuration
└── README.md        # Project-specific documentation
```

## How: Development Workflow

**Essential Commands:**
```bash
pnpm start              # Start dev server
pnpm ios/android        # Run on platform
pnpm lint               # ESLint check
pnpm type-check         # TypeScript validation
pnpm test               # Run Jest tests
pnpm check-all          # All quality checks
```

**Environment-Specific:**
```bash
pnpm start:preview              # Preview environment
pnpm ios:production             # Production iOS
pnpm build:production:ios       # EAS production build
```

## How: Key Patterns

- **Create routes/screens**: Create route files in `src/app/` (Expo Router file-based routing)
- **Domain components**: Add subcomponents to `src/components/[feature]/`
- **Forms**: Use TanStack Form + Zod or controlled components
- **Data fetching**: Use React Query
- **Global state**: Use Zustand in `src/lib/hooks/stores/` (e.g. `src/lib/hooks/stores/use-add-customer-store.ts`)
- **Styling**: NativeWind/Tailwind classes (see `src/components/ui/button.tsx`)
- **Storage**: Use MMKV via `src/lib/storage.tsx` for sensitive data
- **Imports**: Always use `@/` prefix, never relative imports

## How: Essential Rules

- ✅ **DO** use absolute imports: `@/components/ui/button`
- ✅ **DO** follow Expo Router route structure in `src/app/` and domain components in `src/components/[feature]/`
- ✅ **DO** use TanStack Form for forms (not react-hook-form)
- ✅ **DO** use MMKV storage for sensitive data (not AsyncStorage)
- ✅ **DO** use EAS Build for production: `pnpm build:production:ios`
- ✅ **DO** prefix env vars with `EXPO_PUBLIC_*` for app access
- ✅ **DO** verify and update translation keys across all supported languages (e.g., English, Telugu) whenever UI text or error messages change
- ✅ **DO** ensure translation JSON keys are sorted and formatted by running `pnpm run lint:translations`
- ✅ **DO** write Jest unit tests to verify language switching and localized text across all supported languages
- ❌ **DO NOT** use inline `elevation`, `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, or shadow utility classes unless explicitly specified by the user (use clean flat borders like `border border-border` instead)
- ❌ **DO NOT** modify `android/` or `ios/` directly (use Expo config plugins)
