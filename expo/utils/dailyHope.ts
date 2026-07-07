import type { DailySummarySportsBeat } from '@/utils/dailySummary';
import type { JoySources, Show, UserProfile } from '@/types/habit';

export type DailyHopeKind =
  | 'sport'
  | 'show'
  | 'calendar'
  | 'weather'
  | 'book'
  | 'tv'
  | 'youtube'
  | 'game'
  | 'music'
  | 'podcast'
  | 'restaurant'
  | 'exercise'
  | 'interest';

export type DailyHopeCandidate = {
  id: string;
  headline: string;
  subline?: string;
  kind: DailyHopeKind;
  /** Higher = prefer when picking (live sport, new episode, etc.) */
  priority: number;
};

export type DailyHopeInput = {
  todayYmd: string;
  profile?: UserProfile | null;
  /** Manual + inferred joy graph */
  joySources?: JoySources;
  sportsBeats?: DailySummarySportsBeat[];
  newEpisodes?: { title: string; episodeLabel?: string }[];
  todayCalendar?: { title: string; timeLabel: string }[];
  weather?: { temp: number; condition: string; description: string };
  showsWatching?: Show[];
  /** Extra timed headlines (F1 qualifying, UFC main card, etc.) */
  timedHeadlines?: { headline: string; priority?: number; kind?: DailyHopeKind }[];
};

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase();
}

function titlesMatch(a: string, b: string): boolean {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  return x === y || x.includes(y) || y.includes(x);
}

function hashPick<T>(items: T[], seed: string): T | null {
  if (items.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length] ?? null;
}

function addJoySourceCandidates(candidates: DailyHopeCandidate[], joy: JoySources | undefined): void {
  if (!joy) return;

  for (const show of joy.tvShows ?? []) {
    candidates.push({
      id: `joy-tv-${show}`,
      headline: `A new episode of ${show} might be waiting`,
      kind: 'tv',
      priority: 45,
    });
  }

  for (const creator of joy.youtubers ?? []) {
    candidates.push({
      id: `joy-yt-${creator}`,
      headline: `${creator} may have uploaded something new today`,
      kind: 'youtube',
      priority: 42,
    });
  }

  for (const game of joy.games ?? []) {
    candidates.push({
      id: `joy-game-${game}`,
      headline: `${game} is there whenever you need an escape`,
      kind: 'game',
      priority: 38,
    });
  }

  for (const artist of joy.music ?? []) {
    candidates.push({
      id: `joy-music-${artist}`,
      headline: `Put on ${artist} — you deserve a moment`,
      kind: 'music',
      priority: 36,
    });
  }

  for (const podcast of joy.podcasts ?? []) {
    candidates.push({
      id: `joy-pod-${podcast}`,
      headline: `A new ${podcast} episode could be worth a listen`,
      kind: 'podcast',
      priority: 40,
    });
  }

  for (const place of joy.restaurants ?? []) {
    candidates.push({
      id: `joy-food-${place}`,
      headline: `${place} is a small treat worth looking forward to`,
      kind: 'restaurant',
      priority: 34,
    });
  }

  for (const exercise of joy.exerciseTypes ?? []) {
    candidates.push({
      id: `joy-move-${exercise}`,
      headline: `You usually feel better after ${exercise}`,
      kind: 'exercise',
      priority: 44,
    });
  }
}

export function buildDailyHopeCandidates(input: DailyHopeInput): DailyHopeCandidate[] {
  const candidates: DailyHopeCandidate[] = [];
  const matchedShows = new Set<string>();

  for (const beat of input.sportsBeats ?? []) {
    const isLive = beat.kind === 'live_now';
    candidates.push({
      id: `sport-${beat.headline}`,
      headline: beat.headline,
      subline: beat.whenLabel ? `(${beat.whenLabel})` : undefined,
      kind: 'sport',
      priority: isLive ? 95 : beat.kind === 'match_today' ? 88 : 72,
    });
  }

  for (const timed of input.timedHeadlines ?? []) {
    candidates.push({
      id: `timed-${timed.headline}`,
      headline: timed.headline,
      kind: timed.kind ?? 'sport',
      priority: timed.priority ?? 90,
    });
  }

  for (const ep of input.newEpisodes ?? []) {
    matchedShows.add(normalizeTitle(ep.title));
    candidates.push({
      id: `show-ep-${ep.title}`,
      headline: ep.episodeLabel
        ? `A new episode of ${ep.title} — ${ep.episodeLabel}`
        : `Something new from ${ep.title} dropped today`,
      kind: 'show',
      priority: 92,
    });
  }

  for (const show of input.showsWatching ?? []) {
    if (show.status !== 'Watching' || !show.title?.trim()) continue;
    if (matchedShows.has(normalizeTitle(show.title))) continue;
    candidates.push({
      id: `watching-${show.title}`,
      headline: `${show.title} is waiting whenever you need an escape`,
      kind: 'show',
      priority: 50,
    });
  }

  const joy = input.joySources;
  if (joy?.tvShows) {
    for (const show of joy.tvShows) {
      if ([...(input.newEpisodes ?? [])].some((ep) => titlesMatch(ep.title, show))) continue;
    }
  }
  addJoySourceCandidates(candidates, joy);

  for (const ev of input.todayCalendar ?? []) {
    candidates.push({
      id: `cal-${ev.title}`,
      headline: ev.timeLabel ? `${ev.title} at ${ev.timeLabel}` : ev.title,
      kind: 'calendar',
      priority: 70,
    });
  }

  const books = input.profile?.favoriteBooks?.filter((b) => b.status === 'Reading') ?? [];
  for (const book of books.slice(0, 2)) {
    const pagesLeft =
      book.totalPages && book.currentPage
        ? Math.max(0, book.totalPages - book.currentPage)
        : null;
    candidates.push({
      id: `book-${book.id}`,
      headline: pagesLeft
        ? `${book.title} — ${pagesLeft} pages left`
        : `Pick up ${book.title} when you're ready`,
      kind: 'book',
      priority: 48,
    });
  }

  const weather = input.weather;
  if (weather && weather.temp >= 14 && !weather.condition.toLowerCase().includes('rain')) {
    candidates.push({
      id: 'weather-nice',
      headline: `It's ${weather.temp}° and ${weather.description || 'decent'} — good for ten minutes outside`,
      kind: 'weather',
      priority: 55,
    });
  }

  return candidates;
}

/** Pick one hope item — weighted toward high-priority live/timed joy, stable per day. */
export function pickDailyHope(candidates: DailyHopeCandidate[], todayYmd: string): DailyHopeCandidate | null {
  if (candidates.length === 0) return null;

  const topPriority = Math.max(...candidates.map((c) => c.priority));
  const tier = candidates.filter((c) => c.priority >= topPriority - 8);
  const pool = tier.length > 0 ? tier : candidates;

  return hashPick(pool, todayYmd);
}

export function formatDailyHopeHeadline(candidate: DailyHopeCandidate | null): string | null {
  if (!candidate) return null;
  if (candidate.subline) {
    return `${candidate.headline} ${candidate.subline}`;
  }
  return candidate.headline;
}
