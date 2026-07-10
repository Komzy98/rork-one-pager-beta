import type { LocalEvent } from '@/types/events';
import type { CalendarBusyEvent } from '@/utils/calendarHabitSlots';
import { eventsToBusyIntervals } from '@/utils/calendarHabitSlots';
import { getLogicalCategoryIds } from '@/utils/eventCategories';

export type EventConciergeContext =
  | 'busy_week'
  | 'low_activity'
  | 'rainy'
  | 'sunny'
  | 'travelling'
  | 'default';

export interface EventConciergeWeather {
  isRaining?: boolean;
  isStormy?: boolean;
  isSnowing?: boolean;
  isClear?: boolean;
  isDayTime?: boolean;
  description?: string;
}

export interface EventConciergeInput {
  profileName?: string;
  now?: Date;
  weather?: EventConciergeWeather | null;
  calendarEvents?: CalendarBusyEvent[];
  habitCompletionRate7d?: number;
  missedHabitDays3d?: number;
  recoveryModeActive?: boolean;
  recentWellbeingMovement?: boolean;
  calendarEventsThisWeek?: number;
  isSearchingAwayFromHome?: boolean;
  travelAreaLabel?: string;
}

export interface EventConciergeNarrative {
  greeting: string;
  summarySentence: string;
  context: EventConciergeContext;
}

const INDOOR_CATEGORIES = new Set([
  'comedy',
  'theatre',
  'music',
  'arts',
  'food',
  'networking',
  'tech',
  'nightlife',
]);

const OUTDOOR_CATEGORIES = new Set(['sports', 'fitness', 'family', 'arts']);

function eventHasLogicalCategory(event: LocalEvent, categories: Set<string>): boolean {
  return getLogicalCategoryIds(event).some((cat) => categories.has(cat));
}

function firstName(full?: string): string {
  const trimmed = full?.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? 'there';
}

function greetingForHour(hour: number, name: string): string {
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function isEveningWindowFree(
  calendarEvents: CalendarBusyEvent[],
  dayOffset: number,
  now: Date,
): boolean {
  if (calendarEvents.length === 0) return false;

  const target = new Date(now);
  target.setDate(target.getDate() + dayOffset);
  target.setHours(17, 0, 0, 0);
  const windowEnd = new Date(target);
  windowEnd.setHours(22, 0, 0, 0);

  const busy = eventsToBusyIntervals(calendarEvents, target);
  const conflict = busy.some(
    (b) => b.startMs < windowEnd.getTime() && b.endMs > target.getTime(),
  );
  return !conflict;
}

function countCalendarEventsInRange(
  calendarEvents: CalendarBusyEvent[],
  startMs: number,
  endMs: number,
): number {
  return calendarEvents.filter((e) => {
    const s = e.startDate.getTime();
    return s >= startMs && s < endMs;
  }).length;
}

function detectContext(input: EventConciergeInput): EventConciergeContext {
  const weather = input.weather;
  if (input.isSearchingAwayFromHome) return 'travelling';
  if (weather?.isRaining || weather?.isStormy || weather?.isSnowing) return 'rainy';
  if (
    input.recoveryModeActive ||
    (input.missedHabitDays3d ?? 0) >= 2 ||
    input.recentWellbeingMovement === false
  ) {
    return 'low_activity';
  }
  if (
    (input.calendarEventsThisWeek ?? 0) >= 10 ||
    (input.habitCompletionRate7d != null && input.habitCompletionRate7d < 0.45)
  ) {
    return 'busy_week';
  }
  if (weather?.isClear && weather.isDayTime) return 'sunny';
  return 'default';
}

function summarySentenceForContext(
  context: EventConciergeContext,
  input: EventConciergeInput,
  now: Date,
): string {
  const calendar = input.calendarEvents ?? [];
  const tomorrowFree =
    calendar.length > 0 && isEveningWindowFree(calendar, 1, now);
  const tonightFree =
    calendar.length > 0 && isEveningWindowFree(calendar, 0, now) && now.getHours() >= 12;

  switch (context) {
    case 'rainy':
      return tomorrowFree ? 'An indoor plan for tomorrow.' : 'An indoor pick for tonight.';
    case 'sunny':
      return tomorrowFree
        ? 'Something outdoors for tomorrow.'
        : 'Something outdoors while skies are clear.';
    case 'travelling':
      return 'Worth your evening while you\u2019re here.';
    case 'low_activity':
      return tomorrowFree
        ? 'A low-effort plan to get you out tomorrow.'
        : 'A low-effort plan to get you out the door.';
    case 'busy_week':
      return tomorrowFree
        ? 'A relaxing pick for tomorrow evening.'
        : 'A low-effort unwind for tonight.';
    default:
      if (tomorrowFree) return 'A low-effort plan to get you out tomorrow.';
      if (tonightFree) return 'A low-effort plan to get you out tonight.';
      return 'A pick we think you\u2019d enjoy.';
  }
}

export function buildEventConciergeNarrative(input: EventConciergeInput): EventConciergeNarrative {
  const now = input.now ?? new Date();
  const name = firstName(input.profileName);
  const context = detectContext(input);

  return {
    greeting: greetingForHour(now.getHours(), name),
    summarySentence: summarySentenceForContext(context, input, now),
    context,
  };
}

export function boostEventsForConciergeContext(
  events: LocalEvent[],
  context: EventConciergeContext,
): LocalEvent[] {
  if (events.length <= 1) return events;

  const score = (event: LocalEvent): number => {
    let s = 0;
    if (context === 'rainy' && eventHasLogicalCategory(event, INDOOR_CATEGORIES)) s += 3;
    if (context === 'sunny' && eventHasLogicalCategory(event, OUTDOOR_CATEGORIES)) s += 3;
    if (context === 'busy_week') {
      if (eventHasLogicalCategory(event, new Set(['comedy', 'music', 'food']))) s += 2;
      if (getLogicalCategoryIds(event).includes('nightlife')) s -= 1;
    }
    if (context === 'low_activity') {
      if (eventHasLogicalCategory(event, new Set(['fitness', 'family', 'arts']))) s += 2;
    }
    if (context === 'travelling' && event.distanceKm != null && event.distanceKm < 8) s += 2;
    const price = event.price ?? '';
    if (context === 'busy_week' && (price === 'Free' || price.toLowerCase().includes('free'))) s += 1;
    return s;
  };

  return [...events].sort((a, b) => score(b) - score(a) || (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

export function buildConciergeSignals(input: {
  calendarEvents: CalendarBusyEvent[];
  now?: Date;
}): { calendarEventsThisWeek: number } {
  const now = input.now ?? new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return {
    calendarEventsThisWeek: countCalendarEventsInRange(
      input.calendarEvents,
      now.getTime(),
      weekEnd.getTime(),
    ),
  };
}
