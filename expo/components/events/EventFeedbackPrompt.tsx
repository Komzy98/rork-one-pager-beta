import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SavedEventSnapshot } from '@/types/events';
import type { EventFeedbackRating } from '@/utils/eventJoyFeedback';

interface ThemeColors {
  text: string;
  textSecondary: string;
  card: string;
  border: string;
  primary: string;
  primaryLight: string;
}

interface EventFeedbackPromptProps {
  snapshot: SavedEventSnapshot;
  colors: ThemeColors;
  onRate: (eventId: string, rating: EventFeedbackRating) => void | Promise<void>;
  onDismiss: (eventId: string) => void | Promise<void>;
}

const RATING_OPTIONS: { rating: EventFeedbackRating; label: string; emoji: string }[] = [
  { rating: 5, label: 'Loved it', emoji: '🤩' },
  { rating: 4, label: 'Good', emoji: '😊' },
  { rating: 2, label: 'Meh', emoji: '😐' },
];

export function EventFeedbackPrompt({
  snapshot,
  colors,
  onRate,
  onDismiss,
}: EventFeedbackPromptProps) {
  const handleRate = useCallback(
    (rating: EventFeedbackRating) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void onRate(snapshot.id, rating);
    },
    [onRate, snapshot.id],
  );

  const handleDismiss = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void onDismiss(snapshot.id);
  }, [onDismiss, snapshot.id]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Sparkles size={16} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>How was it?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {snapshot.title}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={8} accessibilityLabel="Skip feedback">
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Great nights feed your joy picks and future recommendations.
      </Text>

      <View style={styles.options}>
        {RATING_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.rating}
            style={[styles.option, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
            onPress={() => handleRate(option.rating)}
            activeOpacity={0.85}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text style={[styles.optionLabel, { color: colors.primary }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 20,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
