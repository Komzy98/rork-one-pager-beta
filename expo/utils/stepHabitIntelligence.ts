import type { Task } from '@/types/task';

export interface StepHabitProgress {
  target: number;
  current: number;
  remaining: number;
  progress: number;
  completed: boolean;
  label: string;
  detail: string;
}

export interface StepOpportunityInput {
  progress: StepHabitProgress | null;
  now: Date;
  freeMinutes: number | null;
  nextCommitmentTitle?: string | null;
  outdoorConditionsPoor?: boolean;
}

export interface StepOpportunity {
  walkMinutes: number;
  estimatedSteps: number;
  text: string;
}

function habitText(habit: Pick<Task, 'title' | 'description' | 'tags'>): string {
  return [habit.title, habit.description ?? '', ...(habit.tags ?? [])]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normaliseTarget(raw: string, thousands = false): number | null {
  const numeric = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const target = thousands ? numeric * 1000 : numeric;
  // Prevent accidental parsing of years, tiny repetition counts or implausible values.
  if (target < 1000 || target > 100000) return null;
  return Math.round(target);
}

/**
 * Extracts explicit step goals from both catalogue and user-created habit wording.
 * It intentionally does not assume that a generic "walk more" habit means 10,000 steps.
 */
export function extractStepTarget(habit: Pick<Task, 'title' | 'description' | 'tags'>): number | null {
  const text = habitText(habit);

  const kMatch = text.match(/\b(\d+(?:\.\d+)?)\s*k\s*(?:[- ]?step|steps?)\b/i);
  if (kMatch) return normaliseTarget(kMatch[1], true);

  const explicitMatch = text.match(/\b(\d{1,3}(?:,\d{3})+|\d{4,6})\s*[- ]?steps?\b/i);
  if (explicitMatch) return normaliseTarget(explicitMatch[1]);

  const goalFirst = text.match(/\bstep(?:s)?\s+goal\s*(?:of|:|-)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\b/i);
  if (goalFirst) return normaliseTarget(goalFirst[1]);

  return null;
}

export function buildStepHabitProgress(
  habit: Pick<Task, 'title' | 'description' | 'tags'>,
  stepsToday: number | null | undefined,
): StepHabitProgress | null {
  const target = extractStepTarget(habit);
  if (target == null || stepsToday == null || !Number.isFinite(stepsToday) || stepsToday < 0) return null;

  const current = Math.max(0, Math.round(stepsToday));
  const remaining = Math.max(0, target - current);
  const completed = remaining === 0;
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const number = new Intl.NumberFormat('en-GB');

  return {
    target,
    current,
    remaining,
    progress,
    completed,
    label: `${number.format(current)} / ${number.format(target)} steps`,
    detail: completed
      ? 'Goal reached from Apple Health. No catch-up walk needed.'
      : `${number.format(remaining)} step${remaining === 1 ? '' : 's'} remaining today.`,
  };
}

/**
 * Turns real step progress + a real free window into a restrained opportunity.
 * 90 steps/min is only a planning heuristic, never presented as a guarantee.
 */
export function buildStepOpportunity({
  progress,
  now,
  freeMinutes,
  nextCommitmentTitle,
  outdoorConditionsPoor = false,
}: StepOpportunityInput): StepOpportunity | null {
  if (!progress || progress.completed || freeMinutes == null || freeMinutes < 15) return null;

  const hour = now.getHours();
  // Do not turn a missed cumulative goal into a late-night punishment.
  if (hour >= 21 || hour < 6) return null;

  const usableMinutes = Math.max(0, Math.min(45, freeMinutes - 5));
  if (usableMinutes < 10) return null;

  const stepsPerMinute = 90;
  const minutesToGoal = Math.ceil(progress.remaining / stepsPerMinute);
  const walkMinutes = Math.max(10, Math.min(usableMinutes, minutesToGoal));
  const estimatedSteps = walkMinutes * stepsPerMinute;
  const number = new Intl.NumberFormat('en-GB');
  const getsClose = estimatedSteps >= progress.remaining * 0.8;
  const movement = outdoorConditionsPoor ? 'walk or some indoor movement' : 'walk';
  const commitment = nextCommitmentTitle ? ` before ${nextCommitmentTitle}` : '';
  const impact = getsClose ? 'could get you close to your goal' : 'would make useful progress';

  return {
    walkMinutes,
    estimatedSteps,
    text: `You’re at ${number.format(progress.current)} / ${number.format(progress.target)} steps. A ${walkMinutes}-minute ${movement}${commitment} ${impact}.`,
  };
}
