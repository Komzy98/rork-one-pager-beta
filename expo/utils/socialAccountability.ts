import type { ActivityEvent, ActivityType } from '@/utils/activityService';
import type { SocialProfile } from '@/utils/friendsService';
import { shouldIncludeInActiveToday } from '@/utils/socialPrivacy';
import { getTodayFormatted } from '@/utils/dateUtils';

export const SOCIAL_LAST_SEEN_KEY = 'social_last_seen_at';

export type ActivityRowActionKind =
  | 'rsvp_join'
  | 'open_event'
  | 'nudge_back'
  | 'view_habits'
  | 'open_habit'
  | 'cheer'
  | 'open_sports'
  | 'open_shows'
  | 'view_partners';

export interface ActivityRowAction {
  kind: ActivityRowActionKind;
  label: string;
}

export interface PartnerAtRisk {
  profile: SocialProfile;
  reason: string;
}

export interface CircleProgress {
  activeToday: number;
  totalPartners: number;
  ratio: number;
  label: string;
}

export interface HabitGapMotivation {
  partnerName: string;
  remaining: number;
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === getTodayFormatted();
}

function partnerName(profile: SocialProfile): string {
  return profile.displayName?.trim() || profile.username?.trim() || 'Partner';
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

/** Count partner feed items newer than last seen (excludes own posts). */
export function countUnreadActivitySince(
  feed: ActivityEvent[],
  lastSeenIso: string | null,
  currentUserId?: string,
): number {
  if (!lastSeenIso) {
    return feed.filter((event) => !currentUserId || event.userId !== currentUserId).length;
  }
  const lastSeen = new Date(lastSeenIso).getTime();
  return feed.filter((event) => {
    if (currentUserId && event.userId === currentUserId) return false;
    return new Date(event.createdAt).getTime() > lastSeen;
  }).length;
}

/** Unread cheers on your own activity since last visit. */
export function countUnreadCheersSince(
  feed: ActivityEvent[],
  lastSeenIso: string | null,
  currentUserId?: string,
): number {
  if (!currentUserId) return 0;
  const lastSeen = lastSeenIso ? new Date(lastSeenIso).getTime() : 0;
  return feed.filter((event) => {
    if (event.userId !== currentUserId) return false;
    if (event.cheersCount <= 0) return false;
    return new Date(event.createdAt).getTime() > lastSeen || !lastSeenIso;
  }).length;
}

export function getCircleProgress(
  friends: SocialProfile[],
  activeTodayCount: number,
): CircleProgress {
  const visiblePartners = friends.filter((friend) => shouldIncludeInActiveToday(friend));
  const totalPartners = visiblePartners.length;
  if (totalPartners === 0) {
    return {
      activeToday: 0,
      totalPartners: friends.length,
      ratio: 0,
      label: friends.length === 0 ? 'Add partners to start' : 'Presence hidden for partners',
    };
  }
  const ratio = Math.min(1, activeTodayCount / totalPartners);
  const label =
    activeTodayCount === totalPartners
      ? 'Everyone checked in today'
      : `${activeTodayCount} of ${totalPartners} partners active today`;
  return { activeToday: activeTodayCount, totalPartners, ratio, label };
}

/** Partners with a streak who haven't been active today. */
export function derivePartnersAtRisk(
  friends: SocialProfile[],
  activeTodayCount: number,
  feed: ActivityEvent[],
): PartnerAtRisk[] {
  if (friends.length === 0) return [];

  const activeUserIds = new Set<string>();
  for (const event of feed) {
    if (event.type === 'workout' && isToday(event.createdAt)) {
      activeUserIds.add(event.userId);
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  return friends
    .filter((friend) => {
      if (!shouldIncludeInActiveToday(friend)) return false;
      if (friend.currentStreak < 2) return false;
      if (activeUserIds.has(friend.id)) return false;
      const lastActive = new Date(friend.lastActiveAt).getTime();
      return lastActive < startMs;
    })
    .slice(0, 3)
    .map((profile) => ({
      profile,
      reason:
        profile.currentStreak >= 7
          ? `${profile.currentStreak}-day streak at risk`
          : 'Has not checked in today',
    }));
}

export function getHabitGapMotivation(
  myCompleted: number,
  myTotal: number,
  feed: ActivityEvent[],
): HabitGapMotivation | null {
  if (myTotal <= 0 || myCompleted >= myTotal) return null;

  const partnerWorkout = feed.find(
    (event) => event.type === 'workout' && isToday(event.createdAt) && event.author,
  );
  if (!partnerWorkout?.author) return null;

  const name = firstName(
    partnerWorkout.author.displayName?.trim() ||
      partnerWorkout.author.username?.trim() ||
      'your partner',
  );

  return {
    partnerName: name,
    remaining: Math.max(1, myTotal - myCompleted),
  };
}

/** Action-oriented headline for accountability rows. */
export function formatActionOrientedHeadline(event: ActivityEvent): {
  line: string;
  detail: string | null;
} {
  const name = firstName(
    event.author?.displayName?.trim() || event.author?.username?.trim() || 'Partner',
  );
  const subject = event.title
    .replace(/^(Saved|Planned|Pinned|Published|Logged|Joined|Hit|Completed)\s+/i, '')
    .replace(/\s*[-–|]\s*.+$/, '')
    .trim();

  switch (event.type as ActivityType) {
    case 'event_attending':
      return {
        line: `${name} is going — join?`,
        detail: subject || event.body,
      };
    case 'event_saved':
    case 'event_planned':
      return {
        line: `${name} saved ${subject || 'an event'}`,
        detail: event.body?.trim() || 'Tap Join to RSVP together',
      };
    case 'workout':
      return {
        line: `${name} completed a habit today`,
        detail: subject || event.body,
      };
    case 'streak_milestone':
      return {
        line: `${name} hit ${subject || 'a streak milestone'}`,
        detail: event.body,
      };
    case 'match_pinned':
      return {
        line: `${name} pinned a match`,
        detail: subject || event.body,
      };
    case 'show_saved':
      return {
        line: `${name} queued ${subject || 'something to watch'}`,
        detail: event.body,
      };
    default:
      return {
        line: subject ? `${name} — ${subject}` : `${name} shared an update`,
        detail: event.body,
      };
  }
}

export function getActivityRowAction(event: ActivityEvent): ActivityRowAction {
  const meta = event.metadata ?? {};

  switch (event.type as ActivityType) {
    case 'event_saved':
    case 'event_planned':
      return typeof meta.eventId === 'string'
        ? { kind: 'rsvp_join', label: 'Join' }
        : { kind: 'open_event', label: 'View' };
    case 'event_attending':
      return { kind: 'rsvp_join', label: 'Join' };
    case 'workout':
    case 'published_habit':
      return typeof meta.habitId === 'string'
        ? { kind: 'open_habit', label: 'View' }
        : { kind: 'view_habits', label: 'Habits' };
    case 'streak_milestone':
      return { kind: 'nudge_back', label: 'Celebrate' };
    case 'match_pinned':
      return { kind: 'open_sports', label: 'Sports' };
    case 'show_saved':
      return { kind: 'open_shows', label: 'Shows' };
    default:
      return event.cheeredByMe
        ? { kind: 'cheer', label: 'Cheered' }
        : { kind: 'cheer', label: 'Cheer' };
  }
}

export function getEventIdFromActivity(event: ActivityEvent): string | null {
  const eventId = event.metadata?.eventId;
  return typeof eventId === 'string' ? eventId : null;
}
