import * as Location from 'expo-location';
import * as React from 'react';

/** A position good enough to put on a receipt, or the reason there isn't one. */
export type CollectionFix
  = | { status: 'locating' }
    | { status: 'ready'; latitude: number; longitude: number; gpsAccuracyM: number }
    | { status: 'denied' }
    | { status: 'unavailable' };

/**
 * Where the collector is standing, asked for once when the screen opens.
 *
 * Deliberately not blocking: a receipt is recorded with or without it. A phone
 * indoors, a person who declined the permission, and a dead GPS chip all end up
 * here as a reason rather than a spinner nobody can get past — money that was
 * handed over has to be recordable in a stairwell.
 */
export function useCollectionFix(): CollectionFix {
  const [fix, setFix] = React.useState<CollectionFix>({ status: 'locating' });

  React.useEffect(() => {
    let live = true;

    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();

      if (!live)
        return;

      if (!granted) {
        setFix({ status: 'denied' });
        return;
      }

      // Balanced rather than Highest: a doorstep needs tens of metres, and the
      // best accuracy setting keeps the radio up for far longer on a round that
      // is a hundred of these a day.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

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
    })().catch(() => {
      if (live)
        setFix({ status: 'unavailable' });
    });

    return () => {
      live = false;
    };
  }, []);

  return fix;
}

/** The three fields the API takes, or nothing at all. */
export function fixPayload(fix: CollectionFix): {
  latitude?: number;
  longitude?: number;
  gpsAccuracyM?: number;
} {
  return fix.status === 'ready'
    ? { latitude: fix.latitude, longitude: fix.longitude, gpsAccuracyM: fix.gpsAccuracyM }
    : {};
}
