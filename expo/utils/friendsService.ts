import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { pickPublishedAvatarUrl, resolveDisplayAvatarUrl } from '@/utils/avatarUtils';

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
  shareStreakOnly: boolean;
  shareEventsOnly: boolean;
  hideLastActive: boolean;
  blockNudges: boolean;
}

/** Minimal discovery row returned by search / username lookup RPCs. */
export interface ProfileSearchHit {
  id: string;
  username: string;
}

function mapSearchHit(row: ProfileSearchHit): SocialProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: null,
    avatarUrl: null,
    currentStreak: 0,
    totalCompletions: 0,
    level: 1,
    lastActiveAt: '',
    activityVisibility: 'friends',
    shareStreakOnly: false,
    shareEventsOnly: false,
    hideLastActive: false,
    blockNudges: false,
  };
}

function isRateLimitError(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message?.toLowerCase() ?? '';
  return msg.includes('rate limit');
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
  share_streak_only?: boolean | null;
  share_events_only?: boolean | null;
  hide_last_active?: boolean | null;
  block_nudges?: boolean | null;
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
    shareStreakOnly: row.share_streak_only === true,
    shareEventsOnly: row.share_events_only === true,
    hideLastActive: row.hide_last_active === true,
    blockNudges: row.block_nudges === true,
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

function hasUsername(value?: string | null): boolean {
  return !!value?.trim();
}

function usernameSeed(input: MyProfileInput): string {
  return slugifyUsername(
    input.username || input.displayName || input.email?.split('@')[0] || '',
  );
}

/** Merge local/auth sources into the published social row for UI display. */
export function enrichSocialProfile(
  social: SocialProfile | null,
  sources: {
    profileName?: string | null;
    authName?: string | null;
    authEmail?: string | null;
    profileAvatar?: string | null;
    authAvatar?: string | null;
  },
): SocialProfile | null {
  if (!social) return null;
  const avatarUrl = resolveDisplayAvatarUrl({
    profileAvatar: sources.profileAvatar,
    authAvatar: sources.authAvatar,
    socialAvatar: social.avatarUrl,
  });
  const displayName =
    social.displayName?.trim() ||
    sources.profileName?.trim() ||
    sources.authName?.trim() ||
    null;
  const username =
    social.username?.trim() ||
    (sources.authEmail ? slugifyUsername(sources.authEmail.split('@')[0]) : '');
  return { ...social, avatarUrl, displayName, username };
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
  shareStreakOnly?: boolean;
  shareEventsOnly?: boolean;
  hideLastActive?: boolean;
  blockNudges?: boolean;
}

/**
 * Make sure the signed-in user has a `profiles` row, generating a unique
 * username on first use, and refresh the published stats (streak etc.).
 */
export async function ensureMyProfile(input: MyProfileInput): Promise<SocialProfile> {
  ensureConfigured();

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', input.userId)
    .maybeSingle();
  if (selErr && !isSocialUnavailableError(selErr)) throw selErr;
  if (selErr && isSocialUnavailableError(selErr)) throw selErr;

  const avatar_url = pickPublishedAvatarUrl(
    (existing as ProfileRow | null)?.avatar_url,
    input.avatarUrl,
  );

  const display_name =
    input.displayName?.trim() ||
    (existing as ProfileRow | null)?.display_name?.trim() ||
    null;

  const existingRow = existing as ProfileRow | null;
  const hideLastActive = input.hideLastActive ?? existingRow?.hide_last_active ?? false;
  const last_active_at =
    hideLastActive && existingRow?.last_active_at
      ? existingRow.last_active_at
      : new Date().toISOString();

  const stats = {
    display_name,
    current_streak: input.currentStreak ?? 0,
    total_completions: input.totalCompletions ?? 0,
    level: input.level ?? 1,
    last_active_at,
    updated_at: new Date().toISOString(),
    share_streak_only: input.shareStreakOnly ?? existingRow?.share_streak_only ?? false,
    share_events_only: input.shareEventsOnly ?? existingRow?.share_events_only ?? false,
    hide_last_active: hideLastActive,
    block_nudges: input.blockNudges ?? existingRow?.block_nudges ?? false,
  };

  if (existing) {
    const row = existing as ProfileRow;
    const patch = {
      ...stats,
      avatar_url,
    };

    if (input.username?.trim()) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...patch, username: input.username.trim() })
        .eq('id', input.userId)
        .select('*')
        .single();
      if (error) throw error;
      return mapProfile(data as ProfileRow);
    }

    if (hasUsername(row.username)) {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', input.userId)
        .select('*')
        .single();
      if (error) throw error;
      return mapProfile(data as ProfileRow);
    }

    const base = usernameSeed(input);
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = attempt === 0 ? base : `${base}${Math.floor(10 + Math.random() * 9990)}`;
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...patch, username: candidate })
        .eq('id', input.userId)
        .select('*')
        .single();
      if (!error && data) return mapProfile(data as ProfileRow);
      if (error && (error as { code?: string }).code !== '23505') throw error;
    }
    throw new Error('Could not allocate a unique username');
  }

  // Insert with a unique username (retry on collision).
  const base = usernameSeed(input);
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(10 + Math.random() * 9990)}`;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: input.userId, username: candidate, avatar_url, ...stats })
      .select('*')
      .single();
    if (!error && data) return mapProfile(data as ProfileRow);
    if (error && (error as { code?: string }).code !== '23505') throw error; // not a unique violation
  }
  throw new Error('Could not allocate a unique username');
}

export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string | null,
): Promise<SocialProfile | null> {
  ensureConfigured();
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (selErr && !isSocialUnavailableError(selErr)) throw selErr;
  if (!existing) return null;

  const nextAvatar = pickPublishedAvatarUrl((existing as ProfileRow).avatar_url, avatarUrl);
  const { data, error } = await supabase
    .from('profiles')
    .update({
      avatar_url: nextAvatar,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(data as ProfileRow);
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

export interface SocialPrivacyPatch {
  shareStreakOnly?: boolean;
  shareEventsOnly?: boolean;
  hideLastActive?: boolean;
  blockNudges?: boolean;
}

export async function updateSocialPrivacy(
  userId: string,
  patch: SocialPrivacyPatch,
): Promise<SocialProfile | null> {
  ensureConfigured();
  const row: Record<string, boolean | string> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.shareStreakOnly !== undefined) row.share_streak_only = patch.shareStreakOnly;
  if (patch.shareEventsOnly !== undefined) row.share_events_only = patch.shareEventsOnly;
  if (patch.hideLastActive !== undefined) row.hide_last_active = patch.hideLastActive;
  if (patch.blockNudges !== undefined) row.block_nudges = patch.blockNudges;

  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function searchProfiles(query: string, myUserId: string): Promise<SocialProfile[]> {
  ensureConfigured();
  const q = query.trim().replace(/^@/, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_profiles', {
    p_query: q,
    p_limit: 20,
  });
  if (error) {
    if (isRateLimitError(error)) {
      throw Object.assign(new Error('Too many searches — wait a few minutes and try again.'), {
        code: 'RATE_LIMITED',
      });
    }
    throw error;
  }
  return ((data as ProfileSearchHit[] | null) ?? []).map(mapSearchHit);
}

export async function getProfileByUsername(username: string): Promise<SocialProfile | null> {
  ensureConfigured();
  const u = username.trim().replace(/^@/, '');
  const { data, error } = await supabase.rpc('lookup_profile_username', {
    p_username: u,
  });
  if (error) {
    if (isRateLimitError(error)) {
      throw Object.assign(new Error('Too many lookups — wait a few minutes and try again.'), {
        code: 'RATE_LIMITED',
      });
    }
    throw error;
  }
  const row = Array.isArray(data) ? (data[0] as ProfileSearchHit | undefined) : (data as ProfileSearchHit | null);
  return row ? mapSearchHit(row) : null;
}

function isMissingRpcError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const msg = (e.message || '').toLowerCase();
  return (
    e.code === '42883' ||
    e.code === 'PGRST202' ||
    msg.includes('could not find the function') ||
    msg.includes('function public.list_my_friend_profiles') ||
    msg.includes('function public.get_partner_profiles') ||
    msg.includes('function public.repair_friendship_links')
  );
}

function stubPartnerProfile(id: string): SocialProfile {
  return {
    id,
    username: 'partner',
    displayName: 'Partner',
    avatarUrl: null,
    currentStreak: 0,
    totalCompletions: 0,
    level: 1,
    lastActiveAt: '',
    activityVisibility: 'friends',
    shareStreakOnly: false,
    shareEventsOnly: false,
    hideLastActive: false,
    blockNudges: false,
  };
}

export async function repairFriendshipLinks(): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('repair_friendship_links');
  if (error && !isMissingRpcError(error) && __DEV__) {
    console.warn('repairFriendshipLinks failed', error);
  }
}

export async function countFriendships(myUserId: string): Promise<number> {
  ensureConfigured();
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', myUserId);
  if (error) throw error;
  return count ?? 0;
}

async function listFriendIds(myUserId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', myUserId);
  if (error) throw error;
  return (data as { friend_id: string }[]).map((r) => r.friend_id);
}

async function listFriendsFromIds(myUserId: string): Promise<SocialProfile[]> {
  const ids = await listFriendIds(myUserId);
  if (ids.length === 0) return [];
  const profiles = await fetchProfilesByIds(ids);
  const listed: SocialProfile[] = [];
  for (const id of ids) {
    const profile = profiles.get(id);
    listed.push(profile ?? stubPartnerProfile(id));
  }
  if (__DEV__ && ids.length > 0 && profiles.size < ids.length) {
    console.warn(
      `listFriends: ${ids.length - profiles.size} partner profile(s) missing — showing placeholder until sync completes`,
    );
  }
  return listed;
}

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, SocialProfile>> {
  const map = new Map<string, SocialProfile>();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return map;

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_partner_profiles', {
    p_user_ids: uniqueIds,
  });
  if (!rpcError) {
    for (const row of (rpcData as ProfileRow[] | null) ?? []) map.set(row.id, mapProfile(row));
    return map;
  }
  if (!isMissingRpcError(rpcError)) throw rpcError;

  const { data, error } = await supabase.from('profiles').select('*').in('id', uniqueIds);
  if (error) throw error;
  for (const row of data as ProfileRow[]) map.set(row.id, mapProfile(row));
  return map;
}

export async function listFriends(myUserId: string): Promise<SocialProfile[]> {
  ensureConfigured();
  await repairFriendshipLinks();

  const { data: rpcRows, error: rpcError } = await supabase.rpc('list_my_friend_profiles');
  if (!rpcError) {
    return ((rpcRows as ProfileRow[] | null) ?? []).map(mapProfile);
  }
  if (!isMissingRpcError(rpcError)) throw rpcError;

  return listFriendsFromIds(myUserId);
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
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    from: profiles.get(r.from_user) ?? stubPartnerProfile(r.from_user),
  }));
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
    to: profiles.get(r.to_user) ?? stubPartnerProfile(r.to_user),
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
  const { data: recipient, error: recipientErr } = await supabase
    .from('profiles')
    .select('block_nudges')
    .eq('id', toUserId)
    .maybeSingle();
  if (recipientErr && !isSocialUnavailableError(recipientErr)) throw recipientErr;
  if ((recipient as { block_nudges?: boolean } | null)?.block_nudges) {
    throw Object.assign(new Error('This partner is not accepting nudges right now.'), {
      code: 'NUDGES_BLOCKED',
    });
  }
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
