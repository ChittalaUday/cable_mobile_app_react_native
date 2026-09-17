import type { ViewProps } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { logScreenView, setUserId as setAnalyticsUserId } from '@/lib/analytics';
import { APIProvider, queryClient } from '@/lib/api';
import { initFirebaseAppCheck } from '@/lib/app-check';
import { setCrashlyticsUserId } from '@/lib/crashlytics';
import { useNotificationSync } from '@/lib/hooks/common/use-notification-sync';
import { loadSelectedTheme } from '@/lib/hooks/common/use-selected-theme';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { registerBackgroundHandler } from '@/lib/notifications';
// Import  global CSS file
import '../global.css';

export { ErrorBoundary } from 'expo-router';

// eslint-disable-next-line react-refresh/only-export-components
export const unstable_settings = {
  initialRouteName: 'index',
};

loadSelectedTheme();
// Must run before Firebase monitoring makes its first request.
initFirebaseAppCheck();
// Must be registered before React mounts, not inside a component: the native
// side looks for it as soon as a push arrives with the app in the background.
registerBackgroundHandler();
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  const hydrate = useAuthStore.use.hydrate();
  const userId = useAuthStore.use.user()?.uid;
  const status = useAuthStore.use.status();
  const pathname = usePathname();
  const hasHiddenSplash = React.useRef(false);

  const onLayoutRootView = React.useCallback(() => {
    if (hasHiddenSplash.current) {
      return;
    }

    hasHiddenSplash.current = true;
    SplashScreen.hide();
  }, []);

  React.useEffect(() => hydrate(), [hydrate]);

  /**
   * One keyboard dismissal for the whole app, on every route change.
   *
   * A keyboard is not tied to the screen that raised it: tap a search result
   * and the detail screen opens underneath a keyboard nobody can see the input
   * for. Doing it here rather than per screen means it also covers the back
   * button, a deep link, and every screen added later — none of which can
   * forget to opt in.
   */
  React.useEffect(() => {
    Keyboard.dismiss();
  }, [pathname]);

  React.useEffect(() => {
    if (userId) {
      setAnalyticsUserId(userId);
      setCrashlyticsUserId(userId);
    }
    else {
      setAnalyticsUserId(null);
      setCrashlyticsUserId(null);
    }
  }, [userId]);

  // Every cached list is tenant-scoped, so leaving one — by signing out or by
  // switching — has to drop the cache with it.
  const tenantId = useAuthStore.use.tenantId();
  React.useEffect(() => {
    if (status === 'signOut')
      queryClient.clear();
  }, [status]);

  React.useEffect(() => {
    queryClient.clear();
  }, [tenantId]);

  React.useEffect(() => {
    if (pathname) {
      logScreenView(pathname);
    }
  }, [pathname]);

  return (
    <Providers onLayout={onLayoutRootView}>
      <NotificationSync />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="select-tenant" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="staff" options={{ headerShown: false }} />
        <Stack.Screen name="customer" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="remote" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
}

/**
 * Push registration, the foreground handler and the in-app message pull.
 *
 * A component rather than a hook call in `RootLayout`, because it reads React
 * Query and the provider for that is rendered by `Providers` — below the root,
 * so a hook called in the root would have no client. Mounted once, and inside
 * the provider, so it still covers launches nobody is signed in for.
 */
function NotificationSync() {
  useNotificationSync();
  return null;
}

function Providers({
  children,
  onLayout,
}: {
  children: React.ReactNode;
  onLayout: ViewProps['onLayout'];
}) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      onLayout={onLayout}
      style={styles.container}
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
            </BottomSheetModalProvider>
            <FlashMessage position="top" />
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
