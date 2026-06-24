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

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const DEFAULT_HABIT_MINUTES = 20;
const MIN_SLOT_MINUTES = 15;
const GAP_BUFFER_MS = 8 * 60 * 1000;

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

function preferredHourForHabit(habit: Task, chronoInfo?: ChronotypeInfo): number {
  const logs = habit.completionLogs ?? [];
  if (logs.length >= 3) {
    const hourCounts: Record<number, number> = {};
    logs.forEach((log) => {
      const hour = new Date(log.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const best = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (best) return parseInt(best[0], 10);
  }

  if (chronoInfo) return chronoInfo.peakHours.start;
  return guessOptimalTime(habit.title);
}

function isHourInPeak(hour: number, chronoInfo: ChronotypeInfo): boolean {
  const { start, end } = chronoInfo.peakHours;
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
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
      title: event.title,
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

function scoreSlot(
  slot: TimeSlot,
  habit: Task,
  chronoInfo: ChronotypeInfo | undefined,
  now: Date,
  preferredHour: number,
): number {
  const slotStart = new Date(slot.startMs);
  const hour = slotStart.getHours();
  const durationMin = (slot.endMs - slot.startMs) / 60000;
  const neededMin = habitDurationMinutes(habit);

  if (durationMin < neededMin) return -1;

  let score = 0;

  if (slot.startMs >= now.getTime()) {
    const hoursAway = (slot.startMs - now.getTime()) / 3600000;
    if (hoursAway <= 1) score += 28;
    else if (hoursAway <= 3) score += 22;
    else if (hoursAway <= 6) score += 14;
    else score += 6;
  } else {
    score -= 40;
  }

  if (chronoInfo && isHourInPeak(hour, chronoInfo)) score += 35;

  const hourDistance = Math.min(Math.abs(hour - preferredHour), 24 - Math.abs(hour - preferredHour));
  score += Math.max(0, 24 - hourDistance * 3);

  if (durationMin >= neededMin + 15) score += 10;
  if (durationMin >= 45) score += 6;

  return score;
}

function chronotypeFallbackSlot(
  habit: Task,
  chronoInfo: ChronotypeInfo | undefined,
  now: Date,
  usedStarts: Set<number>,
): HabitTimeRecommendation {
  const preferredHour = preferredHourForHabit(habit, chronoInfo);
  const durationMin = habitDurationMinutes(habit);
  const slotStart = new Date(now);
  slotStart.setMinutes(0, 0, 0);

  let candidateHour = preferredHour;
  if (slotStart.getHours() >= preferredHour) {
    candidateHour = Math.min(preferredHour + 2, DAY_END_HOUR - 1);
  }
  slotStart.setHours(candidateHour, 0, 0, 0);

  while (usedStarts.has(slotStart.getTime()) && candidateHour < DAY_END_HOUR - 1) {
    candidateHour += 1;
    slotStart.setHours(candidateHour, 0, 0, 0);
  }
  usedStarts.add(slotStart.getTime());

  const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);
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
  const usedSlotStarts = new Set<number>();
  const recommendations: HabitTimeRecommendation[] = [];

  const sortedHabits = [...habits].sort((a, b) => {
    const streakA = a.habitStreak ?? 0;
    const streakB = b.habitStreak ?? 0;
    return streakB - streakA;
  });

  for (const habit of sortedHabits) {
    const preferredHour = preferredHourForHabit(habit, chronoInfo);
    const durationMin = habitDurationMinutes(habit);
    const durationMs = durationMin * 60 * 1000;

    let best: { slot: TimeSlot; score: number } | null = null;

    for (const slot of freeSlots) {
      if (usedSlotStarts.has(slot.startMs)) continue;
      const score = scoreSlot(slot, habit, chronoInfo, now, preferredHour);
      if (score < 0) continue;
      if (!best || score > best.score) {
        best = { slot, score };
      }
    }

    if (best) {
      const slotStart = new Date(best.slot.startMs);
      const slotEnd = new Date(Math.min(best.slot.endMs, best.slot.startMs + durationMs));
      usedSlotStarts.add(best.slot.startMs);

      const nextEvent = busy.find((b) => b.startMs >= best!.slot.startMs);
      const reasoning = nextEvent
        ? `Free ${formatRangeLabel(slotStart, slotEnd)} before your next event`
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

    recommendations.push(chronotypeFallbackSlot(habit, chronoInfo, now, usedSlotStarts));
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
