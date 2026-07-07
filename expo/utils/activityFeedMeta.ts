import type { ActivityEvent, ActivityType } from '@/utils/activityService';

export type ActivityFeedCategory =
  | 'going_out'
  | 'watching'
  | 'streaks'
  | 'tasks_done'
  | 'other';

const CATEGORY_LABELS: Record<ActivityFeedCategory, string> = {
  going_out: 'Going out',
  watching: 'Watching',
  streaks: 'Streaks',
  tasks_done: 'Tasks done',
  other: 'Updates',
};

const TYPE_TO_CATEGORY: Record<string, ActivityFeedCategory> = {
  event_saved: 'going_out',
  event_planned: 'going_out',
  event_attending: 'going_out',
  match_pinned: 'watching',
  show_saved: 'watching',
  streak_milestone: 'streaks',
  published_habit: 'tasks_done',
  workout: 'tasks_done',
  custom: 'tasks_done',
  achievement: 'streaks',
  challenge_joined: 'other',
};

export function getActivityFeedCategory(type: ActivityType | string): ActivityFeedCategory {
  return TYPE_TO_CATEGORY[type] ?? 'other';
}

export function getActivityFeedCategoryLabel(category: ActivityFeedCategory): string {
  return CATEGORY_LABELS[category];
}

export interface GroupedActivityFeed {
  category: ActivityFeedCategory;
  label: string;
  events: ActivityEvent[];
}

const CATEGORY_ORDER: ActivityFeedCategory[] = [
  'going_out',
  'watching',
  'streaks',
  'tasks_done',
  'other',
];

export function groupActivityFeed(events: ActivityEvent[], maxPerGroup = 3): GroupedActivityFeed[] {
  const buckets = new Map<ActivityFeedCategory, ActivityEvent[]>();

  for (const event of events) {
    const category = getActivityFeedCategory(event.type);
    const list = buckets.get(category) ?? [];
    list.push(event);
    buckets.set(category, list);
  }

  return CATEGORY_ORDER.filter((category) => (buckets.get(category)?.length ?? 0) > 0).map(
    (category) => ({
      category,
      label: getActivityFeedCategoryLabel(category),
      events: (buckets.get(category) ?? []).slice(0, maxPerGroup),
    })
  );
}

/** Deep-link or in-app route for tapping a partner activity card. */
export function getActivityEventRoute(event: ActivityEvent): string | null {
  const meta = event.metadata ?? {};
  if (typeof meta.eventId === 'string') {
    return `/(root)/event/${meta.eventId}`;
  }
  if (typeof meta.matchId === 'string') {
    return '/(tabs)/sports';
  }
  if (typeof meta.showId === 'string' || typeof meta.tmdbId === 'number') {
    return '/(tabs)/shows';
  }
  if (typeof meta.habitId === 'string') {
    return `/(root)/habit/${meta.habitId}`;
  }
  return null;
}
