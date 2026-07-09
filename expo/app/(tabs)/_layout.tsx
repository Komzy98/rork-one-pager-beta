import { Tabs } from "expo-router";
import { LayoutDashboard, Clapperboard, Medal, ListChecks, Search, CircleUser, CookingPot, CalendarDays, GraduationCap } from "lucide-react-native";
import React, { useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Platform, TouchableOpacity, Text, Animated, Image, ScrollView } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps, BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import * as Haptics from 'expo-haptics';

import { useUserProfile } from "@/hooks/useUserProfile";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColors } from "@/types/theme";
import { FootballBundleProvider } from "@/contexts/FootballBundleContext";
import { F1BundleProvider } from "@/contexts/F1BundleContext";



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
  variant?: 'pinned' | 'scroll';
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
  variant = 'scroll',
  onLayout,
}: AnimatedTabItemProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;
  const glowOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: isFocused ? 1.15 : 1,
        tension: 180,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.spring(glowOpacity, {
        toValue: isFocused ? 1 : 0,
        tension: 180,
        friction: 12,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused, iconScale, glowOpacity]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 180,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 180,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const IconComponent = getTabIcon(route.name);
  const label = getTabTitle(route.name);

  const activeColor = isShowsTabActive ? '#FF4444' : colors.primary;
  const inactiveColor = isFocused ? activeColor : colors.textSecondary;

  return (
    <View
      style={variant === 'pinned' ? styles.tabButtonPinned : styles.tabButtonScroll}
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
          <Animated.View style={{
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowOpacity,
            shadowRadius: 8,
          }}>
            {route.name === 'profile' && avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={[
                  styles.profileAvatar,
                  { borderColor: isFocused ? activeColor : 'transparent' },
                ]}
              />
            ) : (
              <IconComponent 
                color={isFocused ? activeColor : inactiveColor} 
                size={22} 
              />
            )}
          </Animated.View>
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
  const { getPersonalizedTabs, profile, recordTabVisit } = useUserProfile();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const personalizedTabs = getPersonalizedTabs();
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const middleScrollRef = useRef<ScrollView>(null);
  const middleTabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const visibleRoutes = state.routes.filter((route) => 
    personalizedTabs.includes(route.name)
  ).sort((a, b) => personalizedTabs.indexOf(a.name) - personalizedTabs.indexOf(b.name));

  const pinnedStartRoute = visibleRoutes.find((route) => route.name === PINNED_START_TAB);
  const pinnedEndRoute = visibleRoutes.find((route) => route.name === PINNED_END_TAB);
  const scrollableRoutes = visibleRoutes.filter(
    (route) => route.name !== PINNED_START_TAB && route.name !== PINNED_END_TAB,
  );

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [containerOpacity]);

  const currentRouteName = state.routes[state.index]?.name;
  const isShowsTabActive = currentRouteName === 'shows';
  const scrollableTabNames = scrollableRoutes.map((route) => route.name).join(',');
  const lastRecordedTabRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentRouteName || lastRecordedTabRef.current === currentRouteName) {
      return;
    }

    lastRecordedTabRef.current = currentRouteName;
    recordTabVisit(currentRouteName);
  }, [currentRouteName, recordTabVisit]);

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

  const renderTab = (route: (typeof state.routes)[number], variant: 'pinned' | 'scroll') => {
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
        avatarUrl={profile?.avatar || user?.avatar}
        variant={variant}
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

  return (
    <Animated.View style={[styles.tabBarContainer, {
      shadowColor: colors.shadow,
      opacity: containerOpacity,
    }]}>
      <BlurView intensity={isShowsTabActive ? 88 : 72} tint={isDark ? 'dark' : 'light'} style={[styles.blurContainer, {
        backgroundColor: isShowsTabActive ? 'rgba(13, 14, 18, 0.72)' : (isDark ? 'rgba(13, 14, 18, 0.58)' : 'rgba(255, 255, 255, 0.72)'),
        borderColor: isDark ? 'rgba(110, 150, 251, 0.12)' : 'rgba(36, 64, 211, 0.08)',
      }]}>
        <View style={styles.tabBarInner}>
          {pinnedStartRoute ? renderTab(pinnedStartRoute, 'pinned') : null}

          {scrollableRoutes.length > 0 ? (
            <ScrollView
              ref={middleScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scrollableTabs}
              contentContainerStyle={styles.scrollableTabsContent}
              keyboardShouldPersistTaps="handled"
            >
              {scrollableRoutes.map((route) => renderTab(route, 'scroll'))}
            </ScrollView>
          ) : (
            <View style={styles.scrollableTabs} />
          )}

          {pinnedEndRoute ? renderTab(pinnedEndRoute, 'pinned') : null}
        </View>
      </BlurView>
    </Animated.View>
  );
}

export default function TabLayout() {
  const { getPersonalizedTabs, isLoading } = useUserProfile();

  const commonScreenOptions = {
    headerShown: false,
    tabBarStyle: {
      position: 'absolute' as const,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      height: Platform.OS === 'ios' ? 90 : 70,
    },
  };

  if (isLoading) {
    return (
      <FootballBundleProvider>
        <F1BundleProvider>
          <Tabs
            screenOptions={commonScreenOptions}
            tabBar={(props) => <CustomTabBar {...props} />}
          >
            <Tabs.Screen name="activities" />
            <Tabs.Screen name="profile" />
          </Tabs>
        </F1BundleProvider>
      </FootballBundleProvider>
    );
  }

  const personalizedTabs = getPersonalizedTabs();
  const allTabs = ['activities', 'tasks', 'shows', 'sports', 'cooking', 'learning', 'events', 'discover', 'profile'];

  return (
    <FootballBundleProvider>
      <F1BundleProvider>
        <Tabs
          screenOptions={commonScreenOptions}
          tabBar={(props) => <CustomTabBar {...props} />}
        >
          {allTabs.map((tabName) => {
            const isVisible = personalizedTabs.includes(tabName);

            return (
              <Tabs.Screen
                key={tabName}
                name={tabName}
                options={{
                  href: isVisible ? undefined : null,
                }}
              />
            );
          })}
        </Tabs>
      </F1BundleProvider>
    </FootballBundleProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 62,
    borderRadius: 30,
    overflow: 'visible',
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
