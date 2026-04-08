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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import OnboardingProgress from '@/components/OnboardingProgress';
import { CHRONOTYPES, getChronotypePeakLabel } from '@/constants/chronotypes';
import { Chronotype, ChronotypeInfo } from '@/types/habit';

export default function ChronotypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const [selected, setSelected] = useState<Chronotype | null>(null);
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

    if (profile?.interests?.includes('football')) {
      router.push('/(onboarding)/nationality' as any);
    } else {
      router.push('/(onboarding)/complete' as any);
    }
  }, [selected, updateProfile, router, profile?.interests]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSkip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (profile?.interests?.includes('football')) {
      router.push('/(onboarding)/nationality' as any);
    } else {
      router.push('/(onboarding)/complete' as any);
    }
  }, [router, profile?.interests]);

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
          {isSelected && (
            <LinearGradient
              colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          {isSelected && (
            <View style={styles.checkBadge}>
              <Check size={10} color="#050505" strokeWidth={3} />
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
              <Icon size={11} color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.35)'} />
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
          <OnboardingProgress currentStep={2} totalSteps={4} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.stepLabel}>STEP 2</Text>
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
            <ArrowRight size={18} color={!selected ? 'rgba(255,255,255,0.15)' : '#050505'} />
          </View>
        </TouchableOpacity>
      </Animated.View>
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
    fontWeight: '600' as const,
    color: '#747474',
  },
  titleWrap: {
    paddingHorizontal: 32,
    marginBottom: 20,
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
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#747474',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardNameSelected: {
    color: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 12,
    color: '#747474',
    fontWeight: '500' as const,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginRight: 26,
  },
  peakBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  peakText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#747474',
  },
  peakTextSelected: {
    color: '#FFFFFF',
  },
  expandedContent: {
    overflow: 'hidden',
  },
  cardDescription: {
    fontSize: 13,
    color: '#747474',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  traitText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#B3B3B3',
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(5,5,5,0.95)',
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
    backgroundColor: '#FFFFFF',
  },
  continueBtnInnerDisabled: {
    backgroundColor: '#1A1A1A',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#050505',
  },
  continueTextDisabled: {
    color: 'rgba(255,255,255,0.15)',
  },
});
