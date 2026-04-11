import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import OnboardingProgress from '@/components/OnboardingProgress';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 32 * 2 - 12) / 2;

const INTERESTS = [
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'ufc', name: 'UFC / MMA', emoji: '🥊' },
  { id: 'boxing', name: 'Boxing', emoji: '🥇' },
  { id: 'f1', name: 'Formula 1', emoji: '🏎️' },
  { id: 'fitness', name: 'Fitness', emoji: '💪' },
  { id: 'movies', name: 'Movies & TV', emoji: '🎬' },
  { id: 'cooking', name: 'Cooking', emoji: '👨‍🍳' },
  { id: 'learning', name: 'Learning', emoji: '🎓' },
  { id: 'events', name: 'Events', emoji: '🎪' },
  { id: 'productivity', name: 'Productivity', emoji: '📋' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateInterests } = useUserProfile();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const cardAnims = useRef(INTERESTS.map(() => new Animated.Value(0))).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const bounceAnims = useRef(
    INTERESTS.reduce<Record<string, Animated.Value>>((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
      ]),
      Animated.stagger(40, cardAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true })
      )),
      Animated.timing(footerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, titleSlide, cardAnims, footerAnim]);

  const toggleInterest = useCallback((interestId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const bounce = bounceAnims[interestId];
    if (bounce) {
      Animated.sequence([
        Animated.timing(bounce, { toValue: 0.9, duration: 70, useNativeDriver: true }),
        Animated.spring(bounce, { toValue: 1, tension: 300, friction: 7, useNativeDriver: true }),
      ]).start();
    }

    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  }, [bounceAnims]);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateInterests(selectedInterests);
    router.push('/(onboarding)/chronotype' as any);
  }, [selectedInterests, updateInterests, router]);

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
          <OnboardingProgress currentStep={1} totalSteps={4} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.stepLabel}>STEP 1</Text>
        <Text style={styles.title}>What excites you?</Text>
        <Text style={styles.subtitle}>Pick your interests to personalise your experience</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {INTERESTS.map((interest, index) => {
            const isSelected = selectedInterests.includes(interest.id);
            const bounce = bounceAnims[interest.id];
            return (
              <Animated.View
                key={interest.id}
                style={{
                  opacity: cardAnims[index],
                  transform: [
                    { scale: Animated.multiply(
                      cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
                      bounce || new Animated.Value(1)
                    )},
                  ],
                }}
              >
                <TouchableOpacity
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.8}
                  testID={`interest-${interest.id}`}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
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
                  <Text style={styles.emoji}>{interest.emoji}</Text>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {interest.name}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
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
        <View style={styles.selectionInfo}>
          <View style={[styles.countPill, selectedInterests.length > 0 && styles.countPillActive]}>
            <Text style={[styles.countText, selectedInterests.length > 0 && styles.countTextActive]}>
              {selectedInterests.length}
            </Text>
          </View>
          <Text style={styles.selectionLabel}>
            {selectedInterests.length === 0 ? 'Select at least one' : 'selected'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, selectedInterests.length === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selectedInterests.length === 0}
          activeOpacity={0.85}
          testID="interests-continue"
        >
          <View style={[styles.continueBtnInner, selectedInterests.length === 0 && styles.continueBtnInnerDisabled]}>
            <Text style={[styles.continueText, selectedInterests.length === 0 && styles.continueTextDisabled]}>
              Continue
            </Text>
            <ArrowRight size={18} color={selectedInterests.length === 0 ? 'rgba(255,255,255,0.15)' : '#050505'} />
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
  headerSpacer: {
    width: 40,
  },
  titleWrap: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#B3B3B3',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#747474',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    minHeight: 105,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
  },
  cardLabelSelected: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(5,5,5,0.95)',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  countPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countPillActive: {
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
