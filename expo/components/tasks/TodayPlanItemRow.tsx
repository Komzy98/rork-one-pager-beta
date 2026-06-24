import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle, Zap, Target } from 'lucide-react-native';
import type { Task } from '@/types/task';
import type { TodayPlanItem } from '@/utils/todayPlanSchedule';
import {
  countHabitCompletionsInWeek,
  getWeekDateKeysThroughToday,
} from '@/utils/todayPlanSchedule';
import SwipeablePlanTaskRow from './SwipeablePlanTaskRow';

const ACCENT = {
  green: '#18C383',
  blue: '#3578F6',
};

interface TodayPlanItemRowProps {
  item: TodayPlanItem;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  isDark: boolean;
  isFocusRow: boolean;
  getTaskColor: (task: Task) => string;
  getTaskMeta: (task: Task) => string;
  onTaskPress: (task: Task) => void;
  onTaskComplete: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onSetInProgress: (task: Task) => void;
  onSetFocus: (taskId: string) => void;
  onToggleHabit: (habit: Task) => void;
  weeklyProgressLabel?: string;
  recommendedTimeLabel?: string;
  isLast?: boolean;
}

export default function TodayPlanItemRow({
  item,
  textColor,
  mutedColor,
  borderColor,
  isDark,
  isFocusRow,
  getTaskColor,
  getTaskMeta,
  onTaskPress,
  onTaskComplete,
  onTaskDelete,
  onSetInProgress,
  onSetFocus,
  onToggleHabit,
  weeklyProgressLabel,
  recommendedTimeLabel,
  isLast,
}: TodayPlanItemRowProps) {
  if (item.kind === 'task') {
    return (
      <SwipeablePlanTaskRow
        task={item.task}
        taskColor={getTaskColor(item.task)}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
        isDark={isDark}
        isFocusRow={isFocusRow}
        isCompleted={item.isCompleted}
        meta={getTaskMeta(item.task)}
        onPress={() => onTaskPress(item.task)}
        onComplete={() => onTaskComplete(item.task)}
        onDelete={() => onTaskDelete(item.task)}
        onSetInProgress={() => onSetInProgress(item.task)}
        onSetFocus={() => onSetFocus(item.task.id)}
        isLast={isLast}
      />
    );
  }

  const habit = item.task;
  const habitColor = habit.color || ACCENT.green;
  const isWeekItem = item.id.startsWith('week-habit-');
  const weekDays = isWeekItem
    ? countHabitCompletionsInWeek(habit, getWeekDateKeysThroughToday())
    : 0;
  const habitMeta = isWeekItem
    ? `${weekDays} day${weekDays === 1 ? '' : 's'} completed this week`
    : !item.isCompleted && recommendedTimeLabel
      ? `Best time today · ${recommendedTimeLabel}`
      : weeklyProgressLabel
        ? weeklyProgressLabel
        : habit.habitStreak
          ? `${habit.habitStreak} day streak`
          : 'Daily habit';

  return (
    <TouchableOpacity
      style={[
        styles.habitRow,
        { borderBottomColor: borderColor },
        isLast && { borderBottomWidth: 0 },
        !item.isCompleted && isFocusRow && {
          backgroundColor: isDark ? 'rgba(24,195,131,0.15)' : '#EAFBF4',
          borderRadius: 16,
          borderBottomWidth: 0,
          marginBottom: 2,
        },
      ]}
      onPress={() => onTaskPress(habit)}
      onLongPress={() => onToggleHabit(habit)}
      delayLongPress={280}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${habit.title}, habit${item.isCompleted ? ', completed' : ''}`}
    >
      <TouchableOpacity
        onPress={() => onToggleHabit(habit)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={item.isCompleted ? `Mark ${habit.title} not done` : `Mark ${habit.title} done`}
      >
        {item.isCompleted ? (
          <CheckCircle2 size={27} color={ACCENT.green} fill={ACCENT.green} />
        ) : (
          <Circle size={27} color={habitColor} />
        )}
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: textColor }, item.isCompleted && styles.titleDone]}
            numberOfLines={2}
          >
            {habit.title}
          </Text>
          <View style={[styles.kindBadge, { backgroundColor: habitColor + '22' }]}>
            <Target size={11} color={habitColor} />
            <Text style={[styles.kindBadgeText, { color: habitColor }]}>Habit</Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
          {habitMeta}
        </Text>
      </View>
      {isFocusRow && !item.isCompleted ? (
        <View style={[styles.focusBadge, { backgroundColor: ACCENT.green }]}>
          <Zap size={13} color="#FFFFFF" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  habitRow: {
    minHeight: 65,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    flexShrink: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  focusBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
