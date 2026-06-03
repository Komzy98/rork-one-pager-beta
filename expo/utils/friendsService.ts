import { supabase, supabaseConfigured } from '@/utils/supabaseClient';

export type ActivityVisibility = 'public' | 'friends' | 'private';

export interface SocialProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  currentStreak: number;
  totalCompletions: number;
  level: number;
  lastActiveAt: string;
  activityVisibility: ActivityVisibility;
}

export interface IncomingRequest {
  id: string;
  createdAt: string;
  from: SocialProfile;
}

export interface OutgoingRequest {
  id: string;
  createdAt: string;
  toUserId: string;
  to: SocialProfile | null;
}

export interface FriendNudge {
  id: string;
  createdAt: string;
  message: string | null;
  read: boolean;
  fromUserId: string;
  from: SocialProfile | null;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  total_completions: number;
  level: number;
  last_active_at: string;
  activity_visibility?: ActivityVisibility | null;
}

function mapProfile(row: ProfileRow): SocialProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    currentStreak: row.current_streak ?? 0,
    totalCompletions: row.total_completions ?? 0,
    level: row.level ?? 1,
    lastActiveAt: row.last_active_at,
    activityVisibility: (row.activity_visibility ?? 'friends') as ActivityVisibility,
  };
}

/** Thrown errors that mean "the social tables haven't been created yet". */
export function isSocialUnavailableError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42P01') return true; // undefined_table
  const msg = (e.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

export function slugifyUsername(base: string): string {
  const s = (base || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  return s.length >= 3 ? s : `user${Math.floor(1000 + Math.random() * 9000)}`;
}

function ensureConfigured() {
  if (!supabaseConfigured) {
    throw Object.assign(new Error('Supabase is not configured'), { code: 'NOT_CONFIGURED' });
  }
}

/** Lightweight probe: are the social tables present + reachable? */
export async function checkSocialAvailable(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) return !isSocialUnavailableError(error);
    return true;
  } catch {
    return false;
  }
}

export interface MyProfileInput {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  currentStreak?: number;
  totalCompletions?: number;
  level?: number;
  username?: string;
}

/**
 * Make sure the signed-in user has a `profiles` row, generating a unique
 * username on first use, and refresh the published stats (streak etc.).
 */
export async function ensureMyProfile(input: MyProfileInput): Promise<SocialProfile> {
  ensureConfigured();
  const stats = {
    display_name: input.displayName ?? null,
    avatar_url: input.avatarUrl ?? null,
    current_streak: input.currentStreak ?? 0,
    total_completions: input.totalCompletions ?? 0,
    level: input.level ?? 1,
    last_active_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', input.userId)
    .maybeSingle();
  if (selErr && !isSocialUnavailableError(selErr)) throw selErr;
  if (selErr && isSocialUnavailableError(selErr)) throw selErr;

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...stats, ...(input.username ? { username: input.username } : {}) })
      .eq('id', input.userId)
      .select('*')
      .single();
    if (error) throw error;
    return mapProfile(data as ProfileRow);
  }

  // Insert with a unique username (retry on collision).
  const base = slugifyUsername(input.username || input.displayName || input.email?.split('@')[0] || '');
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(10 + Math.random() * 9990)}`;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: input.userId, username: candidate, ...stats })
      .select('*')
      .single();
    if (!error && data) return mapProfile(data as ProfileRow);
    if (error && (error as { code?: string }).code !== '23505') throw error; // not a unique violation
  }
  throw new Error('Could not allocate a unique username');
}

export async function updateActivityVisibility(
  userId: string,
  visibility: ActivityVisibility,
): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('profiles')
    .update({ activity_visibility: visibility, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function searchProfiles(query: string, myUserId: string): Promise<SocialProfile[]> {
  ensureConfigured();
  const q = query.trim().replace(/^@/, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${q}%`)
    .neq('id', myUserId)
    .limit(20);
  if (error) throw error;
  return (data as ProfileRow[]).map(mapProfile);
}

export async function getProfileByUsername(username: string): Promise<SocialProfile | null> {
  ensureConfigured();
  const u = username.trim().replace(/^@/, '');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', u)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as ProfileRow) : null;
}

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, SocialProfile>> {
  const map = new Map<string, SocialProfile>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  for (const row of data as ProfileRow[]) map.set(row.id, mapProfile(row));
  return map;
}

export async function listFriends(myUserId: string): Promise<SocialProfile[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', myUserId);
  if (error) throw error;
  const ids = (data as { friend_id: string }[]).map((r) => r.friend_id);
  const profiles = await fetchProfilesByIds(ids);
  return ids.map((id) => profiles.get(id)).filter((p): p is SocialProfile => !!p);
}

export async function listIncomingRequests(myUserId: string): Promise<IncomingRequest[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user, created_at')
    .eq('to_user', myUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data as { id: string; from_user: string; created_at: string }[];
  const profiles = await fetchProfilesByIds(rows.map((r) => r.from_user));
  return rows
    .map((r) => {
      const from = profiles.get(r.from_user);
      return from ? { id: r.id, createdAt: r.created_at, from } : null;
    })
    .filter((r): r is IncomingRequest => !!r);
}

export async function listOutgoingRequests(myUserId: string): Promise<OutgoingRequest[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, to_user, created_at')
    .eq('from_user', myUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data as { id: string; to_user: string; created_at: string }[];
  const profiles = await fetchProfilesByIds(rows.map((r) => r.to_user));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    toUserId: r.to_user,
    to: profiles.get(r.to_user) ?? null,
  }));
}

export type SendRequestResult =
  | { ok: true }
  | { ok: false; reason: 'already_friends' | 'already_requested' | 'self' | 'error'; message?: string };

export async function sendFriendRequest(myUserId: string, toUserId: string): Promise<SendRequestResult> {
  ensureConfigured();
  if (myUserId === toUserId) return { ok: false, reason: 'self' };

  // Already friends?
  const { data: existingFriend } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', myUserId)
    .eq('friend_id', toUserId)
    .maybeSingle();
  if (existingFriend) return { ok: false, reason: 'already_friends' };

  // If the other person already sent ME a request, accept it instead.
  const { data: reverse } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('from_user', toUserId)
    .eq('to_user', myUserId)
    .eq('status', 'pending')
    .maybeSingle();
  if (reverse?.id) {
    await acceptFriendRequest(reverse.id);
    return { ok: true };
  }

  const { error } = await supabase
    .from('friend_requests')
    .insert({ from_user: myUserId, to_user: toUserId, status: 'pending' });
  if (error) {
    if ((error as { code?: string }).code === '23505') return { ok: false, reason: 'already_requested' };
    return { ok: false, reason: 'error', message: error.message };
  }
  return { ok: true };
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
  if (error) throw error;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
  if (error) throw error;
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('reject_friend_request', { request_id: requestId });
  if (error) throw error;
}

export async function removeFriend(otherUserId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('remove_friend', { other_user: otherUserId });
  if (error) throw error;
}

export async function sendNudge(myUserId: string, toUserId: string, message?: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('nudges')
    .insert({ from_user: myUserId, to_user: toUserId, message: message ?? null });
  if (error) throw error;
}

export async function listNudges(myUserId: string, unreadOnly = false): Promise<FriendNudge[]> {
  ensureConfigured();
  let q = supabase
    .from('nudges')
    .select('id, from_user, message, read, created_at')
    .eq('to_user', myUserId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (unreadOnly) q = q.eq('read', false);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data as { id: string; from_user: string; message: string | null; read: boolean; created_at: string }[];
  const profiles = await fetchProfilesByIds(rows.map((r) => r.from_user));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    message: r.message,
    read: r.read,
    fromUserId: r.from_user,
    from: profiles.get(r.from_user) ?? null,
  }));
}

export async function markNudgesRead(myUserId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('nudges')
    .update({ read: true })
    .eq('to_user', myUserId)
    .eq('read', false);
  if (error) throw error;
}

export interface NudgeEvent {
  fromUserId: string;
  message: string | null;
}

export interface SocialSubscriptionHandlers {
  onChange: () => void;
  /** Fired specifically when a new incoming nudge row is inserted. */
  onNudge?: (event: NudgeEvent) => void;
  /** Fired when a new incoming friend request is inserted. */
  onIncomingRequest?: () => void;
}

/** Subscribe to changes that affect the signed-in user's social graph. */
export function subscribeToSocialChanges(
  myUserId: string,
  handlers: SocialSubscriptionHandlers,
): () => void {
  if (!supabaseConfigured) return () => {};
  const { onChange, onNudge, onIncomingRequest } = handlers;
  try {
    const channel = supabase
      .channel(`social_${myUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user=eq.${myUserId}` }, (payload: any) => {
        onChange();
        if (payload?.eventType === 'INSERT') onIncomingRequest?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `from_user=eq.${myUserId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${myUserId}` }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nudges', filter: `to_user=eq.${myUserId}` }, (payload: any) => {
        onChange();
        onNudge?.({ fromUserId: payload?.new?.from_user, message: payload?.new?.message ?? null });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
