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
      NSCameraUsageDescription: 'Allow $(PRODUCT_NAME) to access your camera to scan barcodes.',
      // Lets a push wake the app long enough to update the badge and inbox.
      UIBackgroundModes: ['remote-notification'],
    },
    entitlements: {
      // Sandbox APNs for anything but a store build. A debug build carrying
      // `production` registers against the wrong APNs environment and every
      // push is dropped with no error on either side.
      'aps-environment': Env.EXPO_PUBLIC_APP_ENV === 'production' ? 'production' : 'development',
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
    permissions: [
      // Android 13+ will not show a notification without the user granting this.
      'android.permission.POST_NOTIFICATIONS',
      // Reaching the paired receipt printer. Declared in the bt-printer module's
      // manifest too; repeated here so the merged manifest is obvious from the
      // config, and so `expo prebuild` keeps them across a clean.
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
    ],
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
    [
      'expo-location',
      {
        // Shown in the OS permission dialog, so it says what the location is
        // for rather than what the app would like. Foreground only: a receipt
        // records where the collector stood at the moment they wrote it, and
        // nothing here needs to follow anybody around between visits.
        locationAlwaysAndWhenInUsePermission: false,
        locationWhenInUsePermission: 'Satya Cable records where a payment was collected, so a receipt can be matched to the address it was written at.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
    ['@react-native-firebase/app', { ios: { disableSPM: true } }],
    // Reads the reversed client id out of GoogleService-Info.plist and registers
    // the URL scheme iOS needs to come back from the Google sheet.
    '@react-native-google-signin/google-signin',
    '@react-native-firebase/crashlytics',
    './plugins/with-firebase-modular-headers',
    './plugins/with-notifee-maven',
    './plugins/with-notification-icon',
    '@react-native-firebase/app-check',
    '@react-native-firebase/perf',
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
    'expo-router',
    ['app-icon-badge', appIconBadgeConfig],
    ['react-native-edge-to-edge'],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera to scan barcodes.',
      },
    ],
  ],
});
