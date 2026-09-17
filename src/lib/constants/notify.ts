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
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * How a notification is allowed to reach somebody.
 *
 * `notification` is tray-only, `in_app` never leaves the app and waits until it
 * is next opened, `both` shows in-app when the app is open and in the tray when
 * it is not — never both at once.
 */
export const NOTIFICATION_DELIVERIES = ['notification', 'both', 'in_app'] as const;
export type NotificationDelivery = (typeof NOTIFICATION_DELIVERIES)[number];
