import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Search, Trophy, Globe, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import FootballLeagueLogo from '@/components/FootballLeagueLogo';
import { COLORS } from '@/constants/colors';
import { ALL_NATIONS } from '@/constants/nations';
import { MAX_FOLLOWED_NATIONALITIES } from '@/constants/nationalTeams';
import type { UserNationality, UserTeam } from '@/types/habit';
import { getNextOnboardingRoute, hasFootballOnboarding } from '@/utils/onboardingFlow';
import {
  apiLogoUri,
  buildDomesticLeagueOptions,
  buildInternationalLeagueOptions,
  countOptionalLeagueIds,
  ensureWorldCupFamilyLeagueIds,
  getWorldCupFamilyLeagueOptions,
  initialOnboardingLeagueIds,
  isWorldCupFamilyLeagueId,
  isWorldCupLeagueId,
  normalizeOnboardingLeagueIds,
  ONBOARDING_MAX_LEAGUES,
} from '@/utils/onboardingFootballOptions';
import { getFootballTeamLogoUrl, getPopularTeams, searchTeams } from '@/constants/footballData';
import {
  pickOnboardingLeagues,
  pickOnboardingTeams,
  shouldApplyNationalities,
} from '@/utils/onboardingProfileSave';

const INTL_OPTIONS = buildInternationalLeagueOptions();
const DOMESTIC_OPTIONS = buildDomesticLeagueOptions();
const WORLD_CUP_OPTIONS = getWorldCupFamilyLeagueOptions();
const DOMESTIC_PREVIEW = 12;

function ClubAvatar({ team, selected }: { team: UserTeam; selected: boolean }) {
  const [failed, setFailed] = useState(false);
  const uri = getFootballTeamLogoUrl(team);
  return (
    <View style={styles.clubLogoSlot} pointerEvents="none">
      {uri && !failed ? (
        <Image source={{ uri }} style={styles.clubLogo} resizeMode="contain" onError={() => setFailed(true)} />
      ) : (
        <Trophy size={18} color={selected ? COLORS.primary : COLORS.textMuted} />
      )}
    </View>
  );
}

export default function FootballFavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { totalSteps, currentStep } = useOnboardingStepMeta('football-favorites');
  const interests = profile?.interests ?? [];

  const [nationSearch, setNationSearch] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [leagueSearch, setLeagueSearch] = useState('');
  const [showAllDomestic, setShowAllDomestic] = useState(false);
  const [showNationModal, setShowNationModal] = useState(false);
  const hydratedFromProfile = useRef(false);
  const [clubsDirty, setClubsDirty] = useState(false);
  const [nationsDirty, setNationsDirty] = useState(false);
  const [leaguesDirty, setLeaguesDirty] = useState(false);

  const [selectedNationIds, setSelectedNationIds] = useState<Set<string>>(
    () => new Set((profile?.nationalities ?? []).map((n) => n.id)),
  );
  const [selectedTeams, setSelectedTeams] = useState<UserTeam[]>(
    () => profile?.favoriteTeams ?? [],
  );
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>(() =>
    initialOnboardingLeagueIds(profile?.favoriteLeagues),
  );

  useEffect(() => {
    if (profile && !hasFootballOnboarding(interests)) {
      router.replace(getNextOnboardingRoute('interests', interests) as any);
    }
  }, [profile, interests, router]);

  useEffect(() => {
    setSelectedLeagueIds((prev) => normalizeOnboardingLeagueIds(prev));
  }, []);

  useEffect(() => {
    if (!profile || hydratedFromProfile.current) return;
    hydratedFromProfile.current = true;
    if (profile.favoriteTeams?.length) {
      setSelectedTeams(profile.favoriteTeams);
    }
    if (profile.nationalities?.length) {
      setSelectedNationIds(new Set(profile.nationalities.map((n) => n.id)));
    }
    if (profile.favoriteLeagues?.length) {
      setSelectedLeagueIds(normalizeOnboardingLeagueIds(profile.favoriteLeagues));
    }
  }, [profile]);

  const optionalLeagueCount = useMemo(
    () => countOptionalLeagueIds(selectedLeagueIds),
    [selectedLeagueIds],
  );

  const selectedNations = useMemo(
    () => ALL_NATIONS.filter((n) => selectedNationIds.has(n.id)),
    [selectedNationIds],
  );

  const filteredNationsModal = useMemo(() => {
    const q = nationSearch.trim().toLowerCase();
    if (!q) return ALL_NATIONS;
    return ALL_NATIONS.filter((n) => n.name.toLowerCase().includes(q));
  }, [nationSearch]);

  const quickClubTeams = useMemo(() => getPopularTeams().slice(0, 8), []);

  const filteredClubs = useMemo(() => {
    if (clubSearch.trim()) return searchTeams(clubSearch);
    return quickClubTeams;
  }, [clubSearch, quickClubTeams]);

  const { intlLeagues, domesticLeagues } = useMemo(() => {
    const q = leagueSearch.trim().toLowerCase();
    const match = (l: { name: string; country: string }) =>
      l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q);
    const intl = (q ? INTL_OPTIONS.filter(match) : INTL_OPTIONS).filter(
      (l) => !isWorldCupFamilyLeagueId(l.id),
    );
    const domestic = q ? DOMESTIC_OPTIONS.filter(match) : DOMESTIC_OPTIONS;
    return { intlLeagues: intl, domesticLeagues: domestic };
  }, [leagueSearch]);

  const worldCupMain = useMemo(
    () => WORLD_CUP_OPTIONS.find((l) => isWorldCupLeagueId(l.id)) ?? WORLD_CUP_OPTIONS[0],
    [],
  );

  const visibleDomestic = showAllDomestic || leagueSearch.trim()
    ? domesticLeagues
    : domesticLeagues.slice(0, DOMESTIC_PREVIEW);

  const toggleNation = useCallback((nationId: string) => {
    void Haptics.selectionAsync();
    setNationsDirty(true);
    setSelectedNationIds((prev) => {
      const next = new Set(prev);
      if (next.has(nationId)) next.delete(nationId);
      else if (next.size < MAX_FOLLOWED_NATIONALITIES) next.add(nationId);
      return next;
    });
  }, []);

  const toggleClub = useCallback((team: UserTeam) => {
    void Haptics.selectionAsync();
    setClubsDirty(true);
    setSelectedTeams((prev) => {
      if (prev.some((t) => t.id === team.id)) return prev.filter((t) => t.id !== team.id);
      return [...prev, { ...team, logo: team.logo ?? getFootballTeamLogoUrl(team) }];
    });
  }, []);

  const toggleLeague = useCallback((leagueId: number) => {
    if (isWorldCupFamilyLeagueId(leagueId)) return;
    void Haptics.selectionAsync();
    setLeaguesDirty(true);
    setSelectedLeagueIds((prev) => {
      const base = ensureWorldCupFamilyLeagueIds(prev);
      if (base.includes(leagueId)) {
        return base.filter((id) => id !== leagueId);
      }
      if (countOptionalLeagueIds(base) >= ONBOARDING_MAX_LEAGUES) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return base;
      }
      return [...base, leagueId];
    });
  }, []);

  const persistAndContinue = useCallback(() => {
    const nationalities: UserNationality[] = selectedNations.map((n) => ({
      id: n.id,
      name: n.name,
      code: n.code,
      flag: n.flag,
      apiId: n.apiId,
    }));

    const updates: Parameters<typeof updateProfile>[0] = {};
    const teams = pickOnboardingTeams({
      dirty: clubsDirty,
      selected: selectedTeams,
      existing: profile?.favoriteTeams,
    });
    if (teams !== undefined) updates.favoriteTeams = teams;

    const leagues = pickOnboardingLeagues({
      dirty: leaguesDirty,
      selected: selectedLeagueIds,
      existing: profile?.favoriteLeagues,
    });
    if (leagues !== undefined) updates.favoriteLeagues = leagues;

    if (
      shouldApplyNationalities({
        dirty: nationsDirty,
        selectedCount: nationalities.length,
        existingCount: profile?.nationalities?.length ?? 0,
      })
    ) {
      updates.nationalities = nationalities;
    }

    if (Object.keys(updates).length > 0) {
      updateProfile(updates);
    }

    router.push(getNextOnboardingRoute('football-favorites', interests) as any);
  }, [
    selectedNations,
    selectedTeams,
    selectedLeagueIds,
    clubsDirty,
    leaguesDirty,
    nationsDirty,
    profile?.favoriteTeams,
    profile?.favoriteLeagues,
    updateProfile,
    router,
    interests,
  ]);

  const handleSkip = useCallback(() => {
    const leagues = pickOnboardingLeagues({
      dirty: false,
      selected: selectedLeagueIds,
      existing: profile?.favoriteLeagues,
      skipMode: true,
    });
    if (leagues !== undefined) {
      updateProfile({ favoriteLeagues: leagues });
    }
    router.push(getNextOnboardingRoute('football-favorites', interests) as any);
  }, [profile?.favoriteLeagues, selectedLeagueIds, updateProfile, router, interests]);

  const renderLeagueRow = (league: (typeof INTL_OPTIONS)[number], isInternational: boolean) => {
    const selected = selectedLeagueIds.includes(league.id);
    const isWc = isWorldCupLeagueId(league.id);
    return (
      <Pressable
        key={league.id}
        style={({ pressed }) => [
          styles.leagueRow,
          selected && styles.leagueRowSelected,
          pressed && styles.rowPressed,
        ]}
        onPress={() => toggleLeague(league.id)}
      >
        <View style={styles.leagueLogoWrap} pointerEvents="none">
          <FootballLeagueLogo
            leagueId={league.id}
            leagueName={league.name}
            leagueLogo={apiLogoUri(league.id)}
            size={26}
            fallbackIconSize={18}
            fallbackColor={COLORS.textMuted}
          />
        </View>
        <View style={styles.leagueText} pointerEvents="none">
          <Text style={[styles.leagueName, selected && styles.leagueNameSelected]}>{league.name}</Text>
          {isWc ? (
            <Text style={styles.leagueHint}>Recommended for World Cup</Text>
          ) : (
            <Text style={styles.leagueCountry}>{league.country}</Text>
          )}
        </View>
        {selected ? (
          <View style={styles.checkCircle}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : isInternational ? (
          <Globe size={15} color={COLORS.textMuted} />
        ) : (
          <Trophy size={15} color={COLORS.textMuted} />
        )}
      </Pressable>
    );
  };

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleWrap}>
          <Text style={styles.stepLabel}>STEP {currentStep} · FOOTBALL</Text>
          <Text style={styles.title}>Teams & countries you follow</Text>
        </View>

        {/* World Cup — first, pre-selected */}
        <View style={styles.worldCupCard}>
          <View style={styles.worldCupHead}>
            <View style={styles.worldCupLogoWrap}>
              <FootballLeagueLogo
                leagueId={worldCupMain?.id ?? 1}
                leagueName={worldCupMain?.name ?? 'FIFA World Cup'}
                leagueLogo={apiLogoUri(1)}
                size={44}
                fallbackIconSize={22}
                fallbackColor={COLORS.primary}
              />
            </View>
            <View style={styles.worldCupCopy}>
              <Text style={styles.worldCupTitle}>{worldCupMain?.name ?? 'FIFA World Cup'}</Text>
              <Text style={styles.worldCupBadge}>Included · all regional qualifiers</Text>
            </View>
            <View style={styles.worldCupCheck}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
          <Text style={styles.worldCupMessage}>
            We'll keep World Cup matches in For You — pick your countries below.
          </Text>
        </View>

        {/* Section A — National teams */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Globe size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>National teams</Text>
            <Text style={styles.sectionMeta}>Up to {MAX_FOLLOWED_NATIONALITIES}</Text>
          </View>
          <Text style={styles.sectionSub}>
            Track World Cup, qualifiers and friendlies for each country.
          </Text>
          <View style={styles.chipRow}>
            {selectedNations.map((n) => (
              <View key={n.id} style={styles.chip}>
                <Text style={styles.chipFlag}>{n.flag}</Text>
                <Text style={styles.chipText} numberOfLines={1}>
                  {n.name}
                </Text>
                <TouchableOpacity onPress={() => toggleNation(n.id)} hitSlop={8}>
                  <X size={12} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
            {selectedNationIds.size < MAX_FOLLOWED_NATIONALITIES ? (
              <TouchableOpacity style={styles.addChip} onPress={() => setShowNationModal(true)}>
                <Plus size={14} color={COLORS.primary} />
                <Text style={styles.addChipText}>Add country</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Section B — Club teams */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Trophy size={16} color={COLORS.textMuted} />
            <Text style={styles.sectionTitle}>Club teams</Text>
            <Text style={styles.sectionMeta}>Optional</Text>
          </View>
          <View style={styles.searchWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clubs..."
              placeholderTextColor={COLORS.textMuted}
              value={clubSearch}
              onChangeText={setClubSearch}
            />
          </View>
          {filteredClubs.map((team) => {
            const selected = selectedTeams.some((t) => t.id === team.id);
            return (
              <Pressable
                key={team.id}
                style={({ pressed }) => [
                  styles.clubRow,
                  selected && styles.clubRowSelected,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => toggleClub(team)}
              >
                <ClubAvatar team={team} selected={selected} />
                <View style={styles.clubText} pointerEvents="none">
                  <Text style={[styles.clubName, selected && styles.clubNameSelected]}>{team.name}</Text>
                  <Text style={styles.clubMeta}>{team.league}</Text>
                </View>
                {selected ? (
                  <View style={styles.checkCircle} pointerEvents="none">
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Section C — Leagues & tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Trophy size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Leagues & tournaments</Text>
            <Text style={styles.sectionMeta}>
              {optionalLeagueCount}/{ONBOARDING_MAX_LEAGUES}
            </Text>
          </View>
          <Text style={styles.sectionSub}>World Cup is already on — add club leagues if you want.</Text>
          <View style={styles.searchWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search leagues..."
              placeholderTextColor={COLORS.textMuted}
              value={leagueSearch}
              onChangeText={setLeagueSearch}
            />
          </View>
          {intlLeagues.length > 0 ? (
            <>
              <Text style={styles.subSectionLabel}>International</Text>
              {intlLeagues.map((l) => renderLeagueRow(l, true))}
            </>
          ) : null}
          {visibleDomestic.length > 0 ? (
            <>
              <Text style={[styles.subSectionLabel, styles.subSectionSpaced]}>Domestic</Text>
              {visibleDomestic.map((l) => renderLeagueRow(l, false))}
              {!showAllDomestic && !leagueSearch.trim() && domesticLeagues.length > DOMESTIC_PREVIEW ? (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllDomestic(true)}>
                  <Text style={styles.showMoreText}>Show more domestic leagues</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.continueBtn} onPress={persistAndContinue} activeOpacity={0.85}>
          <View style={styles.continueBtnInner}>
            <Text style={styles.continueText}>Continue</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={showNationModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top + 12 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add national team</Text>
            <TouchableOpacity
              onPress={() => {
                setShowNationModal(false);
                setNationSearch('');
              }}
            >
              <X size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchWrap, styles.modalSearch]}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              placeholderTextColor={COLORS.textMuted}
              value={nationSearch}
              onChangeText={setNationSearch}
            />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {filteredNationsModal.map((n) => {
              const selected = selectedNationIds.has(n.id);
              const atMax = selectedNationIds.size >= MAX_FOLLOWED_NATIONALITIES && !selected;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.modalRow, (selected || atMax) && !selected && styles.modalRowDisabled]}
                  disabled={atMax}
                  onPress={() => toggleNation(n.id)}
                >
                  <Text style={styles.modalFlag}>{n.flag}</Text>
                  <Text style={styles.modalName}>{n.name}</Text>
                  {selected ? <Check size={16} color={COLORS.primary} /> : null}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrap: { flex: 1, paddingHorizontal: 16 },
  skipText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  titleWrap: { marginBottom: 8 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
  title: { marginTop: 6, fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  worldCupCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
    backgroundColor: `${COLORS.primary}0D`,
    gap: 10,
  },
  worldCupHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  worldCupLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldCupCopy: { flex: 1 },
  worldCupTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  worldCupBadge: { marginTop: 3, fontSize: 12, fontWeight: '600', color: COLORS.primary },
  worldCupCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldCupMessage: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, fontWeight: '500' },
  section: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  sectionSub: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 10 },
  subSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  subSectionSpaced: { marginTop: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text, maxWidth: 110 },
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 10,
  },
  clubRowSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  rowPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  clubLogoSlot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubLogo: { width: 28, height: 28 },
  clubText: { flex: 1 },
  clubName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  clubNameSelected: { color: COLORS.primary },
  clubMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 10,
  },
  leagueRowSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  leagueLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueText: { flex: 1 },
  leagueName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  leagueNameSelected: { color: COLORS.primary },
  leagueCountry: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  leagueHint: { fontSize: 11, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreBtn: { paddingVertical: 10, alignItems: 'center' },
  showMoreText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  continueBtn: { borderRadius: 14, backgroundColor: COLORS.primary },
  continueBtnInner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalSearch: { marginHorizontal: 20 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  modalRowDisabled: { opacity: 0.45 },
  modalFlag: { fontSize: 22 },
  modalName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
});
