import { Stack } from "expo-router";
import { COLORS } from "@/constants/colors";

export default function HabitLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      headerBackVisible: false,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: COLORS.background },
    }}>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false,
          title: "Habit Details",
        }} 
      />
    </Stack>
  );
}