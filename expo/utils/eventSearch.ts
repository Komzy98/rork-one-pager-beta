import type { LocalEvent } from '@/types/events';

/** Re-rank provider results so title/artist matches surface first. */
export function rankEventsBySearchKeyword(events: LocalEvent[], keyword: string): LocalEvent[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return events;

  const score = (event: LocalEvent): number => {
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
  };

  return [...events].sort((a, b) => score(b) - score(a));
}

export function eventMatchesLocalSearch(event: LocalEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    event.title.toLowerCase().includes(q) ||
    event.venue.toLowerCase().includes(q) ||
    event.location.toLowerCase().includes(q) ||
    (event.description ?? '').toLowerCase().includes(q) ||
    (event.tags ?? []).some((t) => t.toLowerCase().includes(q))
  );
}
