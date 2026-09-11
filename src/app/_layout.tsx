import type { ViewProps } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { logScreenView, setUserId as setAnalyticsUserId } from '@/lib/analytics';
import { APIProvider } from '@/lib/api';
import { initFirebaseAppCheck } from '@/lib/app-check';
import { setCrashlyticsUserId } from '@/lib/crashlytics';
import { configureGoogleSignIn } from '@/lib/google-signin';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { registerForPushNotifications } from '@/lib/notifications';
// Registers the background FCM handler as a side effect - must happen at module scope.
import '@/lib/messaging';
// Import  global CSS file
import '../global.css';

export { ErrorBoundary } from 'expo-router';

// eslint-disable-next-line react-refresh/only-export-components
export const unstable_settings = {
  initialRouteName: '(app)',
};

loadSelectedTheme();
// Must run before any other Firebase service (auth, firestore) makes its first request.
initFirebaseAppCheck();
configureGoogleSignIn();
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

  React.useEffect(() => {
    if (userId) {
      registerForPushNotifications(userId).catch(console.warn);
      setAnalyticsUserId(userId);
      setCrashlyticsUserId(userId);
    }
    else {
      setAnalyticsUserId(null);
      setCrashlyticsUserId(null);
    }
  }, [userId]);

  React.useEffect(() => {
    if (pathname) {
      logScreenView(pathname);
    }
  }, [pathname]);

  return (
    <Providers onLayout={onLayoutRootView}>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
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
