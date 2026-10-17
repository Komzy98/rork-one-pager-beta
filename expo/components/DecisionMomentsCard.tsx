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
  const { colors, isDark } = useTheme();
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
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Compass size={15} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.kicker, { color: colors.textMuted }]}>RIGHT NOW</Text>
      </View>

      <View style={styles.list}>
        {moments.map((moment) => (
          <TouchableOpacity
            key={moment.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleAction(moment)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${moment.headline}. ${moment.body}. ${moment.actionLabel}`}
          >
            <View style={[styles.iconTile, { backgroundColor: isDark ? '#2A3345' : '#F1F4FA' }]}>
              <Text style={styles.emoji}>{moment.emoji}</Text>
            </View>
            <View style={styles.copy}>
              <View style={styles.headlineRow}>
                <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>
                  {moment.headline}
                </Text>
                <ChevronRight size={17} color={colors.textMuted} strokeWidth={1.8} />
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
                {moment.body}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                {moment.actionLabel}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 2,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  list: {
    gap: 9,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    justifyContent: 'space-between',
  },
  headline: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400',
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
