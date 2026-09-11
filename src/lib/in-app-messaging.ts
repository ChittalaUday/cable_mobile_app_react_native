import { getApp } from '@react-native-firebase/app';
import { getInAppMessaging, setMessagesDisplaySuppressed, triggerEvent } from '@react-native-firebase/in-app-messaging';

const inAppMessaging = getInAppMessaging(getApp());

/**
 * Firebase In-App Messaging campaigns are configured in the Firebase console and render
 * automatically based on Analytics events. Suppress them while a blocking flow (e.g. checkout,
 * onboarding) is on screen, then re-enable once it's safe to show a campaign again.
 */
export function setInAppMessagesSuppressed(suppressed: boolean) {
  return setMessagesDisplaySuppressed(inAppMessaging, suppressed);
}

export function triggerInAppMessageEvent(eventId: string) {
  return triggerEvent(inAppMessaging, eventId);
}
