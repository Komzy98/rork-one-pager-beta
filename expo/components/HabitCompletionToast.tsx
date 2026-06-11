import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CheckCircle2, Flame, Undo2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { CompletionFeedback } from '@/hooks/useTodayHabits';
import type { TaskCompletion } from '@/types/task';

type Mood = NonNullable<TaskCompletion['mood']>;

const MOOD_OPTIONS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: 'excellent', emoji: '🔥', label: 'Great' },
  { mood: 'good', emoji: '😊', label: 'Good' },
  { mood: 'okay', emoji: '😐', label: 'Okay' },
  { mood: 'difficult', emoji: '😤', label: 'Tough' },
];

interface HabitCompletionToastProps {
  feedback: CompletionFeedback;
  onDismiss?: () => void;
  onMood?: (habitId: string, mood: Mood) => void;
}

export default function HabitCompletionToast({
  feedback,
  onDismiss,
  onMood,
}: HabitCompletionToastProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const [pickedMood, setPickedMood] = useState<Mood | null>(null);

  const logged = feedback.logged;
  const showMoodPicker = logged && !!onMood;

  useEffect(() => {
    if (!feedback.visible) {
      opacity.setValue(0);
      translateY.setValue(12);
      return;
    }

    setPickedMood(null);

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

    // Give a little longer when there's a mood prompt to interact with.
    const hide = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, showMoodPicker ? 5200 : 2600);

    return () => clearTimeout(hide);
  }, [feedback.visible, feedback.title, feedback.logged, showMoodPicker, opacity, translateY, onDismiss]);

  if (!feedback.visible) return null;

  const handleMood = (mood: Mood) => {
    if (!feedback.habitId) return;
    setPickedMood(mood);
    onMood?.(feedback.habitId, mood);
  };

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
      pointerEvents={showMoodPicker ? 'auto' : 'none'}
    >
      <View style={styles.headRow}>
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
      </View>

      {showMoodPicker && (
        <View style={styles.moodRow}>
          <Text style={[styles.moodPrompt, { color: isDark ? colors.textSecondary : '#94A3B8' }]}>
            {pickedMood ? 'Logged — nice!' : 'How did it feel?'}
          </Text>
          <View style={styles.moodOptions}>
            {MOOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.mood}
                onPress={() => handleMood(opt.mood)}
                disabled={!!pickedMood}
                activeOpacity={0.7}
                style={[
                  styles.moodBtn,
                  {
                    backgroundColor:
                      pickedMood === opt.mood
                        ? '#34D39933'
                        : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.1)',
                    opacity: pickedMood && pickedMood !== opt.mood ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={styles.moodEmoji}>{opt.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  moodPrompt: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  moodOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  moodBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 18,
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
