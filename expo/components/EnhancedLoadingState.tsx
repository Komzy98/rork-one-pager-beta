import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Platform } from 'react-native';
import { Activity, Target, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface EnhancedLoadingStateProps {
  message?: string;
  type?: 'default' | 'activities' | 'habits' | 'sports';
  showProgress?: boolean;
  progress?: number;
}

const TYPE_CONFIG = {
  default: { icon: Zap, gradient: ['#007AFF', '#5856D6'] as [string, string], label: 'Loading...', sub: 'Getting things ready' },
  activities: { icon: Activity, gradient: ['#FF6B35', '#FF9500'] as [string, string], label: 'Loading activities', sub: 'Preparing your overview' },
  habits: { icon: Target, gradient: ['#34C759', '#30D158'] as [string, string], label: 'Loading habits', sub: 'Syncing your progress' },
  sports: { icon: Activity, gradient: ['#FF3B30', '#FF453A'] as [string, string], label: 'Loading sports', sub: 'Fetching live data' },
};

const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({
  message,
  type = 'default',
  showProgress = false,
  progress = 0,
}) => {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const config = TYPE_CONFIG[type];
  const IconComp = config.icon;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
      ])
    );

    const ring = Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    );

    const dotAnimations = dotAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );

    pulse.start();
    ring.start();
    dotAnimations.forEach(a => a.start());

    return () => {
      pulse.stop();
      ring.stop();
      dotAnimations.forEach(a => a.stop());
    };
  }, [pulseAnim, ringAnim, dotAnims]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconOuter, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View style={[
            styles.ringPulse,
            {
              borderColor: config.gradient[0] + '20',
              opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
            }
          ]} />
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <IconComp size={28} color="#FFFFFF" strokeWidth={2.2} />
          </LinearGradient>
        </Animated.View>

        <Text style={[styles.loadingText, { color: colors.text }]}>
          {message || config.label}
        </Text>
        <Text style={[styles.subText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
          {config.sub}
        </Text>

        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}

        <View style={styles.dotsContainer}>
          {dotAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: config.gradient[0],
                  opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconOuter: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  ringPulse: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  progressContainer: {
    width: 200,
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default React.memo(EnhancedLoadingState);