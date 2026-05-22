import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSync } from '@/utils/supabaseUserSync';

import { initializeCloudSync, syncAllDataToCloud, syncAllDataFromCloud } from '@/utils/supabaseSync';
import type { CloudMergeStats, CloudPullPayload } from '@/utils/syncMerge';
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
  const [latestSnapshotTime, setLatestSnapshotTime] = useState<string | null>(null);
  const [lastPullTime, setLastPullTime] = useState<string | null>(null);
  const [lastMergeSummary, setLastMergeSummary] = useState<CloudMergeStats | null>(null);

  const { isAuthenticated, user } = useAuth();
  const getScopedSyncKey = useCallback(
    (base: string) => `${base}_${user?.id || 'guest'}`,
    [user?.id]
  );
  const supabaseUserSync = useSupabaseSync(user?.id);
  const { profile, mergeProfileFromCloud } = useUserProfile();
  
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

  const refreshSnapshotMeta = useCallback(async () => {
    if (!user?.id) {
      setLatestSnapshotTime(null);
      return;
    }
    try {
      const snapshots = await supabaseUserSync.listSnapshots();
      setLatestSnapshotTime(snapshots[0]?.createdAt || null);
    } catch {
      setLatestSnapshotTime(null);
    }
  }, [user?.id, supabaseUserSync]);

  const loadSyncStatus = useCallback(async () => {
    try {
      const enabledKey = getScopedSyncKey('cloud_sync_enabled');
      const timestampKey = getScopedSyncKey('cloud_sync_timestamp');
      const pullTimestampKey = getScopedSyncKey('cloud_sync_pull_timestamp');
      const providerKey = getScopedSyncKey('cloud_sync_provider');
      let [enabled, lastSync, lastPull, provider] = await Promise.all([
        AsyncStorage.getItem(enabledKey),
        AsyncStorage.getItem(timestampKey),
        AsyncStorage.getItem(pullTimestampKey),
        AsyncStorage.getItem(providerKey),
      ]);
      if (!enabled && !lastSync && !provider) {
        const legacy = await Promise.all([
          AsyncStorage.getItem('cloud_sync_enabled'),
          AsyncStorage.getItem('cloud_sync_timestamp'),
          AsyncStorage.getItem('cloud_sync_provider'),
        ]);
        enabled = legacy[0];
        lastSync = legacy[1];
        provider = legacy[2];
        if (enabled || lastSync || provider) {
          await Promise.all([
            enabled ? AsyncStorage.setItem(enabledKey, enabled) : Promise.resolve(),
            lastSync ? AsyncStorage.setItem(timestampKey, lastSync) : Promise.resolve(),
            provider ? AsyncStorage.setItem(providerKey, provider) : Promise.resolve(),
          ]);
        }
      }
      
      if (enabled === 'true') {
        setIsCloudEnabled(true);
      } else {
        setIsCloudEnabled(false);
      }
      if (lastSync) {
        setLastSyncTime(lastSync);
      } else {
        setLastSyncTime(null);
      }
      if (lastPull) {
        setLastPullTime(lastPull);
      } else {
        setLastPullTime(null);
      }
      if (provider === 'supabase' || provider === 'firebase') {
        setUseSupabase(true);
      } else {
        setUseSupabase(false);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }, [getScopedSyncKey]);

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
            await AsyncStorage.setItem(getScopedSyncKey('cloud_sync_enabled'), 'true');
            await AsyncStorage.setItem(getScopedSyncKey('cloud_sync_provider'), 'supabase');
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
  }, [user, contextsReady, getScopedSyncKey]);

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
        await refreshSnapshotMeta();
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
      await AsyncStorage.setItem(getScopedSyncKey('cloud_sync_timestamp'), now);
      
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
  }, [isAuthenticated, user, useSupabase, cloudStorage, isCloudEnabled, habits, activities, shows, sports, allTasks, projects, timeEntries, profile, contextsReady, refreshSnapshotMeta, getScopedSyncKey]);

  const applyCloudMerge = useCallback(
    async (cloudData: CloudPullPayload): Promise<CloudMergeStats> => {
      const summary: CloudMergeStats = {
        habitsMerged: false,
        tasksMerged: false,
        profileMerged: false,
        projectsMerged: false,
        timeEntriesMerged: false,
        activitiesMerged: false,
        showsMerged: false,
        sportsMerged: false,
      };

      const habitsStats = await appContext?.mergeFromCloud?.(cloudData);
      if (habitsStats?.habitsMerged) summary.habitsMerged = true;
      if (habitsStats?.activitiesMerged) summary.activitiesMerged = true;
      if (habitsStats?.showsMerged) summary.showsMerged = true;
      if (habitsStats?.sportsMerged) summary.sportsMerged = true;

      const tasksStats = await tasksContext?.mergeFromCloud?.(cloudData);
      if (tasksStats?.tasksMerged) summary.tasksMerged = true;
      if (tasksStats?.projectsMerged) summary.projectsMerged = true;
      if (tasksStats?.timeEntriesMerged) summary.timeEntriesMerged = true;

      if (cloudData.userProfile) {
        const profileMerged = await mergeProfileFromCloud(cloudData.userProfile);
        summary.profileMerged = profileMerged;
      }

      return summary;
    },
    [appContext, tasksContext, mergeProfileFromCloud]
  );

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

      let cloudData: CloudPullPayload | null = null;
      if (useSupabase) {
        cloudData = (await syncAllDataFromCloud()) as CloudPullPayload | null;
      } else {
        const storageToUse = storage || cloudStorage;
        if (!storageToUse) {
          throw new Error('Storage not available');
        }
        cloudData = (await storageToUse.downloadData()) as CloudPullPayload | null;
      }
      
      if (cloudData) {
        console.log('Cloud data received:', Object.keys(cloudData));
        const mergeSummary = await applyCloudMerge(cloudData);
        setLastMergeSummary(mergeSummary);
        console.log('[useCloudSync] Merged from cloud:', mergeSummary);

        setSyncStatus('success');
        const now = new Date().toISOString();
        setLastPullTime(now);
        await AsyncStorage.setItem(getScopedSyncKey('cloud_sync_pull_timestamp'), now);
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
  }, [
    isAuthenticated,
    user,
    useSupabase,
    cloudStorage,
    isCloudEnabled,
    contextsReady,
    getScopedSyncKey,
    applyCloudMerge,
  ]);

  const syncNow = useCallback(async () => {
    const pulled = await syncFromCloud();
    if (!pulled) return false;
    return syncToCloud();
  }, [syncFromCloud, syncToCloud]);

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
    await AsyncStorage.setItem(getScopedSyncKey('cloud_sync_enabled'), 'false');
  }, [getScopedSyncKey]);

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
    setSupabaseInitAttempted(false);
  }, [user?.id]);

  useEffect(() => {
    const autoInitializeSupabaseSync = async () => {
      if (isAuthenticated && user && !isCloudEnabled && contextsReady && !supabaseInitAttempted) {
        setSupabaseInitAttempted(true);
        console.log('Checking cloud sync availability for authenticated user');
        try {
          const initialized = await initializeSync(true);
          if (initialized) {
            console.log('[useCloudSync] Initial merge from cloud after sign-in');
            const pulled = await syncFromCloud();
            const hasAnyLocalData =
              habits.length > 0 ||
              activities.length > 0 ||
              shows.length > 0 ||
              sports.length > 0 ||
              allTasks.length > 0 ||
              projects.length > 0 ||
              timeEntries.length > 0;

            if (pulled || hasAnyLocalData) {
              console.log('[useCloudSync] Backing up merged state to Supabase');
              await syncToCloud();
            } else {
              console.log('[useCloudSync] No local or remote data to sync yet.');
            }
          } else {
            console.log('Cloud sync not available, using local storage');
          }
        } catch (e) {
          console.warn('[useCloudSync] Auto-init error:', e);
        }
      }
    };
    
    void autoInitializeSupabaseSync();
  }, [
    isAuthenticated,
    user,
    isCloudEnabled,
    contextsReady,
    supabaseInitAttempted,
    initializeSync,
    syncFromCloud,
    syncToCloud,
    habits.length,
    activities.length,
    shows.length,
    sports.length,
    allTasks.length,
    projects.length,
    timeEntries.length,
  ]);

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
        console.log('App became active, merging from cloud then backing up...');
        void (async () => {
          const pulled = await syncFromCloud();
          if (pulled) {
            await syncToCloud();
          }
        })();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [isCloudEnabled, isAuthenticated, user, useSupabase, cloudStorage, syncFromCloud, syncToCloud]);

  const syncToCloudWrapper = useCallback(() => syncToCloud(), [syncToCloud]);
  const syncFromCloudWrapper = useCallback(() => syncFromCloud(), [syncFromCloud]);

  const restoreLatestSnapshot = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'No signed-in user' };
    const result = await supabaseUserSync.restoreSnapshot();
    if (result.success) {
      await refreshSnapshotMeta();
    }
    return result;
  }, [user?.id, supabaseUserSync, refreshSnapshotMeta]);

  useEffect(() => {
    void refreshSnapshotMeta();
  }, [refreshSnapshotMeta]);

  const syncNowWrapper = useCallback(() => syncNow(), [syncNow]);

  return useMemo(() => ({
    // Status
    syncStatus,
    lastSyncTime,
    lastPullTime,
    lastMergeSummary,
    isCloudEnabled,
    error,
    
    // Actions
    enableCloudSync,
    disableCloudSync,
    syncToCloud: syncToCloudWrapper,
    syncFromCloud: syncFromCloudWrapper,
    syncNow: syncNowWrapper,
    forceSync,
    
    // Provider info
    useSupabase,
    useFirebase: useSupabase,
    cloudProvider: useSupabase ? 'Supabase' : 'JSONBin',
    
    // Helpers
    isOnline: isCloudEnabled && syncStatus !== 'error',
    latestSnapshotTime,
    restoreLatestSnapshot,
    
    // Auto-sync status
    isAutoSyncActive: isCloudEnabled && (useSupabase || !!cloudStorage),
  }), [
    syncStatus,
    lastSyncTime,
    lastPullTime,
    lastMergeSummary,
    isCloudEnabled,
    error,
    enableCloudSync,
    disableCloudSync,
    syncToCloudWrapper,
    syncFromCloudWrapper,
    syncNowWrapper,
    forceSync,
    useSupabase,
    cloudStorage,
    latestSnapshotTime,
    restoreLatestSnapshot,
  ]);
});