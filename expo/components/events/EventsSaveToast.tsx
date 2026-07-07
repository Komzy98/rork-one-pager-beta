import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import type { EventsPalette } from '@/utils/eventsPalette';

interface EventsSaveToastProps {
  message: string | null;
  palette: EventsPalette;
  bottomInset?: number;
  onDismiss: () => void;
}

export const EventsSaveToast = React.memo(function EventsSaveToast({
  message,
  palette,
  bottomInset = 100,
  onDismiss,
}: EventsSaveToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    translateY.setValue(12);

    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 180, friction: 16 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 180, friction: 16 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 260, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 2200);

    return () => clearTimeout(timer);
  }, [message, onDismiss, opacity, translateY]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom: bottomInset,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: palette.card, borderColor: palette.primary }]}>
        <Sparkles size={16} color={palette.primary} />
        <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
});
