import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const segmentAnims = useRef(
    Array.from({ length: totalSteps }).map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    segmentAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i < currentStep ? 1 : 0,
        tension: 60,
        friction: 10,
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
                  backgroundColor: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(255,255,255,0.06)', '#FFFFFF'],
                  }),
                },
              ]}
            />
          </View>
        ))}
      </View>
      <Text style={styles.stepIndicator}>
        {currentStep} of {totalSteps}
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
    gap: 6,
    width: '100%',
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
  },
});
