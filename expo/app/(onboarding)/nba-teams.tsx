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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { NBAFavoriteTeam } from '@/types/habit';
import { ALL_NBA_TEAMS, searchNBATeams, NBATeamInfo, getTeamColor } from '@/constants/nbaData';
import OnboardingProgress from '@/components/OnboardingProgress';

type ConferenceFilter = 'all' | 'Eastern' | 'Western';

export default function NBATeamsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
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
    router.push('/(onboarding)/complete' as any);
  }, [selectedTeams, profile, updateProfile, router]);

  const handleSkip = useCallback(() => {
    router.push('/(onboarding)/complete' as any);
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050505', '#0D1117', '#050505']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={styles.ambientOrb1} />
      <View style={styles.ambientOrb2} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={4} totalSteps={4} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <View style={styles.nbaEmojiRow}>
          <Text style={styles.nbaEmoji}>🏀</Text>
        </View>
        <Text style={styles.title}>Pick Your Team</Text>
        <Text style={styles.subtitle}>Follow NBA teams for upcoming games and scores</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color="#747474" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search NBA teams..."
          placeholderTextColor="rgba(255,255,255,0.2)"
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
                    <LinearGradient
                      colors={[`${teamColor}18`, `${teamColor}08`]}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <View style={styles.teamLogoWrap}>
                    <Image
                      source={{ uri: team.logo }}
                      style={styles.teamLogo}
                      resizeMode="contain"
                    />
                  </View>
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
          <LinearGradient
            colors={['#F26522', '#E85D1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnInner}
          >
            <Text style={styles.continueText}>Continue</Text>
            <ArrowRight size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  ambientOrb1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(242, 101, 34, 0.03)',
    top: -60,
    right: -80,
  },
  ambientOrb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(29, 66, 138, 0.03)',
    bottom: 100,
    left: -50,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#747474',
    fontWeight: '600' as const,
  },
  titleWrap: {
    paddingHorizontal: 32,
    marginBottom: 18,
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
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#747474',
    lineHeight: 20,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 32,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  confChipActive: {
    backgroundColor: 'rgba(242, 101, 34, 0.15)',
    borderColor: 'rgba(242, 101, 34, 0.3)',
  },
  confChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#747474',
  },
  confChipTextActive: {
    color: '#F26522',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  teamCardSelected: {
    borderColor: 'rgba(242, 101, 34, 0.3)',
  },
  teamLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  teamNameSelected: {
    color: '#FFFFFF',
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamAbbr: {
    fontSize: 12,
    color: '#747474',
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
    color: '#747474',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(5,5,5,0.95)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countChipActive: {
    backgroundColor: 'rgba(242, 101, 34, 0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.3)',
  },
  countTextActive: {
    color: '#F26522',
  },
  selectionLabel: {
    fontSize: 14,
    color: '#747474',
  },
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F26522',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
