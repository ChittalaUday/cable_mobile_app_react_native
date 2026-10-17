import { useQueryClient } from '@tanstack/react-query';
import Env from 'env';
import * as React from 'react';
import { AppState } from 'react-native';
import { devHostUrl } from '@/lib/api/client';
import { getTenantId, getToken } from '@/lib/auth/utils';
import { liveSocketHeaders, openLiveSocket, realtimeSocketUrl, upgradeFailureStatus } from '@/lib/automations/live-protocol';
import { MAX_RECONNECTS, reconnectDelay } from '@/lib/hooks/common/use-job-live-stream';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

/**
 * Keeps what the user is looking at current. The server says `data-updated` whenever a sync finishes for the
 * tenant; every query the open screens use is then fetched again, and the rest go stale until their screen
 * opens. A reconnect also refetches, since an update may have come while the socket was away. Paused in the
 * background (coming back refetches through the focus manager too) and stops for good if the server refuses us.
 */
export function useRealtimeRefresh(): void {
  const queryClient = useQueryClient();
  const signedIn = useAuthStore.use.status() === 'signIn';
  const tenantId = useAuthStore.use.tenantId();
  const [appActive, setAppActive] = React.useState(AppState.currentState !== 'background');

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setAppActive(state !== 'background'));
    return () => subscription.remove();
  }, []);

  const active = signedIn && tenantId !== null && appActive;

  React.useEffect(() => {
    if (!active)
      return;

    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let stopped = false;
    let seenReady = false;
    const refetchAll = () => {
      queryClient.invalidateQueries().catch(() => {});
    };
    const detach = () => {
      if (socket === null)
        return;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      socket = null;
    };

    function connect() {
      timer = null;
      // Read at every attempt: a refreshed token applies to the next socket.
      const token = getToken()?.access;
      const tenant = getTenantId();
      if (!token || !tenant)
        return;
      let fatal = false;
      const next = openLiveSocket(realtimeSocketUrl(devHostUrl(Env.EXPO_PUBLIC_API_URL)), liveSocketHeaders(token, tenant));
      socket = next;
      next.onmessage = (event) => {
        let type: unknown;
        try {
          type = (JSON.parse(String(event.data)) as { type?: unknown }).type;
        }
        catch {
          return;
        }
        if (type === 'ready') {
          attempts = 0;
          // The first ready is the app just starting; a later one follows a gap in which an update could have been missed.
          if (seenReady)
            refetchAll();
          seenReady = true;
        }
        else if (type === 'data-updated') {
          refetchAll();
        }
      };
      next.onerror = (event) => {
        // A refused upgrade (signed out, wrong tenant) will not heal by retrying.
        if (upgradeFailureStatus((event as { message?: unknown }).message) !== null)
          fatal = true;
      };
      next.onclose = () => {
        if (stopped || socket !== next || fatal)
          return;
        detach();
        attempts += 1;
        if (attempts <= MAX_RECONNECTS)
          timer = setTimeout(connect, reconnectDelay(attempts));
      };
    }

    connect();

    return () => {
      stopped = true;
      if (timer !== null)
        clearTimeout(timer);
      detach();
    };
  }, [active, tenantId, queryClient]);
}
