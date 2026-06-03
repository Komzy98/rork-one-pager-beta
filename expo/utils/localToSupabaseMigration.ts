import AsyncStorage from '@react-native-async-storage/async-storage';
import { unifiedStorage } from '@/utils/unifiedStorage';
import type { Habit, UserProfile } from '@/types/habit';
import type { Task, TaskProject, TaskTimeEntry } from '@/types/task';
import {
  mergeHabitsFromCloud,
  mergeProfilesFromCloud,
  mergeTasksFromCloud,
  mergeRecordsById,
} from '@/utils/syncMerge';

const USERS_STORAGE_KEY = '@users_db';
export const LAST_GUEST_USER_ID_KEY = '@last_guest_user_id';

interface StoredLocalUser {
  id: string;
  email: string;
}

const getMigratedFlagKey = (supabaseUserId: string) =>
  `@local_to_supabase_migrated_${supabaseUserId}`;

const getGuestMigratedFlagKey = (supabaseUserId: string, guestUserId: string) =>
  `@guest_to_supabase_migrated_${supabaseUserId}_${guestUserId}`;

const USER_SUFFIX_KEY_PREFIXES: string[] = [
  'habits_',
  'activities_',
  'shows_',
  'sports_',
  'tasks_',
  'task_projects_',
  'task_time_entries_',
  'saved_community_habits_',
  'challenges_data_',
];

const USER_PROFILE_PREFIX = '@user_profile_';

async function findLocalUserIdByEmail(email: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return null;
    const users: StoredLocalUser[] = JSON.parse(raw);
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    return match?.id || null;
  } catch (e) {
    console.warn('[migration] Failed to read users db:', e);
    return null;
  }
}

async function readJsonProfile(key: string): Promise<UserProfile | null> {
  try {
    const raw = await unifiedStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

async function mergeKeyIfSourceExists(
  fromKey: string,
  toKey: string,
  mergeFn: (local: any[], source: any[]) => any[]
): Promise<boolean> {
  try {
    const sourceRaw = await unifiedStorage.getItem(fromKey);
    if (!sourceRaw) return false;

    const source = JSON.parse(sourceRaw);
    if (!Array.isArray(source) || source.length === 0) return false;

    const targetRaw = await unifiedStorage.getItem(toKey);
    let merged = source;
    if (targetRaw) {
      try {
        const target = JSON.parse(targetRaw);
        if (Array.isArray(target) && target.length > 0) {
          merged = mergeFn(target, source);
        }
      } catch {
        merged = source;
      }
    }

    await unifiedStorage.setItem(toKey, JSON.stringify(merged));
    console.log('[migration] Merged', fromKey, '->', toKey);
    return true;
  } catch (e) {
    console.warn('[migration] Merge failed', fromKey, '->', toKey, e);
    return false;
  }
}

async function mergeProfileKey(
  fromKey: string,
  toKey: string,
  session: { userId: string; email: string; displayName: string }
): Promise<boolean> {
  try {
    const source = await readJsonProfile(fromKey);
    if (!source) return false;

    const target = await readJsonProfile(toKey);
    const merged = mergeProfilesFromCloud(target, source, {
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });
    if (!merged) return false;

    await unifiedStorage.setItem(toKey, JSON.stringify(merged));
    console.log('[migration] Merged profile', fromKey, '->', toKey);
    return true;
  } catch (e) {
    console.warn('[migration] Profile merge failed', fromKey, '->', toKey, e);
    return false;
  }
}

export async function rememberGuestUserId(guestUserId: string): Promise<void> {
  if (!guestUserId.startsWith('guest_')) return;
  try {
    await unifiedStorage.setItem(LAST_GUEST_USER_ID_KEY, guestUserId);
  } catch (e) {
    console.warn('[migration] Failed to remember guest id:', e);
  }
}

export async function getLastGuestUserId(): Promise<string | null> {
  try {
    const id = await unifiedStorage.getItem(LAST_GUEST_USER_ID_KEY);
    return id?.startsWith('guest_') ? id : null;
  } catch {
    return null;
  }
}

export async function clearLastGuestUserId(): Promise<void> {
  try {
    await unifiedStorage.removeItem(LAST_GUEST_USER_ID_KEY);
  } catch {
    /* non-fatal */
  }
}

/**
 * Merge guest-scoped habits/tasks/profile into the signed-in account (conflict-safe).
 */
export async function migrateGuestDataToSupabaseUser(
  guestUserId: string,
  supabaseUserId: string,
  sessionEmail: string,
  sessionDisplayName: string
): Promise<{ migrated: boolean; keysMerged: number }> {
  if (!guestUserId.startsWith('guest_') || guestUserId === supabaseUserId) {
    return { migrated: false, keysMerged: 0 };
  }

  const flagKey = getGuestMigratedFlagKey(supabaseUserId, guestUserId);
  const already = await unifiedStorage.getItem(flagKey);
  if (already === 'true') {
    return { migrated: false, keysMerged: 0 };
  }

  console.log('[migration] Merging guest data from', guestUserId, 'to', supabaseUserId);
  let keysMerged = 0;
  const session = {
    userId: supabaseUserId,
    email: sessionEmail,
    displayName: sessionDisplayName,
  };

  if (
    await mergeKeyIfSourceExists(
      `habits_${guestUserId}`,
      `habits_${supabaseUserId}`,
      (local, source) => mergeHabitsFromCloud(local as Habit[], source as Habit[])
    )
  ) {
    keysMerged += 1;
  }
  if (
    await mergeKeyIfSourceExists(
      `tasks_${guestUserId}`,
      `tasks_${supabaseUserId}`,
      (local, source) => mergeTasksFromCloud(local as Task[], source as Task[])
    )
  ) {
    keysMerged += 1;
  }
  if (
    await mergeKeyIfSourceExists(
      `task_projects_${guestUserId}`,
      `task_projects_${supabaseUserId}`,
      (local, source) => mergeRecordsById(local as TaskProject[], source as TaskProject[])
    )
  ) {
    keysMerged += 1;
  }
  if (
    await mergeKeyIfSourceExists(
      `task_time_entries_${guestUserId}`,
      `task_time_entries_${supabaseUserId}`,
      (local, source) => mergeRecordsById(local as TaskTimeEntry[], source as TaskTimeEntry[])
    )
  ) {
    keysMerged += 1;
  }
  for (const prefix of ['activities_', 'shows_', 'sports_', 'saved_community_habits_', 'challenges_data_']) {
    if (
      await mergeKeyIfSourceExists(
        `${prefix}${guestUserId}`,
        `${prefix}${supabaseUserId}`,
        (local, source) => mergeRecordsById(local, source)
      )
    ) {
      keysMerged += 1;
    }
  }
  if (
    await mergeProfileKey(
      `${USER_PROFILE_PREFIX}${guestUserId}`,
      `${USER_PROFILE_PREFIX}${supabaseUserId}`,
      session
    )
  ) {
    keysMerged += 1;
  }

  await unifiedStorage.setItem(flagKey, 'true');
  await clearLastGuestUserId();
  console.log('[migration] Guest merge completed. Keys merged:', keysMerged);
  return { migrated: keysMerged > 0, keysMerged };
}

export async function migrateLocalDataToSupabaseUser(
  email: string,
  supabaseUserId: string,
  options?: { force?: boolean; sessionDisplayName?: string; guestUserId?: string }
): Promise<{ migrated: boolean; keysCopied: number; oldUserId: string | null }> {
  try {
    let keysCopied = 0;
    let oldUserId: string | null = null;

    const guestId = options?.guestUserId ?? (await getLastGuestUserId());
    if (guestId) {
      const guestResult = await migrateGuestDataToSupabaseUser(
        guestId,
        supabaseUserId,
        email,
        options?.sessionDisplayName || email.split('@')[0] || 'there'
      );
      keysCopied += guestResult.keysMerged;
    }

    const flagKey = getMigratedFlagKey(supabaseUserId);
    if (!options?.force) {
      const alreadyMigrated = await unifiedStorage.getItem(flagKey);
      if (alreadyMigrated === 'true' && keysCopied === 0) {
        return { migrated: false, keysCopied: 0, oldUserId: null };
      }
    }

    oldUserId = await findLocalUserIdByEmail(email);
    if (!oldUserId || oldUserId === supabaseUserId) {
      if (keysCopied > 0) {
        await unifiedStorage.setItem(flagKey, 'true');
      }
      return { migrated: keysCopied > 0, keysCopied, oldUserId };
    }

    console.log('[migration] Migrating local data from', oldUserId, 'to', supabaseUserId);
    const session = {
      userId: supabaseUserId,
      email,
      displayName: options?.sessionDisplayName || email.split('@')[0] || 'there',
    };

    if (
      await mergeKeyIfSourceExists(
        `habits_${oldUserId}`,
        `habits_${supabaseUserId}`,
        (local, source) => mergeHabitsFromCloud(local as Habit[], source as Habit[])
      )
    ) {
      keysCopied += 1;
    }
    if (
      await mergeKeyIfSourceExists(
        `tasks_${oldUserId}`,
        `tasks_${supabaseUserId}`,
        (local, source) => mergeTasksFromCloud(local as Task[], source as Task[])
      )
    ) {
      keysCopied += 1;
    }
    if (
      await mergeKeyIfSourceExists(
        `task_projects_${oldUserId}`,
        `task_projects_${supabaseUserId}`,
        (local, source) => mergeRecordsById(local as TaskProject[], source as TaskProject[])
      )
    ) {
      keysCopied += 1;
    }
    if (
      await mergeKeyIfSourceExists(
        `task_time_entries_${oldUserId}`,
        `task_time_entries_${supabaseUserId}`,
        (local, source) => mergeRecordsById(local as TaskTimeEntry[], source as TaskTimeEntry[])
      )
    ) {
      keysCopied += 1;
    }
    for (const prefix of USER_SUFFIX_KEY_PREFIXES) {
      if (prefix.startsWith('habits_') || prefix.startsWith('tasks_') || prefix.startsWith('task_')) {
        continue;
      }
      if (
        await mergeKeyIfSourceExists(
          `${prefix}${oldUserId}`,
          `${prefix}${supabaseUserId}`,
          (local, source) => mergeRecordsById(local, source)
        )
      ) {
        keysCopied += 1;
      }
    }

    const profileFrom = `${USER_PROFILE_PREFIX}${oldUserId}`;
    const profileTo = `${USER_PROFILE_PREFIX}${supabaseUserId}`;
    if (await mergeProfileKey(profileFrom, profileTo, session)) {
      keysCopied += 1;
    }

    try {
      const allKeys = await unifiedStorage.getAllKeys();
      const extraSuffix = `_${oldUserId}`;
      for (const key of allKeys) {
        if (!key.endsWith(extraSuffix)) continue;
        const alreadyHandled = USER_SUFFIX_KEY_PREFIXES.some(
          (p) => `${p}${oldUserId}` === key
        );
        if (alreadyHandled || key.startsWith(USER_PROFILE_PREFIX)) continue;
        const toKey = `${key.slice(0, -extraSuffix.length)}_${supabaseUserId}`;
        if (
          await mergeKeyIfSourceExists(key, toKey, (local, source) =>
            mergeRecordsById(local, source)
          )
        ) {
          keysCopied += 1;
        }
      }
    } catch (scanError) {
      console.warn('[migration] Key scan failed (non-fatal):', scanError);
    }

    await unifiedStorage.setItem(flagKey, 'true');
    console.log('[migration] Completed. Keys merged:', keysCopied);
    return { migrated: keysCopied > 0, keysCopied, oldUserId };
  } catch (error) {
    console.error('[migration] Unexpected error:', error);
    return { migrated: false, keysCopied: 0, oldUserId: null };
  }
}
