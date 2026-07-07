import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Check, Clock, Sunrise, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { CHRONOTYPES, getChronotypePeakLabel } from '@/constants/chronotypes';
import { COLORS } from '@/constants/colors';
import { Chronotype, ChronotypeInfo } from '@/types/habit';
import { getNextOnboardingRoute, HABIT_ONBOARDING_INTERESTS } from '@/utils/onboardingFlow';

export default function ChronotypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const { totalSteps, currentStep } = useOnboardingStepMeta('chronotype');
  const interests = profile?.interests ?? [];
  const [selected, setSelected] = useState<Chronotype | null>(null);

  useEffect(() => {
    const wantsChronotype = interests.some((id) =>
      (HABIT_ONBOARDING_INTERESTS as readonly string[]).includes(id),
    );
    if (profile && !wantsChronotype) {
      router.replace(getNextOnboardingRoute('interests', interests) as any);
    }
  }, [profile, interests, router]);
  const [expandedId, setExpandedId] = useState<Chronotype | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const cardAnims = useRef(CHRONOTYPES.map(() => new Animated.Value(0))).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const bounceAnims = useRef(
    CHRONOTYPES.reduce<Record<string, Animated.Value>>((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {})
  ).current;
  const expandAnims = useRef(
    CHRONOTYPES.reduce<Record<string, Animated.Value>>((acc, item) => {
      acc[item.id] = new Animated.Value(0);
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
      ]),
      Animated.stagger(60, cardAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true })
      )),
      Animated.timing(footerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, titleSlide, cardAnims, footerAnim]);

  const selectChronotype = useCallback((id: Chronotype) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const bounce = bounceAnims[id];
    if (bounce) {
      Animated.sequence([
        Animated.timing(bounce, { toValue: 0.95, duration: 70, useNativeDriver: true }),
        Animated.spring(bounce, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
    }

    setSelected(id);

    if (expandedId && expandedId !== id) {
      Animated.timing(expandAnims[expandedId], {
        toValue: 0, duration: 200, useNativeDriver: false,
      }).start();
    }
    Animated.timing(expandAnims[id], {
      toValue: expandedId === id ? 0 : 1, duration: 250, useNativeDriver: false,
    }).start();
    setExpandedId(expandedId === id ? null : id);
  }, [bounceAnims, expandAnims, expandedId]);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateProfile({ chronotype: selected });
    router.push(getNextOnboardingRoute('chronotype', interests) as any);
  }, [selected, updateProfile, router, interests]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSkip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(getNextOnboardingRoute('chronotype', interests) as any);
  }, [router, interests]);

  const getIconForChronotype = (id: Chronotype) => {
    switch (id) {
      case 'lion': return Sunrise;
      case 'bear': return Sun;
      case 'wolf': return Moon;
      case 'dolphin': return Clock;
    }
  };

  const renderChronotypeCard = (chrono: ChronotypeInfo, index: number) => {
    const isSelected = selected === chrono.id;
    const bounce = bounceAnims[chrono.id];
    const expandHeight = expandAnims[chrono.id];
    const Icon = getIconForChronotype(chrono.id);

    return (
      <Animated.View
        key={chrono.id}
        style={{
          opacity: cardAnims[index],
          transform: [
            {
              scale: Animated.multiply(
                cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                bounce || new Animated.Value(1)
              ),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={[styles.card, isSelected && styles.cardSelected]}
          onPress={() => selectChronotype(chrono.id)}
          activeOpacity={0.8}
          testID={`chronotype-${chrono.id}`}
        >
          {isSelected && <View style={styles.cardSelectedOverlay} />}

          {isSelected && (
            <View style={styles.checkBadge}>
              <Check size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}

          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
              <Text style={styles.emoji}>{chrono.emoji}</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardName, isSelected && styles.cardNameSelected]}>
                {chrono.name}
              </Text>
              <Text style={styles.cardTitle}>{chrono.title}</Text>
            </View>
            <View style={[styles.peakBadge, isSelected && styles.peakBadgeSelected]}>
              <Icon size={11} color={isSelected ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.peakText, isSelected && styles.peakTextSelected]}>
                {getChronotypePeakLabel(chrono)}
              </Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.expandedContent,
              {
                maxHeight: expandHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 160],
                }),
                opacity: expandHeight,
                marginTop: expandHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 12],
                }),
              },
            ]}
          >
            <Text style={styles.cardDescription}>{chrono.description}</Text>
            <View style={styles.traitsRow}>
              {chrono.traits.map((trait, i) => (
                <View key={i} style={styles.traitChip}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.stepLabel}>STEP {currentStep} · ENERGY</Text>
        <Text style={styles.title}>When are you{'\n'}most productive?</Text>
        <Text style={styles.subtitle}>
          Your chronotype helps us optimise your schedule
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CHRONOTYPES.map((chrono, index) => renderChronotypeCard(chrono, index))}
      </ScrollView>

      <Animated.View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16 },
          {
            opacity: footerAnim,
            transform: [{
              translateY: footerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
          testID="chronotype-continue"
        >
          <View style={[styles.continueBtnInner, !selected && styles.continueBtnInnerDisabled]}>
            <Text style={[styles.continueText, !selected && styles.continueTextDisabled]}>
              Continue
            </Text>
            <ArrowRight size={18} color={!selected ? COLORS.disabled : '#FFFFFF'} />
          </View>
        </TouchableOpacity>
      </Animated.View>
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
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  titleWrap: {
    paddingHorizontal: 32,
    marginBottom: 20,
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
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cardSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${COLORS.primary}0F`,
    borderRadius: 18,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapSelected: {
    backgroundColor: `${COLORS.primary}18`,
  },
  emoji: {
    fontSize: 22,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  cardNameSelected: {
    color: COLORS.text,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    marginRight: 26,
  },
  peakBadgeSelected: {
    backgroundColor: `${COLORS.primary}22`,
  },
  peakText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
  },
  peakTextSelected: {
    color: COLORS.primary,
  },
  expandedContent: {
    overflow: 'hidden',
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  traitChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
  },
  traitText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
    backgroundColor: COLORS.primary,
  },
  continueBtnInnerDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  continueTextDisabled: {
    color: COLORS.textMuted,
  },
});
