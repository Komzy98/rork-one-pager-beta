import React, { useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, Sparkles, ArrowRight, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getChronotypeInfo, getChronotypePeakLabel } from '@/constants/chronotypes';

const { width, height } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFFFFF', '#B3B3B3', '#747474', '#E0E0E0', '#D0D0D0', '#A0A0A0', '#FFFFFF'];
const NUM_CONFETTI = 18;

export default function CompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, profile } = useUserProfile();

  const checkScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;
  const summarySlide = useRef(new Animated.Value(24)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;

  const confettiAnims = useRef(
    Array.from({ length: NUM_CONFETTI }).map(() => ({
      translateY: new Animated.Value(-40),
      translateX: new Animated.Value((Math.random() - 0.5) * width),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, tension: 35, friction: 5, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(summaryOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(summarySlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(buttonSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringPulse, { toValue: 2.2, duration: 1800, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringPulse, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    confettiAnims.forEach((anim, i) => {
      const delay = i * 60;
      Animated.sequence([
        Animated.delay(200 + delay),
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 0.7 + Math.random() * 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(anim.scale, { toValue: 0.6 + Math.random() * 0.6, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(anim.translateY, { toValue: height + 40, duration: 2800 + Math.random() * 1000, useNativeDriver: true }),
          Animated.timing(anim.rotate, { toValue: 360 * (Math.random() > 0.5 ? 2 : -2), duration: 3200, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(1800),
            Animated.timing(anim.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, [checkScale, titleOpacity, titleSlide, summaryOpacity, summarySlide, buttonOpacity, buttonSlide, pulseAnim, ringPulse, ringOpacity, confettiAnims]);

  const handleStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    completeOnboarding();
    router.replace('/(tabs)/activities' as any);
  }, [completeOnboarding, router]);

  const selectedInterests = profile?.interests || [];
  const hasFootball = selectedInterests.includes('football');

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

      {confettiAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confetti,
            {
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              left: (i * 21 + 10) % width,
              width: Math.random() > 0.5 ? 7 : 4,
              height: Math.random() > 0.5 ? 12 : 7,
              borderRadius: Math.random() > 0.5 ? 3 : 2,
              transform: [
                { translateY: anim.translateY },
                { translateX: anim.translateX },
                { rotate: anim.rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
                { scale: anim.scale },
              ],
              opacity: anim.opacity,
            },
          ]}
        />
      ))}

      <View style={[styles.content, { paddingTop: insets.top + 50, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.celebrationWrap}>
          <View style={styles.checkArea}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: ringPulse }], opacity: ringOpacity },
              ]}
            />
            <Animated.View style={[styles.checkBg, { transform: [{ scale: checkScale }] }]}>
              <View style={styles.checkInner}>
                <CheckCircle size={48} color="#050505" strokeWidth={2} />
              </View>
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }] }}>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>Your personalised experience is ready</Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.summaryCard,
            { opacity: summaryOpacity, transform: [{ translateY: summarySlide }] },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.summaryTitle}>Your Setup</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryList}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconWrap}>
                <Zap size={14} color="#FFFFFF" />
              </View>
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryLabel}>Interests</Text>
                <Text style={styles.summaryValue}>
                  {selectedInterests.length > 0
                    ? selectedInterests.slice(0, 3).join(', ') + (selectedInterests.length > 3 ? ` +${selectedInterests.length - 3}` : '')
                    : 'None selected'}
                </Text>
              </View>
            </View>

            {hasFootball && profile?.favoriteTeams && profile.favoriteTeams.length > 0 && (
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
            )}

            {profile?.chronotype && (() => {
              const chrono = getChronotypeInfo(profile.chronotype);
              if (!chrono) return null;
              return (
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
              );
            })()}

            {profile?.favoriteCountries && profile.favoriteCountries.length > 0 && (
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconWrap}>
                  <Text style={styles.summaryEmoji}>🌍</Text>
                </View>
                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryLabel}>Leagues</Text>
                  <Text style={styles.summaryValue}>
                    {profile.favoriteCountries.slice(0, 2).map(c => c.name).join(', ')}
                    {profile.favoriteCountries.length > 2 && ` +${profile.favoriteCountries.length - 2}`}
                  </Text>
                </View>
              </View>
            )}

            {profile?.nationalities && profile.nationalities.length > 0 && (
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconWrap}>
                  <Text style={styles.summaryEmoji}>
                    {profile.nationalities[0]?.flag || '🏳️'}
                  </Text>
                </View>
                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryLabel}>Nationality</Text>
                  <Text style={styles.summaryValue}>
                    {profile.nationalities.map(n => n.name).join(', ')}
                  </Text>
                </View>
              </View>
            )}
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
              style={styles.startBtn}
              onPress={handleStart}
              activeOpacity={0.85}
              testID="onboarding-complete"
            >
              <View style={styles.startBtnInner}>
                <Text style={styles.startText}>Start Exploring</Text>
                <View style={styles.startArrow}>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                </View>
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
    backgroundColor: '#050505',
  },
  ambientOrb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.02)',
    top: -80,
    left: -80,
  },
  ambientOrb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.015)',
    bottom: 60,
    right: -60,
  },
  confetti: {
    position: 'absolute',
    top: -20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  celebrationWrap: {
    alignItems: 'center',
  },
  checkArea: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  checkBg: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  checkInner: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#747474',
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  summaryList: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryEmoji: {
    fontSize: 16,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#747474',
    marginBottom: 2,
    fontWeight: '500' as const,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  bottomWrap: {
    alignItems: 'center',
  },
  startBtn: {
    width: width - 64,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  startBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 28,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  startText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#050505',
  },
  startArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(5,5,5,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editHint: {
    fontSize: 13,
    color: '#747474',
    marginTop: 14,
  },
});
