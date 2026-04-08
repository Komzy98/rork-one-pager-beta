import React, { useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Zap, Trophy, Tv, ListChecks } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: Zap, title: 'Smart Habits', desc: 'AI-powered daily routines', delay: 0 },
  { icon: Trophy, title: 'Live Sports', desc: 'Real-time scores & updates', delay: 80 },
  { icon: Tv, title: 'Shows & Movies', desc: 'Track your watchlist', delay: 160 },
  { icon: ListChecks, title: 'Task Manager', desc: 'Stay organised effortlessly', delay: 240 },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(24)).current;
  const featureAnims = useRef(FEATURES.map(() => ({
    opacity: new Animated.Value(0),
    translateX: new Animated.Value(-30),
  }))).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 40, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, tension: 30, friction: 8, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(greetingOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(greetingSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.stagger(80, featureAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(a.translateX, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ])
      )),
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ctaSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, [logoScale, logoOpacity, ringScale, ringOpacity, greetingOpacity, greetingSlide, featureAnims, ctaOpacity, ctaSlide, pulseAnim, orbFloat]);

  const handleGetStarted = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(onboarding)/interests' as any);
  }, [router]);

  const handleCreateAccount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/signup' as any);
  }, [router]);

  const userName = isGuest ? 'there' : user?.name?.split(' ')[0] || 'there';

  const orbTranslateY = orbFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050505', '#0A0A0A', '#050505']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.ambientOrb, styles.orbTopRight, { transform: [{ translateY: orbTranslateY }] }]} />
      <View style={styles.ambientOrb2} />
      <View style={styles.gridLine1} />
      <View style={styles.gridLine2} />

      <View style={[styles.content, { paddingTop: insets.top + 50, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topSection}>
          <View style={styles.logoArea}>
            <Animated.View style={[styles.logoRing, { transform: [{ scale: Animated.multiply(ringScale, pulseAnim) }], opacity: ringOpacity }]} />
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
              <Image
                source={{ uri: 'https://r2-pub.rork.com/attachments/fjpmfu4g76ll0wi3po34f' }}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: greetingOpacity, transform: [{ translateY: greetingSlide }] }}>
            <Text style={styles.greeting}>Hey {userName}</Text>
            <Text style={styles.tagline}>Let's set up your space</Text>
          </Animated.View>
        </View>

        <View style={styles.featuresSection}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Animated.View
                key={f.title}
                style={[
                  styles.featureRow,
                  {
                    opacity: featureAnims[i].opacity,
                    transform: [{ translateX: featureAnims[i].translateX }],
                  },
                ]}
              >
                <View style={styles.featureIconWrap}>
                  <Icon size={18} color="#FFFFFF" strokeWidth={1.8} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View style={[styles.bottomSection, { opacity: ctaOpacity, transform: [{ translateY: ctaSlide }] }]}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleGetStarted}
            activeOpacity={0.85}
            testID="onboarding-get-started"
          >
            <View style={styles.ctaInner}>
              <Text style={styles.ctaText}>Get Started</Text>
              <View style={styles.ctaArrow}>
                <ArrowRight size={16} color="#050505" strokeWidth={2.5} />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.timeHint}>Takes about 1 minute</Text>

          {isGuest && (
            <TouchableOpacity
              style={styles.accountBtn}
              onPress={handleCreateAccount}
              activeOpacity={0.7}
            >
              <Text style={styles.accountBtnText}>Already have an account?</Text>
            </TouchableOpacity>
          )}
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
  ambientOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopRight: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(255,255,255,0.02)',
    top: -80,
    right: -100,
  },
  ambientOrb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.015)',
    bottom: 120,
    left: -60,
  },
  gridLine1: {
    position: 'absolute',
    width: 1,
    height: height,
    backgroundColor: 'rgba(255,255,255,0.02)',
    left: width * 0.25,
  },
  gridLine2: {
    position: 'absolute',
    width: 1,
    height: height,
    backgroundColor: 'rgba(255,255,255,0.02)',
    left: width * 0.75,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    gap: 28,
  },
  logoArea: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: '#747474',
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },
  featuresSection: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#747474',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 12,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 28,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#050505',
    letterSpacing: 0.2,
  },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(5,5,5,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeHint: {
    fontSize: 13,
    color: '#747474',
    letterSpacing: 0.3,
  },
  accountBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  accountBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#B3B3B3',
    letterSpacing: 0.1,
  },
});
