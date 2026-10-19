import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RefreshCw, Share2, Sparkles, Volume2, VolumeX, X } from 'lucide-react-native';

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
  audioError?: string | null;
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
 * The daily summary is presented as an ordinary compact day review, not
 * as an AI feature or a separate coaching dashboard.
 */
export default function TodayCoachCard(props: TodayCoachCardProps) {
  const { colors } = useTheme();
  const {
    dailySummary,
    isGenerating,
    isSpeaking,
    isVoicePending,
    audioError,
    recoveryActive,
    yesterdayDelta,
    onGenerate,
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
    if (challenge) return `Focus next: ${challenge}`;
    const win = dailySummary.wins?.find(Boolean);
    if (win) return `A win today: ${win}`;
    if (yesterdayDelta?.habitsLabel) return yesterdayDelta.habitsLabel;
    return null;
  }, [dailySummary, yesterdayDelta]);

  const hasReview = Boolean(dailySummary && review);

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.topRow}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>DAY REVIEW</Text>
          {hasReview ? (
            <TouchableOpacity
              onPress={onDismissSummary}
              accessibilityRole="button"
              accessibilityLabel="Dismiss day review"
              hitSlop={10}
              style={styles.dismissButton}
            >
              <X size={17} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>

        {dailySummary && review ? (
          <>
            <Text style={[styles.review, { color: colors.text }]}>{review}</Text>
            {supportingLine ? (
              <Text style={[styles.supporting, { color: colors.textSecondary }]} numberOfLines={2}>
                {supportingLine}
              </Text>
            ) : null}
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {recoveryActive ? 'Today · Recovery mode' : `Today · Day score ${dailySummary.score}/100`}
            </Text>

            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={onToggleListen}
                disabled={isVoicePending || isGenerating}
                accessibilityRole="button"
                accessibilityLabel={isVoicePending ? 'Preparing ElevenLabs audio' : isSpeaking ? 'Stop summary audio' : 'Listen to audio version of daily summary'}
                accessibilityState={{ disabled: isVoicePending || isGenerating, busy: isVoicePending }}
                activeOpacity={0.8}
                style={[styles.listenButton, { backgroundColor: colors.primary, opacity: isVoicePending || isGenerating ? 0.72 : 1 }]}
              >
                {isVoicePending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : isSpeaking ? (
                  <VolumeX size={17} color="#FFFFFF" />
                ) : (
                  <Volume2 size={17} color="#FFFFFF" />
                )}
                <Text style={styles.listenText}>
                  {isVoicePending ? 'Preparing Audio…' : isSpeaking ? 'Stop Audio' : 'Listen to Audio'}
                </Text>
              </TouchableOpacity>
              {audioError ? (
                <Text style={[styles.audioError, { color: colors.textSecondary }]} accessibilityRole="alert">
                  {audioError}
                </Text>
              ) : null}
              <View style={styles.secondaryActions}>
                {!recoveryActive ? (
                  <TouchableOpacity
                    onPress={onShareSummary}
                    accessibilityRole="button"
                    accessibilityLabel="Share day review"
                    activeOpacity={0.75}
                    style={styles.shareButton}
                  >
                    <Share2 size={15} color={colors.textSecondary} />
                    <Text style={[styles.shareText, { color: colors.textSecondary }]}>Share</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={onGenerate}
                  disabled={isGenerating || isVoicePending}
                  accessibilityRole="button"
                  accessibilityLabel="Regenerate daily summary"
                  accessibilityState={{ disabled: isGenerating || isVoicePending, busy: isGenerating }}
                  activeOpacity={0.75}
                  style={[styles.regenerateButton, { opacity: isGenerating || isVoicePending ? 0.6 : 1 }]}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <RefreshCw size={14} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.regenerateText, { color: colors.textSecondary }]}>
                    {isGenerating ? 'Generating…' : 'Regenerate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.review, { color: colors.text }]}>Your day, in a few words.</Text>
            <Text style={[styles.supporting, { color: colors.textSecondary }]}>
              Get a personalised recap of your progress, wins and what to focus on next.
            </Text>
            <TouchableOpacity
              onPress={onGenerate}
              disabled={isGenerating}
              accessibilityRole="button"
              accessibilityLabel="Generate daily summary"
              accessibilityState={{ disabled: isGenerating, busy: isGenerating }}
              activeOpacity={0.8}
              style={[
                styles.generateButton,
                { backgroundColor: colors.primary, opacity: isGenerating ? 0.75 : 1 },
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Sparkles size={16} color="#FFFFFF" />
              )}
              <Text style={styles.generateText}>
                {isGenerating ? 'Generating summary…' : 'Generate Daily Summary'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  review: {
    marginTop: 3,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  supporting: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400',
  },
  meta: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  actions: {
    gap: 9,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  listenButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  listenText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  audioError: {
    fontSize: 11,
    lineHeight: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 7,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '600',
  },
  regenerateButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    gap: 6,
    marginLeft: 'auto',
  },
  regenerateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  generateButton: {
    minHeight: 42,
    marginTop: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  generateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
