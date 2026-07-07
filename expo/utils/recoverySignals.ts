import type { RecoverySignalKind } from '@/types/habit';
import type { Task } from '@/types/task';
import { shouldDoHabitToday } from '@/utils/dateUtils';

export type RecoverySignalInput = {
  todayYmd: string;
  habitTasks: Task[];
  allTasks: Task[];
};

export type RecoveryEvaluation = {
  score: number;
  signals: RecoverySignalKind[];
  habitCompletionRate7d: number;
  habitCompletionRatePrior7d: number;
  difficultMoodRatio7d: number;
  overdueTaskCount: number;
  missedScheduledDays3d: number;
};

const MOOD_VALUES = { excellent: 4, good: 3, okay: 2, difficult: 1 } as const;

function ymdOffset(baseYmd: string, days: number): string {
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function datesInRange(endYmd: string, dayCount: number): string[] {
  const out: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    out.push(ymdOffset(endYmd, -i));
  }
  return out;
}

function isHabitScheduledOnDate(task: Task, ymd: string): boolean {
  if (!task.isHabit || !task.habitFrequency) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (task.habitFrequency.type === 'times_per_week') {
    return true;
  }
  return task.habitFrequency.days.includes(date.getDay());
}

function habitCompletionRateForRange(habitTasks: Task[], ymds: string[]): number {
  let scheduled = 0;
  let completed = 0;
  for (const ymd of ymds) {
    for (const task of habitTasks) {
      if (!isHabitScheduledOnDate(task, ymd)) continue;
      scheduled++;
      if (task.habitCompletions?.[ymd]) completed++;
    }
  }
  if (scheduled === 0) return 1;
  return completed / scheduled;
}

function countMissedScheduledDays(habitTasks: Task[], endYmd: string, dayCount: number): number {
  let missedDays = 0;
  for (let i = 1; i <= dayCount; i++) {
    const ymd = ymdOffset(endYmd, -i);
    let hadScheduled = false;
    let hadCompletion = false;
    for (const task of habitTasks) {
      if (!isHabitScheduledOnDate(task, ymd)) continue;
      hadScheduled = true;
      if (task.habitCompletions?.[ymd]) hadCompletion = true;
    }
    if (hadScheduled && !hadCompletion) missedDays++;
  }
  return missedDays;
}

function difficultMoodRatio(habitTasks: Task[], ymds: string[]): number {
  const ymdSet = new Set(ymds);
  let total = 0;
  let difficult = 0;
  for (const task of habitTasks) {
    for (const log of task.completionLogs ?? []) {
      const logDate = log.completedAt.slice(0, 10);
      if (!ymdSet.has(logDate) || !log.mood) continue;
      total++;
      if (log.mood === 'difficult') difficult++;
    }
  }
  if (total === 0) return 0;
  return difficult / total;
}

function countOverdueTasks(allTasks: Task[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return allTasks.filter((t) => {
    if (t.isHabit || t.status === 'completed' || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;
}

/** Score 0–100 — higher means the user likely needs Recovery Mode. */
export function evaluateRecoverySignals(input: RecoverySignalInput): RecoveryEvaluation {
  const habitTasks = input.habitTasks.filter((t) => t.isHabit);
  const last7 = datesInRange(input.todayYmd, 7);
  const prior7 = datesInRange(ymdOffset(input.todayYmd, -7), 7);

  const rate7 = habitCompletionRateForRange(habitTasks, last7);
  const ratePrior7 = habitCompletionRateForRange(habitTasks, prior7);
  const moodRatio = difficultMoodRatio(habitTasks, last7);
  const overdue = countOverdueTasks(input.allTasks);
  const missedDays = countMissedScheduledDays(habitTasks, input.todayYmd, 3);

  const signals: RecoverySignalKind[] = [];
  let score = 0;

  const drop =
    ratePrior7 > 0.05 ? Math.max(0, (ratePrior7 - rate7) / ratePrior7) : rate7 < 0.5 ? 0.35 : 0;
  if (drop >= 0.25) {
    signals.push('habit_drop');
    score += Math.min(30, Math.round(drop * 60));
  }

  if (moodRatio >= 0.35) {
    signals.push('difficult_mood');
    score += Math.min(25, Math.round(moodRatio * 50));
  }

  if (missedDays >= 2) {
    signals.push('missed_habits');
    score += Math.min(20, missedDays * 7);
  }

  if (overdue >= 3) {
    signals.push('task_backlog');
    score += Math.min(15, overdue * 2);
  }

  // Afternoon with zero habit progress today adds gentle pressure signal.
  const hour = new Date().getHours();
  if (hour >= 14 && habitTasks.length > 0) {
    const dueToday = habitTasks.filter((t) => shouldDoHabitToday(t.habitFrequency!));
    const doneToday = dueToday.filter((t) => t.habitCompletions?.[input.todayYmd]).length;
    if (dueToday.length >= 2 && doneToday === 0) {
      score += 10;
      if (!signals.includes('missed_habits')) signals.push('missed_habits');
    }
  }

  return {
    score: Math.min(100, score),
    signals,
    habitCompletionRate7d: rate7,
    habitCompletionRatePrior7d: ratePrior7,
    difficultMoodRatio7d: moodRatio,
    overdueTaskCount: overdue,
    missedScheduledDays3d: missedDays,
  };
}

export const RECOVERY_ENTER_SCORE = 55;
export const RECOVERY_EXIT_SCORE = 35;
export const RECOVERY_ENTER_CONSECUTIVE_DAYS = 2;
export const RECOVERY_EXIT_CONSECUTIVE_DAYS = 3;
