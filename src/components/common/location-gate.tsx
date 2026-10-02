import { Location01Icon } from '@hugeicons/core-free-icons';
import * as Location from 'expo-location';
import * as React from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { Button, Text, ThemedIcon, View } from '@/components/ui';

type GateState = 'checking' | 'ok' | 'services-off' | 'denied';

async function readState(): Promise<GateState> {
  const [enabled, permission] = await Promise.all([
    Location.hasServicesEnabledAsync().catch(() => false),
    Location.getForegroundPermissionsAsync().catch(() => ({ granted: false, canAskAgain: true })),
  ]);
  if (!enabled)
    return 'services-off';
  return permission.granted ? 'ok' : 'denied';
}

/**
 * The operator app only runs with location on. Every payment carries where it
 * was collected, and a round without positions cannot be checked, so the app
 * is held behind this screen until location services are on and the app may
 * use them. Re-checked whenever the app comes back to the foreground — the
 * usual way back is via the phone's settings.
 */
export function LocationGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<GateState>('checking');

  const check = React.useCallback(async () => {
    setState(await readState());
  }, []);

  React.useEffect(() => {
    void check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active')
        void check();
    });
    return () => subscription.remove();
  }, [check]);

  // While held, look again every few seconds: a quick-settings toggle does not
  // background the app, so no AppState change would tell us.
  React.useEffect(() => {
    if (state === 'ok' || state === 'checking')
      return;
    const timer = setInterval(() => void check(), 3000);
    return () => clearInterval(timer);
  }, [state, check]);

  if (state === 'ok')
    return children;

  if (state === 'checking')
    return <View className="flex-1 bg-surface" />;

  const turnOn = async () => {
    if (state === 'denied') {
      const asked = await Location.requestForegroundPermissionsAsync();
      if (!asked.granted && !asked.canAskAgain)
        await Linking.openSettings();
    }
    else if (Platform.OS === 'android') {
      // Android can switch location on from inside the app with one confirm.
      await Location.enableNetworkProviderAsync().catch(async () => Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(async () => Linking.openSettings()));
    }
    else {
      await Linking.openSettings();
    }
    await check();
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface px-8" testID="location-gate">
      <View className="size-20 items-center justify-center rounded-full bg-primary-500/15">
        <ThemedIcon icon={Location01Icon} size={36} colorClassName="text-primary-600" />
      </View>
      <Text className="text-center text-xl font-extrabold text-foreground">
        {state === 'denied' ? 'Allow location' : 'Turn on location'}
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        {state === 'denied'
          ? 'This app records where each payment and visit happens. Allow location to keep using it.'
          : 'Location is off on this phone. Every payment and visit records where it happened, so the app needs it on.'}
      </Text>
      <Button label={state === 'denied' ? 'Allow location' : 'Turn on location'} onPress={() => void turnOn()} testID="location-gate-enable" className="self-stretch" />
    </View>
  );
}
