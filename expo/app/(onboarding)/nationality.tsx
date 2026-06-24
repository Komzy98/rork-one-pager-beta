import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Search, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { ALL_NATIONS } from '@/constants/nations';
import { MAX_FOLLOWED_NATIONALITIES } from '@/constants/nationalTeams';
import { COLORS } from '@/constants/colors';
import type { UserNationality } from '@/types/habit';

export default function NationalityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, setNationalities } = useUserProfile();
  const { totalSteps, stepNationality } = useOnboardingStepMeta();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((profile?.nationalities ?? []).map((n) => n.id)),
  );

  const filteredNations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_NATIONS;
    return ALL_NATIONS.filter((n) => n.name.toLowerCase().includes(q));
  }, [search]);

  const continueNext = useCallback(() => {
    if (profile?.interests?.includes('football')) {
      router.push('/(onboarding)/teams' as any);
    } else if (profile?.interests?.includes('nba')) {
      router.push('/(onboarding)/nba-teams' as any);
    } else {
      router.push('/(onboarding)/calendar' as any);
    }
  }, [profile?.interests, router]);

  const toggleNation = useCallback((nationId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nationId)) {
        next.delete(nationId);
      } else if (next.size < MAX_FOLLOWED_NATIONALITIES) {
        next.add(nationId);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const selected: UserNationality[] = ALL_NATIONS.filter((n) => selectedIds.has(n.id)).map(
      (nation) => ({
        id: nation.id,
        name: nation.name,
        code: nation.code,
        flag: nation.flag,
        apiId: nation.apiId,
      }),
    );
    if (selected.length > 0) {
      setNationalities(selected);
    }
    continueNext();
  }, [selectedIds, setNationalities, continueNext]);

  const handleSkip = useCallback(() => {
    continueNext();
  }, [continueNext]);

  const selectedCount = selectedIds.size;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={stepNationality} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.stepLabel}>STEP {stepNationality} · PERSONALISE</Text>
        <Text style={styles.title}>Which countries do you follow?</Text>
        <Text style={styles.subtitle}>
          Pick up to {MAX_FOLLOWED_NATIONALITIES} — we surface World Cup, qualifier and tournament
          matches for each one, plus local recipes, events and movie picks.
        </Text>
        {selectedCount > 0 ? (
          <Text style={styles.selectedHint}>
            {selectedCount} selected{selectedCount >= MAX_FOLLOWED_NATIONALITIES ? ' (max)' : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Search size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search country..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredNations.map((nation) => {
          const selected = selectedIds.has(nation.id);
          const atMax = selectedIds.size >= MAX_FOLLOWED_NATIONALITIES && !selected;
          return (
            <TouchableOpacity
              key={nation.id}
              style={[styles.row, selected && styles.rowSelected, atMax && styles.rowDisabled]}
              onPress={() => !atMax && toggleNation(nation.id)}
              activeOpacity={atMax ? 1 : 0.8}
              disabled={atMax}
            >
              <Text style={styles.flag}>{nation.flag}</Text>
              <Text style={[styles.name, atMax && styles.nameDisabled]}>{nation.name}</Text>
              {selected ? (
                <View style={styles.checkCircle}>
                  <Check size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <View style={styles.continueBtnInner}>
            <Text style={styles.continueText}>
              {selectedCount > 0 ? `Continue with ${selectedCount}` : 'Continue'}
            </Text>
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
  skipText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  titleWrap: { paddingHorizontal: 32, marginBottom: 16 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  selectedHint: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginTop: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 32,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 15 },
  list: { flex: 1, paddingHorizontal: 32 },
  listContent: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  rowDisabled: { opacity: 0.45 },
  flag: { fontSize: 20, marginRight: 10 },
  name: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  nameDisabled: { color: COLORS.textMuted },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  continueBtn: { borderRadius: 16, overflow: 'hidden' },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
    backgroundColor: COLORS.primary,
  },
  continueText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
