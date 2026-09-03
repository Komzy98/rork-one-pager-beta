import type { UserProfile } from '@/types/habit';
import type { Task } from '@/types/task';
import type { LocalEvent } from '@/types/events';
import type { CalendarBusyEvent } from '@/utils/calendarHabitSlots';
import type { EventRecommendationInput } from '@/utils/eventPersonalization';
import {
  buildEventPersonalizationContext,
  buildEventRecommendationReasons,
  scoreEventForUser,
} from '@/utils/eventPersonalization';
import {
  formatDistanceKm,
  getDaysUntilEvent,
  getEventCountdownLabel,
  parseEventStartDateTime,
} from '@/utils/eventDiscovery';
import { getChronotypeInfo } from '@/constants/chronotypes';

export type DiscoverOpportunityKind =
  | 'event'
  | 'watch'
  | 'sport'
  | 'habit'
  | 'recipe'
  | 'task'
  | 'media';

export type DiscoverFeedbackReason =
  | 'not_for_me'
  | 'bad_timing'
  | 'too_far'
  | 'too_expensive'
  | 'seen_already';

export interface DiscoverFeedbackEntry {
  key: string;
  kind: DiscoverOpportunityKind;
  positive: number;
  negative: number;
  lastPositiveAt?: string;
  lastNegativeAt?: string;
  reasons?: Partial<Record<DiscoverFeedbackReason, number>>;
}

export interface DiscoverFeedbackState {
  entries: Record<string, DiscoverFeedbackEntry>;
  kindAffinity: Partial<Record<DiscoverOpportunityKind, number>>;
}

export interface DiscoverOpenWindow {
  id: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  label: string;
  rangeLabel: string;
  part: 'morning' | 'afternoon' | 'evening';
  isToday: boolean;
  isWeekend: boolean;
}

export interface DiscoverTaskPressure {
  score: number;
  label: 'light' | 'steady' | 'busy' | 'heavy';
  urgent: number;
  high: number;
  overdue: number;
  dueToday: number;
  estimatedMinutes: number;
}

export interface DiscoverEnergyContext {
  mode: 'peak' | 'normal' | 'wind_down' | 'recovery' | 'low_energy' | 'time_crunch';
  label: string;
  peakNow: boolean;
  windDown: boolean;
}

export interface DiscoverWeatherContext {
  available: boolean;
  condition?: string;
  description?: string;
  temp?: number;
  isRaining?: boolean;
  isSnowing?: boolean;
  isStormy?: boolean;
  isClear?: boolean;
  outdoorFriendly: boolean;
}

export interface DiscoverLifeContext {
  now: Date;
  areaLabel?: string | null;
  openWindows: DiscoverOpenWindow[];
  primaryWindow: DiscoverOpenWindow | null;
  taskPressure: DiscoverTaskPressure;
  energy: DiscoverEnergyContext;
  weather: DiscoverWeatherContext;
  interests: string[];
  identityGoals: string[];
  joyTerms: string[];
  signalChips: string[];
  recoveryActive: boolean;
  busyModeActive: boolean;
}

export interface DiscoverWatchSignal {
  id: string;
  title: string;
  platform?: string;
  episodeLabel?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
}

export interface DiscoverSportSignal {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  date?: string;
  time?: string;
  status: 'Live' | 'Upcoming' | 'Completed';
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  favoriteTeamName?: string | null;
}

export interface DiscoverHabitSignal {
  id: string;
  title: string;
  streak: number;
  completedToday: boolean;
  totalCompletions: number;
  estimatedMinutes?: number;
}

export interface DiscoverRecipeSignal {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  readyInMinutes: number;
  rating?: number;
  category?: string;
  saved: boolean;
  cookedCount: number;
}

export interface DiscoverMediaSignal {
  id: string;
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
  mediaType: 'movie' | 'tv';
  reason?: string;
}

export interface DiscoverOpportunity {
  id: string;
  key: string;
  kind: DiscoverOpportunityKind;
  title: string;
  subtitle: string;
  eyebrow: string;
  reasons: string[];
  score: number;
  route: string;
  actionLabel: string;
  image?: string | null;
  secondaryImage?: string | null;
  accent: string;
  startsAt?: Date | null;
  durationMinutes?: number | null;
  event?: LocalEvent;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export interface DiscoverEngineInput {
  context: DiscoverLifeContext;
  profile?: UserProfile | null;
  tasks: Task[];
  events: LocalEvent[];
  eventRecommendationInput: EventRecommendationInput;
  watch?: DiscoverWatchSignal | null;
  sports?: DiscoverSportSignal[];
  habits?: DiscoverHabitSignal[];
  recipe?: DiscoverRecipeSignal | null;
  media?: DiscoverMediaSignal[];
  feedback?: DiscoverFeedbackState | null;
}

export interface DiscoverEngineResult {
  ranked: DiscoverOpportunity[];
  hero: DiscoverOpportunity | null;
  alternatives: DiscoverOpportunity[];
  later: DiscoverOpportunity[];
  serendipity: DiscoverOpportunity | null;
  eventPicks: DiscoverOpportunity[];
}

const EMPTY_FEEDBACK: DiscoverFeedbackState = { entries: {}, kindAffinity: {} };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function startOfLocalDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return localDateKey(a) === localDateKey(b);
}

function windowPart(start: Date): DiscoverOpenWindow['part'] {
  const hour = start.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function splitOpenGapByDaypart(startMs: number, endMs: number): { start: number; end: number }[] {
  const segments: { start: number; end: number }[] = [];
  let cursor = startMs;

  while (cursor < endMs) {
    const start = new Date(cursor);
    const boundary = new Date(start);
    const hour = start.getHours();
    if (hour < 12) boundary.setHours(12, 0, 0, 0);
    else if (hour < 17) boundary.setHours(17, 0, 0, 0);
    else {
      boundary.setDate(boundary.getDate() + 1);
      boundary.setHours(0, 0, 0, 0);
    }

    const segmentEnd = Math.min(endMs, boundary.getTime());
    if (segmentEnd <= cursor) break;
    segments.push({ start: cursor, end: segmentEnd });
    cursor = segmentEnd;
  }

  return segments;
}

function windowLabel(day: Date, now: Date, part: DiscoverOpenWindow['part']): string {
  if (sameLocalDay(day, now)) {
    if (part === 'evening') return 'Tonight';
    if (part === 'afternoon') return 'This afternoon';
    return 'This morning';
  }
  const tomorrow = new Date(startOfLocalDay(now));
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameLocalDay(day, tomorrow)) {
    return part === 'evening' ? 'Tomorrow evening' : `Tomorrow ${part}`;
  }
  return `${day.toLocaleDateString('en-GB', { weekday: 'long' })} ${part}`;
}

function mergeIntervals(intervals: { start: number; end: number }[]): { start: number; end: number }[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [{ ...sorted[0] }];
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start <= last.end + 5 * 60 * 1000) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

export function buildOpenWindows(
  calendarEvents: CalendarBusyEvent[],
  profile: UserProfile | null | undefined,
  now = new Date(),
  daysAhead = 6,
): DiscoverOpenWindow[] {
  const chrono = profile?.chronotype ? getChronotypeInfo(profile.chronotype) : undefined;
  const wakeHour = clamp(chrono?.wakeHour ?? 7, 5, 11);
  const quietEnd = profile?.notificationSettings?.quietHoursStart;
  const quietHour = quietEnd && /^\d{2}:\d{2}$/.test(quietEnd)
    ? Number(quietEnd.split(':')[0])
    : undefined;
  const defaultEndHour = clamp(quietHour ?? chrono?.windDownHour ?? 23, 20, 24);
  const windows: DiscoverOpenWindow[] = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const day = startOfLocalDay(now);
    day.setDate(day.getDate() + offset);

    const dayStart = new Date(day);
    dayStart.setHours(wakeHour, 0, 0, 0);
    const dayEnd = new Date(day);
    if (defaultEndHour >= 24) {
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setHours(0, 0, 0, 0);
    } else {
      dayEnd.setHours(defaultEndHour, 0, 0, 0);
    }

    let windowStartMs = dayStart.getTime();
    if (offset === 0) {
      const roundedNow = new Date(now);
      const minute = roundedNow.getMinutes();
      roundedNow.setMinutes(minute < 30 ? 30 : 0, 0, 0);
      if (minute >= 30) roundedNow.setHours(roundedNow.getHours() + 1);
      windowStartMs = Math.max(windowStartMs, roundedNow.getTime());
    }
    const windowEndMs = dayEnd.getTime();
    if (windowStartMs >= windowEndMs) continue;

    const allDayBusy = calendarEvents.some((event) => {
      if (!event.allDay) return false;
      return sameLocalDay(new Date(event.startDate), day);
    });
    if (allDayBusy) continue;

    const busy = mergeIntervals(
      calendarEvents
        .filter((event) => !event.allDay)
        .map((event) => ({
          start: Math.max(new Date(event.startDate).getTime(), windowStartMs),
          end: Math.min(new Date(event.endDate).getTime(), windowEndMs),
        }))
        .filter((slot) => Number.isFinite(slot.start) && Number.isFinite(slot.end) && slot.end > slot.start),
    );

    let cursor = windowStartMs;
    const gaps: { start: number; end: number }[] = [];
    for (const slot of busy) {
      if (slot.start - cursor >= 30 * 60 * 1000) gaps.push({ start: cursor, end: slot.start });
      cursor = Math.max(cursor, slot.end);
    }
    if (windowEndMs - cursor >= 30 * 60 * 1000) gaps.push({ start: cursor, end: windowEndMs });

    for (const gap of gaps) {
      for (const segment of splitOpenGapByDaypart(gap.start, gap.end)) {
        const start = new Date(segment.start);
        const end = new Date(segment.end);
        const durationMinutes = Math.round((segment.end - segment.start) / 60000);
        if (durationMinutes < 30) continue;
        const part = windowPart(start);
        windows.push({
          id: `${localDateKey(day)}-${segment.start}`,
          start,
          end,
          durationMinutes,
          label: windowLabel(day, now, part),
          rangeLabel: `${formatClock(start)} – ${formatClock(end)}`,
          part,
          isToday: offset === 0,
          isWeekend: day.getDay() === 0 || day.getDay() === 6,
        });
      }
    }
  }

  return windows
    .filter((window) => window.durationMinutes >= 30)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 21);
}

function isIncomplete(task: Task): boolean {
  return task.status !== 'completed' && task.status !== 'cancelled';
}

function dueOnDay(task: Task, day: Date): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return Number.isFinite(due.getTime()) && sameLocalDay(due, day);
}

export function buildTaskPressure(tasks: Task[], now = new Date()): DiscoverTaskPressure {
  const active = tasks.filter((task) => !task.isHabit && isIncomplete(task));
  const urgent = active.filter((task) => task.priority === 'urgent').length;
  const high = active.filter((task) => task.priority === 'high').length;
  const overdue = active.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate).getTime();
    return Number.isFinite(due) && due < now.getTime() && !dueOnDay(task, now);
  }).length;
  const dueToday = active.filter((task) => dueOnDay(task, now)).length;
  const estimatedMinutes = active.reduce((sum, task) => {
    if (!(task.priority === 'urgent' || task.priority === 'high' || dueOnDay(task, now))) return sum;
    return sum + clamp(task.estimatedDuration ?? 30, 5, 240);
  }, 0);

  const score = clamp(urgent * 24 + high * 14 + overdue * 20 + dueToday * 6 + Math.min(20, estimatedMinutes / 20), 0, 100);
  const label: DiscoverTaskPressure['label'] = score >= 78 ? 'heavy' : score >= 52 ? 'busy' : score >= 25 ? 'steady' : 'light';
  return { score, label, urgent, high, overdue, dueToday, estimatedMinutes };
}

function latestWellbeing(profile?: UserProfile | null) {
  const rows = profile?.wellbeingLogs ?? [];
  return [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] ?? null;
}

export function buildEnergyContext(params: {
  profile?: UserProfile | null;
  busyModeActive?: boolean;
  busyModeReason?: 'busy_day' | 'low_energy' | 'time_crunch' | 'custom';
  now?: Date;
}): DiscoverEnergyContext {
  const { profile, busyModeActive = false, busyModeReason, now = new Date() } = params;
  const recovery = profile?.recoveryMode?.active === true;
  const wellbeing = latestWellbeing(profile);
  const chrono = profile?.chronotype ? getChronotypeInfo(profile.chronotype) : undefined;
  const hour = now.getHours();
  const peakNow = chrono
    ? chrono.peakHours.start <= chrono.peakHours.end
      ? hour >= chrono.peakHours.start && hour < chrono.peakHours.end
      : hour >= chrono.peakHours.start || hour < chrono.peakHours.end
    : hour >= 9 && hour < 12;
  const windDown = chrono ? hour >= chrono.windDownHour || hour < chrono.wakeHour : hour >= 21;

  if (recovery) return { mode: 'recovery', label: 'Recovery mode', peakNow, windDown };
  if (busyModeActive && busyModeReason === 'low_energy') return { mode: 'low_energy', label: 'Low-energy mode', peakNow, windDown };
  if (busyModeActive && busyModeReason === 'time_crunch') return { mode: 'time_crunch', label: 'Time-crunch mode', peakNow, windDown };
  if (wellbeing?.sleep === 'poor' || wellbeing?.mood === 'low') return { mode: 'low_energy', label: 'Keep it lighter', peakNow, windDown };
  if (windDown) return { mode: 'wind_down', label: 'Wind-down window', peakNow, windDown };
  if (peakNow) return { mode: 'peak', label: 'Peak-energy window', peakNow, windDown };
  return { mode: 'normal', label: 'Normal capacity', peakNow, windDown };
}

export function buildWeatherContext(weather?: {
  condition?: string;
  description?: string;
  temp?: number;
  isRaining?: boolean;
  isSnowing?: boolean;
  isStormy?: boolean;
  isClear?: boolean;
} | null): DiscoverWeatherContext {
  if (!weather) return { available: false, outdoorFriendly: true };
  const hostile = weather.isRaining || weather.isSnowing || weather.isStormy;
  const temp = weather.temp;
  const comfortable = temp == null || (temp >= 5 && temp <= 27);
  return {
    available: true,
    condition: weather.condition,
    description: weather.description,
    temp,
    isRaining: weather.isRaining,
    isSnowing: weather.isSnowing,
    isStormy: weather.isStormy,
    isClear: weather.isClear,
    outdoorFriendly: !hostile && comfortable,
  };
}

function flattenJoyTerms(profile?: UserProfile | null): string[] {
  const joy = profile?.joySources;
  if (!joy) return [];
  return [
    ...(joy.tvShows ?? []),
    ...(joy.youtubers ?? []),
    ...(joy.games ?? []),
    ...(joy.music ?? []),
    ...(joy.podcasts ?? []),
    ...(joy.restaurants ?? []),
    ...(joy.exerciseTypes ?? []),
  ].map((value) => value.trim()).filter(Boolean);
}

export function buildDiscoverLifeContext(params: {
  profile?: UserProfile | null;
  tasks: Task[];
  calendarEvents: CalendarBusyEvent[];
  areaLabel?: string | null;
  busyModeActive?: boolean;
  busyModeReason?: 'busy_day' | 'low_energy' | 'time_crunch' | 'custom';
  weather?: {
    condition?: string;
    description?: string;
    temp?: number;
    isRaining?: boolean;
    isSnowing?: boolean;
    isStormy?: boolean;
    isClear?: boolean;
  } | null;
  now?: Date;
}): DiscoverLifeContext {
  const now = params.now ?? new Date();
  const profile = params.profile;
  const openWindows = buildOpenWindows(params.calendarEvents, profile, now);
  const taskPressure = buildTaskPressure(params.tasks, now);
  const energy = buildEnergyContext({
    profile,
    busyModeActive: params.busyModeActive,
    busyModeReason: params.busyModeReason,
    now,
  });
  const weather = buildWeatherContext(params.weather);
  const interests = (profile?.interests ?? []).map((value) => value.trim()).filter(Boolean);
  const identityGoals = (profile?.identityGoals ?? []).map((value) => value.trim()).filter(Boolean);
  const joyTerms = flattenJoyTerms(profile);

  const chips = [
    ...(profile?.favoriteEventCategories ?? []).slice(0, 2),
    ...(profile?.favoriteTeams ?? []).slice(0, 1).map((team) => team.name),
    ...interests.slice(0, 2),
    ...identityGoals.slice(0, 1),
  ].map((value) => value.trim()).filter(Boolean);

  return {
    now,
    areaLabel: params.areaLabel,
    openWindows,
    primaryWindow: openWindows[0] ?? null,
    taskPressure,
    energy,
    weather,
    interests,
    identityGoals,
    joyTerms,
    signalChips: [...new Set(chips)].slice(0, 6),
    recoveryActive: profile?.recoveryMode?.active === true,
    busyModeActive: params.busyModeActive === true,
  };
}

function feedbackAdjustment(
  key: string,
  kind: DiscoverOpportunityKind,
  feedback?: DiscoverFeedbackState | null,
): number {
  const state = feedback ?? EMPTY_FEEDBACK;
  const entry = state.entries[key];
  const kindAffinity = state.kindAffinity[kind] ?? 0;
  if (!entry) return kindAffinity;
  const ageDays = entry.lastNegativeAt
    ? Math.max(0, (Date.now() - new Date(entry.lastNegativeAt).getTime()) / 86_400_000)
    : 999;
  const recencyWeight = ageDays < 2 ? 1 : ageDays < 7 ? 0.7 : ageDays < 30 ? 0.35 : 0.15;
  return kindAffinity + entry.positive * 5 - entry.negative * 18 * recencyWeight;
}

function opportunityFitsWindow(start: Date | null | undefined, durationMinutes: number, windows: DiscoverOpenWindow[]): DiscoverOpenWindow | null {
  if (!start) return null;
  const end = start.getTime() + durationMinutes * 60_000;
  return windows.find((window) => start.getTime() >= window.start.getTime() - 10 * 60_000 && end <= window.end.getTime() + 10 * 60_000) ?? null;
}

function lifeWindowReason(window: DiscoverOpenWindow | null): string | null {
  if (!window) return null;
  return `${window.label} is open · ${window.rangeLabel}`;
}

function isLikelyOutdoorEvent(event: LocalEvent): boolean {
  const text = normalize(`${event.title} ${event.description ?? ''} ${event.venue} ${event.category} ${(event.tags ?? []).join(' ')}`);
  return /park|outdoor|festival|run|walk|hike|garden|stadium|market|trail|rooftop|open air/.test(text);
}

function eventOpportunity(
  event: LocalEvent,
  input: DiscoverEngineInput,
): DiscoverOpportunity {
  const { context, eventRecommendationInput, feedback } = input;
  const personalization = buildEventPersonalizationContext(eventRecommendationInput.profile, {
    effectiveJoySources: eventRecommendationInput.effectiveJoySources,
    habitKeywords: eventRecommendationInput.habitKeywords,
    habitCategoryWeights: eventRecommendationInput.habitCategoryWeights,
    recoveryModeActive: eventRecommendationInput.recoveryModeActive,
  });
  const personalScore = scoreEventForUser(event, personalization);
  const reasons = buildEventRecommendationReasons(event, eventRecommendationInput, 3).map((reason) => reason.label);
  const start = parseEventStartDateTime(event);
  const rangeDuration = 120;
  const fittingWindow = opportunityFitsWindow(start, rangeDuration, context.openWindows);
  const days = getDaysUntilEvent(event);
  let score = 54 + personalScore * 1.55;

  if (days === 0) score += 26;
  else if (days === 1) score += 17;
  else if (days != null && days <= 7) score += 7;
  if (fittingWindow) score += 18;
  if (event.isLiveNow) score += 24;
  if (event.isHot) score += 5;
  if (event.isFeatured) score += 4;

  if (typeof event.distanceKm === 'number') {
    if (event.distanceKm <= 3) score += 8;
    else if (event.distanceKm <= 8) score += 4;
    else if (event.distanceKm > 25) score -= 8;
  }

  if (!context.weather.outdoorFriendly && isLikelyOutdoorEvent(event)) score -= 13;
  if ((context.energy.mode === 'recovery' || context.energy.mode === 'low_energy') && event.category === 'nightlife') score -= 13;
  if (context.taskPressure.score >= 78 && days === 0) score -= 10;

  const key = `event:${event.id}`;
  score += feedbackAdjustment(key, 'event', feedback);

  const reasonList = [...reasons];
  const windowReason = lifeWindowReason(fittingWindow);
  if (windowReason && !reasonList.some((reason) => reason.includes('Free'))) reasonList.unshift(windowReason);
  if (!context.weather.outdoorFriendly && !isLikelyOutdoorEvent(event)) reasonList.push('Weather-proof option');

  return {
    id: event.id,
    key,
    kind: 'event',
    title: event.title,
    subtitle: [getEventCountdownLabel(event), event.time, event.venue].filter(Boolean).join(' · '),
    eyebrow: event.isLiveNow ? 'LIVE NEAR YOU' : days === 0 ? 'TONIGHT' : 'WORTH GOING OUT FOR',
    reasons: [...new Set(reasonList)].slice(0, 3),
    score,
    route: `/(root)/event/${event.id}`,
    actionLabel: 'Add to my life',
    image: event.image,
    accent: '#315ED8',
    startsAt: start,
    durationMinutes: rangeDuration,
    event,
    meta: {
      distance: typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : undefined,
      price: event.price,
      category: event.category,
    },
  };
}

function watchOpportunity(signal: DiscoverWatchSignal, input: DiscoverEngineInput): DiscoverOpportunity {
  const { context, feedback } = input;
  const window = context.primaryWindow;
  let score = 72;
  if (context.now.getHours() >= 18) score += 12;
  if (context.energy.mode === 'wind_down') score += 14;
  if (context.energy.mode === 'recovery' || context.energy.mode === 'low_energy') score += 11;
  if (context.taskPressure.score >= 78 && context.now.getHours() < 19) score -= 14;
  if (window && window.durationMinutes >= 45) score += 7;
  const key = `watch:${signal.id}`;
  score += feedbackAdjustment(key, 'watch', feedback);

  const reasons = ['You already started this'];
  if (context.energy.mode === 'wind_down') reasons.push('Fits your wind-down window');
  else if (context.energy.mode === 'recovery' || context.energy.mode === 'low_energy') reasons.push('Low-effort option for your current energy');
  const windowReason = lifeWindowReason(window);
  if (windowReason) reasons.push(windowReason);

  return {
    id: signal.id,
    key,
    kind: 'watch',
    title: signal.title,
    subtitle: [signal.episodeLabel, signal.platform].filter(Boolean).join(' · ') || 'Continue watching',
    eyebrow: 'CONTINUE WATCHING',
    reasons: reasons.slice(0, 3),
    score,
    route: '/(tabs)/shows',
    actionLabel: 'Continue',
    image: signal.backdropUrl ?? signal.posterUrl,
    secondaryImage: signal.posterUrl,
    accent: '#7057E8',
    durationMinutes: 50,
    meta: { rating: signal.rating },
  };
}

function sportKickoff(signal: DiscoverSportSignal): Date | null {
  if (!signal.date) return null;
  const parsed = new Date(signal.date);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function sportOpportunity(signal: DiscoverSportSignal, input: DiscoverEngineInput): DiscoverOpportunity {
  const { context, feedback } = input;
  const kickoff = sportKickoff(signal);
  const hoursUntil = kickoff ? (kickoff.getTime() - context.now.getTime()) / 3_600_000 : null;
  const fittingWindow = opportunityFitsWindow(kickoff, 130, context.openWindows);
  let score = signal.favoriteTeamName ? 78 : 58;
  if (signal.status === 'Live') score += 34;
  else if (hoursUntil != null && hoursUntil >= 0 && hoursUntil <= 6) score += 25;
  else if (hoursUntil != null && hoursUntil <= 30) score += 16;
  else if (hoursUntil != null && hoursUntil <= 168) score += 7;
  if (fittingWindow) score += 12;
  if (context.taskPressure.score >= 85 && signal.status !== 'Live' && hoursUntil != null && hoursUntil < 8) score -= 8;
  const key = `sport:${signal.id}`;
  score += feedbackAdjustment(key, 'sport', feedback);

  const scoreLabel = signal.status === 'Live' && signal.homeScore != null && signal.awayScore != null
    ? `${signal.homeScore}–${signal.awayScore}`
    : null;
  const reasons: string[] = [];
  if (signal.favoriteTeamName) reasons.push(`Because you follow ${signal.favoriteTeamName}`);
  if (signal.status === 'Live') reasons.push('Live right now');
  else if (hoursUntil != null && hoursUntil >= 0 && hoursUntil <= 6) reasons.push(`Starts in ${Math.max(1, Math.round(hoursUntil))}h`);
  const windowReason = lifeWindowReason(fittingWindow);
  if (windowReason) reasons.push(windowReason);

  return {
    id: signal.id,
    key,
    kind: 'sport',
    title: `${signal.homeTeam} vs ${signal.awayTeam}`,
    subtitle: [scoreLabel, signal.league, signal.time].filter(Boolean).join(' · '),
    eyebrow: signal.status === 'Live' ? 'LIVE NOW' : 'ON YOUR RADAR',
    reasons: reasons.slice(0, 3),
    score,
    route: '/(tabs)/sports',
    actionLabel: signal.status === 'Live' ? 'Follow live' : 'View match',
    image: signal.homeTeamLogo,
    secondaryImage: signal.awayTeamLogo,
    accent: '#D98B00',
    startsAt: kickoff,
    durationMinutes: 130,
  };
}

function habitOpportunity(signal: DiscoverHabitSignal, input: DiscoverEngineInput): DiscoverOpportunity {
  const { context, feedback } = input;
  let score = 48;
  if (!signal.completedToday && signal.streak >= 2) score += 22;
  if (!signal.completedToday && signal.streak >= 7) score += 8;
  if (signal.completedToday) score -= 18;
  if (context.energy.mode === 'recovery' || context.energy.mode === 'low_energy') {
    if ((signal.estimatedMinutes ?? 20) <= 20) score += 8;
    else score -= 8;
  }
  if (context.primaryWindow && (signal.estimatedMinutes ?? 20) <= context.primaryWindow.durationMinutes) score += 7;
  const key = `habit:${signal.id}`;
  score += feedbackAdjustment(key, 'habit', feedback);

  const reasons: string[] = [];
  if (signal.streak > 0) reasons.push(`${signal.streak}-day momentum is worth protecting`);
  if (context.energy.mode === 'recovery' || context.energy.mode === 'low_energy') reasons.push('Keep it small today');
  const windowReason = lifeWindowReason(context.primaryWindow);
  if (windowReason) reasons.push(windowReason);

  return {
    id: signal.id,
    key,
    kind: 'habit',
    title: signal.title,
    subtitle: signal.completedToday ? 'Done today' : `${signal.totalCompletions} completions so far`,
    eyebrow: signal.completedToday ? 'MOMENTUM BANKED' : 'PROTECT YOUR MOMENTUM',
    reasons: reasons.slice(0, 3),
    score,
    route: '/(tabs)/tasks',
    actionLabel: signal.completedToday ? 'View habit' : 'Do it',
    accent: '#0E9B62',
    durationMinutes: signal.estimatedMinutes ?? 20,
  };
}

function recipeOpportunity(signal: DiscoverRecipeSignal, input: DiscoverEngineInput): DiscoverOpportunity {
  const { context, feedback } = input;
  const hour = context.now.getHours();
  let score = 48;
  if (hour >= 16 && hour <= 20) score += 18;
  if (signal.saved) score += 10;
  if (signal.cookedCount > 0) score += Math.min(8, signal.cookedCount * 2);
  if ((context.energy.mode === 'recovery' || context.energy.mode === 'low_energy' || context.energy.mode === 'time_crunch') && signal.readyInMinutes <= 35) score += 13;
  if (context.primaryWindow && signal.readyInMinutes <= context.primaryWindow.durationMinutes) score += 9;
  if (context.taskPressure.score >= 75 && signal.readyInMinutes > 45) score -= 9;
  const key = `recipe:${signal.id}`;
  score += feedbackAdjustment(key, 'recipe', feedback);

  const reasons: string[] = [];
  if (signal.saved) reasons.push('You saved this recipe');
  else if (signal.cookedCount > 0) reasons.push(`You've cooked this ${signal.cookedCount}×`);
  if (signal.readyInMinutes <= 30) reasons.push(`${signal.readyInMinutes} minutes — fits a busy day`);
  const windowReason = lifeWindowReason(context.primaryWindow);
  if (windowReason) reasons.push(windowReason);

  return {
    id: signal.id,
    key,
    kind: 'recipe',
    title: signal.title,
    subtitle: [signal.subtitle, `${signal.readyInMinutes} min`].filter(Boolean).join(' · '),
    eyebrow: hour >= 16 ? 'DINNER THAT FITS' : 'FROM YOUR KITCHEN',
    reasons: reasons.slice(0, 3),
    score,
    route: '/(tabs)/cooking',
    actionLabel: 'Cook this',
    image: signal.image,
    accent: '#EA6A37',
    durationMinutes: signal.readyInMinutes,
    meta: { rating: signal.rating, category: signal.category },
  };
}

function taskOpportunity(task: Task, input: DiscoverEngineInput): DiscoverOpportunity {
  const { context, feedback } = input;
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && Number.isFinite(due.getTime()) && due.getTime() < context.now.getTime();
  let score = task.priority === 'urgent' ? 87 : task.priority === 'high' ? 73 : 48;
  if (overdue) score += 20;
  if (due && sameLocalDay(due, context.now)) score += 14;
  if (context.taskPressure.score >= 70) score += 10;
  const duration = clamp(task.estimatedDuration ?? 30, 5, 240);
  if (context.primaryWindow && duration <= context.primaryWindow.durationMinutes) score += 9;
  if (context.energy.mode === 'wind_down' && duration > 45) score -= 15;
  if (context.energy.mode === 'recovery' && task.priority !== 'urgent') score -= 12;
  const key = `task:${task.id}`;
  score += feedbackAdjustment(key, 'task', feedback);

  const reasons: string[] = [];
  if (overdue) reasons.push('This is overdue');
  else if (task.priority === 'urgent') reasons.push('This is your highest-pressure item');
  else reasons.push('Clearing this creates more space');
  if (context.primaryWindow && duration <= context.primaryWindow.durationMinutes) reasons.push(`Fits inside your ${context.primaryWindow.durationMinutes}-minute opening`);

  return {
    id: task.id,
    key,
    kind: 'task',
    title: task.title,
    subtitle: [task.category, `${duration} min`].filter(Boolean).join(' · '),
    eyebrow: overdue ? 'CLEAR THIS FIRST' : 'MAKE ROOM FOR LATER',
    reasons: reasons.slice(0, 3),
    score,
    route: '/(tabs)/tasks',
    actionLabel: 'Open task',
    accent: '#4B5563',
    durationMinutes: duration,
  };
}

function mediaOpportunity(signal: DiscoverMediaSignal, input: DiscoverEngineInput): DiscoverOpportunity {
  const { context, feedback } = input;
  let score = 44;
  if (context.now.getHours() >= 18) score += 7;
  if (context.energy.mode === 'wind_down' || context.energy.mode === 'recovery') score += 6;
  if ((signal.rating ?? 0) >= 7.5) score += 5;
  const key = `media:${signal.id}`;
  score += feedbackAdjustment(key, 'media', feedback);
  return {
    id: signal.id,
    key,
    kind: 'media',
    title: signal.title,
    subtitle: signal.rating ? `★ ${signal.rating.toFixed(1)} · ${signal.mediaType === 'tv' ? 'Series' : 'Movie'}` : signal.mediaType === 'tv' ? 'Series' : 'Movie',
    eyebrow: 'SOMETHING NEW',
    reasons: [signal.reason || 'A fresh pick outside your current library'],
    score,
    route: '/(tabs)/shows',
    actionLabel: 'Explore',
    image: signal.backdropUrl ?? signal.posterUrl,
    secondaryImage: signal.posterUrl,
    accent: '#5848C2',
  };
}

export function dedupeEventExperiences(opportunities: DiscoverOpportunity[]): DiscoverOpportunity[] {
  const seen = new Set<string>();
  return opportunities.filter((item) => {
    if (item.kind !== 'event' || !item.event) return true;
    const title = normalize(item.title);
    const venue = normalize(item.event.venue);
    if (!title || !venue) return true;
    const signature = `${title}|${venue}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function diversify(opportunities: DiscoverOpportunity[], limit: number): DiscoverOpportunity[] {
  const chosen: DiscoverOpportunity[] = [];
  const kindCounts = new Map<DiscoverOpportunityKind, number>();
  for (const item of opportunities) {
    const count = kindCounts.get(item.kind) ?? 0;
    const maxForKind = item.kind === 'event' ? 2 : 1;
    if (count >= maxForKind) continue;
    chosen.push(item);
    kindCounts.set(item.kind, count + 1);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

export function buildDiscoverOpportunities(input: DiscoverEngineInput): DiscoverEngineResult {
  const opportunities: DiscoverOpportunity[] = [];

  for (const event of input.events) opportunities.push(eventOpportunity(event, input));
  if (input.watch) opportunities.push(watchOpportunity(input.watch, input));
  for (const sport of input.sports ?? []) {
    if (sport.status !== 'Completed') opportunities.push(sportOpportunity(sport, input));
  }
  for (const habit of input.habits ?? []) opportunities.push(habitOpportunity(habit, input));
  if (input.recipe) opportunities.push(recipeOpportunity(input.recipe, input));

  const priorityTasks = input.tasks
    .filter((task) => !task.isHabit && isIncomplete(task) && (task.priority === 'urgent' || task.priority === 'high'))
    .sort((a, b) => {
      const priority = (value: Task['priority']) => value === 'urgent' ? 4 : value === 'high' ? 3 : value === 'medium' ? 2 : 1;
      return priority(b.priority) - priority(a.priority);
    })
    .slice(0, 2);
  for (const task of priorityTasks) opportunities.push(taskOpportunity(task, input));
  for (const media of (input.media ?? []).slice(0, 8)) opportunities.push(mediaOpportunity(media, input));

  const ranked = dedupeEventExperiences(
    opportunities
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score),
  );

  const hero = ranked[0] ?? null;
  const remaining = ranked.filter((item) => item.key !== hero?.key);
  const alternatives = diversify(remaining, 4);
  const used = new Set([hero?.key, ...alternatives.map((item) => item.key)].filter(Boolean));
  const later = diversify(remaining.filter((item) => !used.has(item.key)), 8);
  const eventPicks = ranked.filter((item) => item.kind === 'event').slice(0, 8);

  const serendipity = ranked.find((item) => {
    if (used.has(item.key)) return false;
    if (item.kind === 'media') return true;
    if (item.kind !== 'event') return false;
    const reasonText = normalize(item.reasons.join(' '));
    return !/because you|you follow|fits your|you saved/.test(reasonText);
  }) ?? null;

  return { ranked, hero, alternatives, later, serendipity, eventPicks };
}
