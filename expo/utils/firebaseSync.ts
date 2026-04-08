import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { User, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth, firebaseAvailable, setFirebaseAvailable } from './firebaseConfig';

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

class FirebaseSync {
  private user: User | null = null;
  private listeners: (() => void)[] = [];
  private disabled: boolean = false;
  private failureCount: number = 0;
  private static readonly MAX_FAILURES = 3;

  private isPermissionError(error: any): boolean {
    const msg = error?.message || error?.code || String(error);
    return msg.includes('permission') || msg.includes('PERMISSION_DENIED') || msg.includes('insufficient') || msg.includes('unauthorized');
  }

  private handleFailure(error: any): void {
    this.failureCount++;
    const msg = error?.message || String(error);
    const isConnectionError = msg.includes('unavailable') || msg.includes('Could not reach') || msg.includes('timed out') || msg.includes('network');
    if (this.isPermissionError(error) || this.failureCount >= FirebaseSync.MAX_FAILURES) {
      this.disabled = true;
      if (isConnectionError) {
        setFirebaseAvailable(false);
        console.log('Firebase backend unreachable. App will use local storage. Will retry on next app launch.');
      } else {
        console.log('FirebaseSync disabled due to permission error or repeated failures. App will use local storage.');
      }
    }
  }

  get isDisabled(): boolean {
    return this.disabled;
  }

  async initialize() {
    try {
      if (auth.currentUser) {
        this.user = auth.currentUser;
        console.log('Firebase using existing user:', this.user.uid);
        return this.user;
      }

      return new Promise<User | null>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('Firebase auth timeout - no user found');
          resolve(null);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          clearTimeout(timeout);
          unsubscribe();
          this.user = user;
          if (user) {
            console.log('Firebase authenticated user:', user.uid);
          } else {
            console.log('No Firebase user found');
          }
          resolve(user);
        });
      });
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return null;
    }
  }

  setUser(_userId: string) {
    this.user = auth.currentUser;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase operation timed out')), ms)
      ),
    ]);
  }

  async syncToCloud(data: Partial<SyncableData>) {
    if (this.disabled || !firebaseAvailable) {
      console.log('FirebaseSync disabled or unavailable, skipping cloud upload');
      return;
    }
    if (!this.user) {
      console.log('No Firebase user, skipping cloud sync');
      return;
    }
    try {
      const docRef = doc(db, 'users', this.user.uid);
      await this.withTimeout(setDoc(docRef, {
        ...data,
        lastSynced: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true }));
      this.failureCount = 0;
      console.log('Data synced to Firebase');
    } catch (error) {
      console.warn('Failed to sync to Firebase:', error);
      this.handleFailure(error);
    }
  }

  async syncFromCloud(): Promise<Partial<SyncableData> | null> {
    if (this.disabled || !firebaseAvailable) {
      console.log('FirebaseSync disabled or unavailable, skipping cloud download');
      return null;
    }
    if (!this.user) {
      console.log('No Firebase user, skipping cloud download');
      return null;
    }
    try {
      const docRef = doc(db, 'users', this.user.uid);
      const docSnap = await this.withTimeout(getDoc(docRef));
      this.failureCount = 0;

      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<SyncableData>;
        console.log('Data loaded from Firebase');
        return data;
      }
      console.log('No cloud data found for user');
      return null;
    } catch (error) {
      console.warn('Failed to sync from Firebase:', error);
      this.handleFailure(error);
      return null;
    }
  }

  setupRealtimeSync(callback: (data: Partial<SyncableData>) => void) {
    if (this.disabled || !firebaseAvailable) {
      console.log('FirebaseSync disabled or unavailable, skipping realtime sync');
      return () => {};
    }
    if (!this.user) {
      console.log('Cannot setup realtime sync: no user');
      return () => {};
    }

    try {
      const docRef = doc(db, 'users', this.user.uid);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<SyncableData>;
          console.log('Realtime update received from Firebase');
          callback(data);
        }
      }, (error) => {
        console.warn('Realtime sync error (disabling):', error);
        this.handleFailure(error);
      });

      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.warn('Failed to setup realtime sync:', error);
      this.handleFailure(error);
      return () => {};
    }
  }

  async mergeData(localData: Partial<SyncableData>, cloudData: Partial<SyncableData>): Promise<Partial<SyncableData>> {
    const localTimestamp = await AsyncStorage.getItem('lastLocalUpdate');
    const cloudTimestamp = (cloudData as any).lastSynced;

    if (!cloudTimestamp || (localTimestamp && localTimestamp > cloudTimestamp)) {
      return { ...cloudData, ...localData };
    } else {
      return { ...localData, ...cloudData };
    }
  }

  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
  }
}

export const firebaseSync = new FirebaseSync();

export const initializeCloudSync = async (): Promise<boolean> => {
  try {
    const user = await firebaseSync.initialize();
    if (user) {
      console.log('Cloud sync initialized with Firebase');
      return true;
    }
    console.log('Firebase auth not available');
    return false;
  } catch (error) {
    console.error('Cloud sync initialization failed:', error);
    return false;
  }
};

export const syncAllDataToCloud = async (data: Partial<SyncableData>) => {
  try {
    await firebaseSync.syncToCloud(data);
    return true;
  } catch (error) {
    console.error('Sync to cloud failed:', error);
    return false;
  }
};

export const syncAllDataFromCloud = async (): Promise<Partial<SyncableData> | null> => {
  try {
    return await firebaseSync.syncFromCloud();
  } catch (error) {
    console.error('Sync from cloud failed:', error);
    return null;
  }
};

export const useFirebaseSync = (onDataReceived: (data: Partial<SyncableData>) => void) => {
  const setupSync = async () => {
    firebaseSync.setupRealtimeSync(onDataReceived);
  };

  return { setupSync, syncToCloud: syncAllDataToCloud, syncFromCloud: syncAllDataFromCloud };
};
