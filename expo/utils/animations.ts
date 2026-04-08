import { Animated, Easing, Platform } from 'react-native';

// Animation timing presets
export const TIMING = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: 300,
};

// Easing presets
export const EASING = {
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  snap: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
};

// Spring configs
export const SPRING_CONFIG = {
  gentle: { tension: 120, friction: 14, useNativeDriver: true },
  snappy: { tension: 180, friction: 12, useNativeDriver: true },
  bouncy: { tension: 200, friction: 8, useNativeDriver: true },
  stiff: { tension: 300, friction: 20, useNativeDriver: true },
  wobbly: { tension: 100, friction: 6, useNativeDriver: true },
};

// Press animation for buttons and cards
export const createPressAnimation = (
  scaleValue: Animated.Value,
  config: 'gentle' | 'snappy' | 'bouncy' = 'snappy'
) => {
  const pressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      ...SPRING_CONFIG[config],
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      ...SPRING_CONFIG[config],
    }).start();
  };

  return { pressIn, pressOut };
};

// Fade in animation
export const fadeIn = (
  value: Animated.Value,
  duration: number = TIMING.normal,
  delay: number = 0
) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    easing: EASING.smooth,
    useNativeDriver: true,
  });
};

// Fade out animation
export const fadeOut = (
  value: Animated.Value,
  duration: number = TIMING.fast
) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: EASING.smooth,
    useNativeDriver: true,
  });
};

// Slide in from bottom
export const slideInFromBottom = (
  translateY: Animated.Value,
  from: number = 50,
  duration: number = TIMING.normal
) => {
  translateY.setValue(from);
  return Animated.timing(translateY, {
    toValue: 0,
    duration,
    easing: EASING.decelerate,
    useNativeDriver: true,
  });
};

// Slide in from right
export const slideInFromRight = (
  translateX: Animated.Value,
  from: number = 50,
  duration: number = TIMING.normal
) => {
  translateX.setValue(from);
  return Animated.timing(translateX, {
    toValue: 0,
    duration,
    easing: EASING.decelerate,
    useNativeDriver: true,
  });
};

// Scale up animation
export const scaleUp = (
  scale: Animated.Value,
  duration: number = TIMING.normal
) => {
  scale.setValue(0.8);
  return Animated.spring(scale, {
    toValue: 1,
    ...SPRING_CONFIG.snappy,
  });
};

// Pulse animation (loop)
export const createPulseAnimation = (
  scale: Animated.Value,
  minScale: number = 0.95,
  maxScale: number = 1.05
) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(scale, {
        toValue: maxScale,
        duration: 800,
        easing: EASING.smooth,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: minScale,
        duration: 800,
        easing: EASING.smooth,
        useNativeDriver: true,
      }),
    ])
  );
};

// Shimmer animation helper
export const createShimmerAnimation = (value: Animated.Value) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ])
  );
};

// Staggered list animation
export const staggeredFadeIn = (
  values: Animated.Value[],
  staggerDelay: number = 50,
  duration: number = TIMING.normal
) => {
  const animations = values.map((value, index) =>
    Animated.timing(value, {
      toValue: 1,
      duration,
      delay: index * staggerDelay,
      easing: EASING.decelerate,
      useNativeDriver: true,
    })
  );
  return Animated.parallel(animations);
};

// Bounce entrance
export const bounceIn = (scale: Animated.Value, opacity: Animated.Value) => {
  scale.setValue(0.3);
  opacity.setValue(0);
  return Animated.parallel([
    Animated.spring(scale, {
      toValue: 1,
      ...SPRING_CONFIG.bouncy,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]);
};

// Success checkmark animation
export const successAnimation = (
  scale: Animated.Value,
  rotate: Animated.Value
) => {
  scale.setValue(0);
  rotate.setValue(0);
  return Animated.sequence([
    Animated.spring(scale, {
      toValue: 1.2,
      ...SPRING_CONFIG.bouncy,
    }),
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        ...SPRING_CONFIG.gentle,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]),
  ]);
};

// Shake animation (for errors)
export const shakeAnimation = (translateX: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]);
};

// Tab indicator slide animation
export const slideIndicator = (
  translateX: Animated.Value,
  toValue: number,
  duration: number = TIMING.normal
) => {
  return Animated.spring(translateX, {
    toValue,
    ...SPRING_CONFIG.snappy,
  });
};

// Glow pulse for active states
export const glowPulse = (opacity: Animated.Value) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.8,
        duration: 1000,
        easing: EASING.smooth,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: 1000,
        easing: EASING.smooth,
        useNativeDriver: false,
      }),
    ])
  );
};

// Counter animation helper
export const animateNumber = (
  value: Animated.Value,
  toValue: number,
  duration: number = 500
) => {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: EASING.decelerate,
    useNativeDriver: false,
  });
};

// Create confetti particle animation
export const createConfettiAnimation = (
  translateY: Animated.Value,
  translateX: Animated.Value,
  rotate: Animated.Value,
  opacity: Animated.Value,
  startX: number,
  endX: number,
  duration: number = 2000
) => {
  translateY.setValue(-20);
  translateX.setValue(startX);
  opacity.setValue(1);

  return Animated.parallel([
    Animated.timing(translateY, {
      toValue: 400,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: endX,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }),
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ),
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      delay: duration * 0.7,
      useNativeDriver: true,
    }),
  ]);
};
