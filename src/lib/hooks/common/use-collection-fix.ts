import * as Location from 'expo-location';
import * as React from 'react';

/** A position good enough to put on a receipt, or the reason there isn't one. */
export type CollectionFix
  = | { status: 'locating' }
    | { status: 'ready'; latitude: number; longitude: number; gpsAccuracyM: number }
    | { status: 'denied' }
    | { status: 'unavailable' };

/** How long one provider gets before the next is tried. */
const BALANCED_MS = 8_000;
const HIGH_MS = 20_000;

async function within<T>(ms: number, work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Location timed out')), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  }
  finally {
    clearTimeout(timer);
  }
}

/**
 * Where the collector is standing. Every payment carries it — the API refuses
 * one without — so this tries hard: a recent last-known position at once, then
 * a live fix on the network-assisted provider, then GPS alone, which is what a
 * phone with no network fix (or an emulator) still has. `retry` starts again.
 */
export function useCollectionFix(): CollectionFix & { retry: () => void } {
  const [fix, setFix] = React.useState<CollectionFix>({ status: 'locating' });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let live = true;

    const take = (position: Location.LocationObject) => {
      if (!live)
        return;
      setFix({
        status: 'ready',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        // Android can report no accuracy at all; calling that zero would claim
        // a perfect fix, so it is sent as the widest thing we know it isn't.
        gpsAccuracyM: position.coords.accuracy ?? 9999,
      });
    };

    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!live)
        return;
      if (!granted) {
        setFix({ status: 'denied' });
        return;
      }

      const recent = await Promise.resolve()
        .then(async () => Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 }))
        .catch(() => null);
      if (recent !== null)
        take(recent);

      // Balanced first: a doorstep needs tens of metres, and keeping the GPS
      // radio up for every visit on a hundred-door round drains the battery.
      const live1 = await within(BALANCED_MS, Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
        .catch(async () => within(HIGH_MS, Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })))
        .catch(() => null);

      if (live1 !== null)
        take(live1);
      else if (recent === null && live)
        setFix({ status: 'unavailable' });
    })().catch(() => {
      if (live)
        setFix({ status: 'unavailable' });
    });

    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = React.useCallback(() => {
    setFix({ status: 'locating' });
    setAttempt(n => n + 1);
  }, []);

  return { ...fix, retry };
}

/** Where a payment was collected: the three fields every collection carries. */
export type CollectionPoint = { latitude: number; longitude: number; gpsAccuracyM: number };

/** The point off a fix the caller has already checked is ready (see `ensureFix`). */
export function fixPayload(fix: Extract<CollectionFix, { status: 'ready' }>): CollectionPoint {
  return { latitude: fix.latitude, longitude: fix.longitude, gpsAccuracyM: fix.gpsAccuracyM };
}
