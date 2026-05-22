import { useCallback, useMemo, useState } from 'react';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { mergeCompletionMaps } from '@/utils/syncMerge';
import { getTodayFormatted } from '@/utils/dateUtils';
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
    ]
  );

  return {
    today,
    entries,
    stats,
    todayLog,
    feedback,
    dismissFeedback,
    toggleTodayHabit,
  };
}
