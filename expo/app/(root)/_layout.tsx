import { Stack } from "expo-router";
import { COLORS } from "@/constants/colors";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      headerBackVisible: false,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: COLORS.background },
      gestureEnabled: true 
    }}>
      <Stack.Screen 
        name="new-habit" 
        options={{ 
          headerShown: false,
          title: "Add New Habit",
          headerBackVisible: false,
        }} 
      />
      <Stack.Screen 
        name="habit/[id]" 
        options={{ 
          headerShown: false,
          title: "Habit Details",
          headerBackVisible: false,
        }} 
      />
      <Stack.Screen 
        name="analytics" 
        options={{ 
          headerShown: false,
          title: "Analytics",
        }} 
      />
      <Stack.Screen 
        name="daily-agent" 
        options={{ 
          headerShown: false,
          title: "Daily Agent",
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="watching-map" 
        options={{ 
          headerShown: false,
          title: "Watching Nearby",
        }} 
      />
      <Stack.Screen 
        name="privacy-policy" 
        options={{ 
          headerShown: false,
          title: "Privacy Policy",
        }} 
      />
      <Stack.Screen 
        name="terms-of-use" 
        options={{ 
          headerShown: false,
          title: "Terms of Use",
        }} 
      />
    </Stack>
  );
}