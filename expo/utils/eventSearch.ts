import type { LocalEvent } from '@/types/events';

function textMatchScore(event: LocalEvent, q: string): number {
  const title = event.title.toLowerCase();
  const venue = event.venue.toLowerCase();
  const location = event.location.toLowerCase();
  const description = (event.description ?? '').toLowerCase();
  const tags = (event.tags ?? []).join(' ').toLowerCase();

  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (tags.includes(q)) return 45;
  if (description.includes(q)) return 35;
  if (venue.includes(q) || location.includes(q)) return 25;

  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 1 && tokens.every((t) => title.includes(t) || description.includes(t))) {
    return 50;
  }
  return 10;
}

function distanceBoostKm(km: number | undefined): number {
  if (km == null || !Number.isFinite(km)) return 0;
  if (km <= 80) return 36;
  if (km <= 200) return 22;
  if (km <= 500) return 12;
  if (km <= 1200) return 4;
  return 0;
}

/** Re-rank provider results so title/artist matches surface first. */
export function rankEventsBySearchKeyword(events: LocalEvent[], keyword: string): LocalEvent[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return events;

  return [...events].sort((a, b) => textMatchScore(b, q) - textMatchScore(a, q));
}

/**
 * Worldwide search: strong text match first, then prefer dates near the user (tour legs),
 * then nearer distance — without hiding far-away shows (Bill Burr / Romesh UK + US).
 */
export function rankGlobalSearchResults(
  events: LocalEvent[],
  keyword: string,
  coords?: { latitude: number; longitude: number },
): LocalEvent[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return events;

  const scored = events.map((event) => {
    const text = textMatchScore(event, q);
    const distBoost = coords ? distanceBoostKm(event.distanceKm) : 0;
    return { event, score: text + distBoost };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.event.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.event.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    const ta = a.event.startIso ?? a.event.date ?? '';
    const tb = b.event.startIso ?? b.event.date ?? '';
    return ta.localeCompare(tb);
  });

  return scored.map((s) => s.event);
}

function eventSearchHaystack(event: LocalEvent): string {
  return [
    event.title,
    event.venue,
    event.location,
    event.description ?? '',
    ...(event.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export function eventMatchesLocalSearch(event: LocalEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = eventSearchHaystack(event);
  if (haystack.includes(q)) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 1) {
    return tokens.every((t) => haystack.includes(t));
  }
  return false;
}
