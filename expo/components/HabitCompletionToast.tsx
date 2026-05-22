import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Flame, Undo2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { CompletionFeedback } from '@/hooks/useTodayHabits';

interface HabitCompletionToastProps {
  feedback: CompletionFeedback;
  onDismiss?: () => void;
}

export default function HabitCompletionToast({
  feedback,
  onDismiss,
}: HabitCompletionToastProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!feedback.visible) {
      opacity.setValue(0);
      translateY.setValue(12);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const hide = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, 2600);

    return () => clearTimeout(hide);
  }, [feedback.visible, feedback.title, feedback.logged, opacity, translateY, onDismiss]);

  if (!feedback.visible) return null;

  const logged = feedback.logged;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: isDark ? colors.card : '#0F172A',
          borderColor: isDark ? colors.border : 'transparent',
        },
      ]}
      pointerEvents="none"
    >
      {logged ? (
        <CheckCircle2 size={18} color="#34D399" strokeWidth={2.5} />
      ) : (
        <Undo2 size={18} color={colors.textTertiary} strokeWidth={2.5} />
      )}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: isDark ? colors.text : '#F8FAFC' }]}>
          {logged ? 'Saved' : 'Undone'} · {feedback.title}
        </Text>
        {logged && feedback.streak > 0 ? (
          <View style={styles.metaRow}>
            <Flame size={12} color="#F59E0B" strokeWidth={2.5} />
            <Text style={[styles.meta, { color: isDark ? colors.textSecondary : '#94A3B8' }]}>
              {feedback.streak}-day streak
              {feedback.weeklyLabel ? ` · ${feedback.weeklyLabel}` : ''}
            </Text>
          </View>
        ) : logged && feedback.weeklyLabel ? (
          <Text style={[styles.meta, { color: isDark ? colors.textSecondary : '#94A3B8' }]}>
            {feedback.weeklyLabel}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
});
