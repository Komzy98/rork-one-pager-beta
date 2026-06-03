import { mergeCompletionMaps } from '@/utils/syncMerge';
import type { Task } from '@/types/task';
import type { Habit } from '@/types/habit';

export type ProgramWeekDay = {
  day?: number;
  title?: string;
  description?: string;
  duration?: string;
  activities?: string[];
  notes?: string;
  restDay?: boolean;
};

export type ProgramWeek = {
  week: number;
  title?: string;
  description?: string;
  days?: ProgramWeekDay[];
};

/** Count dated completions (any true value). */
export function countProgramCompletions(
  completions?: Record<string, boolean>,
): number {
  if (!completions) return 0;
  return Object.values(completions).filter(Boolean).length;
}

/** Merge task habit completions with legacy habit store (same id). */
export function getMergedHabitCompletions(
  task: Pick<Task, 'id' | 'habitCompletions'>,
  legacyHabits?: Pick<Habit, 'id' | 'completions'>[],
): Record<string, boolean> {
  const legacy = legacyHabits?.find((h) => h.id === task.id);
  return mergeCompletionMaps(task.habitCompletions, legacy?.completions);
}

export function getTrainingDaysFromWeek(week?: ProgramWeek): ProgramWeekDay[] {
  return (week?.days ?? []).filter((d) => !d.restDay);
}

/**
 * Map calendar weekday (0–6) to the workout for that week — skips embedded rest/mobility rows.
 */
export function getWorkoutForWeekday(
  week: ProgramWeek | undefined,
  habitDays: number[],
  dayOfWeek: number,
): ProgramWeekDay | null {
  if (!week || !habitDays.includes(dayOfWeek)) return null;
  const trainingDays = getTrainingDaysFromWeek(week);
  const dayIndex = habitDays.indexOf(dayOfWeek);
  if (dayIndex < 0 || dayIndex >= trainingDays.length) return null;
  return trainingDays[dayIndex] ?? null;
}

export function getProgramSessionProgress(params: {
  completions: Record<string, boolean>;
  totalWeeks: number;
  habitDays: number[];
  programStartDate?: string;
  isDaily?: boolean;
}): {
  currentDay: number;
  totalDays: number;
  programProgressPercent: number;
  completedSessions: number;
  currentWeek: number;
} {
  const sessionsPerWeek = Math.max(1, params.habitDays.length || 7);
  const totalDays = params.totalWeeks * (params.isDaily ? 7 : sessionsPerWeek);
  const completedSessions = countProgramCompletions(params.completions);

  let currentDay = 1;
  if (params.isDaily && params.programStartDate) {
    const startDate = new Date(params.programStartDate);
    startDate.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffMs = now.getTime() - startDate.getTime();
    currentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  } else {
    // Next session = completed count + 1 (e.g. 1 workout done → "Day 2 of 48")
    currentDay = completedSessions + 1;
  }

  currentDay = Math.max(1, Math.min(currentDay, Math.max(1, totalDays)));
  const currentWeek = Math.min(
    params.totalWeeks,
    Math.max(1, Math.floor(completedSessions / sessionsPerWeek) + 1),
  );
  const programProgressPercent =
    totalDays > 0 ? Math.min(100, Math.round((currentDay / totalDays) * 100)) : 0;

  return {
    currentDay,
    totalDays,
    programProgressPercent,
    completedSessions,
    currentWeek,
  };
}
