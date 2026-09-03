import type { ChronotypeInfo } from '@/types/habit';
import type { Task } from '@/types/task';
import {
  getNextRecommendation,
  recommendHabitTimes,
  type CalendarBusyEvent,
  type HabitTimeRecommendation,
} from '@/utils/calendarHabitSlots';
import {
  bedtimeBoundaryForDay,
  classifyHabitSemantics,
  type HabitSemantics,
} from '@/utils/habitSemantics';
import {
  buildStepHabitProgress,
  extractStepTarget,
} from '@/utils/stepHabitIntelligence';

export type SemanticTimingKind =
  | 'scheduled'
  | 'progress'
  | 'all_day'
  | 'multi_window'
  | 'contextual'
  | 'user_defined'
  | 'window';

export interface HabitRuntimeContext {
  stepsToday?: number | null;
  appleHealthRequested?: boolean;
}

export interface SemanticHabitRecommendation extends HabitTimeRecommendation {
  timingKind: SemanticTimingKind;
  semanticType: HabitSemantics['type'];
  confidence: number;
  healthMetric?: 'steps';
  currentValue?: number;
  targetValue?: number;
  remainingValue?: number;
  goalComplete?: boolean;
  healthSource?: 'apple_health';
}

function semanticKind(semantics: HabitSemantics): SemanticTimingKind {
  switch (semantics.policy) {
    case 'track_progress': return 'progress';
    case 'all_day': return 'all_day';
    case 'multi_window': return 'multi_window';
    case 'contextual': return 'contextual';
    case 'user_defined': return 'user_defined';
    default: return 'window';
  }
}

function guidance(
  habit: Task,
  semantics: HabitSemantics,
  now: Date,
  label = semantics.guidanceLabel,
  detail = semantics.guidanceDetail,
): SemanticHabitRecommendation {
  return {
    habitId: habit.id,
    habitTitle: habit.title,
    slotStart: now,
    slotEnd: now,
    timeLabel: label,
    durationMin: semantics.durationMinutes,
    reasoning: detail,
    score: 0,
    usesCalendar: false,
    timingKind: semanticKind(semantics),
    semanticType: semantics.type,
    confidence: semantics.confidence,
  };
}

function stepGuidance(
  habit: Task,
  semantics: HabitSemantics,
  now: Date,
  runtime: HabitRuntimeContext,
): SemanticHabitRecommendation | null {
  const target = extractStepTarget(habit);
  if (target == null) return null;

  const progress = buildStepHabitProgress(habit, runtime.stepsToday);
  if (!progress) {
    return {
      ...guidance(habit, semantics, now),
      healthMetric: 'steps',
      targetValue: target,
      healthSource: runtime.appleHealthRequested ? 'apple_health' : undefined,
      reasoning: runtime.appleHealthRequested
        ? 'Apple Health is set up, but no step data is available today. One Pager will not assume that means 0 steps.'
        : 'Connect Apple Health to replace generic tracking with your real step progress.',
    };
  }

  return {
    ...guidance(
      habit,
      semantics,
      now,
      progress.completed ? `Goal reached · ${progress.label}` : progress.label,
      progress.detail,
    ),
    healthMetric: 'steps',
    currentValue: progress.current,
    targetValue: progress.target,
    remainingValue: progress.remaining,
    goalComplete: progress.completed,
    healthSource: 'apple_health',
  };
}

function withinSemanticWindow(date: Date, semantics: HabitSemantics): boolean {
  if (semantics.windows.length === 0) return true;
  const hour = date.getHours() + date.getMinutes() / 60;
  return semantics.windows.some((window) => hour >= window.startHour && hour < window.endHour);
}

function respectsRecoveryBuffer(
  recommendation: HabitTimeRecommendation,
  semantics: HabitSemantics,
  chronoInfo: ChronotypeInfo | undefined,
  now: Date,
): boolean {
  if (!semantics.avoidBeforeSleepMinutes || !chronoInfo) return true;
  const bedtime = bedtimeBoundaryForDay(now, chronoInfo);
  if (!bedtime) return true;
  return recommendation.slotEnd.getTime()
    <= bedtime.getTime() - semantics.avoidBeforeSleepMinutes * 60_000;
}

function cloneForClockScheduling(habit: Task, semantics: HabitSemantics): Task {
  const fixedDaypart = semantics.type === 'fixed_window' && semantics.windows.length === 1
    ? semantics.windows[0].label
    : null;

  return {
    ...habit,
    estimatedDuration: Math.max(1, semantics.durationMinutes),
    // The legacy slot engine already respects explicit daypart words in tags.
    // This carries high-confidence semantic windows (e.g. Time Blocking -> morning)
    // into it without duplicating the entire calendar algorithm.
    tags: fixedDaypart
      ? [...(habit.tags ?? []), `semantic-${fixedDaypart}`, fixedDaypart]
      : habit.tags ?? [],
  };
}

function enrichScheduled(
  recommendation: HabitTimeRecommendation,
  semantics: HabitSemantics,
): SemanticHabitRecommendation {
  const reasoning = semantics.type === 'duration_activity'
    ? `${semantics.durationMinutes}-minute block with enough room for the full session`
    : recommendation.reasoning;

  return {
    ...recommendation,
    reasoning,
    timingKind: 'scheduled',
    semanticType: semantics.type,
    confidence: semantics.confidence,
  };
}

export function buildSemanticHabitRecommendations(
  habits: Task[],
  calendarEvents: CalendarBusyEvent[],
  chronoInfo: ChronotypeInfo | undefined,
  now: Date = new Date(),
  runtime: HabitRuntimeContext = {},
): SemanticHabitRecommendation[] {
  if (habits.length === 0) return [];

  const semanticsById = new Map<string, HabitSemantics>();
  const schedulable: Task[] = [];

  habits.forEach((habit) => {
    const semantics = classifyHabitSemantics(habit);
    semanticsById.set(habit.id, semantics);
    if (semantics.policy === 'schedule') {
      schedulable.push(cloneForClockScheduling(habit, semantics));
    }
  });

  const clockRecommendations = recommendHabitTimes(schedulable, calendarEvents, chronoInfo, now);
  const clockByHabitId = new Map(clockRecommendations.map((rec) => [rec.habitId, rec]));
  const output: SemanticHabitRecommendation[] = [];

  habits.forEach((habit) => {
    const semantics = semanticsById.get(habit.id) ?? classifyHabitSemantics(habit);

    if (semantics.policy !== 'schedule') {
      if (semantics.type === 'cumulative_goal') {
        const stepRecommendation = stepGuidance(habit, semantics, now, runtime);
        if (stepRecommendation) {
          output.push(stepRecommendation);
          return;
        }
      }
      output.push(guidance(habit, semantics, now));
      return;
    }

    const clock = clockByHabitId.get(habit.id);
    if (
      clock
      && withinSemanticWindow(clock.slotStart, semantics)
      && respectsRecoveryBuffer(clock, semantics, chronoInfo, now)
    ) {
      output.push(enrichScheduled(clock, semantics));
      return;
    }

    if (semantics.type === 'duration_activity') {
      output.push(guidance(
        habit,
        semantics,
        now,
        `Needs a real ${semantics.durationMinutes}-min window`,
        'No good-sized block remains that respects your schedule and normal recovery time. One Pager will not squeeze it into a fake slot.',
      ));
      return;
    }

    if (semantics.windows.length === 1) {
      const window = semantics.windows[0];
      output.push(guidance(
        habit,
        semantics,
        now,
        `${window.label[0].toUpperCase()}${window.label.slice(1)} routine`,
        `Keep this inside its ${window.label} window. If that window has passed, silence is better than moving it to an absurd time.`,
      ));
      return;
    }

    output.push(guidance(habit, semantics, now));
  });

  const rank: Record<SemanticTimingKind, number> = {
    scheduled: 0,
    multi_window: 1,
    progress: 2,
    all_day: 3,
    contextual: 4,
    user_defined: 5,
    window: 6,
  };

  return output.sort((a, b) => {
    const rankDiff = rank[a.timingKind] - rank[b.timingKind];
    if (rankDiff !== 0) return rankDiff;
    if (a.timingKind === 'scheduled' && b.timingKind === 'scheduled') {
      return a.slotStart.getTime() - b.slotStart.getTime();
    }
    return b.confidence - a.confidence || a.habitTitle.localeCompare(b.habitTitle);
  });
}

export function getNextSemanticRecommendation(
  recommendations: SemanticHabitRecommendation[],
  now: Date = new Date(),
): SemanticHabitRecommendation | undefined {
  // Keep the legacy helper's time semantics, but never let all-day/contextual
  // guidance masquerade as the next appointment.
  return getNextRecommendation(
    recommendations.filter((item) => item.timingKind === 'scheduled'),
    now,
  ) as SemanticHabitRecommendation | undefined;
}

export function getSemanticRecommendationForHabit(
  recommendations: SemanticHabitRecommendation[],
  habitId: string,
): SemanticHabitRecommendation | undefined {
  return recommendations.find((item) => item.habitId === habitId);
}
