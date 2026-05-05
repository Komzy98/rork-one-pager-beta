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
import { ArrowRight, ArrowLeft, Search, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import { NBAFavoriteTeam } from '@/types/habit';
import { ALL_NBA_TEAMS, searchNBATeams, NBATeamInfo, getTeamColor } from '@/constants/nbaData';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';

type ConferenceFilter = 'all' | 'Eastern' | 'Western';

export default function NBATeamsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const { totalSteps, stepSportsPick } = useOnboardingStepMeta();
  const [selectedTeams, setSelectedTeams] = useState<NBAFavoriteTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [conferenceFilter, setConferenceFilter] = useState<ConferenceFilter>('all');

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
    let teams: NBATeamInfo[] = searchQuery.trim()
      ? searchNBATeams(searchQuery)
      : ALL_NBA_TEAMS;

    if (conferenceFilter !== 'all') {
      teams = teams.filter(t => t.conference === conferenceFilter);
    }

    return teams;
  }, [searchQuery, conferenceFilter]);

  const toggleTeam = useCallback((team: NBATeamInfo) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeams(prev => {
      const isSelected = prev.some(t => t.id === team.id);
      if (isSelected) {
        return prev.filter(t => t.id !== team.id);
      }
      return [...prev, {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        conference: team.conference,
        logo: team.logo,
      }];
    });
  }, []);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedTeams.length > 0) {
      const existing = profile?.favoriteNBATeams || [];
      const newTeams = selectedTeams.filter(team =>
        !existing.some(e => e.id === team.id)
      );
      updateProfile({ favoriteNBATeams: [...existing, ...newTeams] });
    }
    router.push('/(onboarding)/feed-tuning' as any);
  }, [selectedTeams, profile, updateProfile, router]);

  const handleSkip = useCallback(() => {
    router.push('/(onboarding)/feed-tuning' as any);
  }, [router]);

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
        <Text style={styles.stepKicker}>STEP {stepSportsPick} · NBA</Text>
        <View style={styles.nbaEmojiRow}>
          <Text style={styles.nbaEmoji}>🏀</Text>
        </View>
        <Text style={styles.title}>Pick your team</Text>
        <Text style={styles.subtitle}>Follow NBA teams for upcoming games and scores</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search NBA teams..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      <View style={styles.conferenceRow}>
        {(['all', 'Eastern', 'Western'] as ConferenceFilter[]).map((conf) => (
          <TouchableOpacity
            key={conf}
            style={[styles.confChip, conferenceFilter === conf && styles.confChipActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setConferenceFilter(conf);
            }}
          >
            <Text style={[styles.confChipText, conferenceFilter === conf && styles.confChipTextActive]}>
              {conf === 'all' ? 'All' : conf}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏀</Text>
              <Text style={styles.emptyTitle}>No teams found</Text>
              <Text style={styles.emptySub}>Try a different search</Text>
            </View>
          ) : (
            filteredTeams.map((team) => {
              const isSelected = selectedTeams.some(t => t.id === team.id);
              const teamColor = getTeamColor(team.abbreviation);
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamCard, isSelected && styles.teamCardSelected]}
                  onPress={() => toggleTeam(team)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View
                      style={[StyleSheet.absoluteFillObject, { backgroundColor: `${teamColor}22` }]}
                    />
                  )}
                    <Image
                      source={{ uri: team.logo }}
                      style={styles.teamLogo}
                      resizeMode="contain"
                    />
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
                      {team.name}
                    </Text>
                    <View style={styles.teamMeta}>
                      <Text style={styles.teamAbbr}>{team.abbreviation}</Text>
                      <View style={[styles.confBadge, { backgroundColor: team.conference === 'Eastern' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                        <Text style={[styles.confBadgeText, { color: team.conference === 'Eastern' ? '#3B82F6' : '#EF4444' }]}>
                          {team.conference}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: teamColor }]}>
                      <Check size={11} color="#fff" strokeWidth={3} />
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
            <ArrowRight size={18} color="#fff" />
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
  stepKicker: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  nbaEmojiRow: {
    marginBottom: 10,
  },
  nbaEmoji: {
    fontSize: 36,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 10,
  },
  conferenceRow: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    marginBottom: 14,
    gap: 8,
  },
  confChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confChipActive: {
    backgroundColor: `${COLORS.primary}18`,
    borderColor: COLORS.primary,
  },
  confChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  confChipTextActive: {
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
  teamLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 3,
  },
  teamNameSelected: {
    color: COLORS.text,
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamAbbr: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600' as const,
  },
  confBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
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
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
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
