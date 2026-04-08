import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Loader2, Activity, Target } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, cardShadow } from '@/constants/design';

interface EnhancedLoadingStateProps {
  message?: string;
  type?: 'default' | 'activities' | 'habits' | 'sports';
  showProgress?: boolean;
  progress?: number;
}

const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({
  message = 'Loading...',
  type = 'default',
  showProgress = false,
  progress = 0,
}) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Scale animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    pulseAnimation.start();
    scaleAnimation.start();

    return () => {
      rotateAnimation.stop();
      pulseAnimation.stop();
      scaleAnimation.stop();
    };
  }, [rotateValue, scaleValue, pulseValue]);

  const rotateInterpolate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getLoadingIcon = () => {
    const iconProps = { size: 32, color: COLORS.primary };
    switch (type) {
      case 'activities':
        return <Activity {...iconProps} />;
      case 'habits':
        return <Target {...iconProps} />;
      case 'sports':
        return <Activity {...iconProps} />;
      default:
        return <Loader2 {...iconProps} />;
    }
  };

  const getLoadingMessage = () => {
    switch (type) {
      case 'activities':
        return 'Loading your activities...';
      case 'habits':
        return 'Loading your habits...';
      case 'sports':
        return 'Loading sports data...';
      default:
        return message;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { rotate: rotateInterpolate },
                { scale: scaleValue },
              ],
            },
          ]}
        >
          {getLoadingIcon()}
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ scale: pulseValue }],
            },
          ]}
        >
          <Text style={styles.loadingText}>{getLoadingMessage()}</Text>
          <Text style={styles.subText}>Please wait a moment</Text>
        </Animated.View>

        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progress, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: rotateValue.interpolate({
                    inputRange: [0, 0.33, 0.66, 1],
                    outputRange: index === 0 ? [1, 0.3, 0.3, 1] : 
                               index === 1 ? [0.3, 1, 0.3, 0.3] : 
                               [0.3, 0.3, 1, 0.3],
                  }),
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
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...cardShadow(3),
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minWidth: 280,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  subText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

export default React.memo(EnhancedLoadingState);