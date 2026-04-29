import React, { useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Link2, Sparkles, Tv, ListChecks, Zap, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { COLORS } from '@/constants/colors';
import { ONBOARDING_PREMIUM } from '@/constants/onboardingTheme';

const FEATURES = [
  { icon: Link2, title: 'Streaming services', desc: 'Connect providers for Continue watching & picks' },
  { icon: Zap, title: 'Smart habits & tasks', desc: 'AI-assisted routines that fit your day' },
  { icon: Sparkles, title: 'Live sports', desc: 'Scores, teams, and alerts you care about' },
  { icon: Tv, title: 'Shows & movies', desc: 'Track what you watch in one place' },
  { icon: ListChecks, title: 'Your overview', desc: 'Calendar, weather, and daily focus' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { completeOnboarding, isLoading: profileLoading } = useUserProfile();
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.92)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(contentY, { toValue: 0, useNativeDriver: true, tension: 56, friction: 10 }),
    ]).start();
  }, [logoScale, contentOpacity, contentY]);

  const handleGetStarted = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(onboarding)/interests' as any);
  }, [router]);

  const handleSkipSetup = useCallback(() => {
    if (profileLoading) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    completeOnboarding();
    router.replace('/(tabs)/activities' as any);
  }, [completeOnboarding, router, profileLoading]);

  const handleCreateAccount = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(auth)/signup' as any);
  }, [router]);

  const userName = isGuest ? 'there' : user?.name?.split(' ')[0] || 'there';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentY }],
          flex: 1,
        }}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Personal setup</Text>
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
            <Image
              source={{ uri: 'https://r2-pub.rork.com/attachments/fjpmfu4g76ll0wi3po34f' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.greeting}>Hey {userName}</Text>
          <Text style={styles.tagline}>
            Let&apos;s tailor One Pager to you — streaming, sports, and habits.
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <View key={f.title} style={[styles.featureCard, ONBOARDING_PREMIUM.cardElevated]}>
                <View style={styles.featureIcon}>
                  <Icon size={20} color={COLORS.primary} strokeWidth={2} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtnOuter, ONBOARDING_PREMIUM.primaryButtonShadow]}
            onPress={handleGetStarted}
            activeOpacity={0.92}
            testID="onboarding-get-started"
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
              <View style={styles.primaryBtnIcon}>
                <ArrowRight size={18} color="#FFF" strokeWidth={2.5} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipBtn, profileLoading && styles.skipBtnDisabled]}
            onPress={handleSkipSetup}
            activeOpacity={0.85}
            disabled={profileLoading}
          >
            <Text style={styles.skipBtnText}>{profileLoading ? 'Loading…' : 'Skip for now'}</Text>
            <Text style={styles.skipHint}>Use the app with defaults; change anytime in Profile</Text>
          </TouchableOpacity>

          <View style={styles.securityHintCard}>
            <Shield size={14} color={COLORS.textMuted} />
            <Text style={styles.securityHintCardText}>Secure your account later with 2FA in Profile.</Text>
          </View>

          <Text style={styles.timeHint}>Full setup takes about 2 minutes · You can skip any step</Text>

          {isGuest ? (
            <TouchableOpacity style={styles.linkRow} onPress={handleCreateAccount} activeOpacity={0.7}>
              <Text style={styles.linkMuted}>Want an account? </Text>
              <Text style={styles.linkStrong}>Sign up</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
  },
  kicker: {
    ...ONBOARDING_PREMIUM.kicker,
    marginBottom: 14,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrap: {
    width: 92,
    height: 92,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    marginBottom: 22,
    ...ONBOARDING_PREMIUM.cardElevated,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_PREMIUM.hairlineBorder,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  greeting: {
    ...ONBOARDING_PREMIUM.displayLarge,
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    maxWidth: 340,
    alignSelf: 'center',
    letterSpacing: -0.15,
  },
  featureList: {
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 122, 255, 0.12)',
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
    fontWeight: '500',
  },
  actions: {
    marginTop: 'auto',
    gap: 12,
  },
  primaryBtnOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 28,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryBtnIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnDisabled: {
    opacity: 0.45,
  },
  skipBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  skipHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  securityHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_PREMIUM.hairlineBorder,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: ONBOARDING_PREMIUM.cardBg,
  },
  securityHintCardText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  timeHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkMuted: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  linkStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
