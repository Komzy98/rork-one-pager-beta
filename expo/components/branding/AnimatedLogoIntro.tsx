import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '@/constants/colors';

const LOGO = require('@/assets/images/icon.png');

interface AnimatedLogoIntroProps {
  onFinish: () => void;
}

export function AnimatedLogoIntro({ onFinish }: AnimatedLogoIntroProps) {
  const overlayOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.7);
  const ringOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(14);
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(10);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120, mass: 0.85 });
    ringOpacity.value = withDelay(
      120,
      withSequence(
        withTiming(0.35, { duration: 280 }),
        withTiming(0.12, { duration: 900 }),
      ),
    );
    ringScale.value = withDelay(
      120,
      withTiming(1.35, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
    titleOpacity.value = withDelay(380, withTiming(1, { duration: 420 }));
    titleY.value = withDelay(380, withSpring(0, { damping: 16, stiffness: 140 }));
    taglineOpacity.value = withDelay(560, withTiming(1, { duration: 380 }));
    taglineY.value = withDelay(560, withSpring(0, { damping: 16, stiffness: 130 }));

    overlayOpacity.value = withDelay(
      2100,
      withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [
    logoOpacity,
    logoScale,
    onFinish,
    overlayOpacity,
    ringOpacity,
    ringScale,
    taglineOpacity,
    taglineY,
    titleOpacity,
    titleY,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Animated.Text style={[styles.title, titleStyle]}>One Pager</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>Your day, one page</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  ring: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoWrap: {
    width: 112,
    height: 112,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: {
    width: 112,
    height: 112,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textTertiary,
    letterSpacing: -0.1,
  },
});
