import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Share2, Volume2, VolumeX, X } from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import type { DailySummary } from '@/utils/dailySummary';
import type { DailyStatsDelta } from '@/utils/dailySummaryStats';
import type { TodayCoachPhase } from '@/utils/todayCoach';

export type TodayCoachCardProps = {
  coachPhase?: TodayCoachPhase;
  chronotypeId?: string;
  dailySummary: DailySummary | null;
  isGenerating: boolean;
  isSpeaking: boolean;
  isVoicePending: boolean;
  recoveryActive: boolean;
  autoSummaryHintDismissed: boolean;
  autoSummaryScheduleLabel: string | null;
  yesterdayDelta: DailyStatsDelta | null;
  userDisplayName?: string;
  onGenerate: () => void;
  onDismissSummary: () => void;
  onToggleListen: () => void;
  onShareSummary: () => void;
  onDismissAutoSummaryHint: () => void;
};

function firstUsefulSentence(value: string, max = 220) {
  const clean = value.replace(/\s+/g, ' ').trim();
  const sentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? clean;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).replace(/[\s,;:.!?-]+$/g, '')}…`;
}

/**
 * The old "AI coach" shell was intentionally removed.
 * Daily synthesis only appears when there is a real summary to communicate,
 * and it is presented as a normal day review rather than an AI feature.
 */
export default function TodayCoachCard(props: TodayCoachCardProps) {
  const { colors, isDark } = useTheme();
  const {
    dailySummary,
    isSpeaking,
    isVoicePending,
    recoveryActive,
    yesterdayDelta,
    onDismissSummary,
    onToggleListen,
    onShareSummary,
  } = props;

  const review = useMemo(
    () => (dailySummary ? firstUsefulSentence(dailySummary.summary) : null),
    [dailySummary],
  );

  const supportingLine = useMemo(() => {
    if (!dailySummary) return null;
    const challenge = dailySummary.challenges?.find(Boolean);
    if (challenge) return `Still worth noticing: ${challenge}`;
    const win = dailySummary.wins?.find(Boolean);
    if (win) return `Good signal: ${win}`;
    if (yesterdayDelta?.habitsLabel) return yesterdayDelta.habitsLabel;
    return null;
  }, [dailySummary, yesterdayDelta]);

  if (!dailySummary || !review) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>DAY REVIEW</Text>
          <Text style={[styles.review, { color: colors.text }]}>{review}</Text>
          {supportingLine ? (
            <Text style={[styles.supporting, { color: colors.textSecondary }]}>{supportingLine}</Text>
          ) : null}
          {!recoveryActive ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>Today · {dailySummary.score}/100</Text>
          ) : (
            <Text style={[styles.meta, { color: colors.textMuted }]}>Today · recovery mode</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onDismissSummary}
          accessibilityLabel="Dismiss day review"
          hitSlop={8}
          style={[styles.iconButton, { backgroundColor: isDark ? '#242832' : '#F1F4F8' }]}
        >
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onToggleListen}
          disabled={isVoicePending}
          style={[styles.action, { backgroundColor: isDark ? '#20252E' : '#F4F6F9' }]}
        >
          {isSpeaking ? <VolumeX size={15} color={colors.text} /> : <Volume2 size={15} color={colors.text} />}
          <Text style={[styles.actionText, { color: colors.text }]}>
            {isVoicePending ? 'Preparing…' : isSpeaking ? 'Stop' : 'Listen'}
          </Text>
        </TouchableOpacity>
        {!recoveryActive ? (
          <TouchableOpacity
            onPress={onShareSummary}
            style={[styles.action, { backgroundColor: isDark ? '#20252E' : '#F4F6F9' }]}
          >
            <Share2 size={15} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 12 },
  rule: { height: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  copy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.25 },
  review: { marginTop: 5, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  supporting: { marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  meta: { marginTop: 7, fontSize: 10, fontWeight: '700' },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { minHeight: 36, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, fontWeight: '750' as any },
});
