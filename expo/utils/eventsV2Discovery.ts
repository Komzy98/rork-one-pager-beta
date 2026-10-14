import type { LocalEvent } from '@/types/events';

/** Listings are distinct by their event, venue and actual start, not provider ID. */
function keyForEvent(event: LocalEvent): string {
  const words = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const start = event.startIso && !Number.isNaN(Date.parse(event.startIso))
    ? new Date(event.startIso).toISOString().slice(0, 16)
    : words(event.date + ' ' + event.time);
  return [words(event.title), words(event.venue), start].join('|');
}

export function isPastListing(event: LocalEvent, now = Date.now()): boolean {
  // Don't infer dates from ambiguous display labels: only trustworthy timestamps.
  if (!event.startIso) return false;
  const at = Date.parse(event.startIso);
  return Number.isFinite(at) && at < now - 6 * 60 * 60 * 1000;
}

export function curateDiscoveryEvents(events: LocalEvent[], now = Date.now()): LocalEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (!event.title?.trim() || isPastListing(event, now)) return false;
    const key = keyForEvent(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isAffordableEvent(event: LocalEvent, maxPounds = 20): boolean {
  const label = event.price?.trim() ?? '';
  if (/\bfree\b/i.test(label)) return true;
  // A vague "from" price is still useful as a filter, but not a total-cost guarantee.
  const amount = label.match(/£\s*(\d+(?:\.\d{1,2})?)/);
  return Boolean(amount && Number(amount[1]) <= maxPounds);
}

export function isWeekendEvent(event: LocalEvent, now = new Date()): boolean {
  if (!event.startIso) return false;
  const start = new Date(event.startIso);
  if (Number.isNaN(start.getTime())) return false;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = date.getDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const friday = new Date(date);
  friday.setDate(date.getDate() + daysUntilFriday);
  const monday = new Date(friday);
  monday.setDate(friday.getDate() + 3);
  return start >= now && start >= friday && start < monday;
}
