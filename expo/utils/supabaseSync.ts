import { supabase, supabaseConfigured, supabaseUrl } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

function looksLikeTransportFailure(err: any, msg: string): boolean {
  const m = msg.toLowerCase();
  if (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('the internet connection appears to be offline')
  ) {
    return true;
  }
  // RN fetch often throws TypeError with a transport message — not every TypeError is network.
  if (err?.name === 'TypeError') {
    return (
      m.includes('network') ||
      m.includes('fetch') ||
      m.includes('aborted') ||
      m.includes('timeout')
    );
  }
  return false;
}

async function executeWithRetry<T>(fn: () => PromiseLike<T> | T, retries = 2, delayMs = 800): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);
      const isNetwork = looksLikeTransportFailure(err, msg);
      console.warn(`[supabaseSync] attempt ${attempt + 1} failed:`, msg, 'retryable:', isNetwork);
      if (!isNetwork || attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

export type SyncableData = {
  habits: any[];
  activities: any[];
  shows: any[];
  sports: any[];
  tasks: any[];
  projects: any[];
  timeEntries: any[];
  userProfile: any;
};

const TABLE = 'user_data';
const USER_ID_KEY = 'supabase_sync_user_id';

let currentUserId: string | null = null;

export const setSyncUserId = async (userId: string) => {
  currentUserId = userId;
  try {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  } catch {}
};

export const clearSyncUserId = async () => {
  currentUserId = null;
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
  } catch {}
};

export const initializeCloudSync = async (): Promise<boolean> => {
  if (!supabaseConfigured) {
    console.log('Supabase not configured, cloud sync unavailable');
    return false;
  }
  try {
    if (!currentUserId) {
      const stored = await AsyncStorage.getItem(USER_ID_KEY);
      if (stored) currentUserId = stored;
    }
    if (!currentUserId) {
      console.log('No user id for Supabase cloud sync');
      return false;
    }
    console.log('Supabase cloud sync initialized for user:', currentUserId);
    return true;
  } catch (error) {
    console.error('Supabase initialization failed:', error);
    return false;
  }
};

export const syncAllDataToCloud = async (data: Partial<SyncableData>): Promise<boolean> => {
  if (!supabaseConfigured) {
    console.warn('[supabaseSync] Not configured - missing SUPABASE_URL/ANON_KEY');
    throw new Error('Supabase not configured');
  }
  if (!currentUserId) {
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) currentUserId = stored;
  }
  if (!currentUserId) {
    console.warn('[supabaseSync] No user id set for sync');
    throw new Error('No user id - please sign in');
  }
  try {
    console.log('[supabaseSync] Upserting user_data for user:', currentUserId, 'at', supabaseUrl);
    const upsertResult = await executeWithRetry<any>(() =>
      supabase
        .from(TABLE)
        .upsert(
          {
            user_id: currentUserId,
            data: { ...data, lastSynced: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
    );
    const error = upsertResult?.error ?? null;
    const status = upsertResult?.status;
    if (error) {
      const details = {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        status,
      };
      try {
        console.warn('[supabaseSync] Upsert error:', JSON.stringify(details));
      } catch {
        console.warn('[supabaseSync] Upsert error:', details);
      }
      const parts = [
        error.message,
        (error as any).details,
        (error as any).hint,
        (error as any).code ? `code ${(error as any).code}` : undefined,
      ].filter(Boolean);
      const combined = parts.join(' — ') || 'Unknown Supabase error';
      const wrapped = new Error(combined);
      (wrapped as any).supabase = details;
      throw wrapped;
    }
    console.log('[supabaseSync] Data synced to Supabase user_data (status', status, ')');
    return true;
  } catch (error: any) {
    const raw =
      error?.message ||
      (typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const isNetwork = looksLikeTransportFailure(error, String(raw));
    const msg = isNetwork
      ? `Network error reaching Supabase (${supabaseUrl || 'no url set'}). Make sure EXPO_PUBLIC_SUPABASE_URL is your Project API URL like https://<ref>.supabase.co (NOT the dashboard URL on supabase.com).`
      : raw;
    console.warn('[supabaseSync] Sync to cloud failed:', msg, error);
    throw new Error(msg);
  }
};

export const syncAllDataFromCloud = async (): Promise<Partial<SyncableData> | null> => {
  if (!supabaseConfigured || !currentUserId) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('user_id', currentUserId)
      .maybeSingle();
    if (error) throw error;
    if (data?.data) return data.data as Partial<SyncableData>;
    return null;
  } catch (error) {
    console.warn('Supabase sync from cloud failed:', error);
    return null;
  }
};
