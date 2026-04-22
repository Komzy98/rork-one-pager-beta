import AsyncStorage from '@react-native-async-storage/async-storage';
import { unifiedStorage } from '@/utils/unifiedStorage';

const USERS_STORAGE_KEY = '@users_db';

interface StoredLocalUser {
  id: string;
  email: string;
}

const getMigratedFlagKey = (supabaseUserId: string) =>
  `@local_to_supabase_migrated_${supabaseUserId}`;

const USER_SUFFIX_KEY_PREFIXES: string[] = [
  'habits_',
  'activities_',
  'shows_',
  'sports_',
  'tasks_',
  'task_projects_',
  'task_time_entries_',
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

async function copyKeyIfMissing(fromKey: string, toKey: string): Promise<boolean> {
  try {
    const existingTarget = await unifiedStorage.getItem(toKey);
    if (existingTarget) {
      console.log('[migration] Target already has data, skipping:', toKey);
      return false;
    }
    const source = await unifiedStorage.getItem(fromKey);
    if (!source) return false;
    await unifiedStorage.setItem(toKey, source);
    console.log('[migration] Copied', fromKey, '->', toKey);
    return true;
  } catch (e) {
    console.warn('[migration] Copy failed', fromKey, '->', toKey, e);
    return false;
  }
}

export async function migrateLocalDataToSupabaseUser(
  email: string,
  supabaseUserId: string
): Promise<{ migrated: boolean; keysCopied: number; oldUserId: string | null }> {
  try {
    const flagKey = getMigratedFlagKey(supabaseUserId);
    const alreadyMigrated = await unifiedStorage.getItem(flagKey);
    if (alreadyMigrated === 'true') {
      return { migrated: false, keysCopied: 0, oldUserId: null };
    }

    const oldUserId = await findLocalUserIdByEmail(email);
    if (!oldUserId || oldUserId === supabaseUserId) {
      await unifiedStorage.setItem(flagKey, 'true');
      return { migrated: false, keysCopied: 0, oldUserId };
    }

    console.log('[migration] Migrating local data from', oldUserId, 'to', supabaseUserId);
    let keysCopied = 0;

    for (const prefix of USER_SUFFIX_KEY_PREFIXES) {
      const fromKey = `${prefix}${oldUserId}`;
      const toKey = `${prefix}${supabaseUserId}`;
      if (await copyKeyIfMissing(fromKey, toKey)) keysCopied += 1;
    }

    const profileFrom = `${USER_PROFILE_PREFIX}${oldUserId}`;
    const profileTo = `${USER_PROFILE_PREFIX}${supabaseUserId}`;
    if (await copyKeyIfMissing(profileFrom, profileTo)) keysCopied += 1;

    try {
      const allKeys = await unifiedStorage.getAllKeys();
      const extraSuffix = `_${oldUserId}`;
      for (const key of allKeys) {
        if (!key.endsWith(extraSuffix)) continue;
        const base = key.slice(0, -extraSuffix.length);
        const alreadyHandled = USER_SUFFIX_KEY_PREFIXES.some(
          (p) => `${p}${oldUserId}` === key
        );
        if (alreadyHandled) continue;
        const toKey = `${base}_${supabaseUserId}`;
        if (await copyKeyIfMissing(key, toKey)) keysCopied += 1;
      }
    } catch (scanError) {
      console.warn('[migration] Key scan failed (non-fatal):', scanError);
    }

    await unifiedStorage.setItem(flagKey, 'true');
    console.log('[migration] Completed. Keys copied:', keysCopied);
    return { migrated: keysCopied > 0, keysCopied, oldUserId };
  } catch (error) {
    console.error('[migration] Unexpected error:', error);
    return { migrated: false, keysCopied: 0, oldUserId: null };
  }
}
