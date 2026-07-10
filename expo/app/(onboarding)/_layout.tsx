import { Stack } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ONBOARDING_PREMIUM } from '@/constants/onboardingTheme';

export default function OnboardingLayout() {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...ONBOARDING_PREMIUM.gradientColors]}
        locations={[...ONBOARDING_PREMIUM.gradientLocations]}
        style={StyleSheet.absoluteFillObject}
        start={ONBOARDING_PREMIUM.gradientStart}
        end={ONBOARDING_PREMIUM.gradientEnd}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade_from_bottom',
          animationDuration: 280,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="event-categories" />
      <Stack.Screen name="football-favorites" />
      <Stack.Screen name="leagues" />
      <Stack.Screen name="streaming" />
      <Stack.Screen name="chronotype" />
      <Stack.Screen name="nationality" />
      <Stack.Screen name="countries" />
      <Stack.Screen name="teams" />
      <Stack.Screen name="nba-teams" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="feed-tuning" />
      <Stack.Screen name="joy-sources" />
      <Stack.Screen name="complete" options={{ animation: 'fade' }} />
    </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
});
