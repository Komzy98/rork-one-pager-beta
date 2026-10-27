import type { DailyDecision } from './dailyDecisionEngine';
import type { PersonalSignal } from './interestSignalEngine';

/** A short list of timely, sourced opportunities — never an inferred mood or fabricated fixture. */
export type TimeOpportunityKind = 'football' | 'episode' | 'habit' | 'priority';
export type TimeOpportunity = {
  id: string;
  kind: TimeOpportunityKind;
  title: string;
  detail: string;
  reason: string;
  actionLabel: string;
  score: number;
  refId?: string;
};
export type EpisodeOpportunity = {
  tmdbId: number;
  showTitle: string;
  latestEpisode?: { airDate?: string | null; seasonNumber: number; episodeNumber: number } | null;
  nextEpisode?: { airDate?: string | null; seasonNumber: number; episodeNumber: number } | null;
};
export type TimeWellSpentInput = {
  now?: Date;
  signals?: readonly PersonalSignal[];
  episodes?: readonly EpisodeOpportunity[];
  incompleteHabits?: readonly string[];
  dailyDecision?: DailyDecision | null;
  recoveryActive?: boolean;
};

const DAY = 24 * 60 * 60_000;
const clean = (s: string, limit = 100) => s.replace(/\s+/g, ' ').trim().slice(0, limit);
const localDay = (date: Date) =>
  date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') +
  '-' + String(date.getDate()).padStart(2, '0');

export function getTimeOpportunities(input: TimeWellSpentInput): TimeOpportunity[] {
  const now = input.now ?? new Date();
  if (input.recoveryActive) return [];
  const candidates: TimeOpportunity[] = [];

  for (const signal of input.signals ?? []) {
    if (signal.kind !== 'football_live' && signal.kind !== 'football_upcoming') continue;
    const kickoff = Date.parse(signal.match.date);
    if (!Number.isFinite(kickoff)) continue;
    const until = kickoff - now.getTime();
    if (signal.kind === 'football_upcoming' && (until < 0 || until > 48 * 60 * 60_000)) continue;
    if (signal.kind === 'football_live' && (until > 0 || until < -3 * 60 * 60_000)) continue;
    candidates.push({
      id: 'football:' + signal.match.id, refId: signal.match.id,
      kind: 'football', title: clean(signal.title),
      detail: clean(signal.subtitle, 130), reason: clean(signal.reason, 120),
      actionLabel: 'Match details',
      score: signal.kind === 'football_live' ? 130 : until <= 3 * 60 * 60_000 ? 115 : 82,
    });
  }

  for (const show of input.episodes ?? []) {
    const last = show.latestEpisode;
    const lastDate = last?.airDate && /^\d{4}-\d{2}-\d{2}$/.test(last.airDate)
      ? new Date(last.airDate + 'T12:00:00') : null;
    const next = show.nextEpisode;
    const nextDate = next?.airDate && /^\d{4}-\d{2}-\d{2}$/.test(next.airDate)
      ? new Date(next.airDate + 'T12:00:00') : null;
    let detail = '', score = 0;
    if (lastDate && Number.isFinite(lastDate.getTime()) &&
      lastDate.getTime() <= now.getTime() && now.getTime() - lastDate.getTime() <= 7 * DAY) {
      detail = 'A new episode is listed as aired recently. Check your streaming service.';
      score = 90;
    } else if (nextDate && Number.isFinite(nextDate.getTime()) &&
      nextDate.getTime() >= now.getTime() && nextDate.getTime() - now.getTime() <= 2 * DAY) {
      detail = 'An episode is scheduled soon. Streaming availability may vary.';
      score = 72;
    }
    if (score) candidates.push({
      id: 'episode:' + show.tmdbId, refId: String(show.tmdbId), kind: 'episode',
      title: clean(show.showTitle), detail, reason: 'A series you follow.',
      actionLabel: 'Episode details', score,
    });
  }

  const next = input.dailyDecision;
  if (next && (next.source === 'calendar' || next.source === 'tasks' || next.source === 'events')) {
    candidates.push({
      id: 'priority:' + next.id, kind: 'priority', title: clean(next.title),
      detail: clean(next.guidance, 140), reason: clean(next.reason),
      actionLabel: next.actionLabel ?? 'See details',
      score: next.urgency === 'now' ? 110 : next.urgency === 'next' ? 65 : 35,
    });
  }
  const habit = (input.incompleteHabits ?? []).find(name => !!clean(name));
  if (habit) candidates.push({
    id: 'habit:' + localDay(now) + ':' + clean(habit),
    kind: 'habit', title: clean(habit),
    detail: 'A small step towards the goal you set for yourself.',
    reason: 'On your list for today, and not yet complete.',
    actionLabel: 'Open habits', score: 74,
  });

  // One of each kind. The dashboard should help decide, not become a second feed.
  const seen = new Set<TimeOpportunityKind>();
  return candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .filter(item => { if (seen.has(item.kind)) return false; seen.add(item.kind); return true; })
    .slice(0, 3);
}

export type TimelyReminder = {
  id: string; title: string; body: string; at: Date; kind: 'football' | 'episode';
};
const isQuiet = (date: Date) => date.getHours() >= 22 || date.getHours() < 8;

/** Only future, opt-in, low-frequency reminders from verified source dates.
 * Episode air dates are not proof of streaming availability.
 */
export function planTimelyReminders(
  input: Pick<TimeWellSpentInput, 'signals' | 'episodes'>,
  now = new Date(),
): TimelyReminder[] {
  const reminders: TimelyReminder[] = [];
  for (const signal of input.signals ?? []) {
    if (signal.kind !== 'football_upcoming') continue;
    const at = Date.parse(signal.match.date);
    if (!Number.isFinite(at) || at <= now.getTime()) continue;
    const notify = new Date(at - 45 * 60_000);
    if (notify.getTime() <= now.getTime() + 60_000 ||
      notify.getTime() - now.getTime() > 7 * DAY || isQuiet(notify)) continue;
    reminders.push({
      id: 'time-well-spent:football:' + signal.match.id,
      title: 'Match you follow is coming up',
      body: clean(signal.match.homeTeam + ' vs ' + signal.match.awayTeam + ' kicks off in 45 minutes.', 160),
      kind: 'football', at: notify,
    });
  }
  for (const show of input.episodes ?? []) {
    const day = show.nextEpisode?.airDate;
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const [year, month, date] = day.split('-').map(Number);
    const notify = new Date(year, month - 1, date, 18, 0, 0);
    if (notify.getTime() <= now.getTime() + 60_000 ||
      notify.getTime() - now.getTime() > 7 * DAY || !Number.isFinite(notify.getTime())) continue;
    reminders.push({
      id: 'time-well-spent:episode:' + show.tmdbId + ':' + day,
      title: 'Episode scheduled today',
      body: clean(show.showTitle + ' has an episode listed for today. Check your streaming provider.', 160),
      kind: 'episode', at: notify,
    });
  }
  const perDay = new Map<string, number>(), seen = new Set<string>();
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter(r => {
      const day = localDay(r.at), count = perDay.get(day) ?? 0;
      if (seen.has(r.id) || count >= 2) return false;
      seen.add(r.id); perDay.set(day, count + 1); return true;
    }).slice(0, 10);
}

export type TimeOutcome = 'opened' | 'acted' | 'not_useful';
export type AggregateMoment = { day: string; kind: TimeOpportunityKind; outcome: TimeOutcome; count: number };
export function summarizeTimeOutcomes(records: readonly AggregateMoment[], now = new Date(), days = 7) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  const selected = records.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.day) &&
    r.day >= localDay(start) && r.day <= localDay(now) &&
    Number.isInteger(r.count) && r.count > 0);
  const count = (outcome: TimeOutcome) => selected.filter(r => r.outcome === outcome)
    .reduce((sum, r) => sum + r.count, 0);
  return { opened: count('opened'), acted: count('acted'), notUseful: count('not_useful') };
}
