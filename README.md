# Satya Cable & Broadband Mobile App

![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-blue?style=flat-square&logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=flat-square&logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)

**Satya Cable & Broadband** is a production-grade, multi-role mobile application built with Expo and React Native to manage cable network and broadband operations, subscriptions, collections, and customer support.

---

## 📱 Role-Based System Overview

The application features role-based access control (RBAC) backed by Firebase Auth and Firestore:

- 👑 **Admin**: Full administrative control over network infrastructure, subscriber management, staff assignments, package pricing, financial collections, and reporting.
- 🛠 **Staff / Field Executives**: Field management tools for recording subscriber bill collections, attending service complaints, looking up customer details, and updating connection status.
- 👤 **Subscriber (User)**: Self-service portal for viewing active cable & broadband plans, bill payment history, raising service tickets, and profile updates.

---

## 🛠 Technology Stack

- **Framework**: [Expo SDK 54](https://docs.expo.dev/) with [React Native 0.81.5](https://reactnative.dev/)
- **Routing**: [Expo Router 6](https://docs.expo.dev/router/introduction/) (file-based navigation)
- **Backend & Auth**: [Firebase Auth](https://firebase.google.com/docs/auth) & [Firestore Database](https://firebase.google.com/docs/firestore)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (app state) & [React Query](https://tanstack.com/query/latest) (server state)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) via Uniwind / NativeWind
- **Forms & Validation**: [TanStack Form](https://tanstack.com/form/latest) + [Zod](https://zod.dev/)
- **Secure Storage**: [React Native MMKV](https://github.com/mrousavy/react-native-mmkv)
- **Localization**: [i18next](https://www.i18next.com/) with multi-language support (English `en.json`, Telugu `te.json`)
- **Testing**: [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/) (Unit), [Maestro](https://maestro.mobile.dev/) (E2E)

---

## 📂 Project Structure

```
.
├── src/
│   ├── app/              # Expo Router file-based screens and tabs
│   ├── components/ui/    # Reusable UI component library (buttons, inputs, modals, etc.)
│   ├── features/         # Modular feature domain logic
│   │   ├── auth/         # Login, Auth store, Role routing, Firebase Auth integration
│   │   ├── dashboard/    # Role-specific dashboard layouts (Admin/Staff/Subscriber)
│   │   ├── onboarding/   # App onboarding flow
│   │   └── settings/     # App configuration, theme, language selection
│   ├── lib/              # Utility singletons (Firebase, MMKV Storage, API client, i18n)
│   └── translations/     # Localization JSON resources (en.json, te.json)
├── .maestro/             # Maestro E2E test scripts
├── app.config.ts         # Dynamic Expo app configuration
├── env.ts                # Environment variable schema & validation
└── package.json          # Dependency manifest & npm scripts
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) LTS (v20+)
- [pnpm](https://pnpm.io/) package manager (`npm install -g pnpm`)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (macOS / Xcode) or Android Emulator (Android Studio)

### Installation

```bash
# Clone the repository
git clone https://github.com/ChittalaUday/cable_mobile_app_react_native.git

# Navigate to the project directory
cd cable_mobile_app_react_native

# Install dependencies
pnpm install
```

### Running the App

```bash
# Start Metro bundler (Development)
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator / device
pnpm android
```

---

## ⚙️ Environment Configuration

Environment configuration is managed via `env.ts` with strict Zod validation:

- **Development**: Bundle ID `com.udaychittala.satyacablenetwork.development`
- **Preview / Staging**: Bundle ID `com.udaychittala.satyacablenetwork.preview`
- **Production**: Bundle ID `com.udaychittala.satyacablenetwork`

Copy `.env.example` to `.env` to configure local variables:

```bash
cp .env.example .env
```

To run under specific environment configurations:

```bash
pnpm start:preview      # Preview environment
pnpm start:production   # Production environment
```

---

## 🧪 Testing & Code Quality

Run the complete quality check suite:

```bash
pnpm run check-all
```

Individual validation scripts:

```bash
pnpm run lint               # ESLint static code analysis
pnpm run lint:fix           # Automatically fix linting issues
pnpm run lint:translations  # Verify and sort translation JSON keys (--fix)
pnpm run type-check         # TypeScript strict type verification
pnpm run test               # Run Jest unit test suite (includes multi-language tests)
pnpm run test:watch         # Run unit tests in watch mode
```

### 🌐 Translation Guidelines:
- **Always update all supported languages** (`en.json`, `te.json`) whenever UI text, taglines, or error messages change.
- **Ensure translation keys are sorted**: Run `pnpm run lint:translations` (which executes `eslint ./src/translations/ --fix --ext .json`).
- **Test all languages**: Write Jest unit tests that test language switching (`i18n.changeLanguage(...)`) to ensure all key translations are verified in all supported languages.

---

## 📦 Building & Deployment

Build native binaries using Expo Application Services (EAS):

```bash
# Build Android APK / App Bundle
pnpm build:development:android
pnpm build:preview:android
pnpm build:production:android

# Build iOS Application
pnpm build:development:ios
pnpm build:preview:ios
pnpm build:production:ios
```

---

## 🔗 Repository & Maintenance

- **GitHub Repository**: [https://github.com/ChittalaUday/cable_mobile_app_react_native](https://github.com/ChittalaUday/cable_mobile_app_react_native)
- **Maintainer**: Chittala Uday Kumar ([@ChittalaUday](https://github.com/ChittalaUday))

## 🔖 License

This project is licensed under the [MIT License](LICENSE).
