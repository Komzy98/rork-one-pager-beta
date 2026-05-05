import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Search, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';
import { COMPETITIONS_DATA } from '@/constants/competitions';

type LeagueOption = { id: number; name: string; country: string; logoUri: string };

const PRIORITY_LEAGUE_IDS = new Set([39, 140, 78, 135, 61, 2, 3, 848, 531, 94, 88]);

function buildLeagueOptions(): LeagueOption[] {
  const map = new Map<number, LeagueOption>();
  for (const continent of COMPETITIONS_DATA) {
    for (const country of continent.countries) {
      for (const c of country.competitions) {
        if (c.type !== 'league' && c.type !== 'international') continue;
        if (c.type === 'league' && (c.tier ?? 9) > 1) continue;
        if (!map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            name: c.name,
            country: c.country,
            logoUri: `https://media.api-sports.io/football/leagues/${c.id}.png`,
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

const LEAGUE_OPTIONS = buildLeagueOptions();

export default function FavoriteLeaguesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { totalSteps, stepFavoriteLeagues } = useOnboardingStepMeta();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>(profile?.favoriteLeagues ?? []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return LEAGUE_OPTIONS;
    return LEAGUE_OPTIONS.filter(
      (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const toggleLeague = useCallback((leagueId: number) => {
    void Haptics.selectionAsync();
    setSelectedLeagueIds((prev) => {
      if (prev.includes(leagueId)) return prev.filter((id) => id !== leagueId);
      if (prev.length >= 5) return prev;
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
        <Text style={styles.title}>Pick favorite leagues</Text>
        <Text style={styles.subtitle}>For You will prioritize these first. Choose up to 5.</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leagues..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.map((league) => {
          const selected = selectedLeagueIds.includes(league.id);
          return (
            <TouchableOpacity
              key={league.id}
              style={[styles.row, selected && styles.rowSelected]}
              activeOpacity={0.8}
              onPress={() => toggleLeague(league.id)}
            >
              <View style={styles.logoWrap}>
                <Image source={{ uri: league.logoUri }} style={styles.logo} resizeMode="contain" />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.name, selected && styles.nameSelected]}>{league.name}</Text>
                <Text style={styles.country}>{league.country}</Text>
              </View>
              {selected ? (
                <View style={styles.checkCircle}>
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : (
                <Trophy size={16} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.countText}>{selectedLeagueIds.length} selected</Text>
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
  logo: { width: 24, height: 24 },
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

