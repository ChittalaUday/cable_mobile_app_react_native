import {
  logEvent as firebaseLogEvent,
  logScreenView as firebaseLogScreenView,
  setAnalyticsCollectionEnabled as firebaseSetAnalyticsCollectionEnabled,
  setUserId as firebaseSetUserId,
  setUserProperty as firebaseSetUserProperty,
  getAnalytics,
} from '@react-native-firebase/analytics';

/**
 * Log a custom event to Firebase Analytics.
 */
export async function logEvent(name: string, params?: Record<string, any>): Promise<void> {
  try {
    const analytics = getAnalytics();
    await firebaseLogEvent(analytics, name as any, params);
  }
  catch (error) {
    if (__DEV__) {
      console.warn(`[Analytics] Failed to log event "${name}":`, error);
    }
  }
}

/**
 * Log a screen view event to Firebase Analytics.
 */
export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
  try {
    const analytics = getAnalytics();
    await firebaseLogScreenView(analytics, {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }
  catch (error) {
    if (__DEV__) {
      console.warn(`[Analytics] Failed to log screen view "${screenName}":`, error);
    }
  }
}

/**
 * Set the current user ID for Firebase Analytics session.
 */
export async function setUserId(userId: string | null): Promise<void> {
  try {
    const analytics = getAnalytics();
    await firebaseSetUserId(analytics, userId);
  }
  catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to set user ID:', error);
    }
  }
}

/**
 * Set custom user property for Firebase Analytics.
 */
export async function setUserProperty(name: string, value: string | null): Promise<void> {
  try {
    const analytics = getAnalytics();
    await firebaseSetUserProperty(analytics, name, value);
  }
  catch (error) {
    if (__DEV__) {
      console.warn(`[Analytics] Failed to set user property "${name}":`, error);
    }
  }
}

/**
 * Enable or disable analytics collection.
 */
export async function setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
  try {
    const analytics = getAnalytics();
    await firebaseSetAnalyticsCollectionEnabled(analytics, enabled);
  }
  catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to toggle collection status:', error);
    }
  }
}
