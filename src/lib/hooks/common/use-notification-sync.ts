import { router } from 'expo-router';
import * as React from 'react';
import { AppState } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Image } from '@/components/ui';
import { queryClient } from '@/lib/api';
import { handleRealtimeSync } from '@/lib/api/query-client';
import { useMarkRead, usePendingInApp } from '@/lib/hooks/api/use-notifications';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import {
  clearDeliveredNotifications,
  isPushUsable,
  onForegroundMessage,
  onNotificationOpened,
  onPushTokenRefresh,
  registerNotificationChannels,
  showsInApp,
  syncPushToken,
} from '@/lib/notifications';

function refreshInbox() {
  queryClient.invalidateQueries({ queryKey: ['notifications'] }).catch(() => {});
}

/**
 * The one place an in-app message is presented, so a foreground push and a
 * pulled in-app message look the same and neither can quietly lose its image.
 */
function present({ title, body, category, imageUrl }: {
  title: string | null | undefined;
  body: string | null | undefined;
  category: string | undefined;
  imageUrl?: string | null;
}) {
  showMessage({
    message: title ?? 'Satya Cable',
    ...(body != null ? { description: body } : {}),
    type: category === 'alert' ? 'warning' : 'info',
    duration: imageUrl != null && imageUrl !== '' ? 6000 : 4000,
    ...(imageUrl != null && imageUrl !== ''
      ? { renderAfterContent: () => React.createElement(BannerImage, { uri: imageUrl }) }
      : {}),
  });
}

function BannerImage({ uri }: { uri: string }) {
  return React.createElement(Image, {
    source: uri,
    contentFit: 'cover',
    transition: 150,
    style: { height: 120, width: '100%', borderRadius: 12, marginTop: 8 },
  });
}

/**
 * Wires push and in-app messaging into the app. Mounted once, at the root.
 *
 * Registration runs whether or not anybody is signed in — the device has to be
 * on file before the first launch is over, and it stays on file through a sign
 * out so the phone can still be sent an offer.
 */
export function useNotificationSync(): void {
  const status = useAuthStore.use.status();
  const tenantId = useAuthStore.use.tenantId();
  const signedIn = status === 'signIn' && tenantId !== null;

  // Boot: channels first — Android drops a push whose channel does not exist.
  React.useEffect(() => {
    registerNotificationChannels()
      .then(syncPushToken)
      .catch(() => {});

    return onPushTokenRefresh(() => {
      syncPushToken().catch(() => {});
    });
  }, []);

  // Re-register once a session exists, so the device is filed against a tenant.
  React.useEffect(() => {
    if (signedIn)
      syncPushToken().catch(() => {});
  }, [signedIn]);

  // Signing out leaves account details sitting in the tray. Take them down.
  React.useEffect(() => {
    if (status === 'signOut')
      clearDeliveredNotifications().catch(() => {});
  }, [status]);

  React.useEffect(() => {
    return onForegroundMessage((message) => {
      // A sync nudge is not news. It has no title or body, so presenting it
      // would draw an empty banner over whatever the person is doing.
      if (handleRealtimeSync(message.data))
        return;

      const category = message.data?.category;
      const delivery = message.data?.delivery;

      // The OS shows nothing while the app is in front, so anything whose
      // delivery includes an in-app banner is shown here instead. A
      // notification-only message lands silently in the inbox — and nothing is
      // ever displayed twice, because a backgrounded app never reaches this
      // handler at all.
      if (showsInApp(typeof delivery === 'string' ? delivery : undefined)) {
        const imageUrl = message.data?.imageUrl;

        present({
          title: message.notification?.title,
          body: message.notification?.body,
          category: typeof category === 'string' ? category : undefined,
          imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
        });
      }

      refreshInbox();
    });
  }, []);

  React.useEffect(() => {
    return onNotificationOpened((route) => {
      router.push(route as never);
    });
  }, []);

  usePendingInAppMessages(signedIn);
}

/**
 * In-app-only messages are never pushed, so nothing tells the app they exist.
 * It asks — on sign-in and whenever the app comes back to the foreground.
 */
function usePendingInAppMessages(signedIn: boolean): void {
  // Without a usable push token a `both` message has no other way in — the
  // push never arrives, so pulling only `in_app` would leave it invisible.
  // Where push does work, `both` is shown by the foreground handler and must
  // not be pulled as well, or it shows twice.
  const deliveries = isPushUsable() ? 'in_app' : 'in_app,both';
  const pending = usePendingInApp({ variables: { deliveries }, enabled: signedIn });
  const markRead = useMarkRead();
  const shown = React.useRef<string | null>(null);

  const refetchPending = pending.refetch;

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active')
        return;

      if (signedIn)
        refetchPending().catch(() => {});

      // iOS hands back its APNs token whenever it is ready, which can be after
      // the wait at startup has already given up. Coming back to the app is a
      // free moment to ask again, so a token that arrived late still lands
      // without needing a relaunch.
      if (!isPushUsable())
        syncPushToken().catch(() => {});
    });

    return () => subscription.remove();
  }, [refetchPending, signedIn]);

  const next = pending.data?.items[0];
  const markReadAsync = markRead.mutateAsync;

  React.useEffect(() => {
    if (!next || shown.current === next.id)
      return;

    shown.current = next.id;
    present({ title: next.title, body: next.body, category: next.category, imageUrl: next.imageUrl });

    // Read is what stops it being presented again on the next launch.
    markReadAsync({ id: next.id }).catch(() => {
      shown.current = null;
    });
  }, [next, markReadAsync]);
}
