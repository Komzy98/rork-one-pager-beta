import { Tabs } from "expo-router";
import { LayoutDashboard, Clapperboard, Medal, ListChecks, Search, CircleUser, CookingPot, CalendarDays, GraduationCap, ChevronRight } from "lucide-react-native";
import React, { useRef, useEffect, useCallback, useState } from "react";
import { View, StyleSheet, Platform, TouchableOpacity, Text, Animated, Image, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_HEIGHT,
} from "@/constants/tabBarLayout";
import { useAuth } from "@/hooks/useAuth";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps, BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import * as Haptics from 'expo-haptics';

import { useUserProfile } from "@/hooks/useUserProfile";
import { useFriends } from "@/hooks/useFriends";
import { resolveDisplayAvatarUrl, collectAvatarUrlCandidates } from "@/utils/avatarUtils";
import { isProfileForUser } from "@/utils/accountIsolation";
import { AvatarWithFallback } from "@/components/AvatarWithFallback";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColors } from "@/types/theme";
import { FootballBundleProvider } from "@/contexts/FootballBundleContext";
import { F1BundleProvider } from "@/contexts/F1BundleContext";
import { HealthContextProvider } from "@/contexts/HealthContext";
import { DiscoverLifeContextProvider } from "@/contexts/DiscoverLifeContextProvider";



const getTabIcon = (tabName: string) => {
  const iconMap: Record<string, React.ComponentType<{ color: string; size?: number }>> = {
    activities: LayoutDashboard,
    shows: Clapperboard,
    sports: Medal,
    tasks: ListChecks,
    cooking: CookingPot,
    learning: GraduationCap,
    events: CalendarDays,
    discover: Search,
    profile: CircleUser,
  };
  return iconMap[tabName] || LayoutDashboard;
};

const getTabTitle = (tabName: string) => {
  const titleMap: Record<string, string> = {
    activities: "Overview",
    shows: "Shows",
    sports: "Sports",
    tasks: "Tasks",
    cooking: "Cooking",
    learning: "Learning",
    events: "Events",
    discover: "Discover",
    profile: "Profile",
  };
  return titleMap[tabName] || tabName;
};

interface TabRoute {
  key: string;
  name: string;
  params?: object;
  path?: string;
}

// Keep the original personalisable tab bar, but always expose the three
// classic destinations explicitly requested by the founder.
const CLASSIC_TAB_NAMES = ['activities', 'tasks', 'shows', 'sports', 'cooking', 'learning', 'events', 'discover', 'profile'] as const;
const ALWAYS_VISIBLE_TABS = ['activities', 'sports', 'events', 'profile'] as const;
function getClassicVisibleTabs(personalized: string[]): string[] {
  // Retain the user's preferred ordering while keeping Sports and Events
  // available even if their current interests no longer include those tabs.
  const eligible = new Set<string>(CLASSIC_TAB_NAMES);
  const middle = personalized.filter(
    (name, index) =>
      eligible.has(name) &&
      name !== 'activities' &&
      name !== 'profile' &&
      personalized.indexOf(name) === index,
  );
  for (const name of ALWAYS_VISIBLE_TABS) {
    if (name !== 'activities' && name !== 'profile' && !middle.includes(name)) {
      middle.push(name);
    }
  }
  return ['activities', ...middle, 'profile'];
}

const PINNED_START_TAB = 'activities';
const PINNED_END_TAB = 'profile';

interface AnimatedTabItemProps {
  route: TabRoute;
  isFocused: boolean;
  onPress: () => void;
  options: BottomTabNavigationOptions;
  colors: ThemeColors;
  isShowsTabActive?: boolean;
  avatarUrl?: string;
  avatarCandidates?: string[];
  variant?: 'pinned' | 'scroll';
  /** Even width in the middle strip when the user has few interest tabs. */
  uniformMiddle?: boolean;
  onLayout?: (event: { nativeEvent: { layout: { x: number; width: number } } }) => void;
}

const AnimatedTabItem = React.memo(({
  route,
  isFocused,
  onPress,
  options,
  colors,
  isShowsTabActive,
  avatarUrl,
  avatarCandidates,
  variant = 'scroll',
  uniformMiddle = false,
  onLayout,
}: AnimatedTabItemProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;

  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: isFocused ? 1.12 : 1,
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [isFocused, iconScale]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const IconComponent = getTabIcon(route.name);
  const label = getTabTitle(route.name);

  const activeColor = isShowsTabActive ? '#FF4444' : colors.primary;
  const inactiveColor = isFocused
    ? activeColor
    : isShowsTabActive
      ? 'rgba(255, 255, 255, 0.68)'
      : colors.textSecondary;

  return (
    <View
      style={
        variant === 'pinned'
          ? styles.tabButtonPinned
          : uniformMiddle
            ? styles.tabButtonScrollUniform
            : styles.tabButtonScroll
      }
      onLayout={onLayout}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabTouchable}
        activeOpacity={1}
      >
      <Animated.View style={[
        styles.tabItemContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <Animated.View style={[{ transform: [{ scale: iconScale }] }]}>
          <View style={{
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isFocused ? 0.32 : 0,
            shadowRadius: 8,
          }}>
            {route.name === 'profile' && (avatarCandidates?.length ?? 0) > 0 ? (
              <AvatarWithFallback
                candidates={avatarCandidates ?? []}
                style={[
                  styles.profileAvatar,
                  { borderColor: isFocused ? activeColor : 'transparent' },
                ]}
                contentFit="cover"
                fallback={
                  <IconComponent
                    color={isFocused ? activeColor : inactiveColor}
                    size={22}
                  />
                }
              />
            ) : (
              <IconComponent
                color={isFocused ? activeColor : inactiveColor}
                size={22}
              />
            )}
          </View>
        </Animated.View>
        <Text style={[
          styles.tabLabel,
          {
            color: isFocused ? activeColor : inactiveColor,
            textShadowColor: isShowsTabActive ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: isShowsTabActive ? 2 : 0,
          },
          isFocused && styles.tabLabelFocused
        ]}>
          {label}
        </Text>
      </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

AnimatedTabItem.displayName = 'AnimatedTabItem';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { getPersonalizedTabs, profile, recordTabVisits } = useUserProfile();
  const { myProfile } = useFriends();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const profileMatchesSession = isProfileForUser(profile, user?.id);
  const tabAvatarUrl = resolveDisplayAvatarUrl({
    profileAvatar: profileMatchesSession ? profile?.avatar : null,
    authAvatar: user?.avatar,
    socialAvatar: myProfile?.avatarUrl,
  });
  const tabAvatarCandidates = collectAvatarUrlCandidates({
    profileAvatar: profileMatchesSession ? profile?.avatar : null,
    authAvatar: user?.avatar,
    socialAvatar: myProfile?.avatarUrl,
  });
  const personalizedTabs = getClassicVisibleTabs(getPersonalizedTabs());
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const middleScrollRef = useRef<ScrollView>(null);
  const middleTabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const middleScrollMetrics = useRef({ offsetX: 0, layoutWidth: 0, contentWidth: 0 });
  const [showMiddleScrollHint, setShowMiddleScrollHint] = useState(false);

  const updateMiddleScrollHint = useCallback((offsetX: number, layoutWidth: number, contentWidth: number) => {
    middleScrollMetrics.current = { offsetX, layoutWidth, contentWidth };
    const threshold = 6;
    const hasOverflow = contentWidth > layoutWidth + threshold;
    const canScrollRight = hasOverflow && offsetX + layoutWidth < contentWidth - threshold;
    setShowMiddleScrollHint(canScrollRight);
  }, []);

  const visibleRoutes = state.routes.filter((route) =>
    personalizedTabs.includes(route.name)
  ).sort((a, b) => personalizedTabs.indexOf(a.name) - personalizedTabs.indexOf(b.name));

  const pinnedStartRoute = visibleRoutes.find((route) => route.name === PINNED_START_TAB);
  const pinnedEndRoute = visibleRoutes.find((route) => route.name === PINNED_END_TAB);
  const scrollableRoutes = visibleRoutes.filter(
    (route) => route.name !== PINNED_START_TAB && route.name !== PINNED_END_TAB,
  );

  /** Few interest-driven tabs: fill the middle strip evenly instead of clustering left. */
  const UNIFORM_MIDDLE_TAB_MAX = 4;
  const useUniformMiddleTabs =
    scrollableRoutes.length > 0 && scrollableRoutes.length <= UNIFORM_MIDDLE_TAB_MAX;

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [containerOpacity]);

  const currentRouteName = state.routes[state.index]?.name;
  const isShowsTabActive = currentRouteName === 'shows';
  const scrollableTabNames = scrollableRoutes.map((route) => route.name).join(',');
  const lastRecordedTabRef = useRef<string | null>(null);
  const visitBufferRef = useRef<Record<string, number>>({});
  const visitFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTabVisitsRef = useRef(recordTabVisits);
  recordTabVisitsRef.current = recordTabVisits;

  useEffect(() => {
    if (!currentRouteName || lastRecordedTabRef.current === currentRouteName) return;
    lastRecordedTabRef.current = currentRouteName;
    if (currentRouteName === 'activities' || currentRouteName === 'profile') return;
    visitBufferRef.current[currentRouteName] = (visitBufferRef.current[currentRouteName] ?? 0) + 1;
    if (visitFlushTimerRef.current) clearTimeout(visitFlushTimerRef.current);
    // A sequence of taps must never write a full profile during the transitions.
    visitFlushTimerRef.current = setTimeout(() => {
      const pending = visitBufferRef.current;
      visitBufferRef.current = {};
      visitFlushTimerRef.current = null;
      recordTabVisitsRef.current(pending);
    }, 5000);
  }, [currentRouteName]);

  useEffect(() => () => {
    // Never write a previous account's visits during an account switch.
    if (visitFlushTimerRef.current) clearTimeout(visitFlushTimerRef.current);
    visitBufferRef.current = {};
  }, []);

  const scrollMiddleTabIntoView = useCallback((tabName: string, animated: boolean) => {
    const layout = middleTabLayouts.current[tabName];
    if (!layout || !middleScrollRef.current) {
      return;
    }

    middleScrollRef.current.scrollTo({
      x: Math.max(0, layout.x - 12),
      animated,
    });
  }, []);

  useEffect(() => {
    if (!currentRouteName || !scrollableTabNames.split(',').includes(currentRouteName)) {
      return;
    }

    scrollMiddleTabIntoView(currentRouteName, true);
  }, [currentRouteName, scrollableTabNames, scrollMiddleTabIntoView]);

  useEffect(() => {
    const { offsetX, layoutWidth, contentWidth } = middleScrollMetrics.current;
    if (layoutWidth > 0 && contentWidth > 0) {
      updateMiddleScrollHint(offsetX, layoutWidth, contentWidth);
    }
  }, [scrollableTabNames, updateMiddleScrollHint]);

  const renderTab = (route: (typeof state.routes)[number], variant: 'pinned' | 'scroll', uniformMiddle?: boolean) => {
    const routeIndex = state.routes.findIndex((r) => r.name === route.name);
    const isFocused = state.index === routeIndex;
    const { options } = descriptors[route.key];

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <AnimatedTabItem
        key={route.key}
        route={route}
        isFocused={isFocused}
        onPress={onPress}
        options={options}
        colors={colors}
        isShowsTabActive={isShowsTabActive}
        avatarUrl={tabAvatarUrl ?? undefined}
        avatarCandidates={tabAvatarCandidates}
        variant={variant}
        uniformMiddle={uniformMiddle}
        onLayout={
          variant === 'scroll'
            ? (event) => {
                const layout = {
                  x: event.nativeEvent.layout.x,
                  width: event.nativeEvent.layout.width,
                };
                middleTabLayouts.current[route.name] = layout;
                if (route.name === currentRouteName) {
                  scrollMiddleTabIntoView(route.name, false);
                }
              }
            : undefined
        }
      />
    );
  };

  const tabBarBottom = Math.max(insets.bottom, 12) + FLOATING_TAB_BAR_BOTTOM_GAP;
  const dockScrimColor = isShowsTabActive
    ? 'rgba(13, 14, 18, 0.96)'
    : isDark
      ? 'rgba(13, 14, 18, 0.96)'
      : 'rgba(247, 248, 252, 0.96)';

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.tabBarDockScrim,
          {
            height: tabBarBottom + FLOATING_TAB_BAR_HEIGHT,
            backgroundColor: dockScrimColor,
          },
        ]}
      />
    <Animated.View style={[styles.tabBarContainer, {
      bottom: tabBarBottom,
      shadowColor: colors.shadow,
      opacity: containerOpacity,
    }]}>
      <BlurView
        intensity={isShowsTabActive ? 88 : 72}
        tint={isShowsTabActive || isDark ? 'dark' : 'light'}
        style={[styles.blurContainer, {
        backgroundColor: isShowsTabActive ? 'rgba(13, 14, 18, 0.72)' : (isDark ? 'rgba(13, 14, 18, 0.58)' : 'rgba(255, 255, 255, 0.72)'),
        borderColor: isShowsTabActive
          ? 'rgba(255, 255, 255, 0.14)'
          : isDark
            ? 'rgba(110, 150, 251, 0.12)'
            : 'rgba(36, 64, 211, 0.08)',
      }]}>
        <View style={styles.tabBarInner}>
          {pinnedStartRoute ? renderTab(pinnedStartRoute, 'pinned') : null}

          {scrollableRoutes.length > 0 ? (
            useUniformMiddleTabs ? (
              <View style={[styles.scrollableTabs, styles.scrollableTabsUniform]}>
                {scrollableRoutes.map((route) => renderTab(route, 'scroll', true))}
              </View>
            ) : (
            <ScrollView
              ref={middleScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scrollableTabs}
              contentContainerStyle={styles.scrollableTabsContent}
              keyboardShouldPersistTaps="handled"
              onScroll={(event) => {
                const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
                updateMiddleScrollHint(
                  contentOffset.x,
                  layoutMeasurement.width,
                  contentSize.width,
                );
              }}
              scrollEventThrottle={16}
              onContentSizeChange={(contentWidth) => {
                const { offsetX, layoutWidth } = middleScrollMetrics.current;
                updateMiddleScrollHint(offsetX, layoutWidth, contentWidth);
              }}
              onLayout={(event) => {
                const layoutWidth = event.nativeEvent.layout.width;
                const { offsetX, contentWidth } = middleScrollMetrics.current;
                updateMiddleScrollHint(offsetX, layoutWidth, contentWidth);
              }}
            >
              {scrollableRoutes.map((route) => renderTab(route, 'scroll'))}
            </ScrollView>
            )
          ) : (
            <View style={styles.scrollableTabs} />
          )}

          {showMiddleScrollHint && pinnedEndRoute && !useUniformMiddleTabs ? (
            <View
              style={styles.scrollHint}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <ChevronRight
                size={15}
                color={isShowsTabActive ? 'rgba(255, 255, 255, 0.55)' : colors.textMuted}
                strokeWidth={2.4}
              />
            </View>
          ) : null}

          {pinnedEndRoute ? renderTab(pinnedEndRoute, 'pinned') : null}
        </View>
      </BlurView>
    </Animated.View>
    </>
  );
}

// Restore the original, horizontally scrollable Overview / interest / Profile
// navigation. The simplified AI-first tabs are intentionally not registered.
function ClassicTabScreens() {
  const { getPersonalizedTabs } = useUserProfile();
  const visible = getClassicVisibleTabs(getPersonalizedTabs());

  return (
    <Tabs
      initialRouteName="activities"
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 90 : 70,
        },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {CLASSIC_TAB_NAMES.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: visible.includes(name) ? undefined : null }}
        />
      ))}
      {['today-focus', 'my-life', 'discover-concierge', 'discover-flagship', 'discover-life'].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <FootballBundleProvider>
      <F1BundleProvider>
        <HealthContextProvider>
          <DiscoverLifeContextProvider>
            <ClassicTabScreens />
          </DiscoverLifeContextProvider>
        </HealthContextProvider>
      </F1BundleProvider>
    </FootballBundleProvider>
  );
}

const styles = StyleSheet.create({
  tabBarDockScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: 30,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  glassContainer: {
    flex: 1,
    borderRadius: 36,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabButtonPinned: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabButtonScroll: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollableTabs: {
    flex: 1,
    minWidth: 0,
  },
  scrollableTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  scrollableTabsUniform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 2,
  },
  tabButtonScrollUniform: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  scrollHint: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: -2,
    opacity: 0.72,
  },
  tabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    marginTop: 3,
    textAlign: 'center' as const,
  },
  tabLabelFocused: {
    fontWeight: '600' as const,
  },
  profileAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
