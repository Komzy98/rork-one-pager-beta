import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { COLORS } from '@/constants/colors';

export default function Index() {
  const { isAuthenticated, isInitialized, isGuest, user } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();

  if (__DEV__) {
    console.log('🏠 [Index] Page state:', {
      platform: Platform.OS,
      isInitialized,
      isAuthenticated,
      isGuest,
      hasUser: !!user,
      hasProfile: !!profile,
      profileLoading,
      onboardingCompleted: profile?.onboardingCompleted
    });
  }

  // Show loading while initializing - but don't block hydration
  if (!isInitialized) {
    if (__DEV__) console.log('🔄 Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Not authenticated - go to login
  if (!isAuthenticated) {
    if (__DEV__) console.log('🔐 Not authenticated, redirecting to login');
    return <Redirect href={"/(auth)/login" as any} />;
  }

  // Guest user - go to onboarding
  if (isGuest) {
    if (__DEV__) console.log('👤 Guest user, redirecting to onboarding');
    return <Redirect href={"/(onboarding)/welcome" as any} />;
  }

  if (profile?.onboardingCompleted) {
    if (__DEV__) console.log('✅ Onboarding completed, redirecting to main app');
    return <Redirect href={"/(tabs)/activities" as any} />;
  }

  // Never block onboarding on profile hydration — new signups seed a default profile quickly.
  if (!profile || !profile.onboardingCompleted) {
    if (__DEV__) console.log('📋 Onboarding not completed, redirecting to welcome');
    return <Redirect href={"/(onboarding)/welcome" as any} />;
  }

  if (profileLoading) {
    if (__DEV__) console.log('🔄 Profile still loading');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Redirect href={"/(tabs)/activities" as any} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  }
});