import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, ArrowRight, ArrowLeft, Search, Star, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import { UserTeam } from '@/types/habit';
import { getPopularTeams, searchTeams, getFootballTeamLogoUrl } from '@/constants/footballData';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';

function FootballTeamAvatar({
  team,
  isSelected,
}: {
  team: UserTeam;
  isSelected: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const uri = getFootballTeamLogoUrl(team);
  const showLogo = Boolean(uri && !failed);
  return (
    <View style={styles.teamLogoSlot}>
      {showLogo ? (
        <Image
          source={{ uri: uri! }}
          style={styles.teamLogo}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Trophy size={22} color={isSelected ? COLORS.primary : COLORS.textMuted} />
      )}
    </View>
  );
}

export default function TeamsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const { totalSteps, stepSportsPick } = useOnboardingStepMeta();
  const [selectedTeams, setSelectedTeams] = useState<UserTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const quickPickTeams = useMemo(() => getPopularTeams().slice(0, 8), []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const searchScale = useRef(new Animated.Value(0.95)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(searchScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(listOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeAnim, titleSlide, searchScale, listOpacity]);

  const filteredTeams = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTeams(searchQuery);
    }
    let teams = getPopularTeams();
    if (profile?.favoriteCountries && profile.favoriteCountries.length > 0) {
      const favoriteCountryNames = profile.favoriteCountries.map(c => c.name.toLowerCase());
      const countryFilteredTeams = teams.filter(team =>
        team.country && favoriteCountryNames.includes(team.country.toLowerCase())
      );
      if (countryFilteredTeams.length > 0) {
        teams = countryFilteredTeams;
      }
    }
    return teams;
  }, [searchQuery, profile?.favoriteCountries]);

  const toggleTeam = useCallback((team: UserTeam) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeams(prev => {
      const isSelected = prev.some(t => t.id === team.id);
      return isSelected ? prev.filter(t => t.id !== team.id) : [...prev, team];
    });
  }, []);

  const getNextRoute = useCallback(() => {
    if (profile?.interests?.includes('nba')) {
      return '/(onboarding)/nba-teams' as any;
    }
    return '/(onboarding)/feed-tuning' as any;
  }, [profile?.interests]);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedTeams.length > 0 && profile) {
      const existingTeams = profile.favoriteTeams || [];
      const newTeams = selectedTeams
        .filter(team =>
          !existingTeams.some(existing =>
            existing.id === team.id || existing.name.toLowerCase() === team.name.toLowerCase()
          )
        )
        .map((t) => ({ ...t, logo: t.logo ?? getFootballTeamLogoUrl(t) }));
      const updatedTeams = [...existingTeams, ...newTeams];
      updateProfile({ favoriteTeams: updatedTeams });
    }
    router.push(getNextRoute());
  }, [selectedTeams, profile, updateProfile, router, getNextRoute]);

  const handleSkip = useCallback(() => {
    router.push(getNextRoute());
  }, [router, getNextRoute]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={stepSportsPick} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.stepLabel}>STEP {stepSportsPick} · CLUBS</Text>
        <Text style={styles.title}>Follow Your Teams</Text>
        <Text style={styles.subtitle}>Get live scores and updates for your favourite clubs</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      {!searchQuery && (
        <View style={styles.sectionRow}>
          <Star size={13} color={COLORS.textMuted} />
          <Text style={styles.sectionLabel}>
            {profile?.favoriteCountries && profile.favoriteCountries.length > 0
              ? 'Teams from Your Countries'
              : 'Popular Teams'}
          </Text>
        </View>
      )}

      {!searchQuery ? (
        <View style={styles.quickPickWrap}>
          <Text style={styles.quickPickLabel}>Must-follow quick picks (2-5)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPickRow}>
            {quickPickTeams.map((team) => {
              const selected = selectedTeams.some((t) => t.id === team.id);
              return (
                <TouchableOpacity
                  key={`qp-${team.id}`}
                  style={[styles.quickPickChip, selected && styles.quickPickChipActive]}
                  activeOpacity={0.8}
                  onPress={() => toggleTeam(team)}
                >
                  <Text style={[styles.quickPickChipText, selected && styles.quickPickChipTextActive]} numberOfLines={1}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Trophy size={36} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No teams found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'Try a different search' : 'No teams available'}
              </Text>
            </View>
          ) : (
            filteredTeams.map((team) => {
              const isSelected = selectedTeams.some(t => t.id === team.id);
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamCard, isSelected && styles.teamCardSelected]}
                  onPress={() => toggleTeam(team)}
                  activeOpacity={0.7}
                >
                  {isSelected && <View style={styles.cardSelectedOverlay} />}
                  <FootballTeamAvatar team={team} isSelected={isSelected} />
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
                      {team.name}
                    </Text>
                    <Text style={styles.teamLeague}>{team.league}</Text>
                    {team.country && <Text style={styles.teamCountry}>{team.country}</Text>}
                  </View>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.selectionRow}>
          <View style={[styles.countChip, selectedTeams.length > 0 && styles.countChipActive]}>
            <Text style={[styles.countText, selectedTeams.length > 0 && styles.countTextActive]}>
              {selectedTeams.length}
            </Text>
          </View>
          <Text style={styles.selectionLabel}>
            team{selectedTeams.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
  titleWrap: {
    paddingHorizontal: 32,
    marginBottom: 18,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 32,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 10,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  quickPickWrap: {
    paddingHorizontal: 32,
    marginBottom: 8,
  },
  quickPickLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  quickPickRow: {
    gap: 8,
    paddingRight: 8,
  },
  quickPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 170,
  },
  quickPickChipActive: {
    backgroundColor: `${COLORS.primary}18`,
    borderColor: COLORS.primary,
  },
  quickPickChipText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600' as const,
  },
  quickPickChipTextActive: {
    color: COLORS.primary,
  },
  list: {
    flex: 1,
    paddingHorizontal: 32,
  },
  listContent: {
    paddingBottom: 16,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  teamCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cardSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${COLORS.primary}0D`,
    borderRadius: 16,
  },
  /** Layout only — no box behind logos (selection shown by card border) */
  teamLogoSlot: {
    width: 44,
    height: 44,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogo: {
    width: 40,
    height: 40,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  teamNameSelected: {
    color: COLORS.text,
  },
  teamLeague: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 1,
  },
  teamCountry: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  countChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countChipActive: {
    backgroundColor: `${COLORS.primary}22`,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
  },
  countTextActive: {
    color: COLORS.primary,
  },
  selectionLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
    backgroundColor: COLORS.primary,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
