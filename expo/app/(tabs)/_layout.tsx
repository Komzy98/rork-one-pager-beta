import { Tabs } from "expo-router";
import { Tv, Trophy, Compass, User, LayoutGrid } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : undefined,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shows"
        options={{
          title: "Shows",
          tabBarIcon: ({ color, size }) => <Tv size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: "Sports",
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="cooking" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="learning" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
    </Tabs>
  );
}
