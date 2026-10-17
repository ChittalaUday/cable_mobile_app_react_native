import type { JobRunEvent } from '@/lib/api/contracts';
import type { LiveCursors, LiveFrame } from '@/lib/automations/live-protocol';
import { useQueryClient } from '@tanstack/react-query';
import Env from 'env';
import * as React from 'react';
import { AppState } from 'react-native';
import { devHostUrl } from '@/lib/api/client';
import { getTenantId, getToken } from '@/lib/auth/utils';
import { mergeJobEvents } from '@/lib/automations/job-activity';
import { listLiveFrames, saveLiveFrame } from '@/lib/automations/live-frame-store';
import { liveSocketHeaders, liveSocketUrl, openLiveSocket, upgradeFailureStatus, validateLiveMessage } from '@/lib/automations/live-protocol';
import { jobRunKeys } from '@/lib/hooks/api/use-job-runs';

export type LivePhase = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'ended' | 'error';

export type LiveStreamState = {
  phase: LivePhase;
  /** The newest validated picture, also kept on this device so it outlasts navigation, reconnects and the run itself. */
  frame: LiveFrame | null;
  /** Every picture saved for this run, oldest first; empty while the view is live, when `frame` is the newest. */
  history: LiveFrame[];
  /** Persisted and live events as one list, ascending by sequence. */
  events: JobRunEvent[];
};

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30_000;
export const MAX_RECONNECTS = 8;
const MAX_LIVE_EVENTS = 500;
const CLOSE_POLICY = 1008;

/** Doubling delay capped at 30s, then spread over 50-100% so many phones do not return together. */
export function reconnectDelay(attempt: number, random: number = Math.random()): number {
  const ceiling = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** (attempt - 1));
  return Math.round(ceiling * (0.5 + random * 0.5));
}

type Options = {
  runId: string | undefined;
  enabled: boolean;
  /** A finished run is read from REST alone; no socket is opened for it. */
  terminal: boolean;
  persistedEvents: readonly JobRunEvent[];
};

const NO_EVENTS: JobRunEvent[] = [];
const NO_FRAMES: LiveFrame[] = [];

/**
 * Watches one active run: the newest browser picture and activity that arrives
 * before the next REST poll. Stops when the run ends, the screen unmounts, the
 * app goes to the background, or the server says no. Every picture is saved on
 * the device (see `live-frame-store`), so they are all still there after any of
 * those, and when this screen is opened again.
 */
export function useJobLiveStream({ runId, enabled, terminal, persistedEvents }: Options): LiveStreamState {
  const queryClient = useQueryClient();
  const [appActive, setAppActive] = React.useState(AppState.currentState !== 'background');
  const [phase, setPhase] = React.useState<LivePhase>('idle');
  const [liveFrame, setLiveFrame] = React.useState<LiveFrame | null>(null);
  const [liveEvents, setLiveEvents] = React.useState<JobRunEvent[]>(NO_EVENTS);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setAppActive(state !== 'background'));
    return () => subscription.remove();
  }, []);

  const active = enabled && !terminal && appActive && runId !== undefined && runId !== '';

  React.useEffect(() => {
    if (!active)
      return;

    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let stopped = false;
    const cursors: LiveCursors = { frame: 0, activity: 0 };

    const refetchDetail = () => {
      void queryClient.invalidateQueries({ queryKey: jobRunKeys.detail(getTenantId(), runId) });
    };
    const release = (next: LivePhase) => {
      stopped = true;
      if (timer !== null)
        clearTimeout(timer);
      timer = null;
      detach();
      setPhase(next);
    };
    const detach = () => {
      if (socket === null)
        return;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      socket = null;
    };
    const scheduleReconnect = () => {
      detach();
      attempts += 1;
      if (attempts > MAX_RECONNECTS) {
        release('error');
        return;
      }
      setPhase('reconnecting');
      timer = setTimeout(connect, reconnectDelay(attempts));
    };

    function connect() {
      timer = null;
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect -- the effect owns an external socket
      setPhase(attempts === 0 ? 'connecting' : 'reconnecting');
      // Read at every attempt: a refreshed token or a switched tenant applies to the next socket.
      const token = getToken()?.access;
      const tenantId = getTenantId();
      if (!token || !tenantId) {
        release('error');
        return;
      }
      // Frame sequences restart on a new socket (and on a retry attempt), so that cursor starts over.
      cursors.frame = 0;
      let fatal = false;
      const next = openLiveSocket(liveSocketUrl(devHostUrl(Env.EXPO_PUBLIC_API_URL), runId!), liveSocketHeaders(token, tenantId));
      socket = next;

      next.onmessage = (event) => {
        const message = validateLiveMessage(event.data, runId!, cursors);
        if (message === null)
          return;
        switch (message.type) {
          case 'ready':
            // Ready follows the server's subscription: anything before it (and any gap while
            // disconnected) is only in REST, the source of truth for events.
            refetchDetail();
            attempts = 0;
            setPhase('live');
            break;
          case 'frame':
            cursors.frame = message.frame.sequence;
            setLiveFrame(message.frame);
            saveLiveFrame(runId!, message.frame);
            break;
          case 'activity':
            cursors.activity = message.event.sequence;
            if (message.event.code === 'attempt_started')
              cursors.frame = 0;
            setLiveEvents(previous => mergeJobEvents(previous, [message.event]).slice(-MAX_LIVE_EVENTS));
            break;
          case 'status':
            refetchDetail();
            if (message.terminal)
              release('ended');
            break;
          case 'error':
            // The run is gone, or the server cannot stream it now; only the former is permanent.
            if (message.code === 'RUN_NOT_FOUND') {
              fatal = true;
              release('error');
            }
            break;
        }
      };
      next.onerror = (event) => {
        // The native layer reports a refused upgrade only as text; 401/403/404 will not heal by retrying.
        if (upgradeFailureStatus((event as { message?: unknown }).message) !== null)
          fatal = true;
      };
      next.onclose = (event) => {
        if (stopped || socket !== next)
          return;
        if (fatal || event.code === CLOSE_POLICY)
          release('error');
        else
          scheduleReconnect();
      };
    }

    connect();

    return () => {
      stopped = true;
      if (timer !== null)
        clearTimeout(timer);
      detach();
      setPhase('idle');
    };
  }, [active, runId, queryClient]);

  // A different run starts its own live list and picture.
  React.useEffect(() => () => {
    setLiveEvents(NO_EVENTS);
    setLiveFrame(null);
  }, [runId]);

  const events = React.useMemo(() => mergeJobEvents(persistedEvents, liveEvents), [persistedEvents, liveEvents]);

  const live = active && phase === 'live';
  // Read from the device whenever the view is not live: on opening, after a reconnect, once the run is over.
  const history = React.useMemo(() => (live || runId === undefined || runId === '' ? NO_FRAMES : listLiveFrames(runId)), [live, runId]);
  const frame = liveFrame ?? history.at(-1) ?? null;
  if (!active)
    return { phase: terminal ? 'ended' : 'idle', frame, history, events };
  return { phase, frame, history, events };
}
