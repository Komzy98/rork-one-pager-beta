import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import {
  Clock3,
  Compass,
  LayoutGrid,
  UserRound,
} from "lucide-react-native";

import { DiscoverLifeContextProvider } from "@/contexts/DiscoverLifeContextProvider";
import { FootballBundleProvider } from "@/contexts/FootballBundleContext";
import { F1BundleProvider } from "@/contexts/F1BundleContext";
import { HealthContextProvider } from "@/contexts/HealthContext";
import BackNavigationButton from "@/components/navigation/BackNavigationButton";
import { useTheme } from "@/hooks/useTheme";
import { interFont } from "@/constants/fonts";

const PRIMARY_TABS = [
  {
    name: "today-coherent",
    title: "Today",
    icon: Clock3,
  },
  {
    name: "my-life-world",
    title: "My Life",
    icon: LayoutGrid,
  },
  {
    name: "discover-focused",
    title: "Discover",
    icon: Compass,
  },
  {
    name: "profile",
    title: "You",
    icon: UserRound,
  },
] as const;

const LEGACY_TABS = [
  "activities",
  "profile",
  "you-coherent",
  "today-focus",
  "today-overview",
  "my-life",
  "tasks",
  "discover-focused",
  "discover-concierge",
  "discover-flagship",
  "discover-life",
  "discover",
  "shows",
  "sports",
  "cooking",
  "learning",
  "events",
] as const;

/**
 * These are full-screen workspaces opened from My Life. They are intentionally
 * hidden from the tab bar, but unlike primary tabs they must always provide a
 * clear route back to the screen that opened them.
 */
const DRILL_DOWN_TABS = new Set<string>([
  "activities",
  "tasks",
  "shows",
  "sports",
  "cooking",
  "learning",
  "events",
]);

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <FootballBundleProvider>
      <F1BundleProvider>
        <HealthContextProvider>
          <DiscoverLifeContextProvider>
            <Tabs
              initialRouteName="today-coherent"
              screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                  fontFamily: interFont("600"),
                  fontSize: 11,
                  fontWeight: "600",
                  marginTop: 2,
                },
                tabBarItemStyle: {
                  paddingTop: 1,
                },
                tabBarStyle: {
                  position: "absolute",
                  height: Platform.OS === "ios" ? 82 : 68,
                  paddingTop: 8,
                  paddingBottom: Platform.OS === "ios" ? 20 : 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.tabBarBorder || (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"),
                  backgroundColor: colors.tabBarBackground || (isDark ? "#0D0E12" : "#FFFFFF"),
                  elevation: 0,
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: isDark ? 0.18 : 0.04,
                  shadowRadius: 12,
                },
              }}
            >
              {PRIMARY_TABS.map(({ name, title, icon: Icon }) => (
                <Tabs.Screen
                  key={name}
                  name={name}
                  options={{
                    title,
                    tabBarAccessibilityLabel: title,
                    tabBarIcon: ({ color, size, focused }) => (
                      <Icon
                        color={color}
                        size={focused ? size + 1 : size}
                        strokeWidth={focused ? 2.35 : 2}
                      />
                    ),
                  }}
                />
              ))}

              {LEGACY_TABS.filter((name) => !PRIMARY_TABS.some((tab) => tab.name === name)).map((name) => {
                const isDrillDown = DRILL_DOWN_TABS.has(name);

                return (
                  <Tabs.Screen
                    key={name}
                    name={name}
                    options={{
                      href: null,
                      ...(isDrillDown
                        ? {
                            headerShown: true,
                            headerTransparent: true,
                            headerShadowVisible: false,
                            headerTitle: "",
                            headerLeft: () => <BackNavigationButton style={{ marginLeft: 16 }} />,
                          }
                        : {
                            headerShown: false,
                          }),
                    }}
                  />
                );
              })}
            </Tabs>
          </DiscoverLifeContextProvider>
        </HealthContextProvider>
      </F1BundleProvider>
    </FootballBundleProvider>
  );
}
