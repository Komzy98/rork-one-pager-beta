import type { FriendEventSave } from '@/utils/sharedPlansService';

export interface EventFriendProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

function profileName(profile: EventFriendProfile): string {
  const name = profile.displayName?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  return 'Friend';
}

export function friendSaveToProfile(save: FriendEventSave): EventFriendProfile | null {
  if (!save.profile) return null;
  return {
    id: save.userId,
    displayName: save.profile.displayName?.trim() || save.profile.username,
    avatarUrl: save.profile.avatarUrl ?? null,
  };
}

export function groupFriendsByEventId(
  friendSaves: FriendEventSave[],
): Map<string, EventFriendProfile[]> {
  const map = new Map<string, EventFriendProfile[]>();
  const seenByEvent = new Map<string, Set<string>>();

  for (const save of friendSaves) {
    const profile = friendSaveToProfile(save);
    if (!profile) continue;

    const seen = seenByEvent.get(save.eventId) ?? new Set<string>();
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    seenByEvent.set(save.eventId, seen);

    const list = map.get(save.eventId) ?? [];
    list.push(profile);
    map.set(save.eventId, list);
  }

  return map;
}

export function getEventFriendProfiles(
  eventId: string,
  friendsByEventId?: Map<string, EventFriendProfile[]> | null,
): EventFriendProfile[] {
  return friendsByEventId?.get(eventId) ?? [];
}

export function formatFriendsGoingLabel(profiles: EventFriendProfile[]): string | null {
  if (profiles.length === 0) return null;
  const first = profileName(profiles[0]);
  if (profiles.length === 1) return `${first} is going`;
  if (profiles.length === 2) return `${first} and ${profileName(profiles[1])} are going`;
  return `${first} and ${profiles.length - 1} others are going`;
}
