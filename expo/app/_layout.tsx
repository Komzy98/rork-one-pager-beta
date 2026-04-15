import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import React, { useEffect, ReactNode } from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";

if (typeof __DEV__ !== 'undefined' && !__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
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
import { BusyModeProvider } from "@/hooks/useBusyMode";
import { BackgroundServicesProvider } from "@/hooks/useBackgroundServices";
import { WalkthroughProvider } from "@/hooks/useWalkthrough";

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
    </Stack>
  );
}

export default function RootLayout() {
  const router = useRouter();

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
            <SafeProvider provider={ThemeProvider}>
              <SafeProvider provider={AuthProvider}>
                <SafeProvider provider={UserProfileProvider}>
                  <SafeProvider provider={UIStateProvider}>
                    <SafeProvider provider={AppProvider}>
                      <SafeProvider provider={TaskProvider}>
                        <SafeProvider provider={CloudSyncProvider}>
                            <SafeProvider provider={HabitsEnhancementProvider}>
                              <SafeProvider provider={BusyModeProvider}>
                                <SafeProvider provider={BackgroundServicesProvider}>
                                  <SafeProvider provider={WalkthroughProvider}>
                                      <StatusBarManager />
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
