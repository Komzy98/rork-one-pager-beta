import { Tabs } from "expo-router";
import { LayoutDashboard, Clapperboard, Medal, ListChecks, Search, CircleUser, CookingPot, CalendarDays, GraduationCap } from "lucide-react-native";
import React, { useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Platform, TouchableOpacity, Text, Animated, Image } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps, BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import * as Haptics from 'expo-haptics';

import { useUserProfile } from "@/hooks/useUserProfile";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColors } from "@/types/theme";



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

interface AnimatedTabItemProps {
  route: TabRoute;
  isFocused: boolean;
  onPress: () => void;
  options: BottomTabNavigationOptions;
  colors: ThemeColors;
  isShowsTabActive?: boolean;
  avatarUrl?: string;
}

const AnimatedTabItem = React.memo(({ 
  route, 
  isFocused, 
  onPress, 
  options, 
  colors, 
  isShowsTabActive,
  avatarUrl,
}: AnimatedTabItemProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconTranslateY = useRef(new Animated.Value(isFocused ? -2 : 0)).current;
  const bgOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconTranslateY, {
        toValue: isFocused ? -2 : 0,
        tension: 200,
        friction: 14,
        useNativeDriver: false,
      }),
      Animated.spring(bgOpacity, {
        toValue: isFocused ? 1 : 0,
        tension: 200,
        friction: 14,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: isFocused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused, iconTranslateY, bgOpacity, labelOpacity]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      tension: 200,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
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
  const inactiveColor = 'rgba(255, 255, 255, 0.45)';

  return (
    <View style={styles.tabButton}>
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
        <Animated.View style={[
          styles.tabActiveBg,
          {
            opacity: bgOpacity,
            backgroundColor: activeColor + '18',
          },
        ]} />
        <Animated.View style={[{ transform: [{ translateY: iconTranslateY }] }]}>
          {route.name === 'profile' && avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[
                styles.profileAvatar,
                { borderColor: isFocused ? activeColor : 'rgba(255,255,255,0.15)' },
              ]}
            />
          ) : (
            <IconComponent 
              color={isFocused ? activeColor : inactiveColor} 
              size={21} 
              strokeWidth={isFocused ? 2.4 : 1.8}
            />
          )}
        </Animated.View>
        <Animated.Text style={[
          styles.tabLabel,
          { 
            color: isFocused ? activeColor : inactiveColor,
            opacity: labelOpacity,
          },
          isFocused && styles.tabLabelFocused
        ]}>
          {label}
        </Animated.Text>
        {isFocused && (
          <View style={[styles.tabActiveIndicator, { backgroundColor: activeColor }]} />
        )}
      </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

AnimatedTabItem.displayName = 'AnimatedTabItem';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { getPersonalizedTabs, profile } = useUserProfile();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const personalizedTabs = getPersonalizedTabs();
  const containerOpacity = useRef(new Animated.Value(0)).current;

  const visibleRoutes = state.routes.filter((route) => 
    personalizedTabs.includes(route.name)
  ).sort((a, b) => personalizedTabs.indexOf(a.name) - personalizedTabs.indexOf(b.name));

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [containerOpacity]);

  const currentRouteName = state.routes[state.index]?.name;
  const isShowsTabActive = currentRouteName === 'shows';

  return (
    <Animated.View style={[styles.tabBarContainer, {
      shadowColor: isShowsTabActive ? '#FF4444' : colors.shadow,
      opacity: containerOpacity,
    }]}>
      <BlurView intensity={isShowsTabActive ? 130 : 100} tint="dark" style={[styles.blurContainer, {
        backgroundColor: isShowsTabActive ? 'rgba(0, 0, 0, 0.88)' : (isDark ? 'rgba(8, 8, 18, 0.82)' : 'rgba(12, 12, 20, 0.78)'),
        borderWidth: 0.5,
        borderColor: isShowsTabActive ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
      }]}>
        <View style={styles.tabBarInner}>
          {visibleRoutes.map((route) => {
            const routeIndex = state.routes.findIndex(r => r.name === route.name);
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
              />
            );
          })}
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
      <Tabs 
        screenOptions={commonScreenOptions}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="activities" />
        <Tabs.Screen name="profile" />
      </Tabs>
    );
  }

  const personalizedTabs = getPersonalizedTabs();
  const allTabs = ['activities', 'tasks', 'shows', 'sports', 'cooking', 'learning', 'events', 'discover', 'profile'];

  return (
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
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 34,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  glassContainer: {
    flex: 1,
    borderRadius: 34,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    borderRadius: 34,
    overflow: 'hidden',
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    minWidth: 56,
    position: 'relative' as const,
  },
  tabActiveBg: {
    position: 'absolute' as const,
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 18,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    marginTop: 3,
    textAlign: 'center' as const,
    letterSpacing: 0.1,
  },
  tabLabelFocused: {
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  tabActiveIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  profileAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
