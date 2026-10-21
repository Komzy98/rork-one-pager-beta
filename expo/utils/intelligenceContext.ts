import type { DailySummaryInput } from './dailySummary';

/**
 * Phase 1: one bounded, source-aware view of the user's day.
 * This module is pure and never calls an API. LLMs may consume a projected
 * copy in future; neither a model nor a network request is on the UI path.
 */
export const INTELLIGENCE_CONTEXT_VERSION = 1;

export type IntelligenceSource = 'habits' | 'tasks' | 'calendar' | 'sports' | 'shows' | 'events' | 'weather';
export type IntelligenceSourceStatus = 'ready' | 'empty' | 'unavailable' | 'stale';
export type IntelligenceSourceHealth = {
  status: IntelligenceSourceStatus;
  count: number;
  updatedAt?: string;
};

export type IntelligenceContextOptions = {
  now?: Date;
  /** False means unavailable or permission denied, not "nothing planned". */
  availability?: Partial<Record<IntelligenceSource, boolean>>;
  /** Only mark a source stale when a genuine observation time is known. */
  updatedAt?: Partial<Record<IntelligenceSource, string>>;
};

export type IntelligenceContext = {
  schemaVersion: number;
  date: string;
  collectedAt: string;
  signature: string;
  sources: Record<IntelligenceSource, IntelligenceSourceHealth>;
  habits: NonNullable<DailySummaryInput['habits']>;
  habitRollup: DailySummaryInput['habitRollup'];
  tasks: NonNullable<DailySummaryInput['tasks']>;
  priorityTasks: NonNullable<DailySummaryInput['priorityTasks']>;
  openItems: string[];
  todayCalendar: NonNullable<DailySummaryInput['todayCalendar']>;
  upcomingEvents: NonNullable<DailySummaryInput['upcomingEvents']>;
  savedDiscoveryEvents: NonNullable<DailySummaryInput['savedDiscoveryEvents']>;
  sportsBeats: NonNullable<DailySummaryInput['sportsBeats']>;
  upcomingMatches: NonNullable<DailySummaryInput['upcomingMatches']>;
  continueWatching: NonNullable<DailySummaryInput['continueWatching']>;
  shows: NonNullable<DailySummaryInput['shows']>;
  weather?: DailySummaryInput['weather'];
};

const maxAgeMs: Partial<Record<IntelligenceSource, number>> = {
  weather: 2 * 60 * 60_000,
  sports: 15 * 60_000,
  calendar: 30 * 60_000,
  events: 60 * 60_000,
};

function clean(value: unknown, limit = 140): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function unique<T>(items: T[], key: (value: T) => string, limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const identity = key(item).toLocaleLowerCase();
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z'));
}

/** Stable lightweight fingerprint: never use it as a security/identity hash. */
function fingerprint(value: unknown): string {
  const json = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'context-v' + INTELLIGENCE_CONTEXT_VERSION + '-' + (hash >>> 0).toString(16);
}

export function buildIntelligenceContext(
  input: DailySummaryInput,
  options: IntelligenceContextOptions = {}
): IntelligenceContext {
  const now = options.now ?? new Date();
  const collectedAt = now.toISOString();
  const date = input.date;
  const allowed = (source: IntelligenceSource) => options.availability?.[source] !== false;

  const habits = allowed('habits')
    ? unique((input.habits ?? []).filter(h => h.scheduledToday !== false).map(h => ({
        name: clean(h.name), done: h.done === true, scheduledToday: true,
        ...(typeof h.streak === 'number' && Number.isFinite(h.streak)
          ? { streak: Math.max(0, Math.floor(h.streak)) } : {}),
      })), h => h.name, 40)
    : [];

  const tasks = allowed('tasks')
    ? unique((input.tasks ?? []).map(t => ({
        name: clean(t.name), completed: t.completed === true,
        priority: clean(t.priority, 30), category: clean(t.category, 50),
      })), t => t.name, 40)
    : [];

  const priorityTasks = allowed('tasks')
    ? unique((input.priorityTasks ?? []).map(t => ({
        title: clean(t.title), priority: clean(t.priority, 30),
        completed: t.completed === true, category: clean(t.category, 50),
      })), t => t.title, 12)
    : [];

  const todayCalendar = allowed('calendar')
    ? unique((input.todayCalendar ?? []).map(e => ({
        title: clean(e.title), timeLabel: clean(e.timeLabel, 40),
        isAllDay: e.isAllDay === true, location: clean(e.location),
      })), e => e.title + '|' + e.timeLabel, 12)
    : [];

  const upcomingEvents = allowed('calendar')
    ? unique((input.upcomingEvents ?? []).filter(e => e.timing !== 'past').map(e => ({
        title: clean(e.title), dateLabel: clean(e.dateLabel, 40),
        timeLabel: clean(e.timeLabel, 40), timing: e.timing, intent: e.intent,
        location: clean(e.location), isAllDay: e.isAllDay === true,
      })), e => e.title + '|' + e.dateLabel + '|' + e.timeLabel, 16)
    : [];

  const savedDiscoveryEvents = allowed('events')
    ? unique((input.savedDiscoveryEvents ?? []).filter(e => e.timing !== 'past' &&
        (e.daysUntil == null || e.daysUntil >= 0)).map(e => ({
        title: clean(e.title), dateLabel: clean(e.dateLabel, 40),
        timeLabel: clean(e.timeLabel, 40), venue: clean(e.venue),
        daysUntil: e.daysUntil, timing: e.timing, intent: e.intent,
      })), e => e.title + '|' + e.dateLabel, 12)
    : [];

  const sportsBeats = allowed('sports')
    ? unique((input.sportsBeats ?? []).map(b => ({
        kind: b.kind, headline: clean(b.headline), whenLabel: clean(b.whenLabel, 40),
      })), b => b.kind + '|' + b.headline, 6)
    : [];

  const upcomingMatches = allowed('sports')
    ? unique((input.upcomingMatches ?? []).filter(m => validDay(m.date) && m.date >= date)
      .map(m => ({
        homeTeam: clean(m.homeTeam), awayTeam: clean(m.awayTeam),
        date: m.date, time: clean(m.time, 40), competition: clean(m.competition),
      })).sort((a, b) => a.date.localeCompare(b.date)),
      m => m.homeTeam + '|' + m.awayTeam + '|' + m.date, 12)
    : [];

  const continueWatching = allowed('shows')
    ? unique((input.continueWatching ?? []).map(s => ({
        title: clean(s.title), episode: clean(s.episode, 60), platform: clean(s.platform, 60),
      })), s => s.title, 10)
    : [];

  const shows = allowed('shows')
    ? unique((input.shows ?? []).map(s => ({
        title: clean(s.title), episode: clean(s.episode, 60),
      })), s => s.title, 12)
    : [];

  const weather = allowed('weather') &&
    input.weather && Number.isFinite(input.weather.temp) &&
    clean(input.weather.condition || input.weather.description)
    ? {
        condition: clean(input.weather.condition, 80), temp: input.weather.temp,
        description: clean(input.weather.description, 140), city: clean(input.weather.city, 80),
      }
    : undefined;

  const counts: Record<IntelligenceSource, number> = {
    habits: habits.length, tasks: tasks.length + priorityTasks.length,
    calendar: todayCalendar.length + upcomingEvents.length,
    sports: sportsBeats.length + upcomingMatches.length,
    shows: continueWatching.length + shows.length,
    events: savedDiscoveryEvents.length, weather: weather ? 1 : 0,
  };

  const present: Record<IntelligenceSource, boolean> = {
    habits: input.habits !== undefined || input.habitRollup != null,
    tasks: input.tasks !== undefined || input.priorityTasks !== undefined,
    calendar: input.todayCalendar !== undefined || input.upcomingEvents !== undefined,
    sports: input.sportsBeats !== undefined || input.upcomingMatches !== undefined,
    shows: input.shows !== undefined || input.continueWatching !== undefined,
    events: input.savedDiscoveryEvents !== undefined,
    weather: weather !== undefined,
  };

  const keys: IntelligenceSource[] = ['habits','tasks','calendar','sports','shows','events','weather'];
  const sources = {} as Record<IntelligenceSource, IntelligenceSourceHealth>;
  for (const key of keys) {
    const updatedAt = options.updatedAt?.[key];
    const parsedTime = updatedAt ? Date.parse(updatedAt) : NaN;
    const validTimestamp = Number.isFinite(parsedTime) && parsedTime <= now.getTime();
    const isStale = validTimestamp && maxAgeMs[key] !== undefined &&
      now.getTime() - parsedTime > maxAgeMs[key]!;
    const status: IntelligenceSourceStatus = !allowed(key) || !present[key]
      ? 'unavailable' : isStale ? 'stale' : counts[key] ? 'ready' : 'empty';
    sources[key] = { status, count: status === 'unavailable' ? 0 : counts[key],
      ...(validTimestamp ? { updatedAt } : {}) };
  }

  // Do not present stale live data as current. Keep the source health visible.
  const usable = (key: IntelligenceSource) => sources[key].status !== 'stale' &&
    sources[key].status !== 'unavailable';
  const safe = {
    habits, habitRollup: allowed('habits') ? (input.habitRollup ?? null) : null,
    tasks, priorityTasks, openItems: unique((input.openItems ?? []).map(x => clean(x)), x => x, 12),
    todayCalendar: usable('calendar') ? todayCalendar : [],
    upcomingEvents: usable('calendar') ? upcomingEvents : [],
    savedDiscoveryEvents: usable('events') ? savedDiscoveryEvents : [],
    sportsBeats: usable('sports') ? sportsBeats : [],
    upcomingMatches: usable('sports') ? upcomingMatches : [],
    continueWatching: shows.length || continueWatching.length ? continueWatching : [],
    shows, weather: usable('weather') ? weather : undefined,
  };
  const signature = fingerprint({ date, sources, ...safe });
  return { schemaVersion: INTELLIGENCE_CONTEXT_VERSION, date, collectedAt, signature, sources, ...safe };
}

/** Bounded projection ready for a future server-side language model. */
export function toBriefingModelContext(context: IntelligenceContext) {
  return {
    date: context.date,
    sourceStatus: Object.fromEntries(
      Object.entries(context.sources).map(([name, health]) => [name, health.status])
    ),
    habits: context.habits,
    habitRollup: context.habitRollup,
    tasks: context.tasks,
    priorityTasks: context.priorityTasks,
    todayCalendar: context.todayCalendar,
    upcomingEvents: context.upcomingEvents,
    savedDiscoveryEvents: context.savedDiscoveryEvents,
    sportsBeats: context.sportsBeats,
    upcomingMatches: context.upcomingMatches,
    continueWatching: context.continueWatching,
    shows: context.shows,
    weather: context.weather,
  };
}
