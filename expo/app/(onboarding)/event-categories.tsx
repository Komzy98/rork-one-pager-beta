import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';
import { getNextOnboardingRoute, hasEventsOnboarding } from '@/utils/onboardingFlow';
import {
  normalizeOnboardingEventCategories,
  ONBOARDING_EVENT_CATEGORIES,
} from '@/utils/onboardingEventCategories';
import { pickOnboardingEventCategories } from '@/utils/onboardingProfileSave';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 32 * 2 - 12) / 2;

export default function EventCategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, profile } = useUserProfile();
  const { currentStep, totalSteps } = useOnboardingStepMeta('event-categories');
  const interests = profile?.interests ?? [];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const hydratedFromProfile = useRef(false);

  useEffect(() => {
    if (profile && !hasEventsOnboarding(interests)) {
      router.replace(getNextOnboardingRoute('interests', interests) as any);
    }
  }, [profile, interests, router]);

  useEffect(() => {
    if (!profile || hydratedFromProfile.current) return;
    hydratedFromProfile.current = true;
    if (profile.favoriteEventCategories?.length) {
      setSelectedCategories(normalizeOnboardingEventCategories(profile.favoriteEventCategories));
    }
  }, [profile]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const cardAnims = useRef(ONBOARDING_EVENT_CATEGORIES.map(() => new Animated.Value(0))).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const bounceAnims = useRef(
    ONBOARDING_EVENT_CATEGORIES.reduce<Record<string, Animated.Value>>((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {}),
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
      ]),
      Animated.stagger(
        40,
        cardAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
        ),
      ),
      Animated.timing(footerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, titleSlide, cardAnims, footerAnim]);

  const toggleCategory = useCallback(
    (categoryId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDirty(true);

      const bounce = bounceAnims[categoryId];
      if (bounce) {
        Animated.sequence([
          Animated.timing(bounce, { toValue: 0.9, duration: 70, useNativeDriver: true }),
          Animated.spring(bounce, { toValue: 1, tension: 300, friction: 7, useNativeDriver: true }),
        ]).start();
      }

      setSelectedCategories((prev) =>
        prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
      );
    },
    [bounceAnims],
  );

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const normalized = normalizeOnboardingEventCategories(selectedCategories);
    const patch = pickOnboardingEventCategories({
      dirty,
      selected: normalized,
      existing: profile?.favoriteEventCategories,
    });
    if (patch) {
      updateProfile({ favoriteEventCategories: patch });
    }
    router.push(getNextOnboardingRoute('event-categories', interests) as any);
  }, [dirty, selectedCategories, profile?.favoriteEventCategories, updateProfile, router, interests]);

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
          <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View
        style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleSlide }] }]}
      >
        <Text style={styles.stepLabel}>EVENTS · YOUR VIBE</Text>
        <Text style={styles.title}>What do you want to go to?</Text>
        <Text style={styles.subtitle}>
          Pick the kinds of events you want surfaced first in Discover
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {ONBOARDING_EVENT_CATEGORIES.map((category, index) => {
            const isSelected = selectedCategories.includes(category.id);
            const bounce = bounceAnims[category.id];
            const Icon = category.icon;

            return (
              <Animated.View
                key={category.id}
                style={{
                  opacity: cardAnims[index],
                  transform: [
                    {
                      scale: Animated.multiply(
                        cardAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                        bounce || new Animated.Value(1),
                      ),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    isSelected && { borderColor: category.color, borderWidth: 2 },
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.85}
                  testID={`event-category-${category.id}`}
                >
                  {isSelected ? (
                    <View
                      style={[styles.cardSelectedOverlay, { backgroundColor: `${category.color}12` }]}
                    />
                  ) : null}
                  {isSelected ? (
                    <View style={[styles.checkBadge, { backgroundColor: category.color }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: isSelected ? `${category.color}22` : COLORS.surfaceSecondary,
                        borderColor: isSelected ? `${category.color}40` : COLORS.border,
                      },
                    ]}
                  >
                    <Icon size={18} color={category.color} strokeWidth={2.25} />
                  </View>

                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {category.label}
                  </Text>
                  <Text style={styles.cardHint}>{category.hint}</Text>
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
            transform: [
              {
                translateY: footerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.selectionInfo}>
          <View
            style={[styles.countPill, selectedCategories.length > 0 && styles.countPillActive]}
          >
            <Text
              style={[styles.countText, selectedCategories.length > 0 && styles.countTextActive]}
            >
              {selectedCategories.length}
            </Text>
          </View>
          <Text style={styles.selectionLabel}>
            {selectedCategories.length === 0
              ? 'Select at least one'
              : 'selected · tune anytime in Profile'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, selectedCategories.length === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selectedCategories.length === 0}
          activeOpacity={0.85}
          testID="event-categories-continue"
        >
          <View
            style={[
              styles.continueBtnInner,
              selectedCategories.length === 0 && styles.continueBtnInnerDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueText,
                selectedCategories.length === 0 && styles.continueTextDisabled,
              ]}
            >
              Continue
            </Text>
            <ArrowRight
              size={18}
              color={selectedCategories.length === 0 ? COLORS.disabled : '#FFFFFF'}
            />
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
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 118,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  cardLabelSelected: {
    color: COLORS.text,
  },
  cardHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
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
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countPillActive: {
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
