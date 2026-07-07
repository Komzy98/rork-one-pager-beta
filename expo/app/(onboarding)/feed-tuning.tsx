import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Globe, Sparkles, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';
import { getNextOnboardingRoute, hasFootballOnboarding } from '@/utils/onboardingFlow';
import {
  buildFeedTuningPreview,
  type FeedTuningPreviewMatch,
} from '@/utils/feedTuningPreview';

function FeedPreviewRow({ match }: { match: FeedTuningPreviewMatch }) {
  const isNational = match.kind === 'national-wc' || match.kind === 'national-qualifier';
  return (
    <View style={previewStyles.row}>
      <View style={previewStyles.rowTop}>
        {isNational ? (
          <Globe size={11} color={COLORS.primary} />
        ) : (
          <Trophy size={11} color={COLORS.textMuted} />
        )}
        <Text style={previewStyles.competition}>{match.competition}</Text>
        {match.isFollowed ? (
          <View style={previewStyles.followedPill}>
            <Text style={previewStyles.followedPillText}>Following</Text>
          </View>
        ) : null}
      </View>
      <View style={previewStyles.matchLine}>
        <Text style={previewStyles.team} numberOfLines={1}>
          {match.homeEmoji ? `${match.homeEmoji} ` : ''}
          {match.homeTeam}
        </Text>
        <Text style={previewStyles.vs}>vs</Text>
        <Text style={[previewStyles.team, previewStyles.teamRight]} numberOfLines={1}>
          {match.awayTeam}
          {match.awayEmoji ? ` ${match.awayEmoji}` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function FeedTuningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { totalSteps, currentStep, hasFootballInterest } = useOnboardingStepMeta('feed-tuning');
  const interests = profile?.interests ?? [];

  useEffect(() => {
    if (profile && !hasFootballOnboarding(interests)) {
      router.replace(getNextOnboardingRoute('interests', interests) as any);
    }
  }, [profile, interests, router]);

  const nationalities = profile?.nationalities ?? [];
  const hasCountries = nationalities.length > 0;

  const [strictFollowing, setStrictFollowing] = useState(
    profile?.sportsFeedPrefs?.strictFollowing ?? false,
  );
  const [prioritizeNationalTeams, setPrioritizeNationalTeams] = useState(
    profile?.sportsFeedPrefs?.prioritizeNationalTeams ?? hasCountries,
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
        prioritizeNationalTeams: hasCountries ? prioritizeNationalTeams : false,
      },
    });
    router.push(getNextOnboardingRoute('feed-tuning', interests) as any);
  }, [
    updateProfile,
    strictFollowing,
    discoveryLevel,
    profile?.sportsFeedPrefs?.prioritizeDomesticLeagues,
    prioritizeNationalTeams,
    hasCountries,
    router,
    interests,
  ]);

  const handleSkip = useCallback(() => {
    router.push(getNextOnboardingRoute('feed-tuning', interests) as any);
  }, [router, interests]);

  const previewMatches = useMemo(
    () =>
      buildFeedTuningPreview({
        nationalities,
        favoriteTeams: profile?.favoriteTeams ?? [],
        prioritizeNationalTeams: hasCountries ? prioritizeNationalTeams : false,
        strictFollowing,
        bigMatchesDiscovery,
      }),
    [
      nationalities,
      profile?.favoriteTeams,
      prioritizeNationalTeams,
      hasCountries,
      strictFollowing,
      bigMatchesDiscovery,
    ],
  );

  const previewCaption = useMemo(() => {
    if (strictFollowing && !bigMatchesDiscovery) {
      return 'Only matches you follow — no filler.';
    }
    if (prioritizeNationalTeams && hasCountries) {
      return 'National teams rise to the top when toggled on.';
    }
    if (bigMatchesDiscovery) {
      return 'Marquee club fixtures appear when you browse Explore.';
    }
    return 'Updates live as you change settings below.';
  }, [strictFollowing, bigMatchesDiscovery, prioritizeNationalTeams, hasCountries]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleWrap}>
          <Text style={styles.stepLabel}>STEP {currentStep} · FOR YOU</Text>
          <Text style={styles.title}>Tune your Sports feed</Text>
          <Text style={styles.subtitle}>
            Choose how club and national-team matches rank in For You — teams and countries are set on
            the previous step.
          </Text>
        </View>

        <View style={styles.feedPreviewSection}>
          <View style={styles.feedPreviewHeader}>
            <Sparkles size={15} color={COLORS.primary} />
            <Text style={styles.feedPreviewTitle}>Your For You feed</Text>
          </View>
          <Text style={styles.feedPreviewCaption}>{previewCaption}</Text>
          <View style={styles.feedPreviewStack}>
            {previewMatches.map((match) => (
              <FeedPreviewRow key={match.id} match={match} />
            ))}
          </View>
        </View>

        {hasFootballInterest ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Globe size={16} color={COLORS.primary} />
              <Text style={styles.cardTitle}>National teams</Text>
              <TouchableOpacity
                onPress={() => router.push('/(onboarding)/football-favorites' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            {hasCountries ? (
              <View style={styles.chipRow}>
                {nationalities.map((nation) => (
                  <View key={nation.id} style={styles.chip}>
                    <Text style={styles.chipFlag}>{nation.flag}</Text>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {nation.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/(onboarding)/football-favorites' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.editLinkBlock}>Add national teams on the previous step</Text>
              </TouchableOpacity>
            )}

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>My countries first</Text>
                <Text style={styles.toggleSub}>
                  Pin national-team matches to the top of For You.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  prioritizeNationalTeams && hasCountries && styles.toggleOn,
                  !hasCountries && styles.toggleDisabled,
                ]}
                onPress={() => hasCountries && setPrioritizeNationalTeams((v) => !v)}
                activeOpacity={hasCountries ? 0.85 : 1}
                disabled={!hasCountries}
              >
                <Text
                  style={[
                    styles.toggleText,
                    prioritizeNationalTeams && hasCountries && styles.toggleTextOn,
                  ]}
                >
                  {prioritizeNationalTeams && hasCountries ? 'On' : 'Off'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Only what I follow</Text>
          <Text style={styles.cardSub}>
            {hasCountries
              ? 'Limit For You to your clubs and national teams — less filler.'
              : 'Show followed clubs first and keep discovery minimal.'}
          </Text>
          <TouchableOpacity
            style={[styles.toggle, strictFollowing && styles.toggleOn]}
            onPress={() => setStrictFollowing((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, strictFollowing && styles.toggleTextOn]}>
              {strictFollowing ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Big matches discovery</Text>
          <Text style={styles.cardSub}>
            Include marquee club fixtures in Explore — top leagues and UEFA comps beyond your profile.
          </Text>
          <TouchableOpacity
            style={[styles.toggle, bigMatchesDiscovery && styles.toggleOn]}
            onPress={() => setBigMatchesDiscovery((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, bigMatchesDiscovery && styles.toggleTextOn]}>
              {bigMatchesDiscovery ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  titleWrap: { paddingHorizontal: 24, marginBottom: 6 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
  title: { marginTop: 6, fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  feedPreviewSection: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
    backgroundColor: COLORS.surface,
    padding: 14,
    gap: 8,
  },
  feedPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedPreviewTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  feedPreviewCaption: { fontSize: 12, lineHeight: 17, color: COLORS.textMuted, fontWeight: '500' },
  feedPreviewStack: { gap: 8, marginTop: 2 },
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  editLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  editLinkBlock: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  cardSub: { fontSize: 13, lineHeight: 18, color: COLORS.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    maxWidth: '100%',
  },
  chipFlag: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text, maxWidth: 120 },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${COLORS.primary}55`,
    backgroundColor: `${COLORS.primary}10`,
  },
  addChipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  addCountriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
    backgroundColor: `${COLORS.primary}0D`,
  },
  addCountriesText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  toggleCopy: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  toggleSub: { marginTop: 2, fontSize: 12, lineHeight: 16, color: COLORS.textMuted },
  toggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleOn: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}18` },
  toggleDisabled: { opacity: 0.45 },
  toggleText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  toggleTextOn: { color: COLORS.primary },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  continueBtn: { borderRadius: 14, backgroundColor: COLORS.primary },
  continueBtnInner: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSub: { paddingHorizontal: 20, fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 14,
  },
  searchInput: { paddingVertical: 12, fontSize: 15, color: COLORS.text },
  modalList: { flex: 1, paddingHorizontal: 20 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  modalRowDisabled: { opacity: 0.5 },
  modalFlag: { fontSize: 22 },
  modalName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalNameDisabled: { color: COLORS.textMuted },
  addedLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});

const previewStyles = StyleSheet.create({
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  competition: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  followedPill: {
    borderRadius: 999,
    backgroundColor: `${COLORS.primary}18`,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  followedPillText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  matchLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  team: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  teamRight: { textAlign: 'right' },
  vs: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
});
