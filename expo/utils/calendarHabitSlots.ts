import type { ChronotypeInfo } from '@/types/habit';
import type { Task } from '@/types/task';
import { guessOptimalTime } from '@/utils/habitFormationAnalysis';

export interface CalendarBusyEvent {
  startDate: Date;
  endDate: Date;
  title: string;
  allDay?: boolean;
}

export interface HabitTimeRecommendation {
  habitId: string;
  habitTitle: string;
  slotStart: Date;
  slotEnd: Date;
  timeLabel: string;
  durationMin: number;
  reasoning: string;
  score: number;
  usesCalendar: boolean;
}

export interface HabitTimeWindow {
  startHour: number;
  endHour: number;
  preferredHour: number;
  label: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
}

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const DEFAULT_HABIT_MINUTES = 20;
const MIN_SLOT_MINUTES = 15;
const GAP_BUFFER_MS = 8 * 60 * 1000;
const CANDIDATE_STEP_MS = 15 * 60 * 1000;

interface TimeSlot {
  startMs: number;
  endMs: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRangeLabel(start: Date, end: Date): string {
  return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;
}

function habitDurationMinutes(habit: Task): number {
  if (habit.estimatedDuration && habit.estimatedDuration > 0) {
    return Math.min(habit.estimatedDuration, 90);
  }
  return DEFAULT_HABIT_MINUTES;
}

/**
 * Strong daypart language is a constraint, not a preference. Chronotype can
 * optimise flexible routines, but it must never turn a morning routine into an
 * evening routine (or vice versa).
 */
export function inferHabitTimeWindow(
  habit: Pick<Task, 'title' | 'description' | 'tags'>,
): HabitTimeWindow | null {
  const text = [habit.title, habit.description ?? '', ...(habit.tags ?? [])]
    .join(' ')
    .toLowerCase();

  if (/\b(morning|every morning|wake[ -]?up|waking|make (?:your|the) bed|breakfast|sunrise)\b/.test(text)) {
    return { startHour: 6, endHour: 12, preferredHour: 8, label: 'morning' };
  }

  if (/\b(lunch|lunchtime|midday|noon)\b/.test(text)) {
    return { startHour: 11, endHour: 15, preferredHour: 13, label: 'midday' };
  }

  if (/\b(afternoon|after lunch)\b/.test(text)) {
    return { startHour: 12, endHour: 17, preferredHour: 15, label: 'afternoon' };
  }

  if (/\b(bedtime|before bed|wind[ -]?down|sleep routine|night routine|every night|at night)\b/.test(text)) {
    return { startHour: 20, endHour: 22, preferredHour: 21, label: 'night' };
  }

  if (/\b(evening|after work|after dinner)\b/.test(text)) {
    return { startHour: 17, endHour: 22, preferredHour: 19, label: 'evening' };
  }

  return null;
}

function completionLogPreferredHour(habit: Task): number | null {
  const logs = habit.completionLogs ?? [];
  if (logs.length < 3) return null;

  const hourCounts: Record<number, number> = {};
  logs.forEach((log) => {
    const hour = new Date(log.completedAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const best = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  return best ? parseInt(best[0], 10) : null;
}

function preferredHourForHabit(
  habit: Task,
  chronoInfo?: ChronotypeInfo,
  window: HabitTimeWindow | null = inferHabitTimeWindow(habit),
): number {
  const learnedHour = completionLogPreferredHour(habit);

  if (window) {
    // Behaviour can refine a semantic window, but historical taps outside that
    // window should not erase the meaning of the routine itself.
    if (learnedHour != null && learnedHour >= window.startHour && learnedHour < window.endHour) {
      return learnedHour;
    }
    return window.preferredHour;
  }

  if (learnedHour != null) return learnedHour;
  if (chronoInfo) return chronoInfo.peakHours.start;
  return guessOptimalTime(habit.title);
}

function isHourInPeak(hour: number, chronoInfo: ChronotypeInfo): boolean {
  const { start, end } = chronoInfo.peakHours;
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function overlaps(slot: TimeSlot, used: TimeSlot[]): boolean {
  return used.some((item) => slot.startMs < item.endMs && slot.endMs > item.startMs);
}

function ceilToCandidateStep(ms: number): number {
  return Math.ceil(ms / CANDIDATE_STEP_MS) * CANDIDATE_STEP_MS;
}

function slotWithinHabitWindow(
  slot: TimeSlot,
  day: Date,
  window: HabitTimeWindow | null,
): TimeSlot | null {
  if (!window) return slot;

  const dayStart = startOfDay(day).getTime();
  const startMs = Math.max(slot.startMs, dayStart + window.startHour * 3600000);
  const endMs = Math.min(slot.endMs, dayStart + window.endHour * 3600000);
  return endMs > startMs ? { startMs, endMs } : null;
}

function candidateStartsForSlot(
  slot: TimeSlot,
  habit: Task,
  now: Date,
  preferredHour: number,
): number[] {
  const durationMs = habitDurationMinutes(habit) * 60000;
  const latestStart = slot.endMs - durationMs;
  if (latestStart < slot.startMs) return [];

  const dayStart = startOfDay(now).getTime();
  const preferredMs = dayStart + preferredHour * 3600000;
  const earliestFuture = Math.max(slot.startMs, now.getTime() - 5 * 60 * 1000);
  if (earliestFuture > latestStart) return [];

  const starts = new Set<number>();
  const clampedPreferred = Math.max(earliestFuture, Math.min(preferredMs, latestStart));
  starts.add(clampedPreferred);
  starts.add(earliestFuture);

  let cursor = ceilToCandidateStep(earliestFuture);
  while (cursor <= latestStart) {
    starts.add(cursor);
    cursor += CANDIDATE_STEP_MS;
  }

  return [...starts].sort((a, b) => {
    const distanceA = Math.abs(a - preferredMs);
    const distanceB = Math.abs(b - preferredMs);
    return distanceA - distanceB || a - b;
  });
}

export function eventsToBusyIntervals(
  events: CalendarBusyEvent[],
  day: Date = new Date(),
): TimeSlot[] {
  const dayStart = startOfDay(day);
  const windowStart = dayStart.getTime() + DAY_START_HOUR * 60 * 60 * 1000;
  const windowEnd = dayStart.getTime() + DAY_END_HOUR * 60 * 60 * 1000;

  return events
    .filter((event) => !event.allDay)
    .map((event) => ({
      startMs: Math.max(event.startDate.getTime(), windowStart),
      endMs: Math.min(event.endDate.getTime(), windowEnd),
    }))
    .filter((slot) => slot.endMs > slot.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

function mergeBusyIntervals(intervals: TimeSlot[]): TimeSlot[] {
  if (intervals.length === 0) return [];

  const merged: TimeSlot[] = [{ ...intervals[0] }];
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];
    if (current.startMs <= last.endMs + GAP_BUFFER_MS) {
      last.endMs = Math.max(last.endMs, current.endMs);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

export function findFreeSlots(
  busyIntervals: TimeSlot[],
  day: Date = new Date(),
  minDurationMin = MIN_SLOT_MINUTES,
): TimeSlot[] {
  const dayStart = startOfDay(day);
  const windowStart = dayStart.getTime() + DAY_START_HOUR * 60 * 60 * 1000;
  const windowEnd = dayStart.getTime() + DAY_END_HOUR * 60 * 60 * 1000;
  const minDurationMs = minDurationMin * 60 * 1000;
  const merged = mergeBusyIntervals(busyIntervals);
  const free: TimeSlot[] = [];

  let cursor = windowStart;
  for (const busy of merged) {
    if (busy.startMs - cursor >= minDurationMs) {
      free.push({ startMs: cursor, endMs: busy.startMs });
    }
    cursor = Math.max(cursor, busy.endMs);
  }

  if (windowEnd - cursor >= minDurationMs) {
    free.push({ startMs: cursor, endMs: windowEnd });
  }

  return free;
}

function scoreCandidate(
  candidate: TimeSlot,
  habit: Task,
  chronoInfo: ChronotypeInfo | undefined,
  now: Date,
  preferredHour: number,
  semanticWindow: HabitTimeWindow | null,
): number {
  const slotStart = new Date(candidate.startMs);
  const hour = slotStart.getHours();
  let score = 0;

  if (candidate.startMs >= now.getTime() - 5 * 60 * 1000) {
    const hoursAway = Math.max(0, (candidate.startMs - now.getTime()) / 3600000);
    if (hoursAway <= 1) score += 28;
    else if (hoursAway <= 3) score += 22;
    else if (hoursAway <= 6) score += 14;
    else score += 6;
  } else {
    score -= 100;
  }

  // Semantic timing is stronger than chronotype. Chronotype only provides an
  // extra nudge for flexible routines (or when its peak happens to fit).
  if (semanticWindow) score += 40;
  if (chronoInfo && isHourInPeak(hour, chronoInfo) && (!semanticWindow || (hour >= semanticWindow.startHour && hour < semanticWindow.endHour))) {
    score += semanticWindow ? 8 : 35;
  }

  const hourDistance = Math.min(Math.abs(hour - preferredHour), 24 - Math.abs(hour - preferredHour));
  score += Math.max(0, 30 - hourDistance * 5);

  return score;
}

function flexibleFallbackSlot(
  habit: Task,
  chronoInfo: ChronotypeInfo | undefined,
  now: Date,
  used: TimeSlot[],
): HabitTimeRecommendation | null {
  const preferredHour = preferredHourForHabit(habit, chronoInfo, null);
  const durationMin = habitDurationMinutes(habit);
  const durationMs = durationMin * 60000;
  const dayStart = startOfDay(now).getTime();
  const window: TimeSlot = {
    startMs: Math.max(dayStart + DAY_START_HOUR * 3600000, now.getTime()),
    endMs: dayStart + DAY_END_HOUR * 3600000,
  };

  const candidates = candidateStartsForSlot(window, habit, now, preferredHour);
  const startMs = candidates.find((candidateStart) => !overlaps({ startMs: candidateStart, endMs: candidateStart + durationMs }, used));
  if (startMs == null) return null;

  const candidate = { startMs, endMs: startMs + durationMs };
  used.push(candidate);
  const slotStart = new Date(startMs);
  const slotEnd = new Date(candidate.endMs);
  const peakNote = chronoInfo ? `your ${chronoInfo.title.toLowerCase()} peak` : 'your usual rhythm';

  return {
    habitId: habit.id,
    habitTitle: habit.title,
    slotStart,
    slotEnd,
    timeLabel: formatTimeLabel(slotStart),
    durationMin,
    reasoning: `Best around ${formatTimeLabel(slotStart)} based on ${peakNote}`,
    score: 50,
    usesCalendar: false,
  };
}

export function recommendHabitTimes(
  habits: Task[],
  calendarEvents: CalendarBusyEvent[],
  chronoInfo: ChronotypeInfo | undefined,
  now: Date = new Date(),
): HabitTimeRecommendation[] {
  if (habits.length === 0) return [];

  const busy = eventsToBusyIntervals(calendarEvents, now);
  const freeSlots = findFreeSlots(busy, now);
  const usesCalendar = calendarEvents.length > 0 || busy.length > 0;
  const usedRecommendations: TimeSlot[] = [];
  const recommendations: HabitTimeRecommendation[] = [];

  const sortedHabits = [...habits].sort((a, b) => {
    const streakA = a.habitStreak ?? 0;
    const streakB = b.habitStreak ?? 0;
    return streakB - streakA;
  });

  for (const habit of sortedHabits) {
    const semanticWindow = inferHabitTimeWindow(habit);
    const preferredHour = preferredHourForHabit(habit, chronoInfo, semanticWindow);
    const durationMin = habitDurationMinutes(habit);
    const durationMs = durationMin * 60000;

    let best: { slot: TimeSlot; score: number } | null = null;

    for (const freeSlot of freeSlots) {
      const allowedSlot = slotWithinHabitWindow(freeSlot, now, semanticWindow);
      if (!allowedSlot) continue;

      for (const startMs of candidateStartsForSlot(allowedSlot, habit, now, preferredHour)) {
        const candidate = { startMs, endMs: startMs + durationMs };
        if (overlaps(candidate, usedRecommendations)) continue;
        const score = scoreCandidate(candidate, habit, chronoInfo, now, preferredHour, semanticWindow);
        if (!best || score > best.score) best = { slot: candidate, score };
      }
    }

    if (best) {
      const slotStart = new Date(best.slot.startMs);
      const slotEnd = new Date(best.slot.endMs);
      usedRecommendations.push(best.slot);

      const nextEvent = busy.find((b) => b.startMs >= best!.slot.endMs);
      const reasoning = nextEvent
        ? `Free ${formatRangeLabel(slotStart, slotEnd)} before your next event`
        : semanticWindow
          ? `Fits your ${semanticWindow.label} routine at ${formatTimeLabel(slotStart)}`
          : chronoInfo && isHourInPeak(slotStart.getHours(), chronoInfo)
            ? `Open window during your peak energy (${formatTimeLabel(slotStart)})`
            : `Open slot on your calendar at ${formatTimeLabel(slotStart)}`;

      recommendations.push({
        habitId: habit.id,
        habitTitle: habit.title,
        slotStart,
        slotEnd,
        timeLabel: formatTimeLabel(slotStart),
        durationMin,
        reasoning,
        score: best.score,
        usesCalendar,
      });
      continue;
    }

    // If a routine has an explicit semantic daypart and that window is busy or
    // already over, silence is better than a nonsensical recommendation.
    if (semanticWindow) continue;

    const fallback = flexibleFallbackSlot(habit, chronoInfo, now, usedRecommendations);
    if (fallback) recommendations.push(fallback);
  }

  return recommendations.sort((a, b) => a.slotStart.getTime() - b.slotStart.getTime());
}

export function getRecommendationForHabit(
  recommendations: HabitTimeRecommendation[],
  habitId: string,
): HabitTimeRecommendation | undefined {
  return recommendations.find((r) => r.habitId === habitId);
}

export function getNextRecommendation(
  recommendations: HabitTimeRecommendation[],
  now: Date = new Date(),
): HabitTimeRecommendation | undefined {
  const upcoming = recommendations
    .filter((r) => r.slotStart.getTime() >= now.getTime() - 5 * 60 * 1000)
    .sort((a, b) => a.slotStart.getTime() - b.slotStart.getTime());
  return upcoming[0];
}
