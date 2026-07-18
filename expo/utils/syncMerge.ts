import { mergeJoySourcesForSync } from '@/utils/joySources';
import { mergeTabVisitCounts } from '@/utils/tabUsage';
import type { Habit, RecoveryWellbeingLog, UserProfile, UserTeam } from '@/types/habit';
import type { SavedEventSnapshot } from '@/types/events';
import type { Task, TaskProject, TaskTimeEntry } from '@/types/task';

export function parseRecordTimestamp(
  item: { updatedAt?: string; createdAt?: string } | null | undefined
): number {
  if (!item) return 0;
  const updated = item.updatedAt ? Date.parse(item.updatedAt) : NaN;
  const created = item.createdAt ? Date.parse(item.createdAt) : NaN;
  const t = Number.isFinite(updated) ? updated : created;
  return Number.isFinite(t) ? t : 0;
}

/** Union completion maps — never drop a day marked complete on either copy. */
export function mergeCompletionMaps(
  a?: Record<string, boolean>,
  b?: Record<string, boolean>
): Record<string, boolean> {
  const merged: Record<string, boolean> = {};
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    if (a?.[key] || b?.[key]) merged[key] = true;
  }
  return merged;
}

export function mergeRecordsById<T extends { id?: string; updatedAt?: string; createdAt?: string }>(
  localItems: T[],
  cloudItems: T[]
): T[] {
  const byId = new Map<string, T>();
  const localWithoutId: T[] = [];
  const cloudWithoutId: T[] = [];

  for (const item of cloudItems) {
    const id = item?.id;
    if (!id) {
      cloudWithoutId.push(item);
      continue;
    }
    byId.set(String(id), item);
  }

  for (const item of localItems) {
    const id = item?.id;
    if (!id) {
      localWithoutId.push(item);
      continue;
    }
    const key = String(id);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, item);
      continue;
    }
    const localTs = parseRecordTimestamp(item);
    const cloudTs = parseRecordTimestamp(existing);
    byId.set(key, localTs >= cloudTs ? item : existing);
  }

  return [...byId.values(), ...cloudWithoutId, ...localWithoutId];
}

export function mergeTasksFromCloud(local: Task[], cloud: Task[]): Task[] {
  const merged = mergeRecordsById(local, cloud);
  const localById = new Map(local.map((t) => [t.id, t]));
  const cloudById = new Map(cloud.map((t) => [t.id, t]));

  return merged.map((task) => {
    const localTask = localById.get(task.id);
    const cloudTask = cloudById.get(task.id);
    if (!localTask || !cloudTask) return task;
    if (!localTask.isHabit && !cloudTask.isHabit) return task;

    const habitCompletions = mergeCompletionMaps(
      cloudTask.habitCompletions,
      localTask.habitCompletions
    );
    if (
      JSON.stringify(habitCompletions) === JSON.stringify(task.habitCompletions ?? {})
    ) {
      return task;
    }
    return { ...task, habitCompletions };
  });
}

export function mergeHabitsFromCloud(local: Habit[], cloud: Habit[]): Habit[] {
  const merged = mergeRecordsById(local, cloud);
  const localById = new Map(local.map((h) => [h.id, h]));
  const cloudById = new Map(cloud.map((h) => [h.id, h]));

  return merged.map((habit) => {
    const localHabit = localById.get(habit.id);
    const cloudHabit = cloudById.get(habit.id);
    if (!localHabit || !cloudHabit) return habit;

    const completions = mergeCompletionMaps(cloudHabit.completions, localHabit.completions);
    if (JSON.stringify(completions) === JSON.stringify(habit.completions ?? {})) {
      return habit;
    }
    return { ...habit, completions };
  });
}

/** Returns merged tasks, or null if cloud should not overwrite local (empty cloud + local data). */
export function resolveTasksAfterCloudSync(
  cloudTasks: unknown,
  localTasks: Task[] | undefined
): Task[] | null {
  if (!Array.isArray(cloudTasks)) return null;
  const local = localTasks ?? [];
  if (cloudTasks.length === 0) {
    return local.length > 0 ? null : [];
  }
  if (local.length === 0) return cloudTasks as Task[];
  return mergeTasksFromCloud(local, cloudTasks as Task[]);
}

export function resolveHabitsAfterCloudSync(
  cloudHabits: unknown,
  localHabits: Habit[] | undefined
): Habit[] | null {
  if (!Array.isArray(cloudHabits)) return null;
  const local = localHabits ?? [];
  if (cloudHabits.length === 0) {
    return local.length > 0 ? null : [];
  }
  if (local.length === 0) return cloudHabits as Habit[];
  return mergeHabitsFromCloud(local, cloudHabits as Habit[]);
}

function mergeTeamsById(a: UserTeam[] = [], b: UserTeam[] = []): UserTeam[] {
  return mergeRecordsById(a, b) as UserTeam[];
}

function unionStrings(a: string[] = [], b: string[] = []): string[] {
  return [...new Set([...a, ...b])];
}

function mergeWellbeingLogs(
  a: RecoveryWellbeingLog[] = [],
  b: RecoveryWellbeingLog[] = []
): RecoveryWellbeingLog[] {
  const byDate = new Map<string, RecoveryWellbeingLog>();
  for (const log of [...a, ...b]) {
    const prev = byDate.get(log.date);
    byDate.set(log.date, prev ? { ...prev, ...log } : log);
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
}

function isPlaceholderDisplayName(name: string | undefined): boolean {
  const n = (name ?? '').trim();
  return n === 'Guest User' || n === 'Guest' || n.length === 0;
}

export type ProfileSessionContext = {
  userId: string;
  email: string;
  displayName: string;
};

/** Align stored profile identity with the signed-in session (guest → account). */
export function reconcileProfileWithSession(
  parsed: UserProfile,
  ctx: ProfileSessionContext
): UserProfile {
  const rawName = typeof parsed.name === 'string' ? parsed.name : '';
  const dn = ctx.displayName.trim();
  const authNameOk = dn.length > 0 && !isPlaceholderDisplayName(dn);

  let name = rawName;
  if (isPlaceholderDisplayName(rawName)) {
    if (authNameOk) {
      name = dn;
    } else if (ctx.email && !ctx.email.toLowerCase().startsWith('guest@')) {
      const local = ctx.email.split('@')[0] ?? '';
      name =
        local.length > 0 ? local.charAt(0).toUpperCase() + local.slice(1) : 'there';
    }
  }

  return {
    ...parsed,
    id: ctx.userId,
    email: ctx.email,
    name,
  };
}

export function mergeProfilesFromCloud(
  local: UserProfile | null | undefined,
  cloud: UserProfile | null | undefined,
  session: ProfileSessionContext
): UserProfile | null {
  if (!local && !cloud) return null;
  if (!local && cloud) {
    return reconcileProfileWithSession(cloud, session);
  }
  if (local && !cloud) {
    return reconcileProfileWithSession(local, session);
  }

  const localProfile = local!;
  const cloudProfile = cloud!;
  const localTs =
    parseRecordTimestamp(localProfile as { updatedAt?: string; createdAt?: string }) ||
    Date.parse(localProfile.lastLoginAt || localProfile.createdAt || '') ||
    0;
  const cloudTs =
    parseRecordTimestamp(cloudProfile as { updatedAt?: string; createdAt?: string }) ||
    Date.parse(cloudProfile.lastLoginAt || cloudProfile.createdAt || '') ||
    0;
  const newer = localTs >= cloudTs ? localProfile : cloudProfile;
  const older = localTs >= cloudTs ? cloudProfile : localProfile;

  const merged: UserProfile = {
    ...older,
    ...newer,
    favoriteTeams: mergeTeamsById(older.favoriteTeams, newer.favoriteTeams),
    favoriteNBATeams: mergeRecordsById(
      older.favoriteNBATeams ?? [],
      newer.favoriteNBATeams ?? []
    ) as UserProfile['favoriteNBATeams'],
    favoriteCountries: mergeRecordsById(
      older.favoriteCountries ?? [],
      newer.favoriteCountries ?? []
    ) as UserProfile['favoriteCountries'],
    nationalities: mergeRecordsById(
      older.nationalities ?? [],
      newer.nationalities ?? []
    ).slice(0, 6) as UserProfile['nationalities'],
    favoriteBooks: mergeRecordsById(older.favoriteBooks ?? [], newer.favoriteBooks ?? []) as UserProfile['favoriteBooks'],
    interests: unionStrings(older.interests, newer.interests),
    favoriteEventCategories: unionStrings(
      older.favoriteEventCategories,
      newer.favoriteEventCategories,
    ),
    tabOrder: newer.tabOrder?.length ? newer.tabOrder : older.tabOrder,
    tabVisitCounts: mergeTabVisitCounts(older.tabVisitCounts, newer.tabVisitCounts),
    onboardingCompleted: newer.onboardingCompleted || older.onboardingCompleted,
    notificationSettings: {
      ...older.notificationSettings,
      ...newer.notificationSettings,
    },
    displayPreferences: {
      ...older.displayPreferences,
      ...newer.displayPreferences,
    },
    sportsFeedPrefs: {
      strictFollowing: newer.sportsFeedPrefs?.strictFollowing ?? older.sportsFeedPrefs?.strictFollowing ?? false,
      includeFollowedLeagues:
        newer.sportsFeedPrefs?.includeFollowedLeagues ??
        older.sportsFeedPrefs?.includeFollowedLeagues ??
        true,
      discoveryLevel: newer.sportsFeedPrefs?.discoveryLevel ?? older.sportsFeedPrefs?.discoveryLevel ?? 'med',
      prioritizeDomesticLeagues:
        newer.sportsFeedPrefs?.prioritizeDomesticLeagues ??
        older.sportsFeedPrefs?.prioritizeDomesticLeagues ??
        true,
      prioritizeNationalTeams:
        newer.sportsFeedPrefs?.prioritizeNationalTeams ??
        older.sportsFeedPrefs?.prioritizeNationalTeams ??
        true,
    },
    identityGoals: unionStrings(older.identityGoals, newer.identityGoals),
    joySources: mergeJoySourcesForSync(older.joySources, newer.joySources),
    recoveryMode:
      Date.parse(newer.recoveryMode?.lastEvaluatedAt || '') >=
      Date.parse(older.recoveryMode?.lastEvaluatedAt || '')
        ? newer.recoveryMode ?? older.recoveryMode
        : older.recoveryMode ?? newer.recoveryMode,
    wellbeingLogs: mergeWellbeingLogs(older.wellbeingLogs, newer.wellbeingLogs),
    savedEvents: mergeSavedEvents(older.savedEvents, newer.savedEvents),
    birthYear: newer.birthYear ?? older.birthYear,
    parentalSocialConsent:
      newer.parentalSocialConsent !== undefined
        ? newer.parentalSocialConsent
        : older.parentalSocialConsent,
    socialPrivacy: {
      ...(older.socialPrivacy ?? {}),
      ...(newer.socialPrivacy ?? {}),
    },
    lastLoginAt:
      localTs >= cloudTs ? localProfile.lastLoginAt : cloudProfile.lastLoginAt,
  };

  return reconcileProfileWithSession(merged, session);
}

function mergeSavedEvents(
  older?: SavedEventSnapshot[],
  newer?: SavedEventSnapshot[]
): SavedEventSnapshot[] {
  const map = new Map<string, SavedEventSnapshot>();
  for (const item of [...(older ?? []), ...(newer ?? [])]) {
    const prev = map.get(item.id);
    if (!prev || Date.parse(item.savedAt) >= Date.parse(prev.savedAt)) {
      map.set(item.id, item);
    }
  }
  return [...map.values()].sort(
    (a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)
  );
}

export type CloudMergeStats = {
  habitsMerged: boolean;
  tasksMerged: boolean;
  profileMerged: boolean;
  projectsMerged: boolean;
  timeEntriesMerged: boolean;
  activitiesMerged: boolean;
  showsMerged: boolean;
  sportsMerged: boolean;
};

export type CloudPullPayload = {
  habits?: unknown;
  tasks?: unknown;
  taskProjects?: unknown;
  taskTimeEntries?: unknown;
  userProfile?: unknown;
  activities?: unknown;
  shows?: unknown;
  sports?: unknown;
  projects?: unknown;
  timeEntries?: unknown;
};

export function resolveProjectsAfterCloudSync(
  cloud: unknown,
  local: TaskProject[] | undefined
): TaskProject[] | null {
  if (!Array.isArray(cloud)) return null;
  const localItems = local ?? [];
  if (cloud.length === 0) return localItems.length > 0 ? null : [];
  if (localItems.length === 0) return cloud as TaskProject[];
  return mergeRecordsById(localItems, cloud as TaskProject[]) as TaskProject[];
}

export function resolveTimeEntriesAfterCloudSync(
  cloud: unknown,
  local: TaskTimeEntry[] | undefined
): TaskTimeEntry[] | null {
  if (!Array.isArray(cloud)) return null;
  const localItems = local ?? [];
  if (cloud.length === 0) return localItems.length > 0 ? null : [];
  if (localItems.length === 0) return cloud as TaskTimeEntry[];
  return mergeRecordsById(localItems, cloud as TaskTimeEntry[]) as TaskTimeEntry[];
}

export function resolveGenericRecordsAfterCloudSync<T extends { id?: string; updatedAt?: string; createdAt?: string }>(
  cloud: unknown,
  local: T[] | undefined
): T[] | null {
  if (!Array.isArray(cloud)) return null;
  const localItems = local ?? [];
  if (cloud.length === 0) return localItems.length > 0 ? null : [];
  if (localItems.length === 0) return cloud as T[];
  return mergeRecordsById(localItems, cloud as T[]);
}
