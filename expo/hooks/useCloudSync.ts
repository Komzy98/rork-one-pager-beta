import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';

import { initializeCloudSync, syncAllDataToCloud, syncAllDataFromCloud } from '@/utils/supabaseSync';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

type SyncableData = {
  habits: any[];
  activities: any[];
  shows: any[];
  sports: any[];
  tasks: any[];
  projects: any[];
  timeEntries: any[];
  userProfile: any;
};

export const [CloudSyncProvider, useCloudSync] = createContextHook(() => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isCloudEnabled, setIsCloudEnabled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudStorage, setCloudStorage] = useState<any>(null);
  const [useSupabase, setUseSupabase] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const { isAuthenticated, user } = useAuth();
  const { profile } = useUserProfile();
  
  // Always call hooks unconditionally
  const appContext = useAppSafe();
  const tasksContext = useTasksSafe();
  
  // Initialize after mount to prevent circular dependency
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  const habits = useMemo(() => appContext?.habits || [], [appContext]);
  const activities = useMemo(() => appContext?.activities || [], [appContext]);
  const shows = useMemo(() => appContext?.shows || [], [appContext]);
  const sports = useMemo(() => appContext?.sports || [], [appContext]);
  const allTasks = useMemo(() => tasksContext?.tasks || [], [tasksContext]);
  const projects = useMemo(() => tasksContext?.projects || [], [tasksContext]);
  const timeEntries = useMemo(() => tasksContext?.timeEntries || [], [tasksContext]);
  
  // Check if contexts are properly initialized
  const contextsReady = useMemo(() => isInitialized && appContext && tasksContext, [isInitialized, appContext, tasksContext]);

  const loadSyncStatus = useCallback(async () => {
    try {
      const enabled = await AsyncStorage.getItem('cloud_sync_enabled');
      const lastSync = await AsyncStorage.getItem('cloud_sync_timestamp');
      const provider = await AsyncStorage.getItem('cloud_sync_provider');
      
      if (enabled === 'true') {
        setIsCloudEnabled(true);
      }
      if (lastSync) {
        setLastSyncTime(lastSync);
      }
      if (provider === 'supabase' || provider === 'firebase') {
        setUseSupabase(true);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }, []);

  const initializeSync = useCallback(async (preferSupabase = true) => {
    if (!user) {
      setError('No user found');
      return false;
    }
    
    if (!contextsReady) {
      console.log('Contexts not ready yet, waiting...');
      return false;
    }

    try {
      setSyncStatus('syncing');
      setError(null);
      
      if (preferSupabase) {
        try {
          const supabaseInitialized = await initializeCloudSync();
          if (supabaseInitialized) {
            setUseSupabase(true);
            setIsCloudEnabled(true);
            await AsyncStorage.setItem('cloud_sync_enabled', 'true');
            await AsyncStorage.setItem('cloud_sync_provider', 'supabase');
            setSyncStatus('success');
            console.log('Supabase cloud sync initialized');
            return true;
          }
        } catch (supabaseError: any) {
          console.log('Supabase initialization failed:', supabaseError?.message || supabaseError);
        }
      }
      
      console.log('Cloud sync not available, app will use local storage');
      setSyncStatus('idle');
      return false;
    } catch (err) {
      setSyncStatus('idle');
      console.log('Cloud sync init error, continuing with local storage:', err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [user, contextsReady]);

  const syncToCloud = useCallback(async (storage?: any) => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping sync');
      return false;
    }
    
    if (!isCloudEnabled) {
      console.log('Cloud sync not enabled');
      return false;
    }
    
    if (!contextsReady) {
      console.log('Contexts not ready for sync');
      return false;
    }

    try {
      setSyncStatus('syncing');
      setError(null);

      const dataToSync: SyncableData = {
        habits: habits || [],
        activities: activities || [],
        shows: shows || [],
        sports: sports || [],
        tasks: allTasks || [],
        projects: projects || [],
        timeEntries: timeEntries || [],
        userProfile: profile || {}
      };

      if (useSupabase) {
        const ok = await syncAllDataToCloud(dataToSync);
        if (!ok) throw new Error('Supabase returned no confirmation');
      } else {
        const storageToUse = storage || cloudStorage;
        if (!storageToUse) {
          throw new Error('Storage not available');
        }
        await storageToUse.uploadData(dataToSync);
      }
      
      setSyncStatus('success');
      const now = new Date().toISOString();
      setLastSyncTime(now);
      await AsyncStorage.setItem('cloud_sync_timestamp', now);
      
      console.log('Data synced to cloud successfully');
      return true;
    } catch (err: any) {
      setSyncStatus('error');
      const msg = err instanceof Error
        ? err.message
        : (err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Sync failed');
      setError(msg);
      // warn: handled failure (Profile shows error); error would trigger dev LogBox over the whole app
      console.warn('Sync to cloud failed:', msg, err);
      return false;
    }
  }, [isAuthenticated, user, useSupabase, cloudStorage, isCloudEnabled, habits, activities, shows, sports, allTasks, projects, timeEntries, profile, contextsReady]);

  const syncFromCloud = useCallback(async (storage?: any) => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping sync');
      return false;
    }
    
    if (!isCloudEnabled) {
      console.log('Cloud sync not enabled');
      return false;
    }
    
    if (!contextsReady) {
      console.log('Contexts not ready for sync');
      return false;
    }

    try {
      setSyncStatus('syncing');
      setError(null);

      let cloudData;
      if (useSupabase) {
        cloudData = await syncAllDataFromCloud();
      } else {
        const storageToUse = storage || cloudStorage;
        if (!storageToUse) {
          throw new Error('Storage not available');
        }
        cloudData = await storageToUse.downloadData();
      }
      
      if (cloudData) {
        console.log('Cloud data received:', Object.keys(cloudData));
        
        // TODO: You would need to add methods to your stores to update from cloud data
        // For now, we just log what we received
        // Example:
        // if (cloudData.habits) updateHabits(cloudData.habits);
        // if (cloudData.tasks) updateTasks(cloudData.tasks);
        
        setSyncStatus('success');
        const now = new Date().toISOString();
        setLastSyncTime(now);
        await AsyncStorage.setItem('cloud_sync_timestamp', now);
        return true;
      } else {
        setSyncStatus('success');
        console.log('No cloud data to sync');
        return true;
      }
    } catch (err: any) {
      setSyncStatus('error');
      const msg = err instanceof Error
        ? err.message
        : (err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Sync failed');
      setError(msg);
      console.warn('Sync from cloud failed:', msg, err);
      return false;
    }
  }, [isAuthenticated, user, useSupabase, cloudStorage, isCloudEnabled, contextsReady]);

  const enableCloudSync = useCallback(async (preferSupabase = false) => {
    if (!isAuthenticated || !user) {
      setError('Please log in to enable cloud sync');
      return false;
    }
    
    return await initializeSync(preferSupabase);
  }, [isAuthenticated, user, initializeSync]);

  const disableCloudSync = useCallback(async () => {
    setIsCloudEnabled(false);
    setCloudStorage(null);
    setSyncStatus('idle');
    setError(null);
    await AsyncStorage.setItem('cloud_sync_enabled', 'false');
  }, []);

  const forceSync = useCallback(async () => {
    if (!cloudStorage) {
      console.log('Cloud storage not available');
      return false;
    }
    
    const uploadSuccess = await syncToCloud();
    const downloadSuccess = await syncFromCloud();
    return uploadSuccess && downloadSuccess;
  }, [cloudStorage, syncToCloud, syncFromCloud]);

  const [supabaseInitAttempted, setSupabaseInitAttempted] = useState<boolean>(false);

  useEffect(() => {
    const autoInitializeSupabaseSync = async () => {
      if (isAuthenticated && user && !isCloudEnabled && contextsReady && !supabaseInitAttempted) {
        setSupabaseInitAttempted(true);
        console.log('Checking cloud sync availability for authenticated user');
        try {
          const initialized = await initializeSync(true);
          if (initialized) {
            console.log('[useCloudSync] Initial push to Supabase after sign-in');
            await syncToCloud();
          } else {
            console.log('Cloud sync not available, using local storage');
          }
        } catch (e) {
          console.warn('[useCloudSync] Auto-init error:', e);
        }
      }
    };
    
    void autoInitializeSupabaseSync();
  }, [isAuthenticated, user, isCloudEnabled, contextsReady, supabaseInitAttempted, initializeSync, syncToCloud]);

  // Load sync status from storage
  useEffect(() => {
    void loadSyncStatus();
  }, [loadSyncStatus]);

  useEffect(() => {
    if (!isCloudEnabled || !isAuthenticated || !user) return;
    
    if (!useSupabase && !cloudStorage) {
      return;
    }

    const interval = setInterval(() => {
      console.log('Auto-syncing to cloud...');
      void syncToCloud();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isCloudEnabled, isAuthenticated, user, useSupabase, cloudStorage, syncToCloud]);

  useEffect(() => {
    if (!isCloudEnabled || !isAuthenticated || !user) return;
    
    if (!useSupabase && !cloudStorage) return;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active, syncing from cloud...');
        void syncFromCloud();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [isCloudEnabled, isAuthenticated, user, useSupabase, cloudStorage, syncFromCloud]);

  const syncToCloudWrapper = useCallback(() => syncToCloud(), [syncToCloud]);
  const syncFromCloudWrapper = useCallback(() => syncFromCloud(), [syncFromCloud]);

  return useMemo(() => ({
    // Status
    syncStatus,
    lastSyncTime,
    isCloudEnabled,
    error,
    
    // Actions
    enableCloudSync,
    disableCloudSync,
    syncToCloud: syncToCloudWrapper,
    syncFromCloud: syncFromCloudWrapper,
    forceSync,
    
    // Provider info
    useSupabase,
    useFirebase: useSupabase,
    cloudProvider: useSupabase ? 'Supabase' : 'JSONBin',
    
    // Helpers
    isOnline: isCloudEnabled && syncStatus !== 'error',
    
    // Auto-sync status
    isAutoSyncActive: isCloudEnabled && (useSupabase || !!cloudStorage),
  }), [syncStatus, lastSyncTime, isCloudEnabled, error, enableCloudSync, disableCloudSync, syncToCloudWrapper, syncFromCloudWrapper, forceSync, useSupabase, cloudStorage]);
});