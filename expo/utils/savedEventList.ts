import type { SavedEventSnapshot } from '@/types/events';

/** Idempotent snapshot update. Always apply against the latest profile, never a rendered list. */
export function addSavedEvent(
  snapshots: SavedEventSnapshot[],
  event: SavedEventSnapshot,
  limit = 50,
): SavedEventSnapshot[] {
  if (snapshots.some((snapshot) => snapshot.id === event.id)) return snapshots;
  return [event, ...snapshots].slice(0, limit);
}

/** Removing an already absent event does not reintroduce other saved events. */
export function removeSavedEvent(
  snapshots: SavedEventSnapshot[],
  eventId: string,
): SavedEventSnapshot[] {
  return snapshots.some((snapshot) => snapshot.id === eventId)
    ? snapshots.filter((snapshot) => snapshot.id !== eventId)
    : snapshots;
}
