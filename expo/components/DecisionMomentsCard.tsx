import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Compass } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import {
  buildDecisionMoments,
  type BuildDecisionMomentsInput,
  type DecisionMoment,
} from '@/utils/decisionMoments';

type DecisionMomentsCardProps = BuildDecisionMomentsInput & {
  onCheer?: (eventId: string) => void;
};

export default function DecisionMomentsCard(props: DecisionMomentsCardProps) {
  const { colors } = useTheme();
  const { onCheer, ...input } = props;

  const moments = useMemo(() => buildDecisionMoments(input), [
    input.now,
    input.completedHabits,
    input.totalHabits,
    input.chronotypeId,
    input.tonightMatchLabel,
    input.matchKickoffTime,
    input.weather,
    input.continueWatchingTitle,
    input.partnerFeed,
    input.currentUserId,
  ]);

  const handleAction = useCallback(
    (moment: DecisionMoment) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      switch (moment.action.type) {
        case 'cheer':
          onCheer?.(moment.action.eventId);
          break;
        case 'tasks':
          router.push('/(tabs)/tasks' as any);
          break;
        case 'route':
          router.push(moment.action.route as any);
          break;
      }
    },
    [onCheer],
  );

  if (moments.length === 0) return null;

  return (
    <View style={[styles.wrap, { paddingHorizontal: 20 }]}>
      <View style={styles.headerRow}>
        <Compass size={16} color={colors.primary} strokeWidth={2.2} />
        <Text style={[styles.kicker, { color: colors.textMuted }]}>RIGHT NOW</Text>
      </View>

      <View style={styles.list}>
        {moments.map((moment) => (
          <TouchableOpacity
            key={moment.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleAction(moment)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${moment.headline}. ${moment.actionLabel}`}
          >
            <Text style={styles.emoji}>{moment.emoji}</Text>
            <View style={styles.copy}>
              <Text style={[styles.headline, { color: colors.text }]}>{moment.headline}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
                {moment.body}
              </Text>
              <View style={styles.actionRow}>
                <Text style={[styles.actionLabel, { color: colors.primary }]}>{moment.actionLabel}</Text>
                <ChevronRight size={14} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  emoji: {
    fontSize: 20,
    marginTop: 1,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
