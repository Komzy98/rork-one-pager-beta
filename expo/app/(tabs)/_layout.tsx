import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import {
  Compass,
  LayoutGrid,
  Sparkles,
  UserRound,
} from "lucide-react-native";

import { FootballBundleProvider } from "@/contexts/FootballBundleContext";
import { F1BundleProvider } from "@/contexts/F1BundleContext";
import { useTheme } from "@/hooks/useTheme";

const PRIMARY_TABS = [
  {
    name: "activities",
    title: "Today",
    icon: Sparkles,
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
  "today-execution",
  "today-focus",
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

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <FootballBundleProvider>
      <F1BundleProvider>
        <Tabs
          initialRouteName="activities"
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
              marginTop: 2,
            },
            tabBarStyle: {
              position: "absolute",
              height: Platform.OS === "ios" ? 84 : 68,
              paddingTop: 8,
              paddingBottom: Platform.OS === "ios" ? 22 : 10,
              borderTopWidth: 1,
              borderTopColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.08)",
              backgroundColor: isDark ? "#0D0E12" : "#FFFFFF",
              elevation: 0,
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
                    size={focused ? size + 2 : size}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                ),
              }}
            />
          ))}

          {LEGACY_TABS.filter((name) => !PRIMARY_TABS.some((tab) => tab.name === name)).map((name) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                href: null,
              }}
            />
          ))}
        </Tabs>
      </F1BundleProvider>
    </FootballBundleProvider>
  );
}
