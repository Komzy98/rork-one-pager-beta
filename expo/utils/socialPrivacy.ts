import type { ActivityType } from '@/utils/activityService';
import type { SocialProfile } from '@/utils/friendsService';

export interface SocialPrivacyPreferences {
  /** Only streak/leaderboard stats — no activity feed or saves. */
  shareStreakOnly?: boolean;
  /** Event plans/RSVPs only — no habit, show, or sports activity. */
  shareEventsOnly?: boolean;
  /** Habit activity uses generic “checked in” copy only. */
  shareHabitsGeneric?: boolean;
  /** Partners cannot see precise last-active / presence signals. */
  hideLastActive?: boolean;
  /** Decline incoming partner nudges and pings. */
  blockNudges?: boolean;
}

const EVENT_ACTIVITY_TYPES = new Set<ActivityType>([
  'event_saved',
  'event_planned',
  'event_attending',
]);

const HABIT_ACTIVITY_TYPES = new Set<ActivityType>(['workout', 'published_habit']);

export function shouldPublishActivityType(
  type: ActivityType,
  privacy?: SocialPrivacyPreferences | null,
): boolean {
  if (!privacy) return true;
  if (privacy.shareStreakOnly) return false;
  if (privacy.shareEventsOnly) {
    return EVENT_ACTIVITY_TYPES.has(type);
  }
  return true;
}

export function shouldPublishEventSaves(privacy?: SocialPrivacyPreferences | null): boolean {
  if (!privacy) return true;
  return !privacy.shareStreakOnly;
}

export function shouldForceGenericHabits(
  privacy?: SocialPrivacyPreferences | null,
  displayGeneric?: boolean,
): boolean {
  if (privacy?.shareHabitsGeneric) return true;
  return displayGeneric ?? true;
}

export function isPresenceHidden(profile: Pick<SocialProfile, 'hideLastActive'>): boolean {
  return profile.hideLastActive === true;
}

export function partnerPresenceLabel(
  profile: Pick<SocialProfile, 'lastActiveAt' | 'hideLastActive'>,
): { label: string; color: string } | null {
  if (isPresenceHidden(profile)) {
    return { label: 'Presence hidden', color: '#8E8E93' };
  }
  const diffMin = (Date.now() - new Date(profile.lastActiveAt).getTime()) / 60000;
  if (diffMin < 5) return { label: 'Online', color: '#34C759' };
  if (diffMin < 60) return { label: 'Away', color: '#FF9500' };
  return { label: 'Offline', color: '#8E8E93' };
}

export function shouldIncludeInActiveToday(profile: Pick<SocialProfile, 'hideLastActive'>): boolean {
  return !isPresenceHidden(profile);
}

export const SOCIAL_PRIVACY_DEFAULTS: Required<SocialPrivacyPreferences> = {
  shareStreakOnly: false,
  shareEventsOnly: false,
  shareHabitsGeneric: true,
  hideLastActive: false,
  blockNudges: false,
};

export function mergeSocialPrivacy(
  current?: SocialPrivacyPreferences | null,
): Required<SocialPrivacyPreferences> {
  return { ...SOCIAL_PRIVACY_DEFAULTS, ...current };
}
