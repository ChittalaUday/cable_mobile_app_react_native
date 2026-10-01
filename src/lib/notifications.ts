import type { RemoteMessage } from '@react-native-firebase/messaging';
import type { NotificationCategory } from '@/lib/constants/notify';
import notifee, { AndroidImportance, AuthorizationStatus as NotifeeAuthorizationStatus } from '@notifee/react-native';
import {
  getAPNSToken,
  getInitialNotification,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onTokenRefresh as onFcmTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  registerDeviceForRemoteMessages,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { client } from '@/lib/api/client';
import { handleRealtimeSync } from '@/lib/api/query-client';

export type { NotificationCategory } from '@/lib/constants/notify';

/**
 * Android drops a notification whose channel does not exist, so every category
 * the server can send has to be registered here before the first push lands.
 * These are also what the user sees in the OS notification settings, which is
 * the point of splitting them: somebody can mute offers without muting outages.
 */
const CHANNELS: { id: NotificationCategory; name: string; importance: AndroidImportance }[] = [
  { id: 'general', name: 'General', importance: AndroidImportance.DEFAULT },
  { id: 'alert', name: 'Service alerts', importance: AndroidImportance.HIGH },
  { id: 'promotional', name: 'Offers', importance: AndroidImportance.LOW },
  { id: 'billing', name: 'Payments and bills', importance: AndroidImportance.DEFAULT },
  { id: 'service', name: 'Your connection', importance: AndroidImportance.DEFAULT },
  { id: 'staff', name: 'Team messages', importance: AndroidImportance.DEFAULT },
];

/**
 * Whether a message shows a banner while the app is open.
 *
 * `delivery` decides this, not `category` — the server already made that choice
 * and sends it along. Gating on category here is what made a `both` message
 * land silently: the row appeared in the inbox and nothing was ever shown.
 */
const IN_APP_DELIVERIES = new Set<string>(['both', 'in_app']);

export function showsInApp(delivery: string | undefined): boolean {
  return delivery !== undefined && IN_APP_DELIVERIES.has(delivery);
}

/**
 * Registered at module scope, before React mounts — the native side looks for
 * this the moment a message arrives with the app in the background, and logs
 * "No task registered for key ReactNativeFirebaseMessagingHeadlessTask" when
 * it is missing.
 *
 * It deliberately does almost nothing. Every message we send carries a
 * `notification` payload, so the OS draws the tray notification itself;
 * displaying one here as well is what would produce a duplicate.
 */
export function registerBackgroundHandler(): void {
  setBackgroundMessageHandler(getMessaging(), async (message) => {
    handleRealtimeSync(message.data);
  });
}

export async function registerNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android')
    return;

  await Promise.all(CHANNELS.map(async channel => notifee.createChannel(channel)));
}

/**
 * Hands the current push token to the API.
 *
 * Deliberately called whether or not anybody is signed in: the endpoint is
 * public and keyed on the device headers the API client already sends, so a
 * signed-out phone stays reachable for promotional messages. Failing is not
 * worth surfacing — the next launch or token refresh tries again.
 */
export async function syncPushToken(): Promise<void> {
  const granted = await requestNotificationPermission().catch(() => false);
  const token = granted ? await pushToken() : null;

  pushIsUsable = token !== null;

  try {
    // Registered whether or not there is a token. The device belongs on file
    // either way, and sending null is how a revoked permission is recorded.
    await client.post('/notifications/token', { token });
  }
  catch (error) {
    if (__DEV__)
      console.warn('[notifications] could not register this device:', error);
  }

  if (__DEV__ && !pushIsUsable) {
    console.warn(
      granted
        ? '[notifications] no push token — iOS never returned an APNs token. Check that Push Notifications is enabled on the bundle id and that an APNs key is uploaded to Firebase. In-app messages work regardless.'
        : '[notifications] notification permission refused — FCM will accept pushes and the OS will drop them',
    );
  }
}

/**
 * True once this install has a usable FCM token.
 *
 * iOS cannot mint one without an APNs token, which the Simulator never
 * provides, so this is false there for the whole session. Anything that would
 * otherwise only ever arrive by push has to be pulled instead.
 */
let pushIsUsable = false;

export function isPushUsable(): boolean {
  return pushIsUsable;
}

async function pushToken(): Promise<string | null> {
  const messaging = getMessaging();

  try {
    if (Platform.OS === 'ios' && !(await apnsReady(messaging)))
      return null;

    return await getToken(messaging);
  }
  catch (error) {
    if (__DEV__)
      console.warn('[notifications] could not get a push token:', error);

    return null;
  }
}

/**
 * Waits for iOS to hand back an APNs token.
 *
 * Firebase refuses to vend an FCM token until one exists, and registration is
 * asynchronous — it is still in flight when the app finishes mounting. Calling
 * `getToken` straight away therefore fails on the first launch of a real
 * device, not just in the Simulator, and the failure looks identical to having
 * no push at all.
 */
async function apnsReady(messaging: ReturnType<typeof getMessaging>): Promise<boolean> {
  if (!isDeviceRegisteredForRemoteMessages(messaging))
    await registerDeviceForRemoteMessages(messaging);

  const deadline = Date.now() + APNS_WAIT_MS;

  while (Date.now() < deadline) {
    if (await getAPNSToken(messaging) !== null)
      return true;

    await new Promise(resolve => setTimeout(resolve, APNS_POLL_MS));
  }

  return false;
}

const APNS_WAIT_MS = 10_000;
const APNS_POLL_MS = 500;

/**
 * Notifee asks, not Firebase Messaging.
 *
 * `requestPermission` from @react-native-firebase/messaging is deprecated, and
 * on Android it returned AUTHORIZED without ever raising the Android 13
 * POST_NOTIFICATIONS dialog — a token registered happily and every
 * notification was then dropped by the OS with no error anywhere. Notifee asks
 * for real, on both platforms, and iOS APNs registration is handled by
 * Firebase's app delegate proxy without a second prompt.
 */
async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();

  return settings.authorizationStatus !== NotifeeAuthorizationStatus.DENIED;
}

export function onPushTokenRefresh(handler: () => void): () => void {
  return onFcmTokenRefresh(getMessaging(), handler);
}

export function onForegroundMessage(handler: (message: RemoteMessage) => void): () => void {
  // NEVER call notifee.displayNotification() from in here. The OS already
  // stays silent for a foregrounded app and shows the tray notification for a
  // backgrounded one — the two are mutually exclusive, and displaying one
  // ourselves is the only way to get both at once.
  return onMessage(getMessaging(), handler);
}

function routeOf(message: RemoteMessage | null): string | null {
  const route = message?.data?.route;
  return typeof route === 'string' && route !== '' ? route : null;
}

export function onNotificationOpened(handler: (route: string) => void): () => void {
  const messaging = getMessaging();

  // A tap that cold-started the app is waiting here rather than on the listener.
  getInitialNotification(messaging).then((message) => {
    const route = routeOf(message);
    if (route !== null)
      handler(route);
  }).catch(() => {});

  return onNotificationOpenedApp(messaging, (message) => {
    const route = routeOf(message);
    if (route !== null)
      handler(route);
  });
}

/**
 * Signing out leaves whatever was already in the tray on screen, and some of it
 * names an account. Clear it. The token itself stays registered: this phone is
 * still allowed to receive offers.
 */
export async function clearDeliveredNotifications(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
    await notifee.setBadgeCount(0);
  }
  catch {
    // Nothing displayed, or the platform does not do badges.
  }
}
