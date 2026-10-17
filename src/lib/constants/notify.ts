/** Mirrors `src/constants/notify.ts` in cable-backend. */

/** How a notification reached the device. */
export const NOTIFICATION_CHANNELS = ['in_app', 'push', 'whatsapp', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['queued', 'sent', 'failed'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * What kind of thing a notification is. One Android notification channel each,
 * so somebody can mute offers without muting an outage.
 */
export const NOTIFICATION_CATEGORIES = [
  'general',
  'alert',
  'promotional',
  'billing',
  'service',
  'staff',
  'activation',
  'renewal',
  'refresh',
  'sync',
  'activity',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Raised by the server for admins, so never offered when somebody writes a message. */
export const AUTOMATED_CATEGORIES: readonly NotificationCategory[] = ['activation', 'renewal', 'refresh', 'sync', 'activity'];
export const SENDABLE_CATEGORIES = NOTIFICATION_CATEGORIES.filter(value => !AUTOMATED_CATEGORIES.includes(value));

/**
 * How a notification is allowed to reach somebody.
 *
 * `notification` is tray-only, `in_app` never leaves the app and waits until it
 * is next opened, `both` shows in-app when the app is open and in the tray when
 * it is not — never both at once.
 */
export const NOTIFICATION_DELIVERIES = ['notification', 'both', 'in_app'] as const;
export type NotificationDelivery = (typeof NOTIFICATION_DELIVERIES)[number];
