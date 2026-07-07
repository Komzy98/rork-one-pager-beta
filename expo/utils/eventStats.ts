import type { SavedEventSnapshot } from '@/types/events';
import type { UserProfile } from '@/types/habit';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';

export interface EventStatsSummary {
  saved: number;
  attended: number;
  thisMonth: number;
}

export function getEventStatsSummary(
  profile: UserProfile | null | undefined,
  savedSnapshots: SavedEventSnapshot[]
): EventStatsSummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const thisMonth = savedSnapshots.filter((snapshot) => {
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
    return start != null && start.getTime() >= monthStart;
  }).length;

  return {
    saved: savedSnapshots.length,
    attended: 0,
    thisMonth,
  };
}
