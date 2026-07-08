import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { isSocialUnavailableError } from '@/utils/friendsService';
import type { LocalEvent, SavedEventSnapshot } from '@/types/events';

function toQueryError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: string } | null)?.message?.trim();
  return new Error(message || fallback);
}

export type PlanRsvpStatus = 'in' | 'maybe' | 'cant';
export type SharedPlanType = 'event' | 'match' | 'show';

export interface SharedPlan {
  id: string;
  ownerId: string;
  planType: SharedPlanType;
  entityId: string;
  payload: Record<string, unknown>;
  meetAt: string | null;
  createdAt: string;
}

export interface PlanRsvp {
  planId: string;
  userId: string;
  status: PlanRsvpStatus;
  updatedAt: string;
  profile?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface FriendEventSave {
  userId: string;
  eventId: string;
  snapshot: SavedEventSnapshot;
  profile?: PlanRsvp['profile'];
}

export interface GuestRsvp {
  id: string;
  eventId: string;
  displayName: string;
  status: PlanRsvpStatus;
  updatedAt: string;
}

interface PlanRow {
  id: string;
  owner_id: string;
  plan_type: string;
  entity_id: string;
  payload: Record<string, unknown> | null;
  meet_at: string | null;
  created_at: string;
}

interface RsvpRow {
  plan_id: string;
  user_id: string;
  status: string;
  updated_at: string;
}

interface SaveRow {
  user_id: string;
  event_id: string;
  snapshot: SavedEventSnapshot | Record<string, unknown>;
  updated_at: string;
}

interface ProfileMini {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

function mapPlan(row: PlanRow): SharedPlan {
  return {
    id: row.id,
    ownerId: row.owner_id,
    planType: row.plan_type as SharedPlanType,
    entityId: row.entity_id,
    payload: row.payload ?? {},
    meetAt: row.meet_at,
    createdAt: row.created_at,
  };
}

function mapProfile(row: ProfileMini) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

export async function checkSharedPlansAvailable(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { error } = await supabase.from('shared_plans').select('id').limit(1);
    if (error) return !isSocialUnavailableError(error);
    return true;
  } catch {
    return false;
  }
}

export async function getOrCreateEventPlan(
  userId: string,
  event: LocalEvent
): Promise<SharedPlan | null> {
  if (!supabaseConfigured) return null;

  const payload = {
    title: event.title,
    venue: event.venue,
    date: event.date,
    time: event.time,
    image: event.image,
    category: event.category,
  };

  const { data: existing, error: fetchError } = await supabase
    .from('shared_plans')
    .select('*')
    .eq('plan_type', 'event')
    .eq('entity_id', event.id)
    .maybeSingle();

  if (fetchError && !isSocialUnavailableError(fetchError)) {
    throw toQueryError(fetchError, 'Could not load the event plan.');
  }
  if (existing) return mapPlan(existing as PlanRow);

  const { data: created, error: insertError } = await supabase
    .from('shared_plans')
    .insert({
      owner_id: userId,
      plan_type: 'event',
      entity_id: event.id,
      payload,
    })
    .select('*')
    .single();

  if (insertError) {
    if (isSocialUnavailableError(insertError)) return null;
    if ((insertError as { code?: string }).code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('shared_plans')
        .select('*')
        .eq('plan_type', 'event')
        .eq('entity_id', event.id)
        .maybeSingle();
      if (retryError && !isSocialUnavailableError(retryError)) {
        throw toQueryError(retryError, 'Could not join the event plan.');
      }
      return retry ? mapPlan(retry as PlanRow) : null;
    }
    throw toQueryError(insertError, 'Could not create the event plan.');
  }

  return mapPlan(created as PlanRow);
}

export async function setPlanRsvp(
  planId: string,
  userId: string,
  status: PlanRsvpStatus
): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from('plan_rsvps').upsert(
    {
      plan_id: planId,
      user_id: userId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'plan_id,user_id' }
  );
  if (error && !isSocialUnavailableError(error)) {
    throw toQueryError(error, 'Could not save your RSVP.');
  }
}

export async function updatePlanMeetAt(planId: string, meetAt: Date | null): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from('shared_plans')
    .update({ meet_at: meetAt?.toISOString() ?? null, updated_at: new Date().toISOString() })
    .eq('id', planId);
  if (error && !isSocialUnavailableError(error)) {
    throw toQueryError(error, 'Could not update the meet time.');
  }
}

export async function getEventPlanBundle(
  eventId: string,
  myUserId: string
): Promise<{ plan: SharedPlan | null; rsvps: PlanRsvp[]; myStatus: PlanRsvpStatus | null }> {
  if (!supabaseConfigured) {
    return { plan: null, rsvps: [], myStatus: null };
  }

  const { data: planRow, error: planError } = await supabase
    .from('shared_plans')
    .select('*')
    .eq('plan_type', 'event')
    .eq('entity_id', eventId)
    .maybeSingle();

  if (planError && !isSocialUnavailableError(planError)) throw planError;
  if (!planRow) return { plan: null, rsvps: [], myStatus: null };

  const plan = mapPlan(planRow as PlanRow);

  const { data: rsvpRows, error: rsvpError } = await supabase
    .from('plan_rsvps')
    .select('*')
    .eq('plan_id', plan.id);

  if (rsvpError && !isSocialUnavailableError(rsvpError)) throw rsvpError;

  const rows = (rsvpRows ?? []) as RsvpRow[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  let profiles = new Map<string, PlanRsvp['profile']>();
  if (userIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);
    if (profileError && !isSocialUnavailableError(profileError)) {
      throw toQueryError(profileError, 'Could not load RSVP profiles.');
    }
    for (const p of (profileRows ?? []) as ProfileMini[]) {
      profiles.set(p.id, mapProfile(p));
    }
  }

  const rsvps: PlanRsvp[] = rows.map((r) => ({
    planId: r.plan_id,
    userId: r.user_id,
    status: r.status as PlanRsvpStatus,
    updatedAt: r.updated_at,
    profile: profiles.get(r.user_id),
  }));

  const mine = rsvps.find((r) => r.userId === myUserId);

  return { plan, rsvps, myStatus: mine?.status ?? null };
}

export async function getGuestRsvpsForEvent(eventId: string): Promise<GuestRsvp[]> {
  if (!supabaseConfigured) return [];

  const { data, error } = await supabase
    .from('guest_rsvps')
    .select('id, event_id, display_name, status, updated_at')
    .eq('event_id', eventId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSocialUnavailableError(error)) return [];
    throw error;
  }

  return ((data ?? []) as {
    id: string;
    event_id: string;
    display_name: string;
    status: string;
    updated_at: string;
  }[]).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    displayName: row.display_name,
    status: row.status as PlanRsvpStatus,
    updatedAt: row.updated_at,
  }));
}

export async function publishEventSave(
  userId: string,
  snapshot: SavedEventSnapshot
): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from('user_event_saves').upsert(
    {
      user_id: userId,
      event_id: snapshot.id,
      snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,event_id' }
  );
  if (error && !isSocialUnavailableError(error)) throw error;
}

export async function unpublishEventSave(userId: string, eventId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from('user_event_saves')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);
  if (error && !isSocialUnavailableError(error)) throw error;
}

/** Backfill local One Pager saves to user_event_saves (best-effort batch upsert). */
export async function syncSavedEventsToPartners(
  userId: string,
  snapshots: SavedEventSnapshot[]
): Promise<boolean> {
  if (!supabaseConfigured || snapshots.length === 0) return false;

  const available = await checkSharedPlansAvailable();
  if (!available) return false;

  const now = new Date().toISOString();
  const rows = snapshots.map((snapshot) => ({
    user_id: userId,
    event_id: snapshot.id,
    snapshot,
    updated_at: now,
  }));

  const { error } = await supabase.from('user_event_saves').upsert(rows, {
    onConflict: 'user_id,event_id',
  });

  if (error) {
    if (isSocialUnavailableError(error)) return false;
    throw error;
  }
  return true;
}

export async function getFriendsGoingToEvent(
  eventId: string,
  friendIds: string[]
): Promise<FriendEventSave[]> {
  if (!supabaseConfigured || friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('user_event_saves')
    .select('*')
    .eq('event_id', eventId)
    .in('user_id', friendIds);

  if (error) {
    if (isSocialUnavailableError(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as SaveRow[];
  const userIds = rows.map((r) => r.user_id);

  let profiles = new Map<string, PlanRsvp['profile']>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);
    for (const p of (profileRows ?? []) as ProfileMini[]) {
      profiles.set(p.id, mapProfile(p));
    }
  }

  return rows.map((r) => ({
    userId: r.user_id,
    eventId: r.event_id,
    snapshot: r.snapshot as SavedEventSnapshot,
    profile: profiles.get(r.user_id),
  }));
}

export async function getFriendsSavedEventIds(friendIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!supabaseConfigured || friendIds.length === 0) return counts;

  const { data, error } = await supabase
    .from('user_event_saves')
    .select('event_id')
    .in('user_id', friendIds);

  if (error) {
    if (isSocialUnavailableError(error)) return counts;
    throw error;
  }

  for (const row of (data ?? []) as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }
  return counts;
}

export async function getFriendsSavedEvents(
  friendIds: string[],
  limit = 40
): Promise<FriendEventSave[]> {
  if (!supabaseConfigured || friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('user_event_saves')
    .select('*')
    .in('user_id', friendIds)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isSocialUnavailableError(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as SaveRow[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  let profiles = new Map<string, PlanRsvp['profile']>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);
    for (const p of (profileRows ?? []) as ProfileMini[]) {
      profiles.set(p.id, mapProfile(p));
    }
  }

  return rows.map((r) => ({
    userId: r.user_id,
    eventId: r.event_id,
    snapshot: r.snapshot as SavedEventSnapshot,
    profile: profiles.get(r.user_id),
  }));
}
