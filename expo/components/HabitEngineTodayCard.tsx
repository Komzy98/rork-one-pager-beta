import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrainCircuit, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

import { useTasks } from '@/hooks/useTasksStore';
import { useTheme } from '@/hooks/useTheme';
import { rankHabitEngineInterventions } from '@/utils/habitEngine';

export default function HabitEngineTodayCard() {
  const { tasks } = useTasks();
  const { colors } = useTheme();

  const intervention = useMemo(() => {
    const ranked = rankHabitEngineInterventions(tasks);
    return ranked.find(({ snapshot }) => snapshot.dueNow || snapshot.overdueWindow)
      ?? ranked[0]
      ?? null;
  }, [tasks]);

  const openHabitPlan = useCallback((habitId: string) => {
    router.navigate({
      pathname: '/(tabs)/tasks',
      params: {
        habitId,
        habitAction: String(Date.now()),
      },
    } as any);
  }, []);

  if (!intervention) return null;

  const { task, snapshot } = intervention;
  const tone = snapshot.overdueWindow ? '#F59E0B' : snapshot.dueNow ? '#10B981' : colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      testID="habit-engine-today-card"
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openHabitPlan(task.id)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${task.title} habit plan`}
        testID="habit-engine-card-open"
      >
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${tone}18` }]}>
            <BrainCircuit size={20} color={tone} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.eyebrow, { color: tone }]}>HABIT ENGINE</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {task.title}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {snapshot.stabilityScore}%
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>stability</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{snapshot.maturity}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>maturity</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{snapshot.recoveryScore}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>recovery</Text>
          </View>
        </View>

        <Text style={[styles.guidance, { color: colors.textSecondary }]}>
          {snapshot.guidance}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.72}
        onPress={() => openHabitPlan(task.id)}
        accessibilityRole="button"
        accessibilityLabel={`${snapshot.nextActionLabel} for ${task.title}`}
        style={[styles.actionPill, { backgroundColor: `${tone}14` }]}
        testID="habit-engine-action"
      >
        <Text style={[styles.actionText, { color: tone }]}>{snapshot.nextActionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
  },
  guidance: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
  },
  actionPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
