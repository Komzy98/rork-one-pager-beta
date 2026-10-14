import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrainCircuit, ChevronRight, Clock3, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTasks } from '@/hooks/useTasksStore';
import { useTheme } from '@/hooks/useTheme';
import type { HabitEngineFrictionReason } from '@/types/task';
import {
  applyHabitEngineV2Suggestion,
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

  const intervention = useMemo(() => {
    return rankHabitEngineV2Interventions(tasks)[0] || null;
  }, [tasks]);

  if (!intervention) return null;

  const { task, snapshot } = intervention;
  const engine = task.habitEngine;
  const tone = snapshot.overdueWindow ? '#F59E0B' : snapshot.dueNow ? '#10B981' : colors.primary;
  const weekText = snapshot.weeklyTarget > 0
    ? String(snapshot.weeklyCompleted) + '/' + String(snapshot.weeklyTarget) + ' this week'
    : 'Learning your pattern';
  const contextText = [
    engine?.anchor,
    engine?.windowStart && engine?.windowEnd ? engine.windowStart + '–' + engine.windowEnd : undefined,
  ].filter(Boolean).join(' · ');
  const contextLabel =
    snapshot.contextConsistency >= 70
      ? 'Stable'
      : snapshot.contextConsistency >= 50
        ? 'Forming'
        : snapshot.learningConfidence === 'low'
          ? 'Learning'
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
    if (snapshot.interventionType === 'adapt' && snapshot.adaptiveSuggestion) {
      const kind = snapshot.adaptiveSuggestion.kind;
      if (kind === 'shift_window' || kind === 'reduce_prompts') {
        haptic();
        updateTask(task.id, applyHabitEngineV2Suggestion(task, snapshot.adaptiveSuggestion));
        return;
      }
      if (kind === 'use_minimum') {
        complete('minimum');
        return;
      }
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
              <Text style={[styles.eyebrow, { color: tone }]}>HABIT ENGINE V2</Text>
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

        <Text style={[styles.guidance, { color: colors.text }]}>{snapshot.guidance}</Text>

        {snapshot.insight ? (
          <View style={[styles.insightBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>{snapshot.insight}</Text>
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
            <Text style={styles.primaryText}>{snapshot.nextActionLabel}</Text>
          </TouchableOpacity>
          {(snapshot.overdueWindow || snapshot.recentMisses > 0) && snapshot.interventionType !== 'setup' ? (
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
      </View>

      <HabitEngineV2SetupModal
        visible={showSetup}
        task={task}
        onClose={() => setShowSetup(false)}
        onSave={(updates) => updateTask(task.id, updates)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
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
  titleWrap: { flex: 1 },
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
  contextText: { flex: 1, fontSize: 12, lineHeight: 17 },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  metric: { flex: 1 },
  metricValue: { fontSize: 14, fontWeight: '800' },
  metricLabel: { marginTop: 3, fontSize: 10, fontWeight: '600' },
  guidance: { marginTop: 16, fontSize: 14, lineHeight: 20, fontWeight: '600' },
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
  actionsRow: { flexDirection: 'row', gap: 9, marginTop: 15 },
  primaryButton: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  secondaryButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 12, fontWeight: '700' },
});