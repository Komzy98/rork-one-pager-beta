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
import OnboardingProgress from '@/components/OnboardingProgress';
import { ALL_NATIONS, REGION_LABELS, REGION_ORDER, Nation } from '@/constants/nations';
import { COLORS } from '@/constants/colors';

export default function NationalityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const { totalSteps, stepNationality } = useOnboardingStepMeta();
  const [selectedNationalities, setSelectedNationalities] = useState<Nation[]>([]);
  const [activeRegion, setActiveRegion] = useState<Nation['region'] | 'all'>('all');
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

  const filteredNations = useMemo(() => {
    let nations = ALL_NATIONS;
    if (activeRegion !== 'all') {
      nations = nations.filter(n => n.region === activeRegion);
    }
    if (searchQuery.trim()) {
      nations = nations.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return nations.sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, activeRegion]);

  const toggleNationality = useCallback((nation: Nation) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNationalities(prev => {
      const isSelected = prev.some(n => n.id === nation.id);
      return isSelected ? prev.filter(n => n.id !== nation.id) : [...prev, nation];
    });
  }, []);

  const handleContinue = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedNationalities.length > 0 && profile) {
      const nationalities = selectedNationalities.map(nation => ({
        id: nation.id,
        name: nation.name,
        code: nation.code,
        flag: nation.flag,
        apiId: nation.apiId,
      }));
      console.log('🌍 Saving nationalities:', nationalities.map(n => ({ name: n.name, apiId: n.apiId })));
      await new Promise<void>(resolve => {
        updateProfile({ nationalities });
        setTimeout(resolve, 300);
      });
    }
    if (profile?.interests?.includes('football')) {
      router.push('/(onboarding)/countries' as any);
    } else if (profile?.interests?.includes('nba')) {
      router.push('/(onboarding)/nba-teams' as any);
    } else {
      router.push('/(onboarding)/complete' as any);
    }
  }, [selectedNationalities, profile, updateProfile, router]);

  const handleSkip = useCallback(() => {
    if (profile?.interests?.includes('football')) {
      router.push('/(onboarding)/countries' as any);
    } else if (profile?.interests?.includes('nba')) {
      router.push('/(onboarding)/nba-teams' as any);
    } else {
      router.push('/(onboarding)/complete' as any);
    }
  }, [profile, router]);

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
          <OnboardingProgress currentStep={stepNationality} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.stepLabel}>STEP {stepNationality} · REGION</Text>
        <Text style={styles.title}>Your Nationality</Text>
        <Text style={styles.subtitle}>Follow your national team in World Cup, AFCON & more</Text>
      </Animated.View>

      <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
        <Search size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search countries..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      <View style={styles.regionFilterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionFilterContent}>
          <TouchableOpacity
            style={[styles.regionChip, activeRegion === 'all' && styles.regionChipActive]}
            onPress={() => setActiveRegion('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.regionChipText, activeRegion === 'all' && styles.regionChipTextActive]}>All</Text>
          </TouchableOpacity>
          {REGION_ORDER.filter(r => r !== 'oceania').map(region => (
            <TouchableOpacity
              key={region}
              style={[styles.regionChip, activeRegion === region && styles.regionChipActive]}
              onPress={() => setActiveRegion(region)}
              activeOpacity={0.7}
            >
              <Text style={[styles.regionChipText, activeRegion === region && styles.regionChipTextActive]}>{REGION_LABELS[region]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredNations.map((nation) => {
            const isSelected = selectedNationalities.some(n => n.id === nation.id);
            return (
              <TouchableOpacity
                key={nation.id}
                style={[styles.nationCard, isSelected && styles.nationCardSelected]}
                onPress={() => toggleNationality(nation)}
                activeOpacity={0.7}
              >
                {isSelected && <View style={styles.nationSelectedOverlay} />}
                <View style={[styles.flagCircle, isSelected && styles.flagCircleSelected]}>
                  <Text style={styles.flagEmoji}>{nation.flag}</Text>
                </View>
                <View style={styles.nationInfo}>
                  <Text style={[styles.nationName, isSelected && styles.nationNameSelected]}>
                    {nation.name}
                  </Text>
                  <Text style={styles.nationSub}>National Team</Text>
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
        {selectedNationalities.length > 0 && (
          <View style={styles.selectedRow}>
            {selectedNationalities.slice(0, 6).map((n) => (
              <View key={n.id} style={styles.footerFlagBubble}>
                <Text style={styles.footerFlagEmoji}>{n.flag}</Text>
              </View>
            ))}
            {selectedNationalities.length > 6 && (
              <Text style={styles.moreText}>+{selectedNationalities.length - 6}</Text>
            )}
          </View>
        )}
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
  regionFilterWrap: {
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  regionFilterContent: {
    gap: 8,
    paddingRight: 8,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  regionChipActive: {
    backgroundColor: `${COLORS.primary}18`,
    borderColor: COLORS.primary,
  },
  regionChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  regionChipTextActive: {
    color: COLORS.primary,
  },
  list: {
    flex: 1,
    paddingHorizontal: 32,
  },
  listContent: {
    paddingBottom: 16,
  },
  nationCard: {
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
  nationCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  nationSelectedOverlay: {
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
    fontSize: 22,
  },
  nationInfo: {
    flex: 1,
  },
  nationName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  nationNameSelected: {
    color: COLORS.text,
  },
  nationSub: {
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
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  moreText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  footerFlagBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerFlagEmoji: {
    fontSize: 18,
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
