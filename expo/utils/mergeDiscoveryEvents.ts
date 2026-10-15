import type { LocalEvent } from '@/types/events';
import { filterUpcomingEvents, sortEventsByStartDate } from '@/utils/eventDiscovery';

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupeKey(event: LocalEvent): string {
  return [
    normalizeKeyPart(event.title),
    normalizeKeyPart(event.venue),
    normalizeKeyPart(event.date),
  ].join('|');
}

/** Merge Ticketmaster + Skiddle (or other) lists, dedupe near-duplicates, cap size. */
export function mergeDiscoveryEvents(
  lists: LocalEvent[][],
  limit: number,
): LocalEvent[] {
  const seen = new Map<string, LocalEvent>();

  for (const list of lists) {
    for (const event of list) {
      const key = dedupeKey(event);
      if (!seen.has(key)) {
        seen.set(key, event);
      }
    }
  }

  return sortEventsByStartDate(filterUpcomingEvents([...seen.values()])).slice(
    0,
    Math.max(limit, 1),
  );
}

/** Keep a few verified listings from smaller providers visible instead of letting
 * the largest ticket platform occupy every slot in a time-sorted feed. */
export function mergeDiscoveryWithProviderDiversity(lists: LocalEvent[][], limit: number): LocalEvent[] {
  const pool = mergeDiscoveryEvents(lists, Math.max(limit * 10, 300));
  const selected = new Map<string, LocalEvent>();
  const reservedPerSource = Math.min(3, Math.max(1, Math.ceil(limit * 0.06)));
  for (const source of ['fienta', 'datathistle', 'ents24', 'meetup', 'fever', 'billetto']) {
    const matches = pool.filter(event => event.listingSource === source).slice(0, reservedPerSource);
    for (const event of matches) selected.set(event.id, event);
  }
  for (const event of pool) {
    if (selected.size >= limit) break;
    selected.set(event.id, event);
  }
  return sortEventsByStartDate([...selected.values()]).slice(0, Math.max(limit, 1));
}
