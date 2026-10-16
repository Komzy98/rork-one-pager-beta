import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { resolveStartupRoute } from '@/utils/startupRoute';
import { COLORS } from '@/constants/colors';

export default function Index() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const { profile, isLoading: profileLoading, profileRestoreError, retryLoadProfile } = useUserProfile();

  const route = resolveStartupRoute({
    authInitialized: isInitialized,
    isAuthenticated,
    userId: user?.id,
    profileLoading,
    profileRestoreError,
    profile,
  });

  switch (route) {
    case 'login':
      return <Redirect href={'/(auth)/login' as any} />;
    case 'overview':
      return <Redirect href={'/(tabs)/activities' as any} />;
    case 'onboarding':
      return <Redirect href={'/(onboarding)/welcome' as any} />;
    case 'recovery':
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.title}>We couldn't restore your profile</Text>
          <Text style={styles.description}>
            Your existing setup hasn't been reset. Check your connection and try again.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retry restoring my profile"
            testID="retry-profile-restore"
            style={styles.button}
            onPress={() => void retryLoadProfile()}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    default:
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.waitText}>Restoring your One Pager…</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 21, fontWeight: '800', textAlign: 'center', color: COLORS.text },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },
  waitText: { color: COLORS.textSecondary, marginTop: 16, fontSize: 13 },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 13,
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
