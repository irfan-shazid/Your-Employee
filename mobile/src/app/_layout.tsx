import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { BootScreen } from '@/components/layout/BootScreen';
import { ToastHost } from '@/components/ui';
import { useAppState, useAuthSync } from '@/features/auth/useAppState';
import { PaymentMethodSheet } from '@/features/payments/PaymentMethodSheet';
import { storage } from '@/lib/storage';
import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { setThemePreference, THEME_KEY, type ThemePreference } from '@/store/slices/ui';
import { AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <AppThemeProvider>{fontsLoaded ? <AppShell /> : null}</AppThemeProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  useAuthSync();
  const dispatch = useAppDispatch();
  const state = useAppState();
  const theme = useTheme();

  // Restore the saved light/dark preference (saved by changeTheme).
  useEffect(() => {
    storage.get(THEME_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') dispatch(setThemePreference(v as ThemePreference));
    });
  }, [dispatch]);

  // Mount the navigator only once we know who the user is, so the URL the app was opened
  // with (deep link, web refresh) isn't bounced by route guards that are still undecided.
  const [ready, setReady] = useState(false);
  if (!ready && state !== 'loading') setReady(true);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {});
  }, [theme.colors.bg]);

  useEffect(() => {
    if (state !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [state]);

  // Safety net: never keep the splash up for more than 6s (e.g. very slow network).
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <BootScreen />;

  const navTheme = theme.dark ? DarkTheme : DefaultTheme;
  const approved = state === 'worker' || state === 'employer' || state === 'admin';

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.bg,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
        },
      }}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: 'ios_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="payment-result" options={{ animation: 'fade' }} />

        <Stack.Protected guard={state === 'signedOut'}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        </Stack.Protected>

        <Stack.Protected guard={state === 'onboarding' || state === 'pending'}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>

        <Stack.Protected guard={state === 'worker'}>
          <Stack.Screen name="worker" options={{ animation: 'fade' }} />
          <Stack.Screen name="subscription" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Protected>

        <Stack.Protected guard={state === 'employer'}>
          <Stack.Screen name="employer" options={{ animation: 'fade' }} />
          <Stack.Screen name="jobs/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="jobs/[id]/applicants" />
          <Stack.Screen name="workers/index" />
          <Stack.Screen name="workers/[id]" />
          <Stack.Screen name="hires/new" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>

        <Stack.Protected guard={state === 'admin'}>
          <Stack.Screen name="admin" options={{ animation: 'fade' }} />
          <Stack.Screen name="manage/workers/[id]" />
          <Stack.Screen name="manage/employers/[id]" />
          <Stack.Screen name="manage/users" />
          <Stack.Screen name="manage/jobs" />
          <Stack.Screen name="manage/categories" />
        </Stack.Protected>

        <Stack.Protected guard={approved}>
          <Stack.Screen name="jobs/[id]/index" />
          <Stack.Screen name="hires/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="payments" />
          <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>
      </Stack>
      <PaymentMethodSheet />
      <ToastHost />
    </ThemeProvider>
  );
}
