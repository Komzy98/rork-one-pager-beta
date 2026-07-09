import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Platform } from 'react-native';
import { COLORS } from '@/constants/colors';
import { interFont } from '@/constants/fonts';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

/** Premium step indicator: soft track, saturated fill, clear typography scale. */
export default function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const segmentAnims = useRef(
    Array.from({ length: totalSteps }).map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    segmentAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i < currentStep ? 1 : 0,
        tension: 70,
        friction: 12,
        useNativeDriver: false,
      }).start();
    });
  }, [currentStep, segmentAnims]);

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        {segmentAnims.map((anim, i) => (
          <View key={i} style={styles.segmentTrack}>
            <Animated.View
              style={[
                styles.segmentFill,
                {
                  width: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        ))}
      </View>
      <Text style={styles.stepIndicator}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  segmentTrack: {
    flex: 1,
    height: Platform.OS === 'ios' ? 4 : 5,
    backgroundColor: 'rgba(36, 64, 211, 0.08)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 100,
    backgroundColor: COLORS.primary,
  },
  stepIndicator: {
    fontFamily: interFont('600'),
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.4,
  },
});
