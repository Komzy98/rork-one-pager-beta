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

  async saveToCloud(data: Partial<UserData>): Promise<void> {
    if (this.disabled) {
      await this.saveToLocalFallback(data);
      return;
    }
    try {
      const existing = await this.loadFromCloud();
      const merged = removeUndefined({
        ...(existing || {}),
        ...data,
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
      console.log('Data saved to Supabase for user:', this.userId);
    } catch (error: any) {
      console.warn('Supabase save failed, using local fallback:', error?.message || String(error));
      this.handleFailure(error);
      await this.saveToLocalFallback(data);
    }
  }

  private async saveToLocalFallback(data: Partial<UserData>): Promise<void> {
    try {
      const sanitized = removeUndefined({
        ...data,
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

  async loadFromCloud(): Promise<UserData | null> {
    if (this.disabled) {
      return this.loadFromLocalFallback();
    }
    try {
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
        return data.data as UserData;
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
              onDataChange(newRow as UserData);
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
    }),
    [sync]
  );
};
