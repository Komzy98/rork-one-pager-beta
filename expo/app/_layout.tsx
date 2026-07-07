import { configureYounify } from "../services/younify";
import { isYounifyAuthUnreachableError } from "@/utils/onboardingProfileSave";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { parseDeepLink } from "@/utils/deepLinks";
import React, { useEffect, ReactNode } from "react";
import { LogBox, Platform, StatusBar, StyleSheet } from "react-native";

if (typeof __DEV__ !== 'undefined' && !__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const joined = args
      .map((arg) => {
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        if (typeof arg === 'string') return arg;
        return '';
      })
      .join(' ');
    if (/Network request failed|Failed to fetch|Load failed|network connection was lost/i.test(joined)) {
      console.warn('[Network]', ...args);
      return;
    }
    originalConsoleError(...args);
  };

  LogBox.ignoreLogs([
    'TypeError: Network request failed',
    'Error: Network request failed',
  ]);
}
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { UserProfileProvider } from "@/hooks/useUserProfile";
import { UIStateProvider } from "@/hooks/useUIState";
import { AppProvider } from "@/hooks/useHabitsStore";
import { TaskProvider } from "@/hooks/useTasksStore";
import { CloudSyncProvider } from "@/hooks/useCloudSync";
import { HabitsEnhancementProvider } from "@/hooks/useHabitsEnhancement";
import { FriendsProvider } from "@/hooks/useFriends";
import { PartnerEventSaveSync } from "@/hooks/usePartnerEventSaveSync";
import { CommunityProvider } from "@/hooks/useCommunity";
import { ActivityProvider } from "@/hooks/useActivity";
import { BusyModeProvider } from "@/hooks/useBusyMode";
import { BackgroundServicesProvider } from "@/hooks/useBackgroundServices";
import { WalkthroughProvider } from "@/hooks/useWalkthrough";
import { EventKitProvider } from "@/hooks/useEventKit";
import { CalendarProvider } from "@/hooks/useCalendar";
import { YounifyAuthDevBanner } from "@/components/younify/YounifyAuthUnavailablePanel";

import { trpc, trpcReactClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync().catch(() => {
  if (__DEV__) console.log('SplashScreen.preventAutoHideAsync failed');
});

function SafeProvider({ provider: Provider, children }: { provider: React.ComponentType<{ children: ReactNode }> | undefined | null; children: ReactNode }) {
  if (!Provider || typeof Provider !== 'function') {
    if (__DEV__) console.warn('SafeProvider: Provider is undefined, rendering children directly');
    return <>{children}</>;
  }
  return <Provider>{children}</Provider>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      gestureEnabled: true,
      animation: 'slide_from_right',
      animationDuration: 200,
    }}>
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="(onboarding)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="(root)" 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
        }} 
      />
      <Stack.Screen 
        name="sports-debug" 
        options={{ 
          headerShown: false,
          title: "Sports Debug",
          presentation: "modal",
          gestureEnabled: true,
        }} 
      />
      <Stack.Screen
        name="friends"
        options={{
          headerShown: false,
          title: "Accountability Partners",
          presentation: "modal",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="publish-habit"
        options={{
          headerShown: false,
          title: "Publish Habit",
          presentation: "modal",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const router = useRouter();
  useEffect(() => {
    configureYounify().catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      const authDown = isYounifyAuthUnreachableError(msg);
      if (__DEV__ && authDown) {
        console.warn(
          "[Younify] Auth on :3000 is not running — use npm run dev (simulator) or npm run younify-auth in another terminal.",
        );
        return;
      }
      if (__DEV__) {
        console.warn("Younify configure failed:", error);
        return;
      }
      console.error("Younify configure failed:", error);
    });
  }, []);

  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        if (__DEV__) console.log('Splash screen already hidden');
      }
    };
    void hideSplash();

    if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.localStorage) {
      const mockStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      };
      (window as any).localStorage = mockStorage;
    }
  }, []);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (__DEV__) console.log('Deep link received:', event.url);

      const parsed = parseDeepLink(event.url);
      if (parsed) {
        if (parsed.kind === 'challenge') {
          router.push({ pathname: '/(tabs)/profile', params: { challengeId: parsed.id } } as any);
          return;
        }
        if (parsed.kind === 'user') {
          router.push({ pathname: '/friends', params: { addUsername: parsed.username } } as any);
          return;
        }
        if (parsed.kind === 'event') {
          router.push({ pathname: '/(root)/event/[id]', params: { id: parsed.id } } as any);
          return;
        }
        if (parsed.kind === 'tab') {
          router.push(`/(tabs)/${parsed.name}` as any);
          return;
        }
      }

      const { path } = Linking.parse(event.url);
      if (path) {
        if (path === 'sports') {
          router.push('/(tabs)/sports' as any);
        } else if (path === 'shows') {
          router.push('/(tabs)/shows' as any);
        } else if (path === 'tasks') {
          router.push('/(tabs)/tasks' as any);
        } else if (path.startsWith('tabs/')) {
          const tabPath = path.replace('tabs/', '');
          router.push(`/(tabs)/${tabPath}` as any);
        }
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => { subscription?.remove(); };
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleError = (event: ErrorEvent) => {
      const message = String(event.message || '');
      const stack = String(event.error?.stack || '');
      if (
        stack.includes('chrome-extension') ||
        stack.includes('moz-extension') ||
        message.includes('ResizeObserver loop completed with undelivered notifications')
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('error', handleError, true);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
          <GestureHandlerRootView style={styles.container}>
            <SafeProvider provider={AuthProvider}>
              <SafeProvider provider={UserProfileProvider}>
                <SafeProvider provider={ThemeProvider}>
                  <SafeProvider provider={UIStateProvider}>
                    <SafeProvider provider={AppProvider}>
                      <SafeProvider provider={TaskProvider}>
                        <SafeProvider provider={CloudSyncProvider}>
                          <SafeProvider provider={HabitsEnhancementProvider}>
                            <SafeProvider provider={FriendsProvider}>
                              <SafeProvider provider={CommunityProvider}>
                                <SafeProvider provider={ActivityProvider}>
                                  <SafeProvider provider={BusyModeProvider}>
                                    <SafeProvider provider={BackgroundServicesProvider}>
                                      <SafeProvider provider={WalkthroughProvider}>
                                        <SafeProvider provider={EventKitProvider}>
                                          <SafeProvider provider={CalendarProvider}>
                                            <StatusBarManager />
                                            {typeof __DEV__ !== "undefined" && __DEV__ ? (
                                              <YounifyAuthDevBanner />
                                            ) : null}
                                            <PartnerEventSaveSync />
                                            <RootLayoutNav />
                                          </SafeProvider>
                                        </SafeProvider>
                                      </SafeProvider>
                                    </SafeProvider>
                                  </SafeProvider>
                                </SafeProvider>
                              </SafeProvider>
                            </SafeProvider>
                          </SafeProvider>
                        </SafeProvider>
                      </SafeProvider>
                    </SafeProvider>
                  </SafeProvider>
                </SafeProvider>
              </SafeProvider>
            </SafeProvider>
          </GestureHandlerRootView>
        </trpc.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function StatusBarManager() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
