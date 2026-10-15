import {
  HabitEngineAdaptationRecord,
  HabitEngineCompletionLevel,
  HabitEngineConfig,
  HabitEngineFrictionReason,
  Task,
} from '@/types/task';

export type HabitEnginePhase =
  | 'Designing'
  | 'Starting'
  | 'Building'
  | 'Becoming automatic'
  | 'Automatic';

export type HabitEngineInterventionType =
  | 'setup'
  | 'checkin'
  | 'act_now'
  | 'minimum'
  | 'recover'
  | 'adapt'
  | 'plan_ahead'
  | 'done';

export interface HabitEngineAdaptiveSuggestion {
  kind: HabitEngineAdaptationRecord['kind'];
  title: string;
  message: string;
  actionLabel: string;
  /** Evidence comes from the person's own logged behaviour, not assumptions. */
  evidence?: string;
  signature?: string;
  confidence?: 'emerging' | 'repeated';
  requiresSetup?: boolean;
  recommendedWindowStart?: string;
  recommendedWindowEnd?: string;
}

export interface HabitEngineV2Snapshot {
  habitId: string;
  phase: HabitEnginePhase;
  adherenceRate: number;
  contextConsistency: number;
  recoveryRate: number;
  automaticityScore: number | null;
  automaticityLabel: string;
  planCompleteness: number;
  learningConfidence: 'low' | 'medium' | 'high';
  weeklyCompleted: number;
  weeklyTarget: number;
  completedToday: boolean;
  dueToday: boolean;
  dueNow: boolean;
  overdueWindow: boolean;
  checkInDue: boolean;
  recentMisses: number;
  interventionType: HabitEngineInterventionType;
  priorityScore: number;
  guidance: string;
  nextActionLabel: string;
  insight?: string;
  adaptiveSuggestion?: HabitEngineAdaptiveSuggestion;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function habitDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return String(date.getFullYear()) + '-' + month + '-' + day;
}

function parseMinutes(value?: string) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const parts = value.split(':').map(Number);
  const hour = parts[0];
  const minute = parts[1];
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatMinutes(value: number) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scheduledOn(task: Task, date: Date) {
  const frequency = task.habitFrequency;
  if (!frequency || frequency.type === 'times_per_week') return true;
  return (frequency.days || []).includes(date.getDay());
}

function completionKeys(task: Task) {
  return new Set(
    Object.entries(task.habitCompletions || {})
      .filter((entry) => entry[1])
      .map((entry) => entry[0]),
  );
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}
function opportunities(task: Task, now: Date, lookbackDays = 28) {
  const done = completionKeys(task);
  const frequency = task.habitFrequency;
  const createdAt = new Date(task.createdAt);
  const createdDay = Number.isFinite(createdAt.getTime()) ? habitDateKey(createdAt) : null;
  const earliest = new Date(now);
  earliest.setHours(12, 0, 0, 0);
  earliest.setDate(earliest.getDate() - (lookbackDays - 1));
  const effectiveStart = createdDay && createdDay > habitDateKey(earliest)
    ? new Date(createdDay + 'T12:00:00')
    : earliest;
  const observedDays = Math.max(1, Math.min(lookbackDays, Math.floor((now.getTime() - effectiveStart.getTime()) / DAY_MS) + 1));

  if (frequency?.type === 'times_per_week' && frequency.timesPerWeek) {
    let completed = 0;
    for (const key of done) {
      const date = new Date(key + 'T12:00:00');
      if (date >= effectiveStart && date <= now) completed += 1;
    }
    const target = Math.max(1, Math.round(frequency.timesPerWeek * observedDays / 7));
    return { scheduled: target, completed, rate: clamp(Math.min(completed, target) / target * 100) };
  }

  let scheduled = 0;
  let completed = 0;
  for (let i = 0; i < lookbackDays; i += 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    if (date < effectiveStart || !scheduledOn(task, date)) continue;
    scheduled += 1;
    if (done.has(habitDateKey(date))) completed += 1;
  }
  return { scheduled, completed, rate: scheduled ? clamp(completed / scheduled * 100) : 0 };
}

function weekProgress(task: Task, now: Date) {
  const done = completionKeys(task);
  const start = startOfWeek(now);
  if (task.habitFrequency?.type === 'times_per_week' && task.habitFrequency.timesPerWeek) {
    let completed = 0;
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      if (done.has(habitDateKey(date))) completed += 1;
    }
    return { completed, target: task.habitFrequency.timesPerWeek };
  }

  let completed = 0;
  let target = 0;
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    if (!scheduledOn(task, date)) continue;
    target += 1;
    if (done.has(habitDateKey(date))) completed += 1;
  }
  return { completed, target };
}
function contextConsistency(task: Task) {
  const engine = task.habitEngine;
  const logs = (task.completionLogs || [])
    .map((log) => new Date(log.completedAt))
    .filter((date) => Number.isFinite(date.getTime()))
    .slice(-20);
  const start = parseMinutes(engine?.windowStart);
  const end = parseMinutes(engine?.windowEnd);

  if (logs.length < 3) {
    return clamp(
      20 +
      (engine?.anchor ? 20 : 0) +
      (start != null && end != null ? 15 : 0) +
      (engine?.location ? 5 : 0),
    );
  }

  const values = logs.map((date) => date.getHours() * 60 + date.getMinutes());
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const timing = clamp(100 - Math.sqrt(variance) / 60 * 20);
  const aligned = start != null && end != null
    ? values.filter((value) => value >= start && value <= end).length / values.length * 100
    : 50;
  return clamp(timing * 0.55 + aligned * 0.3 + (engine?.anchor ? 10 : 0) + (engine?.location ? 5 : 0));
}

function recoveryRate(task: Task, now: Date) {
  if (task.habitFrequency?.type === 'times_per_week') return 100;
  const done = completionKeys(task);
  let misses = 0;
  let recovered = 0;

  for (let i = 35; i >= 1; i -= 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    if (!scheduledOn(task, date) || done.has(habitDateKey(date))) continue;
    misses += 1;
    for (let nextOffset = i - 1; nextOffset >= 0; nextOffset -= 1) {
      const next = new Date(now);
      next.setHours(12, 0, 0, 0);
      next.setDate(next.getDate() - nextOffset);
      if (!scheduledOn(task, next)) continue;
      if (done.has(habitDateKey(next))) recovered += 1;
      break;
    }
  }
  return misses ? clamp(recovered / misses * 100) : 100;
}
function planCompleteness(engine?: HabitEngineConfig) {
  if (!engine) return 0;
  let score = 0;
  if (engine.anchor) score += 25;
  if (engine.firstStep) score += 15;
  if (parseMinutes(engine.windowStart) != null && parseMinutes(engine.windowEnd) != null) score += 20;
  if (engine.minimumVersion || engine.fallback) score += 20;
  if (engine.obstacle || engine.fallback) score += 10;
  if (engine.location) score += 5;
  if (engine.immediateReward) score += 5;
  return clamp(score);
}

function automaticity(engine?: HabitEngineConfig) {
  const checks = engine?.automaticityCheckIns || [];
  const latest = checks.length ? checks[checks.length - 1] : undefined;
  if (!latest) return { score: null as number | null, label: 'Not measured' };
  const score = clamp((latest.score - 1) / 4 * 100);
  if (latest.score === 5) return { score, label: 'Feels automatic' };
  if (latest.score === 4) return { score, label: 'Mostly automatic' };
  if (latest.score === 3) return { score, label: 'Getting easier' };
  return { score, label: 'Needs effort' };
}

function checkInDue(engine: HabitEngineConfig | undefined, now: Date) {
  if (!engine?.onboardingCompletedAt) return false;
  const checks = engine.automaticityCheckIns || [];
  if (!checks.length) return true;
  const latest = new Date(checks[checks.length - 1].date);
  if (!Number.isFinite(latest.getTime())) return true;
  const cadenceDays = engine.promptCadence === 'low' ? 28 : engine.promptCadence === 'high' ? 7 : 14;
  return now.getTime() - latest.getTime() >= cadenceDays * DAY_MS;
}

function recentMissCount(task: Task, now: Date) {
  if (task.habitFrequency?.type === 'times_per_week') {
    const week = weekProgress(task, now);
    return Math.max(0, week.target - week.completed);
  }
  const done = completionKeys(task);
  let seen = 0;
  let misses = 0;
  for (let i = 1; i <= 28 && seen < 5; i += 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    if (!scheduledOn(task, date)) continue;
    seen += 1;
    if (!done.has(habitDateKey(date))) misses += 1;
  }
  return misses;
}

function dominantFriction(task: Task, now: Date) {
  const cutoff = now.getTime() - 30 * DAY_MS;
  const counts = new Map<HabitEngineFrictionReason, number>();
  for (const log of task.habitEngine?.frictionLogs || []) {
    if (new Date(log.date).getTime() < cutoff) continue;
    counts.set(log.reason, (counts.get(log.reason) || 0) + 1);
  }
  let reason: HabitEngineFrictionReason | undefined;
  let count = 0;
  for (const entry of counts.entries()) {
    if (entry[1] > count) {
      reason = entry[0];
      count = entry[1];
    }
  }
  return reason && count >= 2 ? { reason, count } : undefined;
}

function successfulTime(task: Task) {
  const values = (task.completionLogs || [])
    .map((log) => new Date(log.completedAt))
    .filter((date) => Number.isFinite(date.getTime()))
    .slice(-16)
    .map((date) => date.getHours() * 60 + date.getMinutes())
    .sort((a, b) => a - b);
  if (values.length < 4) return undefined;
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  return { median, label: formatMinutes(Math.round(median / 15) * 15) };
}
function phaseFor(plan: number, completed: number, adherence: number, context: number, auto: number | null): HabitEnginePhase {
  if (plan < 50) return 'Designing';
  if (completed < 5) return 'Starting';
  if (auto != null && auto >= 75 && adherence >= 75 && context >= 60) return 'Automatic';
  if ((auto != null && auto >= 50 && adherence >= 60) || (completed >= 10 && adherence >= 70 && context >= 60)) {
    return 'Becoming automatic';
  }
  return 'Building';
}

function confidence(task: Task, opportunitiesSeen: number): 'low' | 'medium' | 'high' {
  // Passing days alone is not evidence that the engine has learned someone's context.
  const completionDates = new Set([
    ...Object.entries(task.habitCompletions || {}).filter(([, done]) => done).map(([date]) => date),
    ...(task.completionLogs || []).map((log) => habitDateKey(new Date(log.completedAt))),
  ]);
  const evidence =
    Math.min(5, Math.floor(opportunitiesSeen / 7)) +
    Math.min(14, completionDates.size * 2) +
    Math.min(6, task.habitEngine?.frictionLogs?.length || 0) +
    Math.min(4, task.habitEngine?.automaticityCheckIns?.length || 0);
  if (evidence >= 20 && completionDates.size >= 6) return 'high';
  if (evidence >= 9 && completionDates.size >= 2) return 'medium';
  return 'low';
}

/**
 * Evidence-led habit interventions. Nothing is applied until a person accepts.
 * Require repeat observations on distinct days, suppress repeat pitches after a
 * response, and do not infer fatigue/motivation solely from missed checkboxes.
 */
function adaptiveSuggestion(
  task: Task, now: Date, adherence: number, context: number, auto: number | null, _misses: number,
): HabitEngineAdaptiveSuggestion | undefined {
  const engine = task.habitEngine;
  if (!engine?.onboardingCompletedAt) return undefined;

  const day = habitDateKey(now);
  const cutoff = now.getTime() - 21 * DAY_MS;
  const byReason = new Map<HabitEngineFrictionReason, Set<string>>();
  for (const log of engine.frictionLogs || []) {
    const time = new Date(log.date).getTime();
    if (!Number.isFinite(time) || time < cutoff || time > now.getTime()) continue;
    const dates = byReason.get(log.reason) ?? new Set<string>();
    dates.add(habitDateKey(new Date(time)));
    byReason.set(log.reason, dates);
  }
  const recurring = [...byReason.entries()]
    .filter(([reason, dates]) => reason !== 'other' && dates.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)[0];

  let suggestion: HabitEngineAdaptiveSuggestion | undefined;
  if (recurring) {
    const [reason, dates] = recurring;
    const count = dates.size;
    const repeated = count >= 3;
    const evidence = `You logged "${{
      too_tired: 'Too tired', forgot: 'Forgot', no_time: 'No time',
      wrong_time: 'Wrong time', low_motivation: 'Low motivation',
      unexpected: 'Something came up', other: 'Other',
    }[reason]}" on ${count} separate days in the past 21 days.`;
    const base = {
      evidence, confidence: repeated ? 'repeated' as const : 'emerging' as const,
    };

    if (reason === 'wrong_time') {
      const recentCompletions = (task.completionLogs || [])
        .map((log) => new Date(log.completedAt))
        .filter((date) => Number.isFinite(date.getTime()) &&
          date.getTime() >= now.getTime() - 28 * DAY_MS && date.getTime() <= now.getTime());
      const uniqueDates = new Set(recentCompletions.map(habitDateKey));
      const times = recentCompletions.map((date) => date.getHours() * 60 + date.getMinutes()).sort((a, b) => a - b);
      const median = times.length ? times[Math.floor(times.length / 2)] : 0;
      const start = parseMinutes(engine.windowStart);
      const end = parseMinutes(engine.windowEnd);
      const midpoint = start != null && end != null ? (start + end) / 2 : null;
      // Clock shift is only supported for same-day windows; requires four
      // distinct observations at a different time and the person's approval.
      if (uniqueDates.size >= 4 && start != null && end != null && midpoint != null && end > start &&
          Math.abs(midpoint - median) >= 60) {
        const proposedStart = formatMinutes(median - 45);
        const proposedEnd = formatMinutes(median + 45);
        suggestion = {
          ...base, kind: 'shift_window', signature: 'shift_window:wrong_time',
          title: 'Try a better time',
          message: `Your recent completed sessions are around ${formatMinutes(median)}. Would ${proposedStart}–${proposedEnd} suit you better?`,
          actionLabel: 'Change my time',
          recommendedWindowStart: proposedStart, recommendedWindowEnd: proposedEnd,
          evidence: evidence + ` ${uniqueDates.size} completed sessions also support the timing pattern.`,
        };
      }
    } else if (reason === 'too_tired' || reason === 'no_time') {
      const minimum = engine.minimumVersion;
      suggestion = minimum
        ? {
            ...base, kind: 'use_minimum', signature: `use_minimum:${reason}`,
            title: reason === 'too_tired' ? 'Make tired days easier' : 'Make busy days easier',
            message: `Try your shorter version today: ${minimum}. Only log it once you've actually done it.`,
            actionLabel: 'Use smaller plan today',
          }
        : {
            ...base, kind: 'review_plan', signature: `review_plan:${reason}`,
            title: 'Create a smaller version',
            message: 'Add an achievable minimum version for difficult days. Your full goal stays unchanged.',
            actionLabel: 'Edit my plan', requiresSetup: true,
          };
    } else if (reason === 'forgot') {
      suggestion = {
        ...base, kind: 'strengthen_cue', signature: 'strengthen_cue:forgot',
        title: 'Make your cue easier to notice',
        message: 'Choose an everyday trigger and a tiny first step you can start straight after it.',
        actionLabel: 'Review my cue', requiresSetup: true,
      };
    } else if (reason === 'unexpected') {
      suggestion = engine.fallback
        ? {
            ...base, kind: 'use_fallback', signature: 'use_fallback:unexpected',
            title: 'Use your backup plan',
            message: `When the usual plan falls through, use: ${engine.fallback}. Only mark it done after doing it.`,
            actionLabel: 'Use backup today',
          }
        : {
            ...base, kind: 'review_plan', signature: 'review_plan:unexpected',
            title: 'Plan for disrupted days',
            message: 'Set up a fallback for days when your normal time or place is unavailable.',
            actionLabel: 'Add a backup', requiresSetup: true,
          };
    } else if (reason === 'low_motivation') {
      suggestion = {
        ...base, kind: 'add_reward', signature: 'add_reward:low_motivation',
        title: 'Make starting more rewarding',
        message: 'Review the first step and a small immediate reward that you actually enjoy.',
        actionLabel: 'Review my plan', requiresSetup: true,
      };
    }
  }

  if (!suggestion && !recurring && engine.promptCadence !== 'low') {
    const completeDates = new Set(Object.entries(task.habitCompletions || {})
      .filter(([key, done]) => done && key <= day &&
        key >= habitDateKey(new Date(now.getTime() - 28 * DAY_MS))).map(([key]) => key));
    const checks = (engine.automaticityCheckIns || [])
      .filter((entry) => entry.score >= 4 && Number.isFinite(new Date(entry.date).getTime()) &&
        new Date(entry.date).getTime() <= now.getTime() &&
        new Date(entry.date).getTime() >= now.getTime() - 60 * DAY_MS);
    const distinctCheckIns = new Set(checks.map((entry) => habitDateKey(new Date(entry.date)))).size;
    if (completeDates.size >= 8 && distinctCheckIns >= 2 && auto != null && auto >= 75 &&
        adherence >= 75 && context >= 60) {
      suggestion = {
        kind: 'reduce_prompts', signature: 'reduce_prompts:automatic',
        title: 'Check in less often',
        message: 'Your habit is becoming more established. Would you like automaticity check-ins every four weeks instead of every two?',
        actionLabel: 'Check in less often',
        evidence: `${completeDates.size} completed days recently and ${distinctCheckIns} positive automaticity check-ins.`,
        confidence: 'repeated',
      };
    }
  }

  if (!suggestion) return undefined;
  const cooldown = (engine.adaptationHistory || []).some((record) => {
    if (record.signature !== suggestion.signature) return false;
    const response = record.dismissedAt || record.acceptedAt;
    if (!response) return false;
    const elapsed = now.getTime() - new Date(response).getTime();
    // 'Not now' means 14 days of quiet. An accepted intervention gets seven
    // days before a fresh, evidence-backed suggestion of that type.
    const wait = record.dismissedAt ? 14 : 7;
    return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < wait * DAY_MS;
  });
  return cooldown ? undefined : suggestion;
}

function insight(task: Task, now: Date, auto: number | null, context: number, adherence: number, misses: number) {
  const friction = dominantFriction(task, now);
  if (friction) {
    const labels: Record<HabitEngineFrictionReason, string> = {
      too_tired: 'Low energy',
      forgot: 'Forgetting',
      no_time: 'Not enough time',
      wrong_time: 'Timing',
      low_motivation: 'Low motivation',
      unexpected: 'Unexpected disruptions',
      other: 'Another barrier',
    };
    return labels[friction.reason] + ' is the most common friction you have logged recently.';
  }
  const timing = successfulTime(task);
  if (timing) return 'Most recent completions happen around ' + timing.label + '.';
  if (auto != null && auto >= 75) return 'This behaviour is starting to feel automatic; the engine can become quieter.';
  if (misses >= 2) return 'Recovery matters more than protecting a perfect streak.';
  if (context >= 70) return 'Your completion context is becoming consistent.';
  if (adherence >= 75) return 'Follow-through is strong; keep the cue and context stable.';
  return undefined;
}

export function getHabitEngineV2Snapshot(task: Task, now = new Date()): HabitEngineV2Snapshot {
  const engine = task.habitEngine;
  const done = completionKeys(task);
  const today = habitDateKey(now);
  const completedToday = done.has(today);
  const dueToday = scheduledOn(task, now);
  const start = parseMinutes(engine?.windowStart);
  const end = parseMinutes(engine?.windowEnd);
  const minuteNow = now.getHours() * 60 + now.getMinutes();
  const dueNow = Boolean(dueToday && !completedToday && start != null && end != null && minuteNow >= start && minuteNow <= end);
  const overdueWindow = Boolean(dueToday && !completedToday && end != null && minuteNow > end);

  const opportunity = opportunities(task, now);
  const weekly = weekProgress(task, now);
  const context = contextConsistency(task);
  const recovery = recoveryRate(task, now);
  const auto = automaticity(engine);
  const plan = planCompleteness(engine);
  const misses = recentMissCount(task, now);
  const phase = phaseFor(plan, opportunity.completed, opportunity.rate, context, auto.score);
  const suggestion = adaptiveSuggestion(task, now, opportunity.rate, context, auto.score, misses);
  let interventionType: HabitEngineInterventionType = 'plan_ahead';
  let guidance = engine?.anchor
    ? 'Next cue: ' + engine.anchor + '. Keep the first step easy to start.'
    : 'Give this habit one stable cue so starting requires less deliberation.';
  let nextActionLabel = 'Review plan';
  let priorityScore = 30;

  const configured = engine?.version === 2 && Boolean(engine.onboardingCompletedAt);
  if (!configured || plan < 50) {
    interventionType = 'setup';
    guidance = 'Build a cue, time window and minimum version so One Pager can adapt this habit around real life.';
    nextActionLabel = 'Set up Habit Engine';
    priorityScore = 65;
  } else if (completedToday) {
    interventionType = 'done';
    guidance = engine?.immediateReward
      ? 'Done. Reinforce the loop with your planned reward: ' + engine.immediateReward + '.'
      : 'Done today. Repeating it in the same context strengthens the cue-response link.';
    nextActionLabel = 'Done today';
    priorityScore = 0;
  } else if (dueNow) {
    interventionType = 'act_now';
    guidance = engine?.anchor
      ? 'Your window is open. Use "' + engine.anchor + '" as the cue.' + (engine.firstStep ? ' First step: ' + engine.firstStep + '.' : '')
      : 'Your planned window is open. Start with the smallest possible first step.';
    nextActionLabel = 'Mark done';
    priorityScore = 100;
  } else if (overdueWindow && (engine?.minimumVersion || engine?.fallback)) {
    interventionType = 'minimum';
    guidance = 'The normal window passed. Protect the repetition with: ' + (engine.minimumVersion || engine.fallback) + '.';
    nextActionLabel = 'I did the minimum';
    priorityScore = 92;
  } else if (overdueWindow) {
    interventionType = 'recover';
    guidance = 'The normal window passed. Do a smaller version now, then improve the plan rather than chasing a perfect streak.';
    nextActionLabel = 'Review recovery plan';
    priorityScore = 88;
  } else if (start != null && dueToday && minuteNow < start) {
    interventionType = 'plan_ahead';
    guidance = 'Your window opens at ' + formatMinutes(start) + '.' +
      (engine?.firstStep ? ' First step: ' + engine.firstStep + '.' : ' Keep the first step easy.');
    nextActionLabel = 'See my plan';
    priorityScore = 45;
  } else if (checkInDue(engine, now)) {
    interventionType = 'checkin';
    guidance = 'Quick check-in: how automatic does this behaviour feel now?';
    nextActionLabel = 'Check automaticity';
    priorityScore = 76;
  } else if (suggestion) {
    interventionType = 'adapt';
    guidance = suggestion.message;
    nextActionLabel = suggestion.actionLabel;
    priorityScore = 72;
  }
  return {
    habitId: task.id,
    phase,
    adherenceRate: opportunity.rate,
    contextConsistency: context,
    recoveryRate: recovery,
    automaticityScore: auto.score,
    automaticityLabel: auto.label,
    planCompleteness: plan,
    learningConfidence: confidence(task, opportunity.scheduled),
    weeklyCompleted: weekly.completed,
    weeklyTarget: weekly.target,
    completedToday,
    dueToday,
    dueNow,
    overdueWindow,
    checkInDue: checkInDue(engine, now),
    recentMisses: misses,
    interventionType,
    priorityScore,
    guidance,
    nextActionLabel,
    insight: insight(task, now, auto.score, context, opportunity.rate, misses),
    adaptiveSuggestion: suggestion,
  };
}

export function rankHabitEngineV2Interventions(tasks: Task[], now = new Date()) {
  return tasks
    .filter((task) => task.isHabit)
    .map((task) => ({ task, snapshot: getHabitEngineV2Snapshot(task, now) }))
    .filter((item) => !item.snapshot.completedToday)
    .sort((a, b) => b.snapshot.priorityScore - a.snapshot.priorityScore || a.snapshot.adherenceRate - b.snapshot.adherenceRate);
}

function engineFor(task: Task): HabitEngineConfig {
  return { ...(task.habitEngine || {}), version: 2 };
}

export function buildHabitEngineV2Setup(
  task: Task,
  input: {
    anchor: string;
    firstStep?: string;
    location?: string;
    windowStart?: string;
    windowEnd?: string;
    obstacle?: string;
    minimumVersion?: string;
    fallback?: string;
    immediateReward?: string;
    automaticityBaseline?: 1 | 2 | 3 | 4 | 5;
  },
  now = new Date(),
): Partial<Task> {
  const engine = engineFor(task);
  const checks = [...(engine.automaticityCheckIns || [])];
  if (input.automaticityBaseline) {
    checks.push({ date: now.toISOString(), score: input.automaticityBaseline });
  }
  return {
    habitEngine: {
      ...engine,
      anchor: input.anchor.trim() || undefined,
      firstStep: input.firstStep?.trim() || undefined,
      location: input.location?.trim() || undefined,
      windowStart: input.windowStart?.trim() || undefined,
      windowEnd: input.windowEnd?.trim() || undefined,
      obstacle: input.obstacle?.trim() || undefined,
      minimumVersion: input.minimumVersion?.trim() || undefined,
      fallback: input.fallback?.trim() || undefined,
      immediateReward: input.immediateReward?.trim() || undefined,
      onboardingCompletedAt: engine.onboardingCompletedAt || now.toISOString(),
      automaticityCheckIns: checks.slice(-24),
      promptCadence: engine.promptCadence || 'normal',
    },
  };
}

export function recordHabitEngineV2Automaticity(task: Task, score: 1 | 2 | 3 | 4 | 5, now = new Date()): Partial<Task> {
  const engine = engineFor(task);
  return {
    habitEngine: {
      ...engine,
      automaticityCheckIns: [...(engine.automaticityCheckIns || []), { date: now.toISOString(), score }].slice(-24),
      lastInterventionAt: now.toISOString(),
    },
  };
}

export function recordHabitEngineV2Friction(
  task: Task,
  reason: HabitEngineFrictionReason,
  now = new Date(),
): Partial<Task> {
  const engine = engineFor(task);
  return {
    habitEngine: {
      ...engine,
      frictionLogs: [...(engine.frictionLogs || []), { date: now.toISOString(), reason }].slice(-60),
      lastInterventionAt: now.toISOString(),
    },
  };
}

export function recordHabitEngineV2Completion(
  task: Task,
  level: HabitEngineCompletionLevel,
  now = new Date(),
): Partial<Task> {
  const today = habitDateKey(now);
  const engine = engineFor(task);
  const attempts = [
    ...(engine.attemptLogs || []).filter((attempt) => attempt.date !== today),
    { date: today, completedAt: now.toISOString(), level },
  ].slice(-120);
  const tag = level === 'minimum' ? 'habit-engine:minimum' : 'habit-engine:full';
  const logs = [...(task.completionLogs || [])];
  const index = logs.findIndex((log) => habitDateKey(new Date(log.completedAt)) === today);
  if (index >= 0) {
    const log = logs[index];
    logs[index] = { ...log, tags: Array.from(new Set([...(log.tags || []), tag])) };
  } else {
    logs.push({
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9),
      taskId: task.id,
      completedAt: now.toISOString(),
      tags: [tag],
    });
  }
  return {
    habitCompletions: { ...(task.habitCompletions || {}), [today]: true },
    completionLogs: logs,
    status: 'completed',
    completedAt: now.toISOString(),
    habitEngine: { ...engine, minimumPlannedDate: undefined, fallbackPlannedDate: undefined,
      attemptLogs: attempts, lastInterventionAt: now.toISOString() },
  };
}

export function applyHabitEngineV2Suggestion(
  task: Task,
  suggestion: HabitEngineAdaptiveSuggestion,
  now = new Date(),
): Partial<Task> {
  const engine = engineFor(task);
  const record: HabitEngineAdaptationRecord = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9),
    createdAt: now.toISOString(),
    kind: suggestion.kind,
    message: suggestion.message,
    signature: suggestion.signature,
    acceptedAt: now.toISOString(),
  };
  const updated: HabitEngineConfig = {
    ...engine,
    adaptationHistory: [...(engine.adaptationHistory || []), record].slice(-30),
    lastInterventionAt: now.toISOString(),
  };
  if (suggestion.kind === 'shift_window' && suggestion.recommendedWindowStart && suggestion.recommendedWindowEnd) {
    updated.windowStart = suggestion.recommendedWindowStart;
    updated.windowEnd = suggestion.recommendedWindowEnd;
  }
  if (suggestion.kind === 'reduce_prompts') updated.promptCadence = 'low';
  if (suggestion.kind === 'use_minimum') updated.minimumPlannedDate = habitDateKey(now);
  if (suggestion.kind === 'use_fallback') updated.fallbackPlannedDate = habitDateKey(now);
  return { habitEngine: updated };
}

/** A declined suggestion must remain declined when the app is reopened. */
export function dismissHabitEngineV2Suggestion(
  task: Task, suggestion: HabitEngineAdaptiveSuggestion, now = new Date(),
): Partial<Task> {
  const engine = engineFor(task);
  const record: HabitEngineAdaptationRecord = {
    id: String(Date.now()) + '-dismissed-' + (suggestion.signature ?? suggestion.kind),
    createdAt: now.toISOString(),
    kind: suggestion.kind,
    signature: suggestion.signature,
    message: suggestion.message,
    dismissedAt: now.toISOString(),
  };
  return {
    habitEngine: {
      ...engine,
      adaptationHistory: [...(engine.adaptationHistory || []), record].slice(-30),
      lastInterventionAt: now.toISOString(),
    },
  };
}