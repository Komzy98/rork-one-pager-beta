import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LocalEvent } from '@/types/events';
import { buildInviteRsvpNudgeMessage } from '@/utils/inviteRsvpNotifications';

export type GuestRsvpStatus = 'in' | 'maybe' | 'cant';

export interface GuestRsvpRow {
  id: string;
  event_id: string;
  plan_id: string | null;
  guest_token: string;
  display_name: string;
  status: GuestRsvpStatus;
  invited_by: string | null;
  updated_at: string;
}

export interface GuestRsvpSummary {
  going: number;
  maybe: number;
  cant: number;
  responses: Array<{
    displayName: string;
    status: GuestRsvpStatus;
  }>;
}

function getAdminClient(): SupabaseClient | null {
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isGuestRsvpConfigured(): boolean {
  return getAdminClient() !== null;
}

/** Post-deploy check: env vars present and guest_rsvps table exists. */
export async function checkGuestRsvpHealth(): Promise<{
  configured: boolean;
  databaseReady: boolean;
  missing: string[];
  error?: string;
}> {
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) {
    return { configured: false, databaseReady: false, missing };
  }

  const admin = getAdminClient();
  if (!admin) {
    return { configured: false, databaseReady: false, missing: ['SUPABASE_SERVICE_ROLE_KEY'] };
  }

  const { error } = await admin.from('guest_rsvps').select('id', { head: true, count: 'exact' }).limit(0);
  if (error) {
    return {
      configured: true,
      databaseReady: false,
      missing: [],
      error: error.message,
    };
  }

  return { configured: true, databaseReady: true, missing: [] };
}

function normalizeName(name: string): string {
  return name.trim().slice(0, 80);
}

function normalizeInviter(from?: string | null): string | null {
  if (!from) return null;
  const trimmed = from.replace(/^@/, '').trim().slice(0, 40);
  return trimmed || null;
}

async function resolveInviterUserId(
  admin: SupabaseClient,
  inviterUsername: string | null
): Promise<string | null> {
  if (!inviterUsername) return null;
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('username', inviterUsername)
    .maybeSingle();
  return data?.id ?? null;
}

async function notifyInviterOfGuestRsvp(
  admin: SupabaseClient,
  options: {
    inviterUsername: string;
    displayName: string;
    status: GuestRsvpStatus;
    event: LocalEvent;
  }
): Promise<void> {
  const inviterUserId = await resolveInviterUserId(admin, options.inviterUsername);
  if (!inviterUserId) return;

  const message = buildInviteRsvpNudgeMessage({
    responderName: options.displayName,
    status: options.status,
    eventTitle: options.event.title,
    eventId: options.event.id,
  });

  const { error } = await admin.from('nudges').insert({
    from_user: inviterUserId,
    to_user: inviterUserId,
    message,
  });

  if (error) {
    console.error('[guestRsvp] invite response nudge failed:', error.message);
  }
}

async function ensureEventPlanId(
  admin: SupabaseClient,
  event: LocalEvent,
  inviterUsername: string | null
): Promise<string | null> {
  const { data: existing } = await admin
    .from('shared_plans')
    .select('id')
    .eq('plan_type', 'event')
    .eq('entity_id', event.id)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const ownerId = await resolveInviterUserId(admin, inviterUsername);
  if (!ownerId) return null;

  const payload = {
    title: event.title,
    venue: event.venue,
    date: event.date,
    time: event.time,
    image: event.image,
    category: event.category,
  };

  const { data: created, error } = await admin
    .from('shared_plans')
    .insert({
      owner_id: ownerId,
      plan_type: 'event',
      entity_id: event.id,
      payload,
    })
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      const { data: retry } = await admin
        .from('shared_plans')
        .select('id')
        .eq('plan_type', 'event')
        .eq('entity_id', event.id)
        .maybeSingle();
      return retry?.id ?? null;
    }
    throw error;
  }

  return created?.id ?? null;
}

export async function getGuestRsvpByToken(
  eventId: string,
  token: string
): Promise<GuestRsvpRow | null> {
  const admin = getAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from('guest_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('guest_token', token)
    .maybeSingle();

  if (error) throw error;
  return (data as GuestRsvpRow | null) ?? null;
}

export async function getGuestRsvpSummary(eventId: string): Promise<GuestRsvpSummary> {
  const admin = getAdminClient();
  if (!admin) {
    return { going: 0, maybe: 0, cant: 0, responses: [] };
  }

  const { data, error } = await admin
    .from('guest_rsvps')
    .select('display_name, status')
    .eq('event_id', eventId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as { display_name: string; status: GuestRsvpStatus }[];
  let going = 0;
  let maybe = 0;
  let cant = 0;

  for (const row of rows) {
    if (row.status === 'in') going += 1;
    else if (row.status === 'maybe') maybe += 1;
    else cant += 1;
  }

  return {
    going,
    maybe,
    cant,
    responses: rows.map((r) => ({
      displayName: r.display_name,
      status: r.status,
    })),
  };
}

export async function upsertGuestRsvp(options: {
  event: LocalEvent;
  displayName: string;
  status: GuestRsvpStatus;
  guestToken?: string | null;
  invitedBy?: string | null;
}): Promise<{ guestToken: string; status: GuestRsvpStatus; displayName: string }> {
  const admin = getAdminClient();
  if (!admin) {
    throw new Error('Guest RSVP is not configured on the server.');
  }

  const displayName = normalizeName(options.displayName);
  if (!displayName) {
    throw new Error('Please enter your name.');
  }

  const status = options.status;
  if (!['in', 'maybe', 'cant'].includes(status)) {
    throw new Error('Invalid response.');
  }

  const invitedBy = normalizeInviter(options.invitedBy);
  const planId = await ensureEventPlanId(admin, options.event, invitedBy);
  const now = new Date().toISOString();
  let previousStatus: GuestRsvpStatus | null = null;
  let effectiveInvitedBy = invitedBy;

  if (options.guestToken) {
    const existing = await getGuestRsvpByToken(options.event.id, options.guestToken);
    if (existing && existing.event_id === options.event.id) {
      previousStatus = existing.status;
      effectiveInvitedBy = invitedBy ?? normalizeInviter(existing.invited_by);

      const { data, error } = await admin
        .from('guest_rsvps')
        .update({
          display_name: displayName,
          status,
          plan_id: planId,
          invited_by: effectiveInvitedBy,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('guest_token, status, display_name')
        .single();

      if (error) throw error;

      const saved = {
        guestToken: data.guest_token,
        status: data.status as GuestRsvpStatus,
        displayName: data.display_name,
      };

      if (effectiveInvitedBy && (previousStatus === null || previousStatus !== status)) {
        await notifyInviterOfGuestRsvp(admin, {
          inviterUsername: effectiveInvitedBy,
          displayName: saved.displayName,
          status: saved.status,
          event: options.event,
        });
      }

      return saved;
    }
  }

  const { data, error } = await admin
    .from('guest_rsvps')
    .insert({
      event_id: options.event.id,
      plan_id: planId,
      display_name: displayName,
      status,
      invited_by: invitedBy,
      updated_at: now,
    })
    .select('guest_token, status, display_name')
    .single();

  if (error) throw error;

  const saved = {
    guestToken: data.guest_token,
    status: data.status as GuestRsvpStatus,
    displayName: data.display_name,
  };

  if (effectiveInvitedBy) {
    await notifyInviterOfGuestRsvp(admin, {
      inviterUsername: effectiveInvitedBy,
      displayName: saved.displayName,
      status: saved.status,
      event: options.event,
    });
  }

  return saved;
}
