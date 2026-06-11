import type { HabitWithStats } from '@/types/habit';
import type { Task, TaskStatus } from '@/types/task';
import type { DailySummaryHabit, DailySummaryHabitRollup } from '@/utils/dailySummary';
import {
  calculateStreak,
  getLocalDateStr,
  getTodayFormatted,
  shouldDoHabitToday,
} from '@/utils/dateUtils';

export type TodayHabitFrequency = {
  type?: 'specific_days' | 'times_per_week';
  days: number[];
  timesPerWeek?: number;
};

export type TodayHabitEntry = {
  id: string;
  title: string;
  habitCompletions: Record<string, boolean>;
  habitStreak: number;
  habitFrequency?: TodayHabitFrequency;
  color?: string;
  icon?: string;
  isLegacy: boolean;
  completedToday: boolean;
  weeklyProgress: WeeklyHabitProgress | null;
};

export type WeeklyHabitProgress = {
  completedThisWeek: number;
  target: number;
  label: string;
};

export type TodayHabitsStats = {
  totalHabits: number;
  completedHabits: number;
  habitCompletionRate: number;
  currentStreak: number;
};

export type TodayLogItem = {
  id: string;
  title: string;
  kind: 'habit' | 'task';
  color?: string;
  streak?: number;
  weeklyLabel?: string;
};

export type HabitToggleResult = {
  habitId: string;
  title: string;
  logged: boolean;
  streak: number;
  weeklyLabel?: string;
};

function getWeekStartMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function countCompletionsThisWeek(
  completions: Record<string, boolean>,
  referenceDate = new Date()
): number {
  const start = getWeekStartMonday(referenceDate);
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (completions[getLocalDateStr(cur)]) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function getWeeklyHabitProgress(
  completions: Record<string, boolean>,
  frequency?: TodayHabitFrequency | null
): WeeklyHabitProgress | null {
  if (!frequency || frequency.type !== 'times_per_week' || !frequency.timesPerWeek) {
    return null;
  }
  const completedThisWeek = countCompletionsThisWeek(completions);
  const target = frequency.timesPerWeek;
  return {
    completedThisWeek,
    target,
    label: `${completedThisWeek}/${target} this week`,
  };
}

export function streakForCompletions(
  completions: Record<string, boolean>,
  frequency?: TodayHabitFrequency | null,
  frozenDates?: string[],
  recoveredDates?: string[]
): number {
  return calculateStreak(completions, {
    frozenDates,
    recoveredDates,
    frequency: frequency
      ? {
          type: frequency.type,
          days: frequency.days,
          timesPerWeek: frequency.timesPerWeek,
        }
      : undefined,
  });
}

function taskToTodayEntry(task: Task, today: string): TodayHabitEntry {
  const completions = task.habitCompletions || {};
  const frequency = task.habitFrequency as TodayHabitFrequency | undefined;
  const streak = streakForCompletions(
    completions,
    frequency,
    task.streakFreeze?.frozenDates,
    task.gracePeriod?.recoveredDates
  );
  return {
    id: task.id,
    title: task.title,
    habitCompletions: completions,
    habitStreak: streak,
    habitFrequency: frequency,
    color: task.color,
    icon: task.icon,
    isLegacy: false,
    completedToday: !!completions[today],
    weeklyProgress: getWeeklyHabitProgress(completions, frequency),
  };
}

function legacyToTodayEntry(habit: HabitWithStats, today: string): TodayHabitEntry {
  const completions = Object.keys(habit.completions || {}).reduce(
    (acc, date) => {
      if (habit.completions[date]) acc[date] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
  const frequency = habit.frequency as TodayHabitFrequency;
  const streak = streakForCompletions(
    completions,
    frequency,
    habit.streakFreeze?.frozenDates,
    habit.gracePeriod?.recoveredDates
  );
  return {
    id: habit.id,
    title: habit.name,
    habitCompletions: completions,
    habitStreak: streak,
    habitFrequency: frequency,
    color: habit.color,
    icon: habit.icon,
    isLegacy: true,
    completedToday: !!completions[today] || habit.completedToday,
    weeklyProgress: getWeeklyHabitProgress(completions, frequency),
  };
}

/** Single source of truth: task habits + legacy habits due today (deduped by id). */
export function buildTodayHabitEntries(
  allTasks: Task[],
  legacyTodayHabits: HabitWithStats[],
  today: string = getTodayFormatted()
): TodayHabitEntry[] {
  const taskHabits = allTasks.filter(
    (task) => task.isHabit && task.habitFrequency && shouldDoHabitToday(task.habitFrequency)
  );
  const taskIds = new Set(taskHabits.map((h) => h.id));
  const legacyUnique = legacyTodayHabits.filter((h) => !taskIds.has(h.id));

  return [
    ...taskHabits.map((t) => taskToTodayEntry(t, today)),
    ...legacyUnique.map((h) => legacyToTodayEntry(h, today)),
  ];
}

export function computeTodayHabitsStats(entries: TodayHabitEntry[]): TodayHabitsStats {
  const totalHabits = entries.length;
  const completedHabits = entries.filter((e) => e.completedToday).length;
  const habitCompletionRate =
    totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
  const streaks = entries.map((e) => e.habitStreak);
  const currentStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

  return {
    totalHabits,
    completedHabits,
    habitCompletionRate,
    currentStreak,
  };
}

export function buildTodayHabitLog(
  entries: TodayHabitEntry[],
  completedTasks: Task[],
  today: string = getTodayFormatted()
): TodayLogItem[] {
  const habitItems: TodayLogItem[] = entries
    .filter((e) => e.completedToday)
    .map((e) => ({
      id: `habit-${e.id}`,
      title: e.title,
      kind: 'habit' as const,
      color: e.color,
      streak: e.habitStreak,
      weeklyLabel: e.weeklyProgress?.label,
    }));

  const taskItems: TodayLogItem[] = completedTasks
    .filter((t) => !t.isHabit && t.status === 'completed')
    .map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      kind: 'task' as const,
      color: t.priority === 'urgent' || t.priority === 'high' ? '#EF4444' : '#007AFF',
    }));

  return [...habitItems, ...taskItems];
}

export function applyHabitToggle(
  completions: Record<string, boolean>,
  today: string = getTodayFormatted()
): Record<string, boolean> {
  const next = { ...completions };
  if (next[today]) delete next[today];
  else next[today] = true;
  return next;
}

/** Map unified entries to Task-shaped rows for Tasks tab / plan UI. */
export function entriesToDisplayTasks(entries: TodayHabitEntry[], allTasks: Task[]): Task[] {
  return entries.map((entry) => {
    const task = allTasks.find((t) => t.id === entry.id);
    const status: TaskStatus = entry.completedToday ? 'completed' : 'todo';
    if (task) {
      return {
        ...task,
        habitCompletions: entry.habitCompletions,
        habitStreak: entry.habitStreak,
        status,
      };
    }
    return {
      id: entry.id,
      title: entry.title,
      priority: 'medium',
      status,
      category: 'personal',
      tags: [],
      subTasks: [],
      reminders: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completionLogs: [],
      progress: 0,
      isRecurring: false,
      isHabit: true,
      habitFrequency: entry.habitFrequency ?? { days: [0, 1, 2, 3, 4, 5, 6] },
      habitCompletions: entry.habitCompletions,
      habitStreak: entry.habitStreak,
      color: entry.color,
      icon: entry.icon,
    } as Task;
  });
}

export function buildSummaryHabitsFromEntries(
  entries: TodayHabitEntry[]
): { habits: DailySummaryHabit[]; rollup: DailySummaryHabitRollup | null } {
  const habits: DailySummaryHabit[] = entries.map((e) => ({
    name: e.title,
    done: e.completedToday,
    streak: e.habitStreak,
    scheduledToday: true,
  }));

  const scheduledCount = habits.length;
  const completedCount = habits.filter((h) => h.done).length;
  if (scheduledCount === 0) {
    return { habits, rollup: null };
  }

  return {
    habits,
    rollup: {
      scheduledCount,
      completedCount,
      incompleteCount: scheduledCount - completedCount,
      incompleteNames: habits.filter((h) => !h.done).map((h) => h.name).slice(0, 5),
      ratioLabel: `${completedCount}/${scheduledCount}`,
    },
  };
}

export function resultFromToggle(
  entry: TodayHabitEntry,
  completions: Record<string, boolean>
): HabitToggleResult {
  const logged = !!completions[getTodayFormatted()];
  const streak = streakForCompletions(
    completions,
    entry.habitFrequency,
    undefined,
    undefined
  );
  const weekly = getWeeklyHabitProgress(completions, entry.habitFrequency);
  return {
    habitId: entry.id,
    title: entry.title,
    logged,
    streak,
    weeklyLabel: weekly?.label,
  };
}
