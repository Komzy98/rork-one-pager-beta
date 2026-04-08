import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'fade_from_bottom',
        animationDuration: 300,
        contentStyle: { backgroundColor: '#050505' },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="chronotype" />
      <Stack.Screen name="nationality" />
      <Stack.Screen name="countries" />
      <Stack.Screen name="teams" />
      <Stack.Screen name="complete" options={{ animation: 'fade' }} />
    </Stack>
  );
}
