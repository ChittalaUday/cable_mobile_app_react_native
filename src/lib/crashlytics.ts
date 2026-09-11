import {
  crash as firebaseCrash,
  log as firebaseLog,
  recordError as firebaseRecordError,
  setAttribute as firebaseSetAttribute,
  setUserId as firebaseSetUserId,
  getCrashlytics,
} from '@react-native-firebase/crashlytics';

/**
 * Record a non-fatal JS error to Firebase Crashlytics.
 */
export function recordError(error: Error | unknown, jsReason?: string): void {
  try {
    const crashlytics = getCrashlytics();
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    firebaseRecordError(crashlytics, errorInstance, jsReason);
  }
  catch (err) {
    if (__DEV__) {
      console.warn('[Crashlytics] Failed to record error:', err);
    }
  }
}

/**
 * Log a message to Firebase Crashlytics timeline.
 */
export function logMessage(message: string): void {
  try {
    const crashlytics = getCrashlytics();
    firebaseLog(crashlytics, message);
  }
  catch (err) {
    if (__DEV__) {
      console.warn('[Crashlytics] Failed to log message:', err);
    }
  }
}

/**
 * Set user identifier for Crashlytics reports.
 */
export async function setCrashlyticsUserId(userId: string | null): Promise<void> {
  try {
    if (userId) {
      const crashlytics = getCrashlytics();
      await firebaseSetUserId(crashlytics, userId);
    }
  }
  catch (err) {
    if (__DEV__) {
      console.warn('[Crashlytics] Failed to set user ID:', err);
    }
  }
}

/**
 * Set a custom key-value pair for Crashlytics reports.
 */
export async function setCustomKey(
  key: string,
  value: string | number | boolean,
): Promise<void> {
  try {
    const crashlytics = getCrashlytics();
    await firebaseSetAttribute(crashlytics, key, String(value));
  }
  catch (err) {
    if (__DEV__) {
      console.warn(`[Crashlytics] Failed to set attribute "${key}":`, err);
    }
  }
}

/**
 * Force a crash for testing Firebase Crashlytics integration.
 */
export function testCrash(): void {
  if (__DEV__) {
    console.log('[Crashlytics] Testing crash...');
    const crashlytics = getCrashlytics();
    firebaseCrash(crashlytics);
  }
}
