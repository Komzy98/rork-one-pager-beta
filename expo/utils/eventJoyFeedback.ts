import type { SavedEventSnapshot } from '@/types/events';
import type { JoySources } from '@/types/habit';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import { patchJoySourceField, type JoySourceKey } from '@/utils/joySources';

export type EventFeedbackRating = 1 | 2 | 3 | 4 | 5;

const POST_EVENT_FEEDBACK_DELAY_MS = 2 * 60 * 60 * 1000;

export function getEventsNeedingFeedback(
  snapshots: SavedEventSnapshot[],
  now = Date.now(),
): SavedEventSnapshot[] {
  return snapshots
    .filter((snapshot) => {
      if (snapshot.feedbackRating != null || snapshot.feedbackDismissedAt) return false;
      const start = parseEventStartDateTime({
        id: snapshot.id,
        title: snapshot.title,
        venue: snapshot.venueName,
        location: snapshot.city ?? snapshot.address ?? '',
        date: snapshot.dateLabel ?? '',
        time: snapshot.timeLabel ?? '',
        category: snapshot.category,
        price: snapshot.priceLabel ?? '',
        image: snapshot.imageUrl ?? '',
        isSaved: true,
        attendees: 0,
        rating: 0,
        tags: snapshot.tags ?? [],
        description: snapshot.description ?? '',
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        startIso: snapshot.startAt,
      });
      if (!start) return false;
      return now > start.getTime() + POST_EVENT_FEEDBACK_DELAY_MS;
    })
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}

function extractJoyLabel(snapshot: SavedEventSnapshot): string | null {
  const tag = snapshot.tags?.find((value) => value.trim().length > 2);
  if (tag) return tag.trim();
  const title = snapshot.title.trim();
  if (!title) return null;
  return title.length <= 60 ? title : `${title.slice(0, 57)}…`;
}

function categoryToJoyKey(category: string): JoySourceKey | null {
  switch (category) {
    case 'music':
      return 'music';
    case 'comedy':
      return 'podcasts';
    case 'sports':
      return 'games';
    case 'food':
      return 'restaurants';
    case 'theatre':
    case 'arts':
      return 'tvShows';
    default:
      return null;
  }
}

export function inferJoyPatchesFromSavedEvent(
  snapshot: SavedEventSnapshot,
  rating: EventFeedbackRating,
): Partial<Record<JoySourceKey, string[]>> | null {
  if (rating < 4) return null;
  const key = categoryToJoyKey(snapshot.category);
  const label = extractJoyLabel(snapshot);
  if (!key || !label) return null;
  return { [key]: [label] };
}

export function applyJoyPatches(
  current: JoySources | undefined,
  patches: Partial<Record<JoySourceKey, string[]>>,
): JoySources {
  let next: JoySources = { ...(current ?? {}) };
  for (const [rawKey, values] of Object.entries(patches)) {
    const key = rawKey as JoySourceKey;
    const existing = next[key] ?? [];
    next = patchJoySourceField(next, key, [...existing, ...(values ?? [])]);
  }
  return next;
}
