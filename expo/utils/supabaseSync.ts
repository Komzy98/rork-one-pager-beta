import { supabase, supabaseConfigured } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  if (!supabaseConfigured || !currentUserId) return false;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        {
          user_id: currentUserId,
          data: { ...data, lastSynced: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    console.log('Data synced to Supabase');
    return true;
  } catch (error) {
    console.warn('Supabase sync to cloud failed:', error);
    return false;
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
