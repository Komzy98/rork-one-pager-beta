import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { ArrowRight, ArrowLeft, Search, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import { UserCountry } from '@/types/habit';
import { FOOTBALL_COUNTRIES } from '@/constants/footballData';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';

export default function CountriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const { totalSteps, stepSportsPick } = useOnboardingStepMeta();
  const [selectedCountries, setSelectedCountries] = useState<UserCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [prioritizeDomesticLeagues, setPrioritizeDomesticLeagues] = useState<boolean>(
    profile?.sportsFeedPrefs?.prioritizeDomesticLeagues ?? true,
  );

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

  const filteredCountries = useMemo(() =>
    FOOTBALL_COUNTRIES.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.leagues.some(league => league.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [searchQuery]
  );

  const toggleCountry = useCallback((country: UserCountry) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCountries(prev => {
      const isSelected = prev.some(c => c.id === country.id);
      return isSelected ? prev.filter(c => c.id !== country.id) : [...prev, country];
    });
  }, []);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedCountries.length > 0 && profile) {
      const existingCountries = profile.favoriteCountries || [];
      const newCountries = selectedCountries.filter(country =>
        !existingCountries.some(existing => existing.id === country.id)
      );
      const updatedCountries = [...existingCountries, ...newCountries];
      updateProfile({
        favoriteCountries: updatedCountries,
        sportsFeedPrefs: {
          strictFollowing: profile?.sportsFeedPrefs?.strictFollowing ?? false,
          includeFollowedLeagues: profile?.sportsFeedPrefs?.includeFollowedLeagues ?? true,
          discoveryLevel: profile?.sportsFeedPrefs?.discoveryLevel ?? 'med',
          prioritizeDomesticLeagues,
          prioritizeNationalTeams: profile?.sportsFeedPrefs?.prioritizeNationalTeams ?? true,
        },
      });
    } else {
      updateProfile({
        sportsFeedPrefs: {
          strictFollowing: profile?.sportsFeedPrefs?.strictFollowing ?? false,
          includeFollowedLeagues: profile?.sportsFeedPrefs?.includeFollowedLeagues ?? true,
          discoveryLevel: profile?.sportsFeedPrefs?.discoveryLevel ?? 'med',
          prioritizeDomesticLeagues,
          prioritizeNationalTeams: profile?.sportsFeedPrefs?.prioritizeNationalTeams ?? true,
        },
      });
    }
    router.push('/(onboarding)/teams' as any);
  }, [selectedCountries, profile, updateProfile, router, prioritizeDomesticLeagues]);

  const handleSkip = useCallback(() => {
    router.push('/(onboarding)/teams' as any);
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
        <Text style={styles.stepLabel}>STEP {stepSportsPick} · LEAGUES</Text>
        <Text style={styles.title}>Choose Leagues</Text>
        <Text style={styles.subtitle}>Select countries to follow their football leagues</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search countries or leagues..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        {selectedCountries.length > 0 ? (
          <View style={styles.domesticPrefCard}>
            <Text style={styles.domesticPrefTitle}>Prioritize domestic leagues from these countries?</Text>
            <View style={styles.domesticPrefRow}>
              <TouchableOpacity
                style={[styles.domesticPrefChip, prioritizeDomesticLeagues && styles.domesticPrefChipActive]}
                onPress={() => setPrioritizeDomesticLeagues(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.domesticPrefChipText, prioritizeDomesticLeagues && styles.domesticPrefChipTextActive]}>
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.domesticPrefChip, !prioritizeDomesticLeagues && styles.domesticPrefChipActive]}
                onPress={() => setPrioritizeDomesticLeagues(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.domesticPrefChipText, !prioritizeDomesticLeagues && styles.domesticPrefChipTextActive]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredCountries.map((country) => {
            const isSelected = selectedCountries.some(c => c.id === country.id);
            return (
              <TouchableOpacity
                key={country.id}
                style={[styles.countryCard, isSelected && styles.countryCardSelected]}
                onPress={() => toggleCountry(country)}
                activeOpacity={0.7}
              >
                {isSelected && <View style={styles.cardSelectedOverlay} />}
                <View style={[styles.flagCircle, isSelected && styles.flagCircleSelected]}>
                  <Text style={styles.flagEmoji}>{country.flag}</Text>
                </View>
                <View style={styles.countryInfo}>
                  <Text style={[styles.countryName, isSelected && styles.countryNameSelected]}>
                    {country.name}
                  </Text>
                  <Text style={styles.leagueText} numberOfLines={1}>
                    {country.leagues.join(' · ')}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.selectionRow}>
          <View style={[styles.countChip, selectedCountries.length > 0 && styles.countChipActive]}>
            <Text style={[styles.countText, selectedCountries.length > 0 && styles.countTextActive]}>
              {selectedCountries.length}
            </Text>
          </View>
          <Text style={styles.selectionLabel}>
            {selectedCountries.length === 1 ? 'country' : 'countries'} selected
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
  list: {
    flex: 1,
    paddingHorizontal: 32,
  },
  domesticPrefCard: {
    marginHorizontal: 32,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  domesticPrefTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 10,
  },
  domesticPrefRow: {
    flexDirection: 'row',
    gap: 8,
  },
  domesticPrefChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 9,
  },
  domesticPrefChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}18`,
  },
  domesticPrefChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  domesticPrefChipTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: 16,
  },
  countryCard: {
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
  countryCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cardSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${COLORS.primary}0D`,
    borderRadius: 16,
  },
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flagCircleSelected: {
    backgroundColor: `${COLORS.primary}14`,
  },
  flagEmoji: {
    fontSize: 20,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  countryNameSelected: {
    color: COLORS.text,
  },
  leagueText: {
    fontSize: 12,
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
