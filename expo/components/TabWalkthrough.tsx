import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Clock,
  Cloud,
  Zap,
  Tv,
  TrendingUp,
  Search,
  Radio,
  Star,
  FileText,
  Timer,
  ArrowRight,
  Compass,
  Sparkles,
  PlusCircle,
  BarChart3,
  Palette,
  RefreshCw,
  ChevronRight,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWalkthrough, WalkthroughStep } from '@/hooks/useWalkthrough';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const STEP_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  timeline: Clock,
  weather: Cloud,
  action: Zap,
  watchlist: Tv,
  trending: TrendingUp,
  search: Search,
  live: Radio,
  favorite: Star,
  details: FileText,
  organize: FileText,
  timer: Timer,
  swipe: ArrowRight,
  browse: Compass,
  personalized: Sparkles,
  add: PlusCircle,
  stats: BarChart3,
  customize: Palette,
  sync: RefreshCw,
};

interface TabWalkthroughProps {
  tabName: string;
}

const StepDot = React.memo(({ active, color }: { active: boolean; color: string }) => (
  <View
    style={[
      styles.dot,
      active
        ? { backgroundColor: color, width: 24, borderRadius: 6 }
        : { backgroundColor: 'rgba(255,255,255,0.3)' },
    ]}
  />
));

StepDot.displayName = 'StepDot';

const StepCard = React.memo(
  ({
    step,
    accentColor,
    animValue,
  }: {
    step: WalkthroughStep;
    accentColor: string;
    animValue: Animated.Value;
  }) => {
    const IconComp = STEP_ICONS[step.icon] ?? Zap;

    return (
      <Animated.View
        style={[
          styles.stepCard,
          {
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.stepIconWrap, { backgroundColor: accentColor + '20' }]}>
          <IconComp color={accentColor} size={26} />
        </View>
        <View style={styles.stepTextWrap}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </View>
      </Animated.View>
    );
  }
);

StepCard.displayName = 'StepCard';

export default function TabWalkthrough({ tabName }: TabWalkthroughProps) {
  const { shouldShowWalkthrough, getWalkthroughData, markTabSeen } = useWalkthrough();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const data = getWalkthroughData(tabName);
  const show = shouldShowWalkthrough(tabName) && data !== null;

  useEffect(() => {
    if (show) {
      const t = setTimeout(() => {
        setVisible(true);
        Animated.sequence([
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(contentAnim, {
            toValue: 1,
            tension: 60,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.timing(stepAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        });

        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
          ])
        ).start();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [show]);

  const animateStep = useCallback(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [stepAnim]);

  const handleNext = useCallback(() => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < data.steps.length - 1) {
      setCurrentStep((s) => s + 1);
      animateStep();
    } else {
      Animated.parallel([
        Animated.timing(contentAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        markTabSeen(tabName);
      });
    }
  }, [currentStep, data, animateStep, contentAnim, overlayOpacity, markTabSeen, tabName]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.timing(contentAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      markTabSeen(tabName);
    });
  }, [contentAnim, overlayOpacity, markTabSeen, tabName]);

  if (!visible || !data) return null;

  const step = data.steps[currentStep];
  const isLast = currentStep === data.steps.length - 1;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleSkip} />

      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT * 0.3, 0],
                }),
              },
              {
                scale: contentAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.85, 0.97, 1],
                }),
              },
            ],
            opacity: contentAnim,
          },
        ]}
      >
        <LinearGradient
          colors={[data.accentColor + 'DD', data.accentColor + '99', '#1C1C1EEE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        />

        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.08, 0],
              }),
            },
          ]}
        />

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>{data.welcomeTitle}</Text>
          <Text style={styles.welcomeSubtitle}>{data.welcomeSubtitle}</Text>
        </View>

        <View style={styles.stepArea}>
          {step && <StepCard step={step} accentColor={data.accentColor} animValue={stepAnim} />}
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {data.steps.map((_, i) => (
              <StepDot key={i} active={i === currentStep} color="#FFFFFF" />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: '#FFFFFF' }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, { color: data.accentColor }]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
            {!isLast && <ChevronRight color={data.accentColor} size={18} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip tour</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  container: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 120 : 100,
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 380,
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center' as const,
    marginTop: 6,
    lineHeight: 20,
  },
  stepArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    gap: 4,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
});
