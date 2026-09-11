import type { ConfigContext, ExpoConfig } from '@expo/config';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import 'tsx/cjs';

// adding lint exception as we need to import tsx/cjs before env.ts is imported
// eslint-disable-next-line perfectionist/sort-imports
import Env from './env';

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.EXPO_PUBLIC_APP_ENV !== 'production',
  badges: [
    {
      text: Env.EXPO_PUBLIC_APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.EXPO_PUBLIC_VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'cable-mobile-app',
  owner: 'uday-niruthi',
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  orientation: 'portrait',
  icon: './assets/icon.png',
  // TODO: dark theme temporarily disabled app-wide - revert to 'automatic' to re-enable.
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.EXPO_PUBLIC_BUNDLE_ID,
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#13161C',
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/aa767d4e-857d-46e0-abff-66eaddeff07f',
    fallbackToCacheTimeout: 0,
  },
  extra: {
    eas: {
      projectId: 'aa767d4e-857d-46e0-abff-66eaddeff07f',
    },
  },
  plugins: [
    ['@react-native-firebase/app', { ios: { disableSPM: true } }],
    '@react-native-firebase/crashlytics',
    './plugins/with-firebase-modular-headers',
    '@react-native-firebase/messaging',
    '@react-native-firebase/app-check',
    '@react-native-firebase/perf',
    '@react-native-google-signin/google-signin',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#13161C',
        image: './assets/splash-icon.png',
        imageWidth: 150,
      },
    ],
    [
      'expo-font',
      {
        ios: {
          fonts: [
            'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: 'Inter',
              fontDefinitions: [
                { path: 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf', weight: 400 },
                { path: 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf', weight: 500 },
                { path: 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf', weight: 600 },
                { path: 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf', weight: 700 },
              ],
            },
          ],
        },
      },
    ],
    'expo-localization',
    ['expo-notifications', { defaultChannel: 'default' }],
    './plugins/with-fcm-channel-tools-replace',
    'expo-router',
    ['app-icon-badge', appIconBadgeConfig],
    ['react-native-edge-to-edge'],
  ],
});
