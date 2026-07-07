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

const ACTIVITY_VERBS: Partial<Record<ActivityType, string>> = {
  event_saved: 'saved',
  event_planned: 'planned',
  event_attending: 'is going to',
  match_pinned: 'pinned',
  show_saved: 'saved',
  streak_milestone: 'hit',
  published_habit: 'published',
  workout: 'logged',
  custom: 'shared',
  achievement: 'earned',
  challenge_joined: 'joined',
};

export function formatActivityTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function partnerFirstName(event: ActivityEvent): string {
  const display = event.author?.displayName?.trim();
  if (display) {
    const first = display.split(/\s+/)[0];
    if (first) return first;
  }
  const username = event.author?.username?.replace(/^@/, '').trim();
  return username || 'Partner';
}

function stripActivityTitlePrefix(title: string): string {
  return title
    .replace(/^(Saved|Planned|Pinned|Published|Logged|Joined|Hit)\s+/i, '')
    .replace(/\s*[-–|]\s*.+$/, '')
    .trim();
}

/** One-line social headline for compact partner activity rows. */
export function formatPartnerActivityHeadline(event: ActivityEvent): {
  line: string;
  detail: string | null;
} {
  const verb = ACTIVITY_VERBS[event.type] ?? 'updated';
  const name = partnerFirstName(event);
  const subject = stripActivityTitlePrefix(event.title);
  const line = subject ? `${name} ${verb} ${subject}` : `${name} ${verb}`;
  const detail = event.body?.trim() || null;
  return { line, detail };
}

export function partnerActivityInitials(event: ActivityEvent): string {
  const display = event.author?.displayName?.trim();
  const username = event.author?.username?.trim() ?? '?';
  if (display) {
    const parts = display.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return display.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export interface ActivityCategoryVisual {
  tint: string;
  background: string;
}

const CATEGORY_VISUALS: Record<ActivityFeedCategory, ActivityCategoryVisual> = {
  going_out: { tint: '#E84393', background: '#E8439318' },
  watching: { tint: '#6C5CE7', background: '#6C5CE718' },
  streaks: { tint: '#F59E0B', background: '#F59E0B18' },
  tasks_done: { tint: '#22C55E', background: '#22C55E18' },
  other: { tint: '#0A84FF', background: '#0A84FF18' },
};

export function getActivityCategoryVisual(type: ActivityType | string): ActivityCategoryVisual {
  return CATEGORY_VISUALS[getActivityFeedCategory(type)];
}

/** Dashboard preview: partners only, newest first, capped. */
export function selectPartnerActivityPreview(
  events: ActivityEvent[],
  options: { currentUserId?: string; limit?: number } = {},
): ActivityEvent[] {
  const { currentUserId, limit = 4 } = options;
  return events
    .filter((event) => !currentUserId || event.userId !== currentUserId)
    .slice(0, limit);
}
