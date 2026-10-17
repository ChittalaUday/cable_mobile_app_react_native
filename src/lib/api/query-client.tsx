import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

/**
 * A 4xx is an answer, not a blip. Retrying it spends a phone's battery and data
 * to be told the same thing three more times — and on a 401 it drags the token
 * refresh through the interceptor again on each pass. Only faults that might
 * pass on their own (no signal, 5xx) are worth a second try.
 *
 * Kept apart from `provider.tsx` because that file wires the React Query dev
 * tools, which ship as ESM. Anything importing the client to invalidate a query
 * would otherwise drag the dev plugin in behind it, and a plain unit test has no
 * business loading a dev tool to find out what a mutation refreshes.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: unknown) => {
        const status = (error as { response?: { status?: number } }).response?.status;

        if (status !== undefined && status >= 400 && status < 500)
          return false;

        return failureCount < 2;
      },
    },
  },
});

/*
 * React Query only knows "focus" from browser events. Coming back to the app is
 * the phone's focus: without this, a collector who switches apps and returns
 * sees the balance from before and may collect again. Registered once, at import.
 * ponytail: no onlineManager — @react-native-community/netinfo isn't installed;
 * add it if offline-then-online refetching matters.
 */
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', state => handleFocus(state === 'active'));
  return () => subscription.remove();
});

const REALTIME_QUERY_KEYS: Record<string, readonly string[]> = {
  customers: ['customers', 'customer', 'staff-dashboard', 'admin-dashboard'],
  inventory: ['inventory', 'customers', 'customer', 'staff-dashboard', 'admin-dashboard'],
  payments: ['payments', 'payment', 'customers', 'customer', 'inventory', 'staff-dashboard', 'admin-dashboard'],
  visits: ['visits', 'customer-timeline', 'admin-dashboard', 'staff-dashboard'],
};

/** Marks every view affected by a silent FCM data message stale. */
export function handleRealtimeSync(data: Record<string, unknown> | undefined): boolean {
  const sync = data?.sync;

  if (typeof sync !== 'string')
    return false;

  for (const key of REALTIME_QUERY_KEYS[sync] ?? [])
    queryClient.invalidateQueries({ queryKey: [key] }).catch(() => {});

  return true;
}
