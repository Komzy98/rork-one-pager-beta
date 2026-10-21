import type { IntelligenceContext, IntelligenceSource } from './intelligenceContext';

/**
 * Phase 2A: local, deterministic cross-category prioritisation.
 * No API calls, inferred mood, hidden user profiling or model-written facts.
 * Recompute using fresh context and a current clock; do not persist relative-time decisions.
 */
export const DAILY_DECISION_VERSION = 1;

export type DecisionDestination = 'tasks' | 'sports' | 'events' | 'shows';
export type DailyDecision = {
  id: string;
  source: Exclude<IntelligenceSource, 'weather'>;
  urgency: 'now' | 'next' | 'optional';
  title: string;
  guidance: string;
  reason: string;
  /** A factual, distinct cross-category consideration, not an instruction. */
  alongside?: string;
  destination?: DecisionDestination;
  actionLabel?: string;
};

type Candidate = DailyDecision & { score: number; identity: string };

const tidy = (value: string | undefined, limit = 95) =>
  (value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);

function localDate(date: Date): string {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

/** Only parse an explicit clock time, never infer one from an untimed event. */
export function parseDecisionClock(label: string | undefined): number | null {
  const raw = tidy(label, 45);
  const match = /^(?:(?:today|at)\s+)?(\d{1,2}):(\d{2})(?:\s*(am|pm))?(?=$|\s|[-–—])/i.exec(raw);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  const resolvedHour = meridiem ? (hour % 12) + (meridiem === 'pm' ? 12 : 0) : hour;
  return resolvedHour * 60 + minute;
}

const minutesNow = (now: Date) => now.getHours() * 60 + now.getMinutes();

export function buildDailyDecision(
  context: IntelligenceContext,
  options: { now?: Date } = {},
): DailyDecision | null {
  const now = options.now ?? new Date();
  // Avoid showing yesterday's suggested next action after midnight or while
  // inspecting a different day. Future date context is not "today".
  if (!Number.isFinite(now.getTime()) || context.date !== localDate(now)) return null;
  const usable = (source: IntelligenceSource) => context.sources[source]?.status === 'ready';
  const candidates: Candidate[] = [];
  const dedupe = new Set<string>();
  const add = (item: Candidate) => {
    const identity = item.source + ':' + item.identity.toLowerCase();
    if (!item.title || dedupe.has(identity)) return;
    dedupe.add(identity);
    candidates.push(item);
  };

  const calendar = usable('calendar') ? context.todayCalendar.filter(e => !!tidy(e.title)) : [];
  const upcomingTimed = calendar
    .filter(e => !e.isAllDay)
    .map(e => ({ ...e, clock: parseDecisionClock(e.timeLabel) }))
    .filter((e): e is typeof e & { clock: number } => e.clock !== null)
    .map(e => ({ ...e, minutesUntil: e.clock - minutesNow(now) }))
    .filter(e => e.minutesUntil >= 0)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
  const nextCalendar = upcomingTimed[0];

  if (usable('calendar')) {
    for (const event of upcomingTimed.slice(0, 3)) {
      const imminent = event.minutesUntil <= 60;
      const soon = event.minutesUntil <= 180;
      const title = tidy(event.title);
      add({
        id: 'calendar:' + title + ':' + event.clock,
        identity: title + ':' + event.clock,
        source: 'calendar',
        urgency: imminent ? 'now' : 'next',
        score: imminent ? 125 - event.minutesUntil / 6 : soon ? 66 : 44,
        title: imminent ? 'Prepare for ' + title : 'Plan around ' + title,
        guidance: imminent
          ? 'Check what you need before it starts.'
          : 'Keep this commitment in mind when planning your next task.',
        reason: 'Scheduled for ' + tidy(event.timeLabel, 35) + ' today.',
      });
    }
  }

  if (usable('tasks')) {
    const tasks = [
      ...context.priorityTasks.map(t => ({ name: t.title, completed: t.completed, priority: t.priority })),
      ...context.tasks,
    ];
    for (const task of tasks) {
      if (task.completed || !tidy(task.name)) continue;
      const priority = tidy(task.priority).toLowerCase();
      const urgent = /^(urgent|critical|p0|highest)$/.test(priority);
      const high = /^(high|p1|important)$/.test(priority);
      const medium = /^(medium|normal|p2)$/.test(priority);
      const name = tidy(task.name);
      add({
        id: 'tasks:' + name,
        identity: name,
        source: 'tasks',
        urgency: urgent || high ? 'now' : 'next',
        score: urgent ? 103 : high ? 90 : medium ? 69 : 59,
        title: name,
        guidance: 'Choose the first concrete step and give it ten focused minutes.',
        reason: urgent ? 'Marked urgent and not yet completed.'
          : high ? 'Marked high priority and still open.'
          : 'Still on your open task list.',
        destination: 'tasks',
        actionLabel: 'Open tasks',
      });
    }
  }

  if (usable('habits')) {
    for (const habit of context.habits) {
      if (habit.done || habit.scheduledToday === false || !tidy(habit.name)) continue;
      const name = tidy(habit.name);
      add({
        id: 'habits:' + name,
        identity: name,
        source: 'habits',
        urgency: 'next',
        score: 57,
        title: name,
        guidance: 'Try the smallest version that feels practical today.',
        reason: 'Scheduled for today and not yet marked complete.',
        destination: 'tasks',
        actionLabel: 'Open habits',
      });
    }
  }

  if (usable('calendar') && !upcomingTimed.length) {
    for (const event of calendar.filter(e => e.isAllDay).slice(0, 1)) {
      const title = tidy(event.title);
      add({
        id: 'calendar:all-day:' + title,
        identity: title + ':all-day',
        source: 'calendar',
        urgency: 'next',
        score: 41,
        title,
        guidance: 'Keep this all-day commitment on your radar.',
        reason: 'Listed as an all-day calendar event today.',
      });
    }
  }

  if (usable('events')) {
    for (const event of context.savedDiscoveryEvents
      .filter(e => e.intent === 'saved' && e.timing !== 'past' &&
        (e.daysUntil === null || e.daysUntil >= 0))
      .slice(0, 2)) {
      const title = tidy(event.title);
      if (!title) continue;
      add({
        id: 'events:' + title,
        identity: title,
        source: 'events',
        urgency: 'optional',
        score: event.daysUntil === 0 || event.timing === 'today' ? 37 : 27,
        title,
        guidance: 'Check the details if you are considering going.',
        reason: (event.daysUntil === 0 || event.timing === 'today' ? 'Saved event today.' : 'Saved for a future date.') +
          (tidy(event.timeLabel, 28) ? ' ' + tidy(event.timeLabel, 28) + '.' : ''),
        destination: 'events',
        actionLabel: 'View saved events',
      });
    }
  }

  if (usable('sports')) {
    const todayBeats = context.sportsBeats.filter(b =>
      (b.kind === 'match_today' || b.kind === 'live_now') && tidy(b.headline));
    const beat = todayBeats[0];
    if (beat) {
      const headline = tidy(beat.headline);
      add({
        id: 'sports:' + headline,
        identity: headline,
        source: 'sports',
        urgency: 'optional',
        score: 35,
        title: headline,
        guidance: 'Check the fixture or live coverage when it suits you.',
        reason: 'From the sports you follow today.',
        destination: 'sports',
        actionLabel: 'Open sports',
      });
    } else {
      const nextMatch = context.upcomingMatches.find(m =>
        m.date === context.date && tidy(m.homeTeam) && tidy(m.awayTeam));
      if (nextMatch) {
        const name = tidy(nextMatch.homeTeam) + ' vs ' + tidy(nextMatch.awayTeam);
        add({
          id: 'sports:' + name,
          identity: name,
          source: 'sports',
          urgency: 'optional',
          score: 32,
          title: name,
          guidance: 'Check the match details when it suits you.',
          reason: 'A fixture listed for today' +
            (tidy(nextMatch.time, 28) ? ' at ' + tidy(nextMatch.time, 28) : '') + '.',
          destination: 'sports',
          actionLabel: 'Open sports',
        });
      }
    }
  }

  if (usable('shows')) {
    const show = context.continueWatching.find(s => tidy(s.title));
    if (show) {
      const title = tidy(show.title);
      add({
        id: 'shows:' + title,
        identity: title,
        source: 'shows',
        urgency: 'optional',
        score: 18,
        title,
        guidance: 'It is ready in your Continue Watching list whenever you want.',
        reason: 'Already saved in Continue Watching.',
        destination: 'shows',
        actionLabel: 'Open shows',
      });
    }
  }

  if (!candidates.length) return null;
  // Stable ordering makes the recommendation predictable for equal scores.
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const [first] = candidates;

  let alongside: string | undefined;
  if (first.source === 'tasks' || first.source === 'habits') {
    if (nextCalendar && nextCalendar.minutesUntil <= 240) {
      alongside = tidy(nextCalendar.title) + ' is on your calendar at ' +
        tidy(nextCalendar.timeLabel, 30) + '.';
    }
  } else if (first.source === 'calendar') {
    const openTask = candidates.find(c => c.source === 'tasks' && c.score >= 85);
    if (openTask) alongside = 'You also have an open priority task: ' + openTask.title + '.';
  }
  if (!alongside && usable('weather') && context.weather &&
      /\b(rain|showers|storm|snow|sleet|icy|ice)\b/i.test(
        context.weather.condition + ' ' + context.weather.description) &&
      (first.source === 'calendar' || first.source === 'habits')) {
    alongside = 'Weather: ' + tidy(context.weather.condition || context.weather.description, 50) +
      '. Check conditions before heading out.';
  }

  const { score: _score, identity: _identity, ...decision } = first;
  return { ...decision, ...(alongside ? { alongside } : {}) };
}
