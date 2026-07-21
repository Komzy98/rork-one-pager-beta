import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Brain, Sparkles, Volume2, VolumeX, X, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import type { DailySummary } from '@/utils/dailySummary';
import type { DailyStatsDelta } from '@/utils/dailySummaryStats';
import DailySummaryInsights from '@/components/DailySummaryInsights';
import {
  getTodayCoachChronotypeLine,
  getTodayCoachEmptyPrompt,
  getTodayCoachKicker,
  resolveTodayCoachPhase,
  getTodayCoachTitle,
  type TodayCoachPhase,
} from '@/utils/todayCoach';

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

export default function TodayCoachCard({
  coachPhase: coachPhaseProp,
  chronotypeId,
  dailySummary,
  isGenerating,
  isSpeaking,
  isVoicePending,
  recoveryActive,
  autoSummaryHintDismissed,
  autoSummaryScheduleLabel,
  yesterdayDelta,
  onGenerate,
  onDismissSummary,
  onToggleListen,
  onShareSummary,
  onDismissAutoSummaryHint,
}: TodayCoachCardProps) {
  const { colors, isDark } = useTheme();

  const phase = coachPhaseProp ?? resolveTodayCoachPhase();
  const kicker = getTodayCoachKicker(phase);
  const title = getTodayCoachTitle(phase);
  const emptyPrompt = getTodayCoachEmptyPrompt(phase);
  const chronotypeLine = useMemo(
    () => getTodayCoachChronotypeLine(chronotypeId),
    [chronotypeId],
  );

  const openPulse = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(root)/daily-agent' as any);
  }, []);

  return (
    <View style={styles.summarySection}>
      <View style={[styles.coachShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.coachHeader}>
          <View style={styles.coachTitleRow}>
            <Sparkles size={18} color="#F59E0B" />
            <View style={styles.coachTitleCopy}>
              <Text style={[styles.coachKicker, { color: colors.textMuted }]}>{kicker}</Text>
              <Text style={[styles.coachTitle, { color: colors.text }]}>{title}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.pulseBtn, { backgroundColor: isDark ? colors.background : '#F1F5F9' }]}
            onPress={openPulse}
            accessibilityLabel="Open Pulse for a deeper chat"
            testID="today-coach-pulse-btn"
          >
            <Brain size={15} color={colors.primary} />
            <Text style={[styles.pulseBtnText, { color: colors.primary }]}>Pulse</Text>
          </TouchableOpacity>
        </View>

        {chronotypeLine ? (
          <Text style={[styles.chronotypeLine, { color: colors.textSecondary }]}>{chronotypeLine}</Text>
        ) : null}

        {dailySummary ? (
          <View style={styles.summaryBody}>
            <View style={styles.summaryMetaRow}>
              <View
                style={[
                  styles.sentimentBadge,
                  {
                    backgroundColor:
                      dailySummary.sentiment === 'positive'
                        ? '#D1FAE5'
                        : dailySummary.sentiment === 'negative'
                          ? '#FEE2E2'
                          : '#F3F4F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sentimentText,
                    {
                      color:
                        dailySummary.sentiment === 'positive'
                          ? '#059669'
                          : dailySummary.sentiment === 'negative'
                            ? '#DC2626'
                            : '#6B7280',
                    },
                  ]}
                >
                  {dailySummary.sentiment}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.summaryCloseBtn}
                onPress={onDismissSummary}
                accessibilityLabel="Dismiss today coach summary"
              >
                <X size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{dailySummary.summary}</Text>

            <TouchableOpacity
              style={[
                styles.listenButton,
                isSpeaking && styles.listenButtonActive,
                isVoicePending && styles.listenButtonLoading,
              ]}
              onPress={onToggleListen}
              activeOpacity={0.7}
              disabled={isVoicePending}
              testID="today-coach-listen-button"
            >
              {isSpeaking ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
              <Text style={styles.listenButtonText}>
                {isVoicePending ? 'Generating audio…' : isSpeaking ? 'Stop audio' : 'Listen'}
              </Text>
            </TouchableOpacity>

            <View style={styles.scoreBar}>
              {!recoveryActive ? (
                <>
                  <View style={styles.scoreTrack}>
                    <View style={[styles.scoreFill, { width: `${dailySummary.score}%` }]} />
                  </View>
                  <Text style={[styles.scoreValue, { color: colors.text }]}>
                    {dailySummary.score}/100
                  </Text>
                </>
              ) : (
                <Text style={[styles.recoverySummaryNote, { color: colors.textSecondary }]}>
                  Recovery mode — focus on wellbeing, not scores
                </Text>
              )}
            </View>

            <DailySummaryInsights
              summary={dailySummary}
              yesterdayDelta={recoveryActive ? null : yesterdayDelta}
            />

            {!recoveryActive ? (
              <TouchableOpacity
                style={styles.shareSummaryButton}
                onPress={onShareSummary}
                activeOpacity={0.8}
                testID="today-coach-share-button"
              >
                <Share2 size={16} color="#fff" />
                <Text style={styles.shareSummaryText}>Share how today went</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyBody}>
            <Text style={[styles.emptyPrompt, { color: colors.textSecondary }]}>{emptyPrompt}</Text>
            <TouchableOpacity
              style={styles.generateSummaryButton}
              onPress={onGenerate}
              disabled={isGenerating}
              testID="today-coach-generate-btn"
            >
              <Sparkles size={20} color="#fff" />
              <Text style={styles.generateSummaryText}>
                {isGenerating ? 'Preparing your check-in…' : 'Get today’s check-in'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!dailySummary && !isGenerating && !autoSummaryHintDismissed ? (
        <View
          style={[
            styles.autoSummaryHintCard,
            { backgroundColor: isDark ? colors.card : '#F1F5F9', borderColor: colors.border },
          ]}
        >
          <Text style={[styles.autoSummaryHint, { color: colors.textSecondary }]}>
            {autoSummaryScheduleLabel
              ? `Auto check-in after ${autoSummaryScheduleLabel} when you open Overview (change in Profile)`
              : 'Auto check-in runs at your chosen time when you open Overview (set in Profile)'}
          </Text>
          <TouchableOpacity
            style={[styles.autoSummaryHintDismiss, { backgroundColor: isDark ? colors.background : '#E2E8F0' }]}
            onPress={onDismissAutoSummaryHint}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss auto check-in message"
            testID="dismiss-auto-summary-hint"
          >
            <X size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summarySection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  coachShell: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
    }),
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  coachTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  coachTitleCopy: {
    flex: 1,
    gap: 2,
  },
  coachKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  coachTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pulseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pulseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chronotypeLine: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  summaryBody: {
    gap: 12,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  summaryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  listenButtonActive: {
    backgroundColor: '#334155',
  },
  listenButtonLoading: {
    opacity: 0.7,
  },
  listenButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
  },
  recoverySummaryNote: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  shareSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareSummaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBody: {
    gap: 12,
  },
  emptyPrompt: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  generateSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
  },
  generateSummaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  autoSummaryHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  autoSummaryHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  autoSummaryHintDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
