import React from 'react';
import { supabase, supabaseConfigured } from './supabaseClient';
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

const TABLE = 'user_data';
const MAX_SNAPSHOTS = 8;

type SnapshotReason = 'cloud_pull' | 'cloud_push' | 'manual_backup';

type SnapshotMeta = {
  key: string;
  createdAt: string;
  reason: SnapshotReason;
};

const SNAPSHOT_MANIFEST_KEY = (userId: string) => `sync_snapshot_manifest_${userId}`;
const SNAPSHOT_KEY = (userId: string, createdAt: string) => `sync_snapshot_${userId}_${createdAt}`;

const ARRAY_MERGE_KEYS: (keyof UserData)[] = [
  'habits',
  'activities',
  'shows',
  'sports',
  'tasks',
  'taskProjects',
  'taskTimeEntries',
];

const USER_SCOPED_STORAGE_KEYS = {
  habits: (userId: string) => `habits_${userId}`,
  activities: (userId: string) => `activities_${userId}`,
  shows: (userId: string) => `shows_${userId}`,
  sports: (userId: string) => `sports_${userId}`,
  tasks: (userId: string) => `tasks_${userId}`,
  taskProjects: (userId: string) => `task_projects_${userId}`,
  taskTimeEntries: (userId: string) => `task_time_entries_${userId}`,
  userProfile: (userId: string) => `@user_profile_${userId}`,
};

export class SupabaseUserSync {
  private userId: string;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private disabled: boolean = false;
  private failureCount: number = 0;
  private static readonly MAX_FAILURES = 3;

  constructor(userId: string) {
    this.userId = userId;
    if (!supabaseConfigured) {
      this.disabled = true;
    }
  }

  private handleFailure(error: any): void {
    this.failureCount++;
    const msg = error?.message || String(error);
    if (this.failureCount >= SupabaseUserSync.MAX_FAILURES) {
      this.disabled = true;
      console.log('Supabase sync disabled after repeated failures. Using local storage only.');
    } else {
      console.warn('Supabase sync failure:', msg);
    }
  }

  get isDisabled(): boolean {
    return this.disabled;
  }

  private withTimeout<T>(promise: PromiseLike<T>, ms: number = 8000): Promise<T> {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase operation timed out')), ms)
      ),
    ]);
  }

  private parseIsoTime(value: unknown): number {
    if (!value || typeof value !== 'string') return 0;
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }

  private mergeArrayById(localItems: any[], cloudItems: any[]): any[] {
    const byId = new Map<string, any>();
    const localWithoutId: any[] = [];
    const cloudWithoutId: any[] = [];

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
      const localTs = this.parseIsoTime(item?.updatedAt) || this.parseIsoTime(item?.createdAt);
      const cloudTs = this.parseIsoTime(existing?.updatedAt) || this.parseIsoTime(existing?.createdAt);
      if (localTs >= cloudTs) {
        byId.set(key, item);
      }
    }

    return [...byId.values(), ...cloudWithoutId, ...localWithoutId];
  }

  /**
   * If Supabase has an empty array for a domain but local disk still has items,
   * treat cloud as corrupted/out-of-sync and prefer local (self-heal).
   * Does not replace non-empty cloud data with local (avoids wiping remote wins).
   */
  private reconcileCloudWithLocalDisk(
    cloud: Partial<UserData> | null | undefined,
    localDisk: Partial<UserData> | null | undefined
  ): Partial<UserData> {
    const c = removeUndefined({ ...(cloud || {}) }) as Partial<UserData>;
    const l = removeUndefined({ ...(localDisk || {}) }) as Partial<UserData>;

    for (const key of ARRAY_MERGE_KEYS) {
      const cloudArr = Array.isArray(c[key]) ? (c[key] as any[]) : undefined;
      const localArr = Array.isArray(l[key]) ? (l[key] as any[]) : undefined;
      const cloudEmpty = !cloudArr || cloudArr.length === 0;
      const localHas = !!(localArr && localArr.length > 0);
      if (cloudEmpty && localHas) {
        (c as any)[key] = localArr;
      }
    }

    return c;
  }

  private mergePayload(existing: Partial<UserData> | null, incoming: Partial<UserData>): Partial<UserData> {
    const base = removeUndefined({ ...(existing || {}) }) as Partial<UserData>;
    const next = removeUndefined({ ...incoming }) as Partial<UserData>;
    const merged: Partial<UserData> = { ...base, ...next };

    for (const key of ARRAY_MERGE_KEYS) {
      const incomingArr = Array.isArray(next[key]) ? (next[key] as any[]) : undefined;
      if (incomingArr) {
        // Treat explicitly provided arrays as source-of-truth snapshots.
        // This preserves deletions (e.g. habit removed locally) instead of
        // resurrecting rows from older cloud state.
        merged[key] = incomingArr as any;
      }
    }

    if (base.userProfile && next.userProfile && typeof base.userProfile === 'object' && typeof next.userProfile === 'object') {
      merged.userProfile = { ...base.userProfile, ...next.userProfile } as any;
    }

    return merged;
  }

  private async saveSnapshot(data: Partial<UserData>, reason: SnapshotReason): Promise<void> {
    try {
      const createdAt = new Date().toISOString();
      const key = SNAPSHOT_KEY(this.userId, createdAt);
      const snapshotPayload = removeUndefined({
        createdAt,
        reason,
        data,
      });
      await unifiedStorage.setItem(key, JSON.stringify(snapshotPayload));

      const manifestRaw = await unifiedStorage.getItem(SNAPSHOT_MANIFEST_KEY(this.userId));
      const manifest: SnapshotMeta[] = manifestRaw ? JSON.parse(manifestRaw) : [];
      const nextManifest = [{ key, createdAt, reason }, ...manifest].slice(0, MAX_SNAPSHOTS);

      if (manifest.length >= MAX_SNAPSHOTS) {
        const toDelete = manifest.slice(MAX_SNAPSHOTS - 1);
        for (const entry of toDelete) {
          await unifiedStorage.removeItem(entry.key);
        }
      }

      await unifiedStorage.setItem(SNAPSHOT_MANIFEST_KEY(this.userId), JSON.stringify(nextManifest));
      await unifiedStorage.setItem(`sync_last_snapshot_time_${this.userId}`, createdAt);
    } catch (error) {
      console.warn('Failed to save sync snapshot:', error);
    }
  }

  async listSnapshots(): Promise<SnapshotMeta[]> {
    try {
      const raw = await unifiedStorage.getItem(SNAPSHOT_MANIFEST_KEY(this.userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async restoreSnapshot(snapshotKey?: string): Promise<{ success: boolean; restoredAt?: string; error?: string }> {
    try {
      const manifest = await this.listSnapshots();
      if (manifest.length === 0) {
        return { success: false, error: 'No snapshots available' };
      }
      const target = snapshotKey ? manifest.find((entry) => entry.key === snapshotKey) : manifest[0];
      if (!target) return { success: false, error: 'Snapshot not found' };

      const raw = await unifiedStorage.getItem(target.key);
      if (!raw) return { success: false, error: 'Snapshot data missing' };
      const parsed = JSON.parse(raw) as { data?: Partial<UserData> };
      const snapshot = parsed?.data;
      if (!snapshot) return { success: false, error: 'Snapshot payload invalid' };

      if (Array.isArray(snapshot.habits)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.habits(this.userId), JSON.stringify(snapshot.habits));
      }
      if (Array.isArray(snapshot.activities)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.activities(this.userId), JSON.stringify(snapshot.activities));
      }
      if (Array.isArray(snapshot.shows)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.shows(this.userId), JSON.stringify(snapshot.shows));
      }
      if (Array.isArray(snapshot.sports)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.sports(this.userId), JSON.stringify(snapshot.sports));
      }
      if (Array.isArray(snapshot.tasks)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.tasks(this.userId), JSON.stringify(snapshot.tasks));
      }
      if (Array.isArray(snapshot.taskProjects)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.taskProjects(this.userId), JSON.stringify(snapshot.taskProjects));
      }
      if (Array.isArray(snapshot.taskTimeEntries)) {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.taskTimeEntries(this.userId), JSON.stringify(snapshot.taskTimeEntries));
      }
      if (snapshot.userProfile && typeof snapshot.userProfile === 'object') {
        await unifiedStorage.setItem(USER_SCOPED_STORAGE_KEYS.userProfile(this.userId), JSON.stringify(snapshot.userProfile));
      }

      await unifiedStorage.setItem(`sync_last_restore_time_${this.userId}`, new Date().toISOString());
      return { success: true, restoredAt: target.createdAt };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to restore snapshot' };
    }
  }

  async saveToCloud(data: Partial<UserData>): Promise<void> {
    if (this.disabled) {
      await this.saveToLocalFallback(data);
      return;
    }
    try {
      const sessionOk = await this.ensureAuthSessionMatchesUser();
      if (!sessionOk) {
        // Avoid writing partial payloads when auth session is not fully ready yet.
        await this.saveToLocalFallback(data);
        return;
      }

      const rawCloud = await this.fetchCloudUserDataRow();
      const localBaseline = await this.loadUserScopedBaseline();
      const existing = this.reconcileCloudWithLocalDisk(rawCloud, localBaseline);
      const merged = removeUndefined({
        ...this.mergePayload(existing, data),
        userId: this.userId,
        lastSynced: new Date().toISOString(),
      });

      const { error } = await this.withTimeout(
        supabase
          .from(TABLE)
          .upsert(
            {
              user_id: this.userId,
              data: merged,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
      );

      if (error) throw error;
      this.failureCount = 0;
      await this.saveSnapshot(merged, 'cloud_push');
      console.log('Data saved to Supabase for user:', this.userId);
    } catch (error: any) {
      console.warn('Supabase save failed, using local fallback:', error?.message || String(error));
      this.handleFailure(error);
      await this.saveToLocalFallback(data);
    }
  }

  private async saveToLocalFallback(data: Partial<UserData>): Promise<void> {
    try {
      const existingLocal = await this.loadFromLocalFallback();
      const sanitized = removeUndefined({
        ...this.mergePayload(existingLocal, data),
        userId: this.userId,
        lastSynced: new Date().toISOString(),
      });
      await unifiedStorage.setItem(
        `sync_userData_${this.userId}`,
        JSON.stringify(sanitized)
      );
    } catch (fallbackError) {
      console.error('Local fallback save failed:', fallbackError);
    }
  }

  private async loadUserScopedBaseline(): Promise<Partial<UserData> | null> {
    try {
      const [
        habitsRaw,
        activitiesRaw,
        showsRaw,
        sportsRaw,
        tasksRaw,
        taskProjectsRaw,
        taskTimeEntriesRaw,
        profileRaw,
      ] = await Promise.all([
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.habits(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.activities(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.shows(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.sports(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.tasks(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.taskProjects(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.taskTimeEntries(this.userId)),
        unifiedStorage.getItem(USER_SCOPED_STORAGE_KEYS.userProfile(this.userId)),
      ]);

      return removeUndefined({
        habits: habitsRaw ? JSON.parse(habitsRaw) : [],
        activities: activitiesRaw ? JSON.parse(activitiesRaw) : [],
        shows: showsRaw ? JSON.parse(showsRaw) : [],
        sports: sportsRaw ? JSON.parse(sportsRaw) : [],
        tasks: tasksRaw ? JSON.parse(tasksRaw) : [],
        taskProjects: taskProjectsRaw ? JSON.parse(taskProjectsRaw) : [],
        taskTimeEntries: taskTimeEntriesRaw ? JSON.parse(taskTimeEntriesRaw) : [],
        userProfile: profileRaw ? JSON.parse(profileRaw) : undefined,
      }) as Partial<UserData>;
    } catch (error) {
      console.warn('Failed to build user-scoped baseline for sync:', error);
      return null;
    }
  }

  /** Raw JSON `data` from Supabase — no reconcile/snapshot (used before merge on save). */
  private async fetchCloudUserDataRow(): Promise<UserData | null> {
    if (!supabaseConfigured) return null;
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(TABLE)
          .select('data')
          .eq('user_id', this.userId)
          .maybeSingle()
      );
      if (error) throw error;
      if (data?.data) return data.data as UserData;
      return null;
    } catch {
      return null;
    }
  }

  /** Avoid RLS returning zero rows because REST ran before the JWT was attached (common right after login). */
  private async ensureAuthSessionMatchesUser(): Promise<boolean> {
    if (!supabaseConfigured) return true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return (
        !!session?.access_token &&
        session.user?.id === this.userId
      );
    };
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 400));
    return check();
  }

  async loadFromCloud(): Promise<UserData | null> {
    if (this.disabled) {
      return this.loadFromLocalFallback();
    }
    try {
      const sessionOk = await this.ensureAuthSessionMatchesUser();
      if (!sessionOk) {
        if (__DEV__) {
          console.warn(
            'loadFromCloud: Supabase session not ready or user id mismatch, skipping (will retry on next effect).',
            { expected: this.userId }
          );
        }
        return null;
      }
      const { data, error } = await this.withTimeout(
        supabase
          .from(TABLE)
          .select('data')
          .eq('user_id', this.userId)
          .maybeSingle()
      );
      if (error) throw error;
      this.failureCount = 0;
      if (data?.data) {
        const raw = data.data as UserData;
        const localBaseline = await this.loadUserScopedBaseline();
        const payload = this.reconcileCloudWithLocalDisk(raw, localBaseline) as UserData;
        await this.saveSnapshot(payload, 'cloud_pull');
        return payload;
      }
      return null;
    } catch (error: any) {
      console.warn('Supabase load failed, using local fallback:', error?.message || String(error));
      this.handleFailure(error);
      return this.loadFromLocalFallback();
    }
  }

  private async loadFromLocalFallback(): Promise<UserData | null> {
    try {
      const stored = await unifiedStorage.getItem(`sync_userData_${this.userId}`);
      if (stored) return JSON.parse(stored) as UserData;
      return null;
    } catch {
      return null;
    }
  }

  setupRealtimeSync(onDataChange: (data: UserData) => void): () => void {
    if (this.disabled) return () => {};
    try {
      this.channel = supabase
        .channel(`user_data_${this.userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: TABLE,
            filter: `user_id=eq.${this.userId}`,
          },
          (payload: any) => {
            const newRow = payload?.new?.data;
            if (newRow) {
              console.log('Realtime update from Supabase for user:', this.userId);
              void this.loadUserScopedBaseline().then((baseline) => {
                const fixed = this.reconcileCloudWithLocalDisk(newRow as UserData, baseline) as UserData;
                onDataChange(fixed);
              });
            }
          }
        )
        .subscribe();

      return () => {
        this.cleanup();
      };
    } catch (error) {
      console.warn('Failed to setup realtime sync:', error);
      this.handleFailure(error);
      return () => {};
    }
  }

  cleanup() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const createSupabaseSync = (userId: string) => new SupabaseUserSync(userId);

export const useSupabaseSync = (userId: string | undefined) => {
  const sync = React.useMemo(() => {
    return userId ? createSupabaseSync(userId) : null;
  }, [userId]);

  return React.useMemo(
    () => ({
      saveToCloud: sync ? sync.saveToCloud.bind(sync) : async (_d: Partial<UserData>) => {},
      loadFromCloud: sync ? sync.loadFromCloud.bind(sync) : async () => null,
      setupRealtimeSync: sync ? sync.setupRealtimeSync.bind(sync) : () => () => {},
      cleanup: sync ? sync.cleanup.bind(sync) : () => {},
      listSnapshots: sync ? sync.listSnapshots.bind(sync) : async () => [],
      restoreSnapshot: sync ? sync.restoreSnapshot.bind(sync) : async () => ({ success: false, error: 'No sync context' }),
    }),
    [sync]
  );
};
