import { getApp } from '@react-native-firebase/app';
import { getMessaging, onMessage, onNotificationOpenedApp, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

const messaging = getMessaging(getApp());

// Must run at module scope so it is registered before the JS bundle's UI mounts.
setBackgroundMessageHandler(messaging, async (message) => {
  if (__DEV__)
    console.log('[Messaging] Background message:', message.messageId);
});

export function subscribeToForegroundMessages(onReceive: (title?: string, body?: string) => void) {
  return onMessage(messaging, (message) => {
    onReceive(message.notification?.title, message.notification?.body);
  });
}

export function subscribeToNotificationOpened(onOpen: (data: Record<string, string | object> | undefined) => void) {
  return onNotificationOpenedApp(messaging, (message) => {
    onOpen(message.data);
  });
}
