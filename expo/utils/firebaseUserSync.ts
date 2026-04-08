import React from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, firebaseAvailable, setFirebaseAvailable } from './firebaseConfig';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { Habit, Activity, Show, SportMatch, UserProfile } from '@/types/habit';
import { Task, TaskProject, TaskTimeEntry } from '@/types/task';

function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export interface UserData {
  habits: Habit[];
  activities: Activity[];
  shows: Show[];
  sports: SportMatch[];
  tasks: Task[];
  taskProjects: TaskProject[];
  taskTimeEntries: TaskTimeEntry[];
  userProfile?: UserProfile;
  lastSynced: any;
  userId: string;
}

export class FirebaseUserSync {
  private userId: string;
  private unsubscribe: (() => void) | null = null;
  private firebaseDisabled: boolean = false;
  private failureCount: number = 0;
  private static readonly MAX_FAILURES = 3;

  constructor(userId: string) {
    this.userId = userId;
  }

  private isPermissionError(error: any): boolean {
    const msg = error?.message || error?.code || String(error);
    return msg.includes('permission') || msg.includes('PERMISSION_DENIED') || msg.includes('insufficient') || msg.includes('unauthorized');
  }

  private isConnectionError(error: any): boolean {
    const msg = error?.message || error?.code || String(error);
    return msg.includes('unavailable') || msg.includes('Could not reach') || msg.includes('timed out') || msg.includes('network') || msg.includes('offline');
  }

  private handleFirebaseFailure(error: any): void {
    this.failureCount++;
    if (this.isPermissionError(error) || this.failureCount >= FirebaseUserSync.MAX_FAILURES) {
      this.firebaseDisabled = true;
      if (this.isConnectionError(error)) {
        setFirebaseAvailable(false);
        console.log('Firebase backend unreachable. Using local storage only. Will retry on next app launch.');
      } else {
        console.log('Firebase sync disabled due to repeated failures or permission error. Using local storage only.');
      }
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase operation timed out')), ms)
      ),
    ]);
  }

  get isDisabled(): boolean {
    return this.firebaseDisabled;
  }

  private getDocRef() {
    return doc(db, 'users', this.userId);
  }

  async saveToFirebase(data: Partial<UserData>): Promise<void> {
    if (this.firebaseDisabled || !firebaseAvailable) {
      console.log('Firebase disabled/unavailable, saving to local fallback');
      await this.saveToLocalFallback(data);
      return;
    }
    try {
      const sanitizedData = removeUndefined({
        ...data,
        userId: this.userId,
        lastSynced: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await this.withTimeout(setDoc(this.getDocRef(), sanitizedData, { merge: true }));
      this.failureCount = 0;
      console.log('Data saved to Firebase for user:', this.userId);
    } catch (error: any) {
      console.warn('Firebase save failed, using local fallback:', error?.message || String(error));
      this.handleFirebaseFailure(error);
      await this.saveToLocalFallback(data);
    }
  }

  private async saveToLocalFallback(data: Partial<UserData>): Promise<void> {
    try {
      const sanitizedData = removeUndefined({
        ...data,
        userId: this.userId,
        lastSynced: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await unifiedStorage.setItem(
        `sync_userData_${this.userId}`,
        JSON.stringify(sanitizedData)
      );
      console.log('Data saved to local fallback for user:', this.userId);
    } catch (fallbackError) {
      console.error('Local fallback save also failed:', fallbackError);
    }
  }

  async loadFromFirebase(): Promise<UserData | null> {
    if (this.firebaseDisabled || !firebaseAvailable) {
      console.log('Firebase disabled/unavailable, loading from local fallback');
      return this.loadFromLocalFallback();
    }
    try {
      const docSnap = await this.withTimeout(getDoc(this.getDocRef()));
      this.failureCount = 0;
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        console.log('Data loaded from Firebase for user:', this.userId);
        return data;
      } else {
        console.log('No existing Firebase data for user:', this.userId);
        return null;
      }
    } catch (error: any) {
      console.warn('Firebase load failed, using local fallback:', error?.message || String(error));
      this.handleFirebaseFailure(error);
      return this.loadFromLocalFallback();
    }
  }

  private async loadFromLocalFallback(): Promise<UserData | null> {
    try {
      const stored = await unifiedStorage.getItem(`sync_userData_${this.userId}`);
      if (stored) {
        console.log('Loaded data from local fallback');
        return JSON.parse(stored) as UserData;
      }
      return null;
    } catch {
      return null;
    }
  }

  async syncWithFirebase(localData: {
    habits: Habit[];
    activities: Activity[];
    shows: Show[];
    sports: SportMatch[];
    tasks?: Task[];
    taskProjects?: TaskProject[];
    taskTimeEntries?: TaskTimeEntry[];
  }): Promise<UserData> {
    const fullLocalData = {
      ...localData,
      tasks: localData.tasks || [],
      taskProjects: localData.taskProjects || [],
      taskTimeEntries: localData.taskTimeEntries || [],
    };
    const localResult: UserData = { ...fullLocalData, lastSynced: null, userId: this.userId };

    if (this.firebaseDisabled) {
      console.log('Firebase disabled, using local data only');
      await this.saveToLocalFallback(fullLocalData);
      return localResult;
    }

    try {
      const localSyncTimestamp = await unifiedStorage.getItem(`firebase_sync_${this.userId}`);
      const cloudData = await this.loadFromFirebase();

      if (this.firebaseDisabled) {
        await this.saveToLocalFallback(fullLocalData);
        return localResult;
      }

      if (!cloudData) {
        await this.saveToFirebase(fullLocalData);
        await unifiedStorage.setItem(`firebase_sync_${this.userId}`, new Date().toISOString());
        return localResult;
      }

      const cloudTimestamp = cloudData.lastSynced ? new Date(cloudData.lastSynced) : null;
      const localTimestamp = localSyncTimestamp ? new Date(localSyncTimestamp) : null;

      if (!cloudTimestamp || (localTimestamp && localTimestamp > cloudTimestamp)) {
        await this.saveToFirebase(fullLocalData);
        await unifiedStorage.setItem(`firebase_sync_${this.userId}`, new Date().toISOString());
        return localResult;
      } else {
        await unifiedStorage.setItem(`firebase_sync_${this.userId}`, cloudTimestamp.toISOString());
        await this.saveToLocal(cloudData);
        return cloudData;
      }
    } catch (error) {
      console.warn('Sync failed, using local data:', error);
      this.handleFirebaseFailure(error);
      await this.saveToLocalFallback(fullLocalData);
      return localResult;
    }
  }

  private async saveToLocal(data: UserData): Promise<void> {
    try {
      const storageKeys = {
        habits: `habits_${this.userId}`,
        activities: `activities_${this.userId}`,
        shows: `shows_${this.userId}`,
        sports: `sports_${this.userId}`,
        tasks: `tasks_${this.userId}`,
        taskProjects: `task_projects_${this.userId}`,
        taskTimeEntries: `task_time_entries_${this.userId}`,
      };

      await unifiedStorage.setItem(storageKeys.habits, JSON.stringify(data.habits || []));
      await unifiedStorage.setItem(storageKeys.activities, JSON.stringify(data.activities || []));
      await unifiedStorage.setItem(storageKeys.shows, JSON.stringify(data.shows || []));
      await unifiedStorage.setItem(storageKeys.sports, JSON.stringify(data.sports || []));
      await unifiedStorage.setItem(storageKeys.tasks, JSON.stringify(data.tasks || []));
      await unifiedStorage.setItem(storageKeys.taskProjects, JSON.stringify(data.taskProjects || []));
      await unifiedStorage.setItem(storageKeys.taskTimeEntries, JSON.stringify(data.taskTimeEntries || []));

      if (data.userProfile) {
        await unifiedStorage.setItem(`@user_profile_${this.userId}`, JSON.stringify(data.userProfile));
      }

      console.log('Data saved to local storage');
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  setupRealtimeSync(onDataChange: (data: UserData) => void): () => void {
    if (this.firebaseDisabled || !firebaseAvailable) {
      console.log('Firebase disabled/unavailable, skipping realtime sync setup');
      return () => {};
    }
    try {
      const unsubscribe = onSnapshot(this.getDocRef(), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          console.log('Realtime update from Firebase for user:', this.userId);
          onDataChange(data);
        }
      }, (error) => {
        console.warn('Realtime sync error (disabling Firebase sync):', error?.message || error);
        this.handleFirebaseFailure(error);
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
      });

      this.unsubscribe = unsubscribe;
      return unsubscribe;
    } catch (error) {
      console.warn('Failed to setup realtime sync:', error);
      this.handleFirebaseFailure(error);
      return () => {};
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const createFirebaseSync = (userId: string) => {
  return new FirebaseUserSync(userId);
};

export const useFirebaseSync = (userId: string | undefined) => {
  const sync = React.useMemo(() => {
    return userId ? createFirebaseSync(userId) : null;
  }, [userId]);

  return React.useMemo(() => ({
    syncWithFirebase: sync ? sync.syncWithFirebase.bind(sync) : async () => null,
    saveToFirebase: sync ? sync.saveToFirebase.bind(sync) : async () => {},
    loadFromFirebase: sync ? sync.loadFromFirebase.bind(sync) : async () => null,
    setupRealtimeSync: sync ? sync.setupRealtimeSync.bind(sync) : () => () => {},
    cleanup: sync ? sync.cleanup.bind(sync) : () => {},
  }), [sync]);
};
