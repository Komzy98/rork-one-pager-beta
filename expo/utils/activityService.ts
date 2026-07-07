import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { isSocialUnavailableError } from '@/utils/friendsService';

export type ActivityType =
  | 'streak_milestone'
  | 'published_habit'
  | 'challenge_joined'
  | 'achievement'
  | 'workout'
  | 'event_saved'
  | 'event_planned'
  | 'event_attending'
  | 'match_pinned'
  | 'show_saved'
  | 'custom';

export interface FeedAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  cheersCount: number;
  createdAt: string;
  author: FeedAuthor | null;
  cheeredByMe: boolean;
}

interface EventRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  cheers_count: number;
  created_at: string;
}

export { isSocialUnavailableError };

function ensureConfigured() {
  if (!supabaseConfigured) {
    throw Object.assign(new Error('Supabase is not configured'), { code: 'NOT_CONFIGURED' });
  }
}

async function fetchAuthors(ids: string[]): Promise<Map<string, FeedAuthor>> {
  const map = new Map<string, FeedAuthor>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);
  if (error) throw error;
  for (const row of data as { id: string; username: string; display_name: string | null; avatar_url: string | null }[]) {
    map.set(row.id, {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    });
  }
  return map;
}

export async function checkActivityAvailable(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { error } = await supabase.from('activity_events').select('id').limit(1);
    if (error) return !isSocialUnavailableError(error);
    return true;
  } catch {
    return false;
  }
}

export interface LogEventInput {
  userId: string;
  type: ActivityType;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logEvent(input: LogEventInput): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from('activity_events')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();
  if (error) {
    if (isSocialUnavailableError(error)) return null;
    throw error;
  }
  return (data as { id: string }).id;
}

export async function getFeed(
  myUserId: string,
  friendIds: string[],
  limit = 40,
): Promise<ActivityEvent[]> {
  ensureConfigured();
  const authorIds = Array.from(new Set([myUserId, ...friendIds]));
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .in('user_id', authorIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data as EventRow[];

  const authors = await fetchAuthors(Array.from(new Set(rows.map((r) => r.user_id))));

  // Which of these did I cheer?
  let cheeredSet = new Set<string>();
  if (rows.length > 0) {
    const { data: reactions } = await supabase
      .from('activity_reactions')
      .select('event_id')
      .eq('user_id', myUserId)
      .in('event_id', rows.map((r) => r.id));
    cheeredSet = new Set((reactions as { event_id: string }[] | null)?.map((r) => r.event_id) ?? []);
  }

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type as ActivityType,
    title: r.title,
    body: r.body,
    metadata: r.metadata ?? {},
    cheersCount: r.cheers_count ?? 0,
    createdAt: r.created_at,
    author: authors.get(r.user_id) ?? null,
    cheeredByMe: cheeredSet.has(r.id),
  }));
}

/** Returns the new cheer count for the event. */
export async function toggleCheer(eventId: string, on: boolean): Promise<number> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('toggle_cheer', { p_event_id: eventId, p_on: on });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** Count of friends whose last activity was today (lightweight presence). */
export async function getActiveTodayCount(friendIds: string[]): Promise<number> {
  if (!supabaseConfigured || friendIds.length === 0) return 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('id', friendIds)
    .gte('last_active_at', startOfDay.toISOString());
  if (error) {
    if (isSocialUnavailableError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export interface ActivitySubscriptionHandlers {
  onChange: () => void;
  /** A cheer landed on one of MY events (count increased). */
  onCheerOnMyEvent?: () => void;
}

export function subscribeToActivity(
  myUserId: string,
  handlers: ActivitySubscriptionHandlers,
): () => void {
  if (!supabaseConfigured) return () => {};
  const { onChange, onCheerOnMyEvent } = handlers;
  try {
    const channel = supabase
      .channel(`activity_${myUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_events' }, onChange)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activity_events', filter: `user_id=eq.${myUserId}` },
        (payload: any) => {
          const next = payload?.new?.cheers_count ?? 0;
          const prev = payload?.old?.cheers_count ?? 0;
          if (next > prev) onCheerOnMyEvent?.();
          onChange();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
