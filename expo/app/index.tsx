import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { COLORS } from '@/constants/colors';

export default function Index() {
  const { isAuthenticated, isInitialized, isGuest, user } = useAuth();
  const { profile } = useUserProfile();

  if (__DEV__) {
    console.log('🏠 [Index] Page state:', {
      platform: Platform.OS,
      isInitialized,
      isAuthenticated,
      isGuest,
      hasUser: !!user,
      hasProfile: !!profile,
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
  
  // Don't block on profile loading - let the app render and load profile in background
  // This prevents hydration timeout issues
  
  // Authenticated but onboarding not completed
  if (profile && !profile.onboardingCompleted) {
    if (__DEV__) console.log('📋 Onboarding not completed, redirecting to welcome');
    return <Redirect href={"/(onboarding)/welcome" as any} />;
  }

  // Authenticated and onboarding completed - go to main app
  if (__DEV__) console.log('✅ All checks passed, redirecting to main app');
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