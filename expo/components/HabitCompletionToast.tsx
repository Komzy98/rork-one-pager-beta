import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle2, Flame, Undo2, X } from 'lucide-react-native';
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

const DISMISS_AFTER_MOOD_MS = 2800;
const DISMISS_MOOD_PROMPT_MS = 14_000;
const DISMISS_SIMPLE_MS = 4500;

interface HabitCompletionToastProps {
  feedback: CompletionFeedback;
  onDismiss?: () => void;
  onMood?: (habitId: string, mood: Mood) => void;
  /** Space above the tab bar (safe area + tab bar). */
  bottomInset?: number;
}

export default function HabitCompletionToast({
  feedback,
  onDismiss,
  onMood,
  bottomInset = 108,
}: HabitCompletionToastProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const [pickedMood, setPickedMood] = useState<Mood | null>(null);

  const logged = feedback.logged;
  const showMoodPicker = logged && !!onMood;

  useEffect(() => {
    if (!feedback.visible) {
      opacity.setValue(0);
      translateY.setValue(24);
      setPickedMood(null);
      return;
    }

    setPickedMood(null);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [feedback.visible, feedback.habitId, feedback.title, feedback.logged, opacity, translateY]);

  useEffect(() => {
    if (!feedback.visible) return;

    const delay = pickedMood
      ? DISMISS_AFTER_MOOD_MS
      : showMoodPicker
        ? DISMISS_MOOD_PROMPT_MS
        : DISMISS_SIMPLE_MS;

    const hide = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 16, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, delay);

    return () => clearTimeout(hide);
  }, [
    feedback.visible,
    showMoodPicker,
    pickedMood,
    opacity,
    translateY,
    onDismiss,
  ]);

  if (!feedback.visible) return null;

  const handleMood = (mood: Mood) => {
    if (!feedback.habitId || pickedMood) return;
    setPickedMood(mood);
    onMood?.(feedback.habitId, mood);
  };

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 16, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDismiss?.();
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={handleDismiss} accessibilityLabel="Dismiss" />
        <Animated.View
          style={[
            styles.wrap,
            {
              marginBottom: bottomInset,
              opacity,
              transform: [{ translateY }],
              backgroundColor: isDark ? colors.card : '#0F172A',
              borderColor: isDark ? colors.border : 'rgba(255,255,255,0.08)',
            },
          ]}
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
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <X size={16} color={isDark ? colors.textSecondary : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {showMoodPicker ? (
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
                    accessibilityLabel={opt.label}
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
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingTop: 1,
  },
  closeBtn: {
    padding: 4,
    marginTop: -2,
  },
  moodRow: {
    marginTop: 14,
    gap: 10,
  },
  moodPrompt: {
    fontSize: 13,
    fontWeight: '700',
  },
  moodOptions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-start',
  },
  moodBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
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
