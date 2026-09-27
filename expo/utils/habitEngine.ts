import { Task } from '@/types/task';

export type HabitMaturity = 'Starting' | 'Building' | 'Growing' | 'Stable';

export interface HabitEngineSnapshot {
  habitId: string;
  stabilityScore: number;
  consistencyScore: number;
  cueConsistencyScore: number;
  recoveryScore: number;
  maturity: HabitMaturity;
  dueNow: boolean;
  overdueWindow: boolean;
  completedToday: boolean;
  guidance: string;
  nextActionLabel: string;
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function scheduledOn(task: Task, date: Date) {
  const f = task.habitFrequency;
  if (!f) return true;
  if (f.type === 'times_per_week') return true;
  return (f.days || []).includes(date.getDay());
}

function parseMinutes(value?: string) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function completionDates(task: Task) {
  return new Set(Object.entries(task.habitCompletions || {}).filter(([, done]) => done).map(([date]) => date));
}

function calculateConsistency(task: Task, now: Date, lookbackDays = 28) {
  const done = completionDates(task);
  let scheduled = 0;
  let completed = 0;
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (!scheduledOn(task, d)) continue;
    scheduled += 1;
    if (done.has(ymd(d))) completed += 1;
  }
  if (scheduled === 0) return 0;
  return clamp((completed / scheduled) * 100);
}

function calculateCueConsistency(task: Task) {
  const logs = task.completionLogs || [];
  if (logs.length < 3) return task.habitEngine?.anchor ? 45 : 25;
  const hours = logs
    .map((log) => new Date(log.completedAt).getHours())
    .filter((hour) => Number.isFinite(hour));
  if (hours.length < 3) return task.habitEngine?.anchor ? 50 : 30;
  const mean = hours.reduce((sum, h) => sum + h, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;
  const sd = Math.sqrt(variance);
  const timingScore = clamp(100 - sd * 14);
  return clamp(timingScore * (task.habitEngine?.anchor ? 1 : 0.82));
}

function calculateRecovery(task: Task, now: Date, lookbackDays = 42) {
  const done = completionDates(task);
  let misses = 0;
  let recovered = 0;

  for (let i = lookbackDays; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (!scheduledOn(task, d) || done.has(ymd(d))) continue;
    misses += 1;

    for (let j = i - 1; j >= 0; j--) {
      const next = new Date(now);
      next.setDate(next.getDate() - j);
      if (!scheduledOn(task, next)) continue;
      if (done.has(ymd(next))) recovered += 1;
      break;
    }
  }

  if (misses === 0) return 100;
  return clamp((recovered / misses) * 100);
}

function maturityFor(score: number, completions: number): HabitMaturity {
  if (completions < 5 || score < 35) return 'Starting';
  if (score < 55) return 'Building';
  if (score < 75) return 'Growing';
  return 'Stable';
}

export function getHabitEngineSnapshot(task: Task, now = new Date()): HabitEngineSnapshot {
  const consistencyScore = calculateConsistency(task, now);
  const cueConsistencyScore = calculateCueConsistency(task);
  const recoveryScore = calculateRecovery(task, now);
  const done = completionDates(task);
  const today = ymd(now);
  const completedToday = done.has(today);
  const engine = task.habitEngine;
  const start = parseMinutes(engine?.windowStart);
  const end = parseMinutes(engine?.windowEnd);
  const minuteNow = now.getHours() * 60 + now.getMinutes();
  const dueToday = scheduledOn(task, now);
  const dueNow = Boolean(dueToday && !completedToday && start != null && end != null && minuteNow >= start && minuteNow <= end);
  const overdueWindow = Boolean(dueToday && !completedToday && end != null && minuteNow > end);

  const configurationBonus = [engine?.anchor, engine?.fallback, start != null && end != null].filter(Boolean).length * 3;
  const stabilityScore = clamp(
    consistencyScore * 0.5 +
    cueConsistencyScore * 0.25 +
    recoveryScore * 0.25 +
    configurationBonus
  );

  const completions = done.size;
  const maturity = maturityFor(stabilityScore, completions);

  let guidance = `Keep repeating “${task.title}” in the same context.`;
  let nextActionLabel = 'Keep the plan';

  if (completedToday) {
    guidance = engine?.immediateReward
      ? `Done. Take the reward you paired with it: ${engine.immediateReward}.`
      : 'Done today. Repeating it in the same context is what strengthens the pattern.';
    nextActionLabel = 'Done today';
  } else if (dueNow) {
    guidance = engine?.anchor
      ? `Your window is open. Use “${engine.anchor}” as the cue and start now.`
      : 'Your planned window is open. Start with the smallest possible first step.';
    nextActionLabel = 'Do it now';
  } else if (overdueWindow && engine?.fallback) {
    guidance = `The normal window passed. Use your fallback instead: ${engine.fallback}.`;
    nextActionLabel = 'Use fallback';
  } else if (overdueWindow) {
    guidance = 'The normal window passed. Do a smaller version rather than turning one miss into two.';
    nextActionLabel = 'Do a tiny version';
  } else if (engine?.obstacle && engine?.fallback) {
    guidance = `If “${engine.obstacle}” gets in the way, switch immediately to: ${engine.fallback}.`;
    nextActionLabel = 'Keep fallback ready';
  }

  return {
    habitId: task.id,
    stabilityScore,
    consistencyScore,
    cueConsistencyScore,
    recoveryScore,
    maturity,
    dueNow,
    overdueWindow,
    completedToday,
    guidance,
    nextActionLabel,
  };
}

export function rankHabitEngineInterventions(tasks: Task[], now = new Date()) {
  return tasks
    .filter((task) => task.isHabit)
    .map((task) => ({ task, snapshot: getHabitEngineSnapshot(task, now) }))
    .filter(({ snapshot }) => !snapshot.completedToday)
    .sort((a, b) => {
      const urgencyA = a.snapshot.dueNow ? 3 : a.snapshot.overdueWindow ? 2 : 1;
      const urgencyB = b.snapshot.dueNow ? 3 : b.snapshot.overdueWindow ? 2 : 1;
      if (urgencyA !== urgencyB) return urgencyB - urgencyA;
      return a.snapshot.stabilityScore - b.snapshot.stabilityScore;
    });
}
