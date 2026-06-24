import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Globe, Plus, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';
import { ALL_NATIONS } from '@/constants/nations';
import { MAX_FOLLOWED_NATIONALITIES } from '@/constants/nationalTeams';
import type { UserNationality } from '@/types/habit';

export default function FeedTuningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, addNationality, removeNationality } = useUserProfile();
  const { totalSteps, stepFeedTuning, hasFootballInterest } = useOnboardingStepMeta();

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
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const discoveryLevel = useMemo<'low' | 'med' | 'high'>(
    () => (bigMatchesDiscovery ? 'high' : 'low'),
    [bigMatchesDiscovery],
  );

  const filteredNations = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return ALL_NATIONS;
    return ALL_NATIONS.filter((n) => n.name.toLowerCase().includes(q));
  }, [countrySearch]);

  const handleAddCountry = useCallback(
    (nation: (typeof ALL_NATIONS)[number]) => {
      if (nationalities.some((n) => n.id === nation.id)) return;
      if (nationalities.length >= MAX_FOLLOWED_NATIONALITIES) return;
      const entry: UserNationality = {
        id: nation.id,
        name: nation.name,
        code: nation.code,
        flag: nation.flag,
        apiId: nation.apiId,
      };
      addNationality(entry);
      setPrioritizeNationalTeams(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [nationalities, addNationality],
  );

  const handleRemoveCountry = useCallback(
    (id: string) => {
      removeNationality(id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [removeNationality],
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
    router.push('/(onboarding)/complete' as any);
  }, [
    updateProfile,
    strictFollowing,
    discoveryLevel,
    profile?.sportsFeedPrefs?.prioritizeDomesticLeagues,
    prioritizeNationalTeams,
    hasCountries,
    router,
  ]);

  const handleSkip = useCallback(() => {
    router.push('/(onboarding)/complete' as any);
  }, [router]);

  const previewText = useMemo(() => {
    const parts: string[] = [];
    if (hasCountries && prioritizeNationalTeams) {
      const names = nationalities.map((n) => n.name);
      if (names.length <= 2) {
        parts.push(names.join(' & '));
      } else {
        parts.push(`${names.slice(0, 2).join(', ')} +${names.length - 2} more`);
      }
    }
    if (strictFollowing) {
      parts.push('clubs you follow');
    } else {
      parts.push('your leagues');
    }
    if (bigMatchesDiscovery) {
      parts.push('big-match discovery');
    }
    if (hasCountries && prioritizeNationalTeams) {
      parts.push('World Cup fixtures');
    }
    return `Your For You feed will prioritize: ${parts.join(', ')}.`;
  }, [hasCountries, prioritizeNationalTeams, nationalities, strictFollowing, bigMatchesDiscovery]);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleWrap}>
          <Text style={styles.stepLabel}>STEP {stepFeedTuning} · FOR YOU</Text>
          <Text style={styles.title}>Tune your Sports feed</Text>
          <Text style={styles.subtitle}>
            Mix club football with the national teams you care about — your country, family roots, or
            rivals you want to track at the World Cup.
          </Text>
        </View>

        {hasFootballInterest ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Globe size={16} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Countries you follow</Text>
            </View>
            <Text style={styles.cardSub}>
              Up to {MAX_FOLLOWED_NATIONALITIES} — we surface qualifiers, friendlies and World Cup
              matches for each one.
            </Text>

            {hasCountries ? (
              <View style={styles.chipRow}>
                {nationalities.map((nation) => (
                  <View key={nation.id} style={styles.chip}>
                    <Text style={styles.chipFlag}>{nation.flag}</Text>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {nation.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveCountry(nation.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={12} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                {nationalities.length < MAX_FOLLOWED_NATIONALITIES ? (
                  <TouchableOpacity
                    style={styles.addChip}
                    onPress={() => setShowCountryModal(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color={COLORS.primary} />
                    <Text style={styles.addChipText}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addCountriesBtn}
                onPress={() => setShowCountryModal(true)}
                activeOpacity={0.85}
              >
                <Plus size={16} color={COLORS.primary} />
                <Text style={styles.addCountriesText}>Add countries to follow</Text>
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
          <Text style={styles.cardSub}>Include marquee club fixtures to keep your feed lively.</Text>
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

        <View style={styles.previewCard}>
          <Sparkles size={14} color={COLORS.primary} />
          <Text style={styles.previewText}>{previewText}</Text>
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

      <Modal visible={showCountryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Follow a country</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setShowCountryModal(false);
                setCountrySearch('');
              }}
            >
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>
            {nationalities.length}/{MAX_FOLLOWED_NATIONALITIES} selected
          </Text>
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              placeholderTextColor={COLORS.textMuted}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {filteredNations.map((nation) => {
              const isAdded = nationalities.some((n) => n.id === nation.id);
              const atMax = nationalities.length >= MAX_FOLLOWED_NATIONALITIES && !isAdded;
              return (
                <TouchableOpacity
                  key={nation.id}
                  style={[styles.modalRow, (isAdded || atMax) && styles.modalRowDisabled]}
                  onPress={() => !isAdded && !atMax && handleAddCountry(nation)}
                  disabled={isAdded || atMax}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalFlag}>{nation.flag}</Text>
                  <Text
                    style={[styles.modalName, (isAdded || atMax) && styles.modalNameDisabled]}
                  >
                    {nation.name}
                  </Text>
                  {isAdded ? <Text style={styles.addedLabel}>Following</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
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
