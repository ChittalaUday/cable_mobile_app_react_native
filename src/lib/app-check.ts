import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

/**
 * Play Integrity / App Attest don't work on simulators, emulators or unregistered dev devices, so
 * debug builds fall back to the debug provider. The native SDK logs a debug token to the console
 * on first run in __DEV__ — register that token in Firebase console > App Check > Manage debug
 * tokens for the app to pass verification during development.
 */
export function initFirebaseAppCheck() {
  const provider = new ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
    apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
  });

  return initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}
