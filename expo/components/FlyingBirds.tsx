import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BirdProps {
  delay: number;
  startY: number;
  color: string;
  size: number;
  speed: number;
}

const FlyingBird = React.memo(function FlyingBird({ delay, startY, color, size, speed }: BirdProps) {
  const positionX = useRef(new Animated.Value(-50)).current;
  const positionY = useRef(new Animated.Value(startY)).current;
  const wingFlap = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const bodyTilt = useRef(new Animated.Value(0)).current;
  const [isGliding, setIsGliding] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let verticalAnimation: Animated.CompositeAnimation | null = null;
    let wingAnimation: Animated.CompositeAnimation | null = null;
    let rotationAnimation: Animated.CompositeAnimation | null = null;
    let glideTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const startAnimation = () => {
      if (!isMounted) return;
      
      positionX.setValue(-50);
      positionY.setValue(startY);
      rotation.setValue(0);
      bodyTilt.setValue(0);

      const flyAcross = Animated.timing(positionX, {
        toValue: SCREEN_WIDTH + 100,
        duration: speed,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      });

      const wave1Height = 15 + Math.random() * 20;
      const wave2Height = 10 + Math.random() * 15;
      const wave1Duration = 2000 + Math.random() * 1000;
      const wave2Duration = 1800 + Math.random() * 800;

      verticalAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(positionY, {
              toValue: startY - wave1Height,
              duration: wave1Duration,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(bodyTilt, {
              toValue: -3,
              duration: wave1Duration,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
          ]),
          Animated.parallel([
            Animated.timing(positionY, {
              toValue: startY + wave2Height,
              duration: wave2Duration,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(bodyTilt, {
              toValue: 2,
              duration: wave2Duration,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
          ]),
        ])
      );

      rotationAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: -2,
            duration: 2200 + Math.random() * 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(rotation, {
            toValue: 2,
            duration: 2400 + Math.random() * 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 1800 + Math.random() * 400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );

      const startWingAnimation = () => {
        if (!isMounted) return;
        const upStrokeDuration = isGliding ? 180 : 100;
        const downStrokeDuration = isGliding ? 140 : 80;
        
        wingAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(wingFlap, {
              toValue: 1,
              duration: downStrokeDuration,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
            Animated.timing(wingFlap, {
              toValue: 0,
              duration: upStrokeDuration,
              useNativeDriver: true,
              easing: Easing.in(Easing.quad),
            }),
            ...(isGliding ? [
              Animated.delay(200 + Math.random() * 300)
            ] : [])
          ])
        );
        wingAnimation.start();
      };

      const scheduleGlide = () => {
        if (!isMounted) return;
        const shouldGlide = Math.random() > 0.6;
        if (shouldGlide !== isGliding) {
          setIsGliding(shouldGlide);
          wingAnimation?.stop();
          startWingAnimation();
        }
        glideTimeout = setTimeout(scheduleGlide, 2000 + Math.random() * 3000);
      };

      setTimeout(() => {
        if (!isMounted) return;
        flyAcross.start(({ finished }) => {
          if (!isMounted) return;
          if (finished) {
            verticalAnimation?.stop();
            wingAnimation?.stop();
            rotationAnimation?.stop();
            if (glideTimeout) clearTimeout(glideTimeout);
            setTimeout(() => startAnimation(), Math.random() * 4000 + 3000);
          }
        });
        verticalAnimation?.start();
        rotationAnimation?.start();
        startWingAnimation();
        scheduleGlide();
      }, delay);
    };

    startAnimation();
    
    return () => {
      isMounted = false;
      verticalAnimation?.stop();
      wingAnimation?.stop();
      rotationAnimation?.stop();
      if (glideTimeout) clearTimeout(glideTimeout);
    };
  }, [delay, startY, speed, positionX, positionY, wingFlap, rotation, bodyTilt, isGliding]);

  const leftWingRotate = wingFlap.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', isGliding ? '5deg' : '35deg'],
  });

  const rightWingRotate = wingFlap.interpolate({
    inputRange: [0, 1],
    outputRange: ['45deg', isGliding ? '-5deg' : '-35deg'],
  });

  const rotationDeg = rotation.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ['-2deg', '0deg', '2deg'],
  });

  const tiltDeg = bodyTilt.interpolate({
    inputRange: [-3, 0, 2],
    outputRange: ['-3deg', '0deg', '2deg'],
  });

  const bodyWidth = size * 0.22;
  const bodyHeight = size * 0.08;
  const wingSpan = size * 0.4;
  const wingThickness = size * 0.06;

  return (
    <Animated.View
      style={[
        styles.bird,
        {
          transform: [
            { translateX: positionX },
            { translateY: positionY },
            { rotate: rotationDeg },
          ],
        },
      ]}
    >
      <Animated.View 
        style={[
          styles.birdShape,
          {
            transform: [{ rotate: tiltDeg }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.wing,
            {
              width: wingSpan,
              height: wingThickness,
              backgroundColor: color,
              borderTopLeftRadius: wingSpan * 0.8,
              borderBottomLeftRadius: wingSpan * 0.2,
              marginRight: -bodyWidth * 0.3,
              opacity: 0.9,
              transform: [
                { rotate: leftWingRotate },
                { skewY: '-8deg' },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.body,
            {
              width: bodyWidth,
              height: bodyHeight,
              backgroundColor: color,
              borderRadius: bodyHeight / 2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.wing,
            {
              width: wingSpan,
              height: wingThickness,
              backgroundColor: color,
              borderTopRightRadius: wingSpan * 0.8,
              borderBottomRightRadius: wingSpan * 0.2,
              marginLeft: -bodyWidth * 0.3,
              opacity: 0.9,
              transform: [
                { rotate: rightWingRotate },
                { skewY: '8deg' },
              ],
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
});

interface FlyingBirdsProps {
  count?: number;
  colors?: string[];
  speed?: 'slow' | 'medium' | 'fast';
}

const FlyingBirdsComponent = React.memo(function FlyingBirds({ 
  count = 5, 
  colors = ['rgba(30,30,30,0.75)', 'rgba(50,50,50,0.65)', 'rgba(70,70,70,0.55)'],
  speed = 'medium'
}: FlyingBirdsProps) {
  const speedMap = {
    slow: 14000,
    medium: 9000,
    fast: 6000,
  };

  const birds = Array.from({ length: count }, (_, index) => {
    const baseSpeed = speedMap[speed];
    return {
      id: index,
      delay: index * 1800 + Math.random() * 2500,
      startY: 50 + Math.random() * (SCREEN_HEIGHT * 0.25),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 14 + Math.random() * 10,
      speed: baseSpeed + Math.random() * 4000 - 2000,
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {birds.map((bird) => (
        <FlyingBird
          key={bird.id}
          delay={bird.delay}
          startY={bird.startY}
          color={bird.color}
          size={bird.size}
          speed={bird.speed}
        />
      ))}
    </View>
  );
});

export default FlyingBirdsComponent;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bird: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  birdShape: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wing: {
    borderRadius: 1,
  },
  body: {
    borderRadius: 2,
  },
});
