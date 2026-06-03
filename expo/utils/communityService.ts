import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { isSocialUnavailableError } from '@/utils/friendsService';
import type { CommunityHabit } from '@/types/habit';

export interface HabitStats {
  saves: number;
  likes: number;
}

export interface PublishHabitInput {
  creatorId: string;
  creatorName?: string | null;
  creatorUsername?: string | null;
  creatorAvatar?: string | null;
  name: string;
  description?: string | null;
  longDescription?: string | null;
  icon?: string | null;
  color?: string | null;
  category: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  estimatedDuration?: string | null;
  tags?: string[];
  benefits?: string[];
  frequency?: { type?: string; days: number[]; timesPerWeek?: number };
}

interface CommunityHabitRow {
  id: string;
  creator_id: string;
  creator_name: string | null;
  creator_username: string | null;
  creator_avatar: string | null;
  name: string;
  description: string | null;
  long_description: string | null;
  icon: string | null;
  color: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | null;
  estimated_duration: string | null;
  tags: string[] | null;
  frequency: { type?: string; days?: number[]; timesPerWeek?: number } | null;
  benefits: string[] | null;
  created_at: string;
}

export { isSocialUnavailableError };

function ensureConfigured() {
  if (!supabaseConfigured) {
    throw Object.assign(new Error('Supabase is not configured'), { code: 'NOT_CONFIGURED' });
  }
}

function mapRow(row: CommunityHabitRow, stats?: HabitStats): CommunityHabit {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    color: row.color || '#6366F1',
    frequency: {
      type: row.frequency?.type as CommunityHabit['frequency']['type'],
      days: row.frequency?.days ?? [],
      timesPerWeek: row.frequency?.timesPerWeek,
    },
    category: (row.category as CommunityHabit['category']) ?? 'Other',
    user: {
      id: row.creator_id,
      name: row.creator_name || row.creator_username || 'One Pager user',
      avatar: row.creator_avatar ?? undefined,
    },
    likes: stats?.likes ?? 0,
    saves: stats?.saves ?? 0,
    difficulty: row.difficulty ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    longDescription: row.long_description ?? undefined,
    benefits: row.benefits ?? undefined,
  };
}

export async function checkCommunityAvailable(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { error } = await supabase.from('community_habits').select('id').limit(1);
    if (error) return !isSocialUnavailableError(error);
    return true;
  } catch {
    return false;
  }
}

export async function getStats(habitIds: string[]): Promise<Map<string, HabitStats>> {
  const map = new Map<string, HabitStats>();
  if (!supabaseConfigured || habitIds.length === 0) return map;
  const { data, error } = await supabase
    .from('community_habit_stats')
    .select('habit_id, saves, likes')
    .in('habit_id', habitIds);
  if (error) throw error;
  for (const row of data as { habit_id: string; saves: number; likes: number }[]) {
    map.set(row.habit_id, { saves: row.saves ?? 0, likes: row.likes ?? 0 });
  }
  return map;
}

export async function listPublicHabits(limit = 100): Promise<CommunityHabit[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('community_habits')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data as CommunityHabitRow[];
  const stats = await getStats(rows.map((r) => r.id));
  return rows.map((r) => mapRow(r, stats.get(r.id)));
}

export async function listMyPublishedHabits(userId: string): Promise<CommunityHabit[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('community_habits')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data as CommunityHabitRow[];
  const stats = await getStats(rows.map((r) => r.id));
  return rows.map((r) => mapRow(r, stats.get(r.id)));
}

export async function publishHabit(input: PublishHabitInput): Promise<CommunityHabit> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('community_habits')
    .insert({
      creator_id: input.creatorId,
      creator_name: input.creatorName ?? null,
      creator_username: input.creatorUsername ?? null,
      creator_avatar: input.creatorAvatar ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      long_description: input.longDescription ?? null,
      icon: input.icon ?? null,
      color: input.color ?? '#6366F1',
      category: input.category,
      difficulty: input.difficulty ?? null,
      estimated_duration: input.estimatedDuration ?? null,
      tags: input.tags ?? [],
      benefits: input.benefits ?? [],
      frequency: input.frequency ?? { type: 'daily', days: [] },
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data as CommunityHabitRow);
}

export async function deleteMyHabit(habitId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.from('community_habits').delete().eq('id', habitId);
  if (error) throw error;
}

export async function getMySavedIds(userId: string): Promise<Set<string>> {
  if (!supabaseConfigured) return new Set();
  const { data, error } = await supabase
    .from('community_saves')
    .select('habit_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data as { habit_id: string }[]).map((r) => r.habit_id));
}

export async function getMyLikedIds(userId: string): Promise<Set<string>> {
  if (!supabaseConfigured) return new Set();
  const { data, error } = await supabase
    .from('community_likes')
    .select('habit_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data as { habit_id: string }[]).map((r) => r.habit_id));
}

/** Returns the new public save count for the habit. */
export async function toggleSave(habitId: string, saved: boolean): Promise<number> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('toggle_community_save', {
    p_habit_id: habitId,
    p_saved: saved,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** Returns the new public like count for the habit. */
export async function toggleLike(habitId: string, liked: boolean): Promise<number> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('toggle_community_like', {
    p_habit_id: habitId,
    p_liked: liked,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export function subscribeToCommunity(onChange: () => void): () => void {
  if (!supabaseConfigured) return () => {};
  try {
    const channel = supabase
      .channel('community_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_habit_stats' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_habits' }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
