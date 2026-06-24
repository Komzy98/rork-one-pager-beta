import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Search, Trophy, Globe } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import FootballLeagueLogo from '@/components/FootballLeagueLogo';
import { COLORS } from '@/constants/colors';
import { COMPETITIONS_DATA, INTERNATIONAL_COMPETITIONS } from '@/constants/competitions';

type LeagueOption = { id: number; name: string; country: string };

const MAX_LEAGUES = 8;

const PRIORITY_LEAGUE_IDS = new Set([39, 140, 78, 135, 61, 2, 3, 848, 531, 94, 88]);

/**
 * National-team & global tournaments shown first — World Cup leads, then qualifiers,
 * continental championships, and the big club competitions. These live in
 * INTERNATIONAL_COMPETITIONS (separate from the domestic COMPETITIONS_DATA tree).
 */
const INTL_PRIORITY_ORDER: number[] = [
  1, // FIFA World Cup
  15, 16, 17, 18, 19, 20, // World Cup Qualifiers (all confederations)
  4, 960, 5, // Euro, Euro Qualifiers, Nations League
  9, // Copa América
  6, // Africa Cup of Nations
  7, // AFC Asian Cup
  21, // CONCACAF Gold Cup
  15000, // FIFA Club World Cup
  2, 3, 848, // UEFA Champions / Europa / Conference League
  13, 14, // Libertadores, Sudamericana
  10, // International Friendlies
];

const apiLogoUri = (id: number) => `https://media.api-sports.io/football/leagues/${id}.png`;

function buildInternationalOptions(): LeagueOption[] {
  const opts = INTERNATIONAL_COMPETITIONS.filter((c) => c.type === 'international').map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
  }));
  return opts.sort((a, b) => {
    const ai = INTL_PRIORITY_ORDER.indexOf(a.id);
    const bi = INTL_PRIORITY_ORDER.indexOf(b.id);
    const an = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bn = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (an !== bn) return an - bn;
    return a.name.localeCompare(b.name);
  });
}

function buildDomesticOptions(): LeagueOption[] {
  const map = new Map<number, LeagueOption>();
  for (const continent of COMPETITIONS_DATA) {
    for (const country of continent.countries) {
      for (const c of country.competitions) {
        if (c.type !== 'league') continue;
        if ((c.tier ?? 9) > 1) continue;
        if (!map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            name: c.name,
            country: c.country,
          });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ap = PRIORITY_LEAGUE_IDS.has(a.id) ? 1 : 0;
    const bp = PRIORITY_LEAGUE_IDS.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.name.localeCompare(b.name);
  });
}

const INTERNATIONAL_OPTIONS = buildInternationalOptions();
const DOMESTIC_OPTIONS = buildDomesticOptions();

export default function FavoriteLeaguesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { totalSteps, stepFavoriteLeagues } = useOnboardingStepMeta();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>(profile?.favoriteLeagues ?? []);

  const { intlResults, domesticResults } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const match = (l: LeagueOption) =>
      l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q);
    return {
      intlResults: q ? INTERNATIONAL_OPTIONS.filter(match) : INTERNATIONAL_OPTIONS,
      domesticResults: q ? DOMESTIC_OPTIONS.filter(match) : DOMESTIC_OPTIONS,
    };
  }, [searchQuery]);

  const toggleLeague = useCallback((leagueId: number) => {
    void Haptics.selectionAsync();
    setSelectedLeagueIds((prev) => {
      if (prev.includes(leagueId)) return prev.filter((id) => id !== leagueId);
      if (prev.length >= MAX_LEAGUES) return prev;
      return [...prev, leagueId];
    });
  }, []);

  const getNextRoute = useCallback(() => {
    if (profile?.interests?.includes('movies')) return '/(onboarding)/streaming' as any;
    return '/(onboarding)/chronotype' as any;
  }, [profile?.interests]);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const unique = Array.from(new Set(selectedLeagueIds));
    updateProfile({ favoriteLeagues: unique });
    router.push(getNextRoute());
  }, [selectedLeagueIds, updateProfile, router, getNextRoute]);

  const handleSkip = useCallback(() => {
    router.push(getNextRoute());
  }, [router, getNextRoute]);

  const renderRow = (league: LeagueOption, isInternational: boolean) => {
    const selected = selectedLeagueIds.includes(league.id);
    return (
      <TouchableOpacity
        key={league.id}
        style={[styles.row, selected && styles.rowSelected]}
        activeOpacity={0.8}
        onPress={() => toggleLeague(league.id)}
      >
        <View style={styles.logoWrap}>
          <FootballLeagueLogo
            leagueId={league.id}
            leagueName={league.name}
            leagueLogo={apiLogoUri(league.id)}
            size={28}
            fallbackIconSize={isInternational ? 20 : 18}
            fallbackColor={COLORS.textMuted}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.name, selected && styles.nameSelected]}>{league.name}</Text>
          <Text style={styles.country}>{league.country}</Text>
        </View>
        {selected ? (
          <View style={styles.checkCircle}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : isInternational ? (
          <Globe size={16} color={COLORS.textMuted} />
        ) : (
          <Trophy size={16} color={COLORS.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  const hasResults = intlResults.length > 0 || domesticResults.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={stepFavoriteLeagues} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.stepLabel}>STEP {stepFavoriteLeagues} · LEAGUES</Text>
        <Text style={styles.title}>Leagues & tournaments</Text>
        <Text style={styles.subtitle}>
          Add the World Cup, your continental cups and top leagues. For You prioritizes these. Choose up to {MAX_LEAGUES}.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leagues & tournaments..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {intlResults.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Globe size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>International & tournaments</Text>
            </View>
            {intlResults.map((league) => renderRow(league, true))}
          </>
        )}

        {domesticResults.length > 0 && (
          <>
            <View style={[styles.sectionHeader, intlResults.length > 0 && styles.sectionHeaderSpaced]}>
              <Trophy size={14} color={COLORS.textMuted} />
              <Text style={styles.sectionTitle}>Domestic leagues</Text>
            </View>
            {domesticResults.map((league) => renderRow(league, false))}
          </>
        )}

        {!hasResults && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No leagues match "{searchQuery.trim()}"</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.countText}>
          {selectedLeagueIds.length} of {MAX_LEAGUES} selected
        </Text>
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
  skipText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  titleWrap: { paddingHorizontal: 24, marginBottom: 14 },
  stepLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  title: { marginTop: 6, fontSize: 30, fontWeight: '800', color: COLORS.text, letterSpacing: -0.6 },
  subtitle: { marginTop: 6, fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  searchWrap: {
    marginHorizontal: 20,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '500' },
  list: { flex: 1, marginTop: 12, paddingHorizontal: 20 },
  listContent: { paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionHeaderSpaced: { marginTop: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 9,
    gap: 10,
  },
  rowSelected: { borderColor: `${COLORS.primary}80`, backgroundColor: `${COLORS.primary}10` },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  nameSelected: { color: COLORS.primary },
  country: { marginTop: 2, color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  footer: { paddingHorizontal: 20, gap: 10 },
  countText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  continueBtn: { borderRadius: 14, backgroundColor: COLORS.primary },
  continueBtnInner: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
