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
