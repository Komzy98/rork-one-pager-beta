import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';

export default function FeedTuningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { totalSteps, stepFeedTuning } = useOnboardingStepMeta();
  const [strictFollowing, setStrictFollowing] = useState(
    profile?.sportsFeedPrefs?.strictFollowing ?? false,
  );
  const [bigMatchesDiscovery, setBigMatchesDiscovery] = useState(
    (profile?.sportsFeedPrefs?.discoveryLevel ?? 'med') !== 'low',
  );

  const discoveryLevel = useMemo<'low' | 'med' | 'high'>(
    () => (bigMatchesDiscovery ? 'high' : 'low'),
    [bigMatchesDiscovery],
  );

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateProfile({
      sportsFeedPrefs: {
        strictFollowing,
        includeFollowedLeagues: true,
        discoveryLevel,
        prioritizeDomesticLeagues: profile?.sportsFeedPrefs?.prioritizeDomesticLeagues ?? true,
      },
    });
    router.push('/(onboarding)/complete' as any);
  }, [updateProfile, strictFollowing, discoveryLevel, profile?.sportsFeedPrefs?.prioritizeDomesticLeagues, router]);

  const handleSkip = useCallback(() => {
    router.push('/(onboarding)/complete' as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={stepFeedTuning} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.stepLabel}>STEP {stepFeedTuning} · FOR YOU</Text>
        <Text style={styles.title}>Tune your Sports feed</Text>
        <Text style={styles.subtitle}>30 seconds to make “For You” feel truly yours.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My clubs only (strict)</Text>
        <Text style={styles.cardSub}>Show followed clubs first and keep discovery minimal.</Text>
        <TouchableOpacity style={[styles.toggle, strictFollowing && styles.toggleOn]} onPress={() => setStrictFollowing((v) => !v)} activeOpacity={0.85}>
          <Text style={[styles.toggleText, strictFollowing && styles.toggleTextOn]}>{strictFollowing ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Big matches discovery</Text>
        <Text style={styles.cardSub}>Include marquee fixtures to keep your feed lively.</Text>
        <TouchableOpacity style={[styles.toggle, bigMatchesDiscovery && styles.toggleOn]} onPress={() => setBigMatchesDiscovery((v) => !v)} activeOpacity={0.85}>
          <Text style={[styles.toggleText, bigMatchesDiscovery && styles.toggleTextOn]}>{bigMatchesDiscovery ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewCard}>
        <Sparkles size={14} color={COLORS.primary} />
        <Text style={styles.previewText}>
          Your Sports Feed will prioritize: {strictFollowing ? 'clubs you follow' : 'your selected leagues'}{bigMatchesDiscovery ? ', plus big-match discovery' : ''}.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={handleContinue}>
          <View style={styles.continueBtnInner}>
            <Text style={styles.continueText}>Continue</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrap: { flex: 1, paddingHorizontal: 16 },
  skipText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  titleWrap: { paddingHorizontal: 24, marginBottom: 10 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
  title: { marginTop: 6, fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 13, lineHeight: 18, color: COLORS.textMuted },
  toggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  toggleOn: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}18` },
  toggleText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  toggleTextOn: { color: COLORS.primary },
  previewCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: `${COLORS.primary}0D`,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewText: { flex: 1, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, fontWeight: '600' },
  footer: { marginTop: 'auto', paddingHorizontal: 20 },
  continueBtn: { borderRadius: 14, backgroundColor: COLORS.primary },
  continueBtnInner: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

