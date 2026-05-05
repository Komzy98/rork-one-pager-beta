import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  AccessibilityInfo,
  Platform,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, Sparkles, ArrowRight, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getChronotypeInfo, getChronotypePeakLabel } from '@/constants/chronotypes';
import { COLORS } from '@/constants/colors';
import { ONBOARDING_PREMIUM } from '@/constants/onboardingTheme';

const { width, height } = Dimensions.get('window');

/** Softer confetti — brand-aware, not grey noise */
const CONFETTI_COLORS = [
  `${COLORS.primary}55`,
  `${COLORS.success}40`,
  '#FFFFFFCC',
  `${COLORS.primary}35`,
  '#E8EEF8',
];
const NUM_CONFETTI = 14;

function StaggeredRow({
  delay,
  reduceMotion,
  children,
}: {
  delay: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 14)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        tension: 52,
        friction: 11,
      }),
    ]).start();
  }, [delay, reduceMotion, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
}

export default function CompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, profile } = useUserProfile();
  const [reduceMotion, setReduceMotion] = useState(false);

  const checkScale = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(26)).current;
  const kickerOpacity = useRef(new Animated.Value(0)).current;
  const summaryCardOpacity = useRef(new Animated.Value(0)).current;
  const summaryCardScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.96)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(0.65)).current;
  const ringOpacity = useRef(new Animated.Value(0.45)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const confettiAnims = useRef(
    Array.from({ length: NUM_CONFETTI }).map(() => ({
      translateY: new Animated.Value(-36),
      translateX: new Animated.Value((Math.random() - 0.5) * width),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    return () => {
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (reduceMotion) {
      checkScale.setValue(1);
      checkRotate.setValue(1);
      titleOpacity.setValue(1);
      titleSlide.setValue(0);
      kickerOpacity.setValue(1);
      summaryCardOpacity.setValue(1);
      summaryCardScale.setValue(1);
      buttonOpacity.setValue(1);
      buttonSlide.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, tension: 38, friction: 6, useNativeDriver: true }),
        Animated.timing(checkRotate, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }),
      ]),
      Animated.parallel([
        Animated.timing(kickerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 54, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(summaryCardOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(summaryCardScale, { toValue: 1, tension: 44, friction: 9, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(buttonSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringPulse, { toValue: 2.15, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringPulse, { toValue: 0.65, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.42, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    confettiAnims.forEach((anim, i) => {
      const delay = i * 55;
      Animated.sequence([
        Animated.delay(240 + delay),
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 0.55 + Math.random() * 0.35, duration: 220, useNativeDriver: true }),
          Animated.timing(anim.scale, { toValue: 0.55 + Math.random() * 0.45, duration: 220, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(anim.translateY, { toValue: height + 48, duration: 2600 + Math.random() * 900, useNativeDriver: true }),
          Animated.timing(anim.rotate, {
            toValue: 360 * (Math.random() > 0.5 ? 2 : -2),
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(1700),
            Animated.timing(anim.opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [
    reduceMotion,
    checkScale,
    checkRotate,
    titleOpacity,
    titleSlide,
    kickerOpacity,
    summaryCardOpacity,
    summaryCardScale,
    buttonOpacity,
    buttonSlide,
    pulseAnim,
    ringPulse,
    ringOpacity,
    shimmer,
    confettiAnims,
  ]);

  const handleStart = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    completeOnboarding();
    router.replace('/(tabs)/activities' as any);
  }, [completeOnboarding, router]);

  const selectedInterests = profile?.interests || [];
  const hasFootball = selectedInterests.includes('football');

  const summaryRows = useMemo(() => {
    const rows: { key: string; node: React.ReactNode }[] = [];

    rows.push({
      key: 'interests',
      node: (
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={['rgba(0,122,255,0.12)', 'rgba(0,122,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryIconWrap}
          >
            <Zap size={15} color={COLORS.primary} strokeWidth={2.2} />
          </LinearGradient>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryLabel}>Interests</Text>
            <Text style={styles.summaryValue}>
              {selectedInterests.length > 0
                ? `${selectedInterests.slice(0, 3).join(', ')}${selectedInterests.length > 3 ? ` +${selectedInterests.length - 3}` : ''}`
                : 'None selected'}
            </Text>
          </View>
        </View>
      ),
    });

    if (hasFootball && profile?.favoriteTeams && profile.favoriteTeams.length > 0) {
      rows.push({
        key: 'teams',
        node: (
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconWrap}>
              <Text style={styles.summaryEmoji}>⚽</Text>
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryLabel}>Teams</Text>
              <Text style={styles.summaryValue}>
                {profile.favoriteTeams.slice(0, 2).map(t => t.name).join(', ')}
                {profile.favoriteTeams.length > 2 && ` +${profile.favoriteTeams.length - 2}`}
              </Text>
            </View>
          </View>
        ),
      });
    }

    if (profile?.chronotype) {
      const chrono = getChronotypeInfo(profile.chronotype);
      if (chrono) {
        rows.push({
          key: 'chrono',
          node: (
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconWrap}>
                <Text style={styles.summaryEmoji}>{chrono.emoji}</Text>
              </View>
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryLabel}>Chronotype</Text>
                <Text style={styles.summaryValue}>
                  {chrono.name} · {getChronotypePeakLabel(chrono)}
                </Text>
              </View>
            </View>
          ),
        });
      }
    }

    if (profile?.favoriteCountries && profile.favoriteCountries.length > 0) {
      rows.push({
        key: 'countries',
        node: (
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconWrap}>
              <Text style={styles.summaryEmoji}>🌍</Text>
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryLabel}>Countries</Text>
              <Text style={styles.summaryValue}>
                {profile.favoriteCountries.slice(0, 2).map(c => c.name).join(', ')}
                {profile.favoriteCountries.length > 2 && ` +${profile.favoriteCountries.length - 2}`}
              </Text>
            </View>
          </View>
        ),
      });
    }

    if (profile?.favoriteLeagues && profile.favoriteLeagues.length > 0) {
      rows.push({
        key: 'favorite-leagues',
        node: (
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconWrap}>
              <Text style={styles.summaryEmoji}>🏆</Text>
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryLabel}>Favorite leagues</Text>
              <Text style={styles.summaryValue}>
                {profile.favoriteLeagues.length} selected for your Sports feed
              </Text>
            </View>
          </View>
        ),
      });
    }

    const hasFollowedTeams = Boolean(profile?.favoriteTeams?.length);
    const hasLeagues = Boolean(profile?.favoriteLeagues?.length);
    const priorityBlurb = hasFollowedTeams
      ? hasLeagues
        ? 'Following clubs first, then your selected leagues.'
        : 'Following clubs first, with broad match discovery.'
      : hasLeagues
        ? 'Your selected leagues first, then relevant discovery picks.'
        : 'Balanced discovery feed until you add clubs or leagues.';

    rows.push({
      key: 'feed-priorities',
      node: (
        <View style={[styles.summaryItem, styles.feedPriorityCard]}>
          <View style={styles.summaryIconWrap}>
            <Sparkles size={14} color={COLORS.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryLabel}>Feed priorities</Text>
            <Text style={styles.summaryValue}>{priorityBlurb}</Text>
            <View style={styles.feedEditRow}>
              <TouchableOpacity
                style={styles.feedEditBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/(onboarding)/leagues' as any)}
              >
                <Text style={styles.feedEditBtnText}>Edit leagues</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedEditBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/(onboarding)/feed-tuning' as any)}
              >
                <Text style={styles.feedEditBtnText}>Edit tuning</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ),
    });

    return rows;
  }, [profile, selectedInterests, hasFootball, router]);

  const staggerBase = reduceMotion ? 0 : 920;

  const checkSpin = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-14deg', '0deg'],
  });

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 0.6],
  });

  return (
    <View style={styles.container}>
      {!reduceMotion &&
        confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                left: (i * 23 + 14) % width,
                width: i % 3 === 0 ? 8 : 5,
                height: i % 3 === 0 ? 10 : 6,
                borderRadius: 3,
                transform: [
                  { translateY: anim.translateY },
                  { translateX: anim.translateX },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  { scale: anim.scale },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}

      <View style={[styles.content, { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.celebrationWrap}>
          <View style={styles.checkArea}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: ringPulse }], opacity: ringOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.checkBg,
                {
                  transform: [{ scale: checkScale }, { rotate: checkSpin }],
                },
              ]}
            >
              <LinearGradient colors={['#FFFFFF', '#F4FAF7']} style={styles.checkInner}>
                <LinearGradient
                  colors={['rgba(52,199,89,0.18)', 'rgba(52,199,89,0.06)']}
                  style={styles.checkTint}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
                <CheckCircle size={46} color={COLORS.success} strokeWidth={2.2} />
              </LinearGradient>
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: kickerOpacity }}>
            <Text style={[styles.kicker, ONBOARDING_PREMIUM.kicker]}>Setup complete</Text>
          </Animated.View>

          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }] }}>
            <Text style={[styles.title, ONBOARDING_PREMIUM.displayLarge]}>You&apos;re All Set!</Text>
            <Text style={[styles.subtitle, ONBOARDING_PREMIUM.titleMedium]}>
              Your personalised experience is ready
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={{
            opacity: summaryCardOpacity,
            transform: [{ scale: summaryCardScale }],
          }}
        >
          <View style={styles.summaryCardOuter}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={42} tint="light" style={StyleSheet.absoluteFillObject} />
            ) : (
              <View style={styles.summaryBlurFallback} />
            )}
            <View style={styles.summaryCardInner}>
              <View style={styles.summaryHeader}>
                <LinearGradient
                  colors={[`${COLORS.primary}22`, `${COLORS.primary}08`]}
                  style={styles.sparklePill}
                >
                  <Sparkles size={15} color={COLORS.primary} strokeWidth={2.2} />
                </LinearGradient>
                <Text style={styles.summaryTitle}>Your Setup</Text>
              </View>

              <LinearGradient
                colors={['transparent', ONBOARDING_PREMIUM.hairlineBorder, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.summaryDivider}
              />

              <View style={styles.summaryList}>
                {summaryRows.map((row, index) => (
                  <StaggeredRow
                    key={row.key}
                    delay={staggerBase + index * 88}
                    reduceMotion={reduceMotion}
                  >
                    {row.node}
                  </StaggeredRow>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomWrap,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonSlide }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={handleStart}
              activeOpacity={0.88}
              testID="onboarding-complete"
              accessibilityRole="button"
              accessibilityLabel="Start exploring the app"
            >
              <View style={[styles.startBtn, ONBOARDING_PREMIUM.primaryButtonShadow]}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark || '#0056B3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startGradient}
                >
                  {!reduceMotion && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.shimmerBand,
                        {
                          transform: [{ translateX: shimmerTranslate }],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    </Animated.View>
                  )}
                  <View style={styles.startBtnInner}>
                    <Text style={styles.startText}>Start exploring</Text>
                    <View style={styles.startArrow}>
                      <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.editHint}>You can always change these in Settings</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  confetti: {
    position: 'absolute',
    top: -24,
    zIndex: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  celebrationWrap: {
    alignItems: 'center',
  },
  kicker: {
    marginBottom: 10,
    textAlign: 'center',
  },
  checkArea: {
    width: 124,
    height: 124,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  pulseRing: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: `${COLORS.success}50`,
  },
  checkBg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 10,
  },
  checkInner: {
    width: 92,
    height: 92,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_PREMIUM.hairlineBorder,
    position: 'relative',
  },
  checkTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
  summaryCardOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_PREMIUM.hairlineStrong,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.09,
        shadowRadius: 28,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  summaryBlurFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  summaryCardInner: {
    padding: 20,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.88)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparklePill: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
    opacity: 0.9,
  },
  summaryList: {
    gap: 14,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedPriorityCard: {
    marginTop: 2,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_PREMIUM.hairlineBorder,
    backgroundColor: 'rgba(0,122,255,0.04)',
  },
  feedEditRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  feedEditBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0,122,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  feedEditBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_PREMIUM.hairlineBorder,
    overflow: 'hidden',
  },
  summaryEmoji: {
    fontSize: 17,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 3,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  bottomWrap: {
    alignItems: 'center',
  },
  startBtn: {
    width: width - 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startGradient: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 0.35,
    opacity: 0.85,
  },
  startBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 28,
    gap: 10,
  },
  startText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  startArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 16,
    letterSpacing: 0.1,
  },
});
