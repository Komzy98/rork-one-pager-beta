import { useCallback, useMemo, useState } from 'react';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { mergeCompletionMaps } from '@/utils/syncMerge';
import { getTodayFormatted, getLocalDateStr } from '@/utils/dateUtils';
import type { TaskCompletion } from '@/types/task';
import {
  applyHabitToggle,
  buildTodayHabitEntries,
  buildTodayHabitLog,
  computeTodayHabitsStats,
  resultFromToggle,
  streakForCompletions,
  type HabitToggleResult,
  type TodayHabitEntry,
  type TodayHabitsStats,
  type TodayLogItem,
} from '@/utils/todayHabits';

export type CompletionFeedback = HabitToggleResult & {
  visible: boolean;
};

const HIDDEN_FEEDBACK: CompletionFeedback = {
  visible: false,
  habitId: '',
  title: '',
  logged: false,
  streak: 0,
};

export function useTodayHabits() {
  const appContext = useApp();
  const tasksContext = useTasks();
  const allTasks = tasksContext?.allTasks ?? [];
  const legacyTodayHabits = appContext?.todayHabits ?? [];
  const updateTask = tasksContext?.updateTask ?? (() => {});
  const toggleLegacy = appContext?.toggleHabitCompletion ?? (() => {});

  const [feedback, setFeedback] = useState<CompletionFeedback>(HIDDEN_FEEDBACK);
  const today = getTodayFormatted();

  const entries = useMemo(
    () => buildTodayHabitEntries(allTasks, legacyTodayHabits, today),
    [allTasks, legacyTodayHabits, today]
  );

  const stats: TodayHabitsStats = useMemo(
    () => computeTodayHabitsStats(entries),
    [entries]
  );

  const completedTodayTasks = useMemo(
    () =>
      allTasks.filter(
        (t) => !t.isHabit && t.status === 'completed'
      ),
    [allTasks]
  );

  const todayLog: TodayLogItem[] = useMemo(
    () => buildTodayHabitLog(entries, completedTodayTasks, today),
    [entries, completedTodayTasks, today]
  );

  const dismissFeedback = useCallback(() => {
    setFeedback(HIDDEN_FEEDBACK);
  }, []);

  const showFeedback = useCallback((result: HabitToggleResult) => {
    setFeedback({ ...result, visible: true });
    setTimeout(() => {
      setFeedback((prev) =>
        prev.visible && prev.title === result.title ? HIDDEN_FEEDBACK : prev
      );
    }, 2800);
  }, []);

  // Keep one timestamped completion log per day so analytics (peak hours, mood)
  // has real data. habitCompletions only stores a date->bool map, which has no time.
  const nextCompletionLogs = useCallback(
    (taskObj: { id: string; completionLogs?: TaskCompletion[] }, doneToday: boolean): TaskCompletion[] => {
      const logs = taskObj.completionLogs ?? [];
      const hasTodayLog = logs.some((l) => getLocalDateStr(new Date(l.completedAt)) === today);
      if (doneToday) {
        if (hasTodayLog) return logs;
        const newLog: TaskCompletion = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          taskId: taskObj.id,
          completedAt: new Date().toISOString(),
        };
        return [...logs, newLog];
      }
      return logs.filter((l) => getLocalDateStr(new Date(l.completedAt)) !== today);
    },
    [today]
  );

  const toggleTodayHabit = useCallback(
    (habitId: string) => {
      const entry = entries.find((e) => e.id === habitId);
      if (!entry) return;

      const taskHabit = allTasks.find((t) => t.id === habitId && t.isHabit);

      if (entry.isLegacy) {
        const legacy = legacyTodayHabits.find((h) => h.id === habitId);
        const legacyCompletions = legacy
          ? Object.keys(legacy.completions || {}).reduce(
              (acc, date) => {
                if (legacy.completions[date]) acc[date] = true;
                return acc;
              },
              {} as Record<string, boolean>
            )
          : { ...entry.habitCompletions };

        const merged = mergeCompletionMaps(
          taskHabit?.habitCompletions,
          legacyCompletions
        );
        const nextCompletions = applyHabitToggle(merged, today);
        toggleLegacy(habitId);

        if (taskHabit) {
          const streak = streakForCompletions(
            nextCompletions,
            entry.habitFrequency,
            taskHabit.streakFreeze?.frozenDates,
            taskHabit.gracePeriod?.recoveredDates
          );
          updateTask(habitId, {
            habitCompletions: nextCompletions,
            habitStreak: streak,
            status: nextCompletions[today] ? 'completed' : 'todo',
            completionLogs: nextCompletionLogs(taskHabit, !!nextCompletions[today]),
          });
        }

        const nextEntry = {
          ...entry,
          habitCompletions: nextCompletions,
          habitStreak: streakForCompletions(
            nextCompletions,
            entry.habitFrequency,
            taskHabit?.streakFreeze?.frozenDates,
            taskHabit?.gracePeriod?.recoveredDates
          ),
        };
        showFeedback(resultFromToggle(nextEntry, nextCompletions));
        return;
      }

      if (!taskHabit) return;

      const nextCompletions = applyHabitToggle(
        taskHabit.habitCompletions || {},
        today
      );
      const streak = streakForCompletions(
        nextCompletions,
        entry.habitFrequency,
        taskHabit.streakFreeze?.frozenDates,
        taskHabit.gracePeriod?.recoveredDates
      );

      updateTask(habitId, {
        habitCompletions: nextCompletions,
        habitStreak: streak,
        status: nextCompletions[today] ? 'completed' : 'todo',
        completionLogs: nextCompletionLogs(taskHabit, !!nextCompletions[today]),
      });

      const nextEntry = { ...entry, habitCompletions: nextCompletions, habitStreak: streak };
      showFeedback(resultFromToggle(nextEntry, nextCompletions));
    },
    [
      entries,
      allTasks,
      legacyTodayHabits,
      today,
      toggleLegacy,
      updateTask,
      showFeedback,
      nextCompletionLogs,
    ]
  );

  // Attach a mood to today's completion log (from the quick mood picker).
  const setTodayMood = useCallback(
    (habitId: string, mood: NonNullable<TaskCompletion['mood']>) => {
      const taskHabit = allTasks.find((t) => t.id === habitId && t.isHabit);
      if (!taskHabit) return;
      const logs = taskHabit.completionLogs ?? [];
      let found = false;
      const updated = logs.map((l) => {
        if (getLocalDateStr(new Date(l.completedAt)) === today) {
          found = true;
          return { ...l, mood };
        }
        return l;
      });
      if (!found) {
        updated.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          taskId: habitId,
          completedAt: new Date().toISOString(),
          mood,
        });
      }
      updateTask(habitId, { completionLogs: updated });
    },
    [allTasks, today, updateTask]
  );

  return {
    today,
    entries,
    stats,
    todayLog,
    feedback,
    dismissFeedback,
    toggleTodayHabit,
    setTodayMood,
  };
}
