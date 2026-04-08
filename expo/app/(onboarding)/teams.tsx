import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, ArrowRight, ArrowLeft, Search, Star, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserTeam } from '@/types/habit';
import { getPopularTeams, searchTeams } from '@/constants/footballData';
import OnboardingProgress from '@/components/OnboardingProgress';

export default function TeamsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const [selectedTeams, setSelectedTeams] = useState<UserTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedTeams.length > 0 && profile) {
      const existingTeams = profile.favoriteTeams || [];
      const newTeams = selectedTeams.filter(team =>
        !existingTeams.some(existing =>
          existing.id === team.id || existing.name.toLowerCase() === team.name.toLowerCase()
        )
      );
      const updatedTeams = [...existingTeams, ...newTeams];
      updateProfile({ favoriteTeams: updatedTeams });
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
        colors={['#050505', '#0A0A0A', '#050505']}
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
        <Text style={styles.stepLabel}>STEP 4</Text>
        <Text style={styles.title}>Follow Your Teams</Text>
        <Text style={styles.subtitle}>Get live scores and updates for your favourite clubs</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color="#747474" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      {!searchQuery && (
        <View style={styles.sectionRow}>
          <Star size={13} color="#B3B3B3" />
          <Text style={styles.sectionLabel}>
            {profile?.favoriteCountries && profile.favoriteCountries.length > 0
              ? 'Teams from Your Countries'
              : 'Popular Teams'}
          </Text>
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Trophy size={36} color="rgba(255,255,255,0.1)" />
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
                  {isSelected && (
                    <LinearGradient
                      colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <View style={[styles.teamIconWrap, isSelected && styles.teamIconSelected]}>
                    <Trophy size={16} color={isSelected ? '#050505' : '#B3B3B3'} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
                      {team.name}
                    </Text>
                    <Text style={styles.teamLeague}>{team.league}</Text>
                    {team.country && <Text style={styles.teamCountry}>{team.country}</Text>}
                  </View>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={11} color="#050505" strokeWidth={3} />
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
            <ArrowRight size={18} color="#050505" />
          </View>
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
    backgroundColor: 'rgba(255,255,255,0.015)',
    top: -60,
    right: -80,
  },
  ambientOrb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.01)',
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
  stepLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#B3B3B3',
    letterSpacing: 2.5,
    marginBottom: 10,
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
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
    color: '#747474',
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
    borderColor: 'rgba(255,255,255,0.25)',
  },
  teamIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamIconSelected: {
    backgroundColor: '#FFFFFF',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  teamNameSelected: {
    color: '#FFFFFF',
  },
  teamLeague: {
    fontSize: 12,
    color: '#747474',
    marginBottom: 1,
  },
  teamCountry: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.18)',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
    color: '#747474',
    marginTop: 14,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.3)',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  selectionLabel: {
    fontSize: 14,
    color: '#747474',
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
    backgroundColor: '#FFFFFF',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#050505',
  },
});
