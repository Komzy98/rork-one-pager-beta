import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useExperienceCheckIn } from '@/hooks/useExperienceCheckIn';
import { useTheme } from '@/hooks/useTheme';

export function ExperienceCheckInCard() {
  const { colors, isDark } = useTheme();
  const { prompt, respond, dismiss } = useExperienceCheckIn();
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleResponse = useCallback(async (value: number) => {
    if (!prompt || submitting) return;
    setSubmitting(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await respond(value);
      setAnswered(true);
    } finally {
      setSubmitting(false);
    }
  }, [prompt, respond, submitting]);

  const handleDismiss = useCallback(async () => {
    if (!prompt || submitting) return;
    setSubmitting(true);
    try {
      await dismiss();
      setAnswered(true);
    } finally {
      setSubmitting(false);
    }
  }, [dismiss, prompt, submitting]);

  if (!prompt || answered) return null;

  const surface = isDark ? '#171A20' : '#FFFFFF';
  const soft = isDark ? '#20242D' : '#F5F7FA';

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{prompt.eyebrow}</Text>
          <Text style={[styles.question, { color: colors.text }]}>{prompt.question}</Text>
        </View>
        <TouchableOpacity
          onPress={() => void handleDismiss()}
          disabled={submitting}
          hitSlop={10}
          accessibilityLabel="Skip check-in"
          style={[styles.dismiss, { backgroundColor: soft }]}
        >
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>{prompt.hint}</Text>

      <View style={styles.options}>
        {prompt.options.map((option) => (
          <TouchableOpacity
            key={`${prompt.id}-${option.value}`}
            activeOpacity={0.82}
            disabled={submitting}
            onPress={() => void handleResponse(option.value)}
            style={[styles.option, { backgroundColor: soft, borderColor: colors.border }]}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text style={[styles.optionText, { color: colors.text }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.learningRow}>
        <Check size={13} color={colors.textSecondary} />
        <Text style={[styles.learningText, { color: colors.textSecondary }]}>One tap helps One Pager learn from what you actually do.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.25,
  },
  question: {
    marginTop: 5,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '850' as any,
    letterSpacing: -0.3,
  },
  dismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  emoji: {
    fontSize: 18,
  },
  optionText: {
    fontSize: 11,
    fontWeight: '750' as any,
    textAlign: 'center',
  },
  learningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  learningText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
});
