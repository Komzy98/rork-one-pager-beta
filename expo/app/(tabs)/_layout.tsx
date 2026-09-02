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
    name: "you-coherent",
    title: "You",
    icon: UserRound,
  },
] as const;

const LEGACY_TABS = [
  "activities",
  "profile",
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
        </DiscoverLifeContextProvider>
      </F1BundleProvider>
    </FootballBundleProvider>
  );
}
