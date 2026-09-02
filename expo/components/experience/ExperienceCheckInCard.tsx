import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useExperienceCheckIn } from '@/hooks/useExperienceCheckIn';
import { useTheme } from '@/hooks/useTheme';
import { OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import { StatusPill, SurfaceCard } from '@/components/ui/OnePagerUI';

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
  const soft = isDark ? colors.surfaceSecondary : '#F3F5F8';

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <StatusPill label={prompt.eyebrow} tone="info" />
          <Text style={[OP_TYPE.cardTitle, styles.question, { color: colors.text }]}>{prompt.question}</Text>
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

      <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>{prompt.hint}</Text>

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
            <Text style={[OP_TYPE.meta, styles.optionText, { color: colors.text }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.learningRow}>
        <Check size={13} color={colors.textSecondary} />
        <Text style={[OP_TYPE.meta, styles.learningText, { color: colors.textSecondary }]}>One tap helps One Pager learn from what you actually do.</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: OP_SPACING.sm },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: OP_SPACING.sm },
  copy: { flex: 1, minWidth: 0, gap: OP_SPACING.xs },
  question: { fontSize: 17, lineHeight: 22 },
  dismiss: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  options: { flexDirection: 'row', gap: OP_SPACING.xs },
  option: { flex: 1, minHeight: 54, borderWidth: 1, borderRadius: OP_RADIUS.medium, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
  emoji: { fontSize: 18 },
  optionText: { fontWeight: '700', textAlign: 'center' },
  learningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  learningText: { flex: 1, fontSize: 10, lineHeight: 14 },
});
