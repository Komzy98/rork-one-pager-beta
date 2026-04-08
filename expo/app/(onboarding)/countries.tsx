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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserCountry } from '@/types/habit';
import { FOOTBALL_COUNTRIES } from '@/constants/footballData';
import OnboardingProgress from '@/components/OnboardingProgress';

export default function CountriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const [selectedCountries, setSelectedCountries] = useState<UserCountry[]>([]);
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
      updateProfile({ favoriteCountries: updatedCountries });
    }
    router.push('/(onboarding)/teams' as any);
  }, [selectedCountries, profile, updateProfile, router]);

  const handleSkip = useCallback(() => {
    router.push('/(onboarding)/teams' as any);
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
          <OnboardingProgress currentStep={3} totalSteps={4} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.stepLabel}>STEP 3</Text>
        <Text style={styles.title}>Choose Leagues</Text>
        <Text style={styles.subtitle}>Select countries to follow their football leagues</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color="#747474" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search countries or leagues..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
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
                {isSelected && (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
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
                    <Check size={11} color="#050505" strokeWidth={3} />
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
    left: -80,
  },
  ambientOrb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.01)',
    bottom: 100,
    right: -50,
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
  list: {
    flex: 1,
    paddingHorizontal: 32,
  },
  listContent: {
    paddingBottom: 16,
  },
  countryCard: {
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
  countryCardSelected: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flagCircleSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  countryNameSelected: {
    color: '#FFFFFF',
  },
  leagueText: {
    fontSize: 12,
    color: '#747474',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
