import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrainCircuit, ChevronRight, Clock3, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTasks } from '@/hooks/useTasksStore';
import { useTheme } from '@/hooks/useTheme';
import type { HabitEngineFrictionReason } from '@/types/task';
import type { HabitEngineAdaptiveSuggestion } from '@/utils/habitEngineV2';
import {
  applyHabitEngineV2Suggestion,
  dismissHabitEngineV2Suggestion,
  habitDateKey,
  rankHabitEngineV2Interventions,
  recordHabitEngineV2Automaticity,
  recordHabitEngineV2Completion,
  recordHabitEngineV2Friction,
} from '@/utils/habitEngineV2';
import HabitEngineV2SetupModal from '@/components/HabitEngineV2SetupModal';

const FRICTION_OPTIONS: { value: HabitEngineFrictionReason; label: string }[] = [
  { value: 'too_tired', label: 'Too tired' },
  { value: 'forgot', label: 'Forgot' },
  { value: 'no_time', label: 'No time' },
  { value: 'wrong_time', label: 'Wrong time' },
  { value: 'low_motivation', label: 'Low motivation' },
  { value: 'unexpected', label: 'Something came up' },
];

export default function HabitEngineTodayCard() {
  const { tasks, updateTask } = useTasks();
  const { colors } = useTheme();
  const [showSetup, setShowSetup] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showFriction, setShowFriction] = useState(false);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);
  const [pendingPlanChange, setPendingPlanChange] = useState<HabitEngineAdaptiveSuggestion | null>(null);
  const [focusedHabitId, setFocusedHabitId] = useState<string | null>(null);

  const interventions = useMemo(() => rankHabitEngineV2Interventions(tasks), [tasks]);
  const activeIndex = Math.max(0, interventions.findIndex((item) => item.task.id === focusedHabitId));
  const intervention = interventions[activeIndex] ?? null;

  if (!intervention) return null;

  const { task, snapshot } = intervention;
  const engine = task.habitEngine;
  const suggestion = snapshot.adaptiveSuggestion;
  const today = habitDateKey(new Date());
  const minimumChosen = engine?.minimumPlannedDate === today;
  const fallbackChosen = engine?.fallbackPlannedDate === today;
  const selectedSmallerPlan = minimumChosen
    ? engine?.minimumVersion
    : fallbackChosen ? engine?.fallback : undefined;
  const tone = snapshot.overdueWindow ? '#F59E0B' : snapshot.dueNow ? '#10B981' : colors.primary;
  const weekText = snapshot.weeklyTarget > 0
    ? String(snapshot.weeklyCompleted) + '/' + String(snapshot.weeklyTarget) + ' this week'
    : 'Learning your pattern';
  const contextText = [
    engine?.anchor,
    engine?.windowStart && engine?.windowEnd ? engine.windowStart + '–' + engine.windowEnd : undefined,
  ].filter(Boolean).join(' · ');
  const contextLabel =
    snapshot.learningConfidence === 'low' ? 'Learning'
      : snapshot.contextConsistency >= 70
      ? 'Stable'
      : snapshot.contextConsistency >= 50
        ? 'Forming'
        : 'Variable';

  const haptic = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openPlan = () => {
    haptic();
    router.navigate({
      pathname: '/(tabs)/tasks',
      params: { habitId: task.id, habitAction: String(Date.now()) },
    } as any);
  };

  const complete = (level: 'full' | 'minimum') => {
    haptic();
    updateTask(task.id, recordHabitEngineV2Completion(task, level));
  };

  const acceptSuggestion = (choice: HabitEngineAdaptiveSuggestion) => {
    haptic();
    if (choice.requiresSetup) {
      setPendingPlanChange(choice);
      setShowSetup(true);
      return;
    }
    updateTask(task.id, applyHabitEngineV2Suggestion(task, choice));
    setShowSuggestionDetails(false);
  };

  const dismissSuggestion = (choice: HabitEngineAdaptiveSuggestion) => {
    haptic();
    updateTask(task.id, dismissHabitEngineV2Suggestion(task, choice));
    setShowSuggestionDetails(false);
  };

  const runPrimaryAction = () => {
    if (snapshot.interventionType === 'setup') {
      haptic();
      setShowSetup(true);
      return;
    }
    if (snapshot.interventionType === 'checkin') {
      haptic();
      setShowCheckIn(true);
      return;
    }
    if (snapshot.interventionType === 'act_now') {
      complete('full');
      return;
    }
    if (snapshot.interventionType === 'minimum') {
      complete('minimum');
      return;
    }
    if (snapshot.interventionType === 'adapt' && suggestion) {
      haptic();
      setShowSuggestionDetails(true);
      return;
    }
    openPlan();
  };

  const submitAutomaticity = (score: 1 | 2 | 3 | 4 | 5) => {
    haptic();
    updateTask(task.id, recordHabitEngineV2Automaticity(task, score));
    setShowCheckIn(false);
  };

  const logFriction = (reason: HabitEngineFrictionReason) => {
    haptic();
    updateTask(task.id, recordHabitEngineV2Friction(task, reason));
    setShowFriction(false);
  };

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        testID="habit-engine-v2-card"
      >
        <TouchableOpacity activeOpacity={0.82} onPress={openPlan}>
          <View style={styles.topRow}>
            <View style={[styles.iconWrap, { backgroundColor: tone + '16' }]}>
              <BrainCircuit size={20} color={tone} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={[styles.eyebrow, { color: tone }]}>HABIT ENGINE</Text>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
            </View>
            <ChevronRight size={19} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <View style={[styles.phasePill, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.phaseText, { color: colors.text }]}>{snapshot.phase}</Text>
          </View>
          <Text style={[styles.weekText, { color: colors.textSecondary }]}>{weekText}</Text>
        </View>

        {snapshot.weeklyTarget > 0 ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${snapshot.weeklyCompleted} of ${snapshot.weeklyTarget} habit sessions completed this week`}
            accessibilityValue={{
              min: 0, max: snapshot.weeklyTarget,
              now: Math.min(snapshot.weeklyCompleted, snapshot.weeklyTarget),
            }}
            style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}
          >
            <View style={[styles.progressFill, {
              backgroundColor: tone,
              width: `${Math.min(100, Math.round(snapshot.weeklyCompleted / snapshot.weeklyTarget * 100))}%`,
            }]} />
          </View>
        ) : null}

        {contextText ? (
          <View style={styles.contextRow}>
            <Clock3 size={13} color={colors.textSecondary} />
            <Text style={[styles.contextText, { color: colors.textSecondary }]} numberOfLines={2}>
              {contextText}
            </Text>
          </View>
        ) : null}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{snapshot.adherenceRate}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>follow-through</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{contextLabel}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>context</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{snapshot.automaticityLabel}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>automaticity</Text>
          </View>
        </View>

        <View style={styles.nextStep}>
          <Text style={[styles.nextStepLabel, { color: colors.textSecondary }]}>YOUR NEXT STEP</Text>
          <Text style={[styles.guidance, { color: colors.text }]}>{snapshot.guidance}</Text>
        </View>

        {snapshot.insight ? (
          <View style={[styles.insightBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>{snapshot.insight}</Text>
          </View>
        ) : null}
        {selectedSmallerPlan ? (
          <View style={[styles.interventionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.interventionEyebrow, { color: colors.primary }]}>YOUR PLAN FOR TODAY</Text>
            <Text style={[styles.interventionTitle, { color: colors.text }]}>
              {minimumChosen ? 'Smaller session selected' : 'Backup plan selected'}
            </Text>
            <Text style={[styles.interventionDescription, { color: colors.textSecondary }]}>
              {selectedSmallerPlan}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Mark selected smaller version completed"
              onPress={() => complete('minimum')}
              style={[styles.interventionPrimary, { backgroundColor: colors.primary }]}
              testID="habit-intervention-mark-completed"
            >
              <Text style={styles.interventionPrimaryText}>I completed this version</Text>
            </TouchableOpacity>
          </View>
        ) : suggestion ? (
          <View style={[styles.interventionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            testID="habit-intervention-proposal"
          >
            <Text style={[styles.interventionEyebrow, { color: colors.primary }]}>SUGGESTED ADJUSTMENT</Text>
            <Text style={[styles.interventionTitle, { color: colors.text }]}>{suggestion.title}</Text>
            <Text style={[styles.interventionDescription, { color: colors.textSecondary }]}>
              {suggestion.message}
            </Text>
            {showSuggestionDetails ? (
              <>
                {suggestion.evidence ? (
                  <View style={styles.evidenceRow}>
                    <Sparkles size={14} color={colors.primary} />
                    <Text style={[styles.evidenceText, { color: colors.textSecondary }]}>{suggestion.evidence}</Text>
                  </View>
                ) : null}
                <View style={styles.interventionActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={suggestion.actionLabel}
                    onPress={() => acceptSuggestion(suggestion)}
                    style={[styles.interventionPrimary, { backgroundColor: colors.primary }]}
                    testID="habit-intervention-accept"
                  >
                    <Text style={styles.interventionPrimaryText}>{suggestion.actionLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Not now, dismiss this suggestion"
                    onPress={() => dismissSuggestion(suggestion)}
                    style={[styles.interventionSecondary, { borderColor: colors.border }]}
                    testID="habit-intervention-dismiss"
                  >
                    <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Not now</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Review why this habit change is recommended"
                onPress={() => setShowSuggestionDetails(true)}
                style={styles.interventionReview}
                testID="habit-intervention-review"
              >
                <Text style={[styles.quietCheckInText, { color: colors.primary }]}>See why & choose</Text>
                <ChevronRight size={15} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        {showCheckIn ? (
          <View style={[styles.inlinePanel, { borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>How automatic does it feel?</Text>
            <Text style={[styles.panelSubtitle, { color: colors.textSecondary }]}>
              “{task.title} is something I do automatically.”
            </Text>
            <View style={styles.scaleRow}>
              {([1, 2, 3, 4, 5] as const).map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[styles.scaleButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => submitAutomaticity(score)}
                >
                  <Text style={[styles.scaleText, { color: colors.text }]}>{score}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>Not at all</Text>
              <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>Completely</Text>
            </View>
          </View>
        ) : null}

        {showFriction ? (
          <View style={[styles.inlinePanel, { borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>What got in the way?</Text>
            <View style={styles.frictionWrap}>
              {FRICTION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.frictionChip, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => logFriction(option.value)}
                >
                  <Text style={[styles.frictionText, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={runPrimaryAction}
            style={[styles.primaryButton, { backgroundColor: tone }]}
            testID="habit-engine-v2-primary"
          >
            <Text style={styles.primaryText}>
              {snapshot.interventionType === 'adapt' ? 'Review adjustment' : snapshot.nextActionLabel}
            </Text>
          </TouchableOpacity>
          {snapshot.interventionType !== 'setup' ? (
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={() => {
                haptic();
                setShowFriction((value) => !value);
              }}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Log barrier</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {snapshot.checkInDue && snapshot.interventionType === 'plan_ahead' ? (
          <TouchableOpacity
            onPress={() => { haptic(); setShowCheckIn((value) => !value); }}
            style={styles.quietCheckIn}
            accessibilityRole="button"
            accessibilityLabel="Check how automatic this habit feels"
          >
            <Text style={[styles.quietCheckInText, { color: colors.primary }]}>
              Check how automatic this feels
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {interventions.length > 1 ? (
          <View style={[styles.habitSwitchRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.habitSwitchCount, { color: colors.textSecondary }]}>
              {activeIndex + 1} of {interventions.length} active habits
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="View next active habit"
              onPress={() => {
                haptic();
                setFocusedHabitId(interventions[(activeIndex + 1) % interventions.length].task.id);
                setShowSuggestionDetails(false);
                setShowCheckIn(false);
                setShowFriction(false);
              }}
              style={styles.habitSwitchAction}
              testID="habit-engine-next-habit"
            >
              <Text style={[styles.quietCheckInText, { color: colors.primary }]}>Next habit</Text>
              <ChevronRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <HabitEngineV2SetupModal
        visible={showSetup}
        task={task}
        onClose={() => { setShowSetup(false); setPendingPlanChange(null); }}
        onSave={(updates) => {
          if (pendingPlanChange) {
            const configuredTask = { ...task, ...updates };
            const accepted = applyHabitEngineV2Suggestion(configuredTask, pendingPlanChange);
            updateTask(task.id, { ...updates, habitEngine: accepted.habitEngine });
            setPendingPlanChange(null);
            setShowSuggestionDetails(false);
          } else {
            updateTask(task.id, updates);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    alignSelf: 'stretch',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.9, marginBottom: 3 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.35 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 16,
  },
  phasePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  phaseText: { fontSize: 11, fontWeight: '800' },
  weekText: { fontSize: 12, fontWeight: '600' },
  contextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12 },
  contextText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17 },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
  metricLabel: { marginTop: 3, fontSize: 10, fontWeight: '600' },
  nextStep: { marginTop: 18 },
  nextStepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  guidance: { marginTop: 6, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 10, overflow: 'hidden', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 10 },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    padding: 12,
    marginTop: 13,
  },
  insightText: { flex: 1, fontSize: 12, lineHeight: 18 },
  inlinePanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 14,
  },
  panelTitle: { fontSize: 13, fontWeight: '800' },
  panelSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  scaleRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: { fontSize: 14, fontWeight: '800' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleLabel: { fontSize: 10 },
  frictionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  frictionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  frictionText: { fontSize: 11, fontWeight: '700' },
  interventionCard: {
    marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 1, gap: 7,
  },
  interventionEyebrow: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  interventionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.25 },
  interventionDescription: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  evidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  evidenceText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 18 },
  interventionReview: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingVertical: 6, marginTop: 4 },
  interventionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  interventionPrimary: { borderRadius: 12, minHeight: 44, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', maxWidth: '100%' },
  interventionPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  interventionSecondary: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15,
    alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 15 },
  primaryButton: {
    minHeight: 44,
    maxWidth: '100%',
    flexShrink: 1,
    borderRadius: 13,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  secondaryButton: {
    minHeight: 44,
    maxWidth: '100%',
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 12, fontWeight: '700' },
  habitSwitchRow: { borderTopWidth: 1, marginTop: 18, paddingTop: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  habitSwitchCount: { flexShrink: 1, fontSize: 11, fontWeight: '600' },
  habitSwitchAction: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 5 },
  quietCheckIn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 4 },
  quietCheckInText: { fontSize: 12, fontWeight: '700' },
});