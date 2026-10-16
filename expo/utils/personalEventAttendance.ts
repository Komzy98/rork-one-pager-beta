import { supabase, supabaseConfigured, recoverSupabaseSession } from '@/utils/supabaseClient';
import { verifyPlanWriteAuth } from '@/utils/planWriteAuth';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';
import { toPersonalAttendance, type TicketStatus } from '@/utils/eventTicketStatus';
export type { TicketStatus } from '@/utils/eventTicketStatus';

export interface PersonalEventAttendance {
  status: PlanRsvpStatus;
  ticketStatus: TicketStatus;
  updatedAt: string;
}

async function verifyOwner(userId: string): Promise<void> {
  await verifyPlanWriteAuth(userId, {
    getSession: () => supabase.auth.getSession(),
    recoverSession: recoverSupabaseSession,
    getUser: () => supabase.auth.getUser(),
    refreshSession: () => supabase.auth.refreshSession(),
  });
}

export async function getPersonalEventAttendance(
  userId: string,
  eventId: string,
): Promise<PersonalEventAttendance | null> {
  if (!supabaseConfigured || !userId || !eventId) return null;
  const { data, error } = await supabase.from('user_event_attendance')
    .select('status,ticket_status,updated_at')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPersonalAttendance(data as { status: string; ticket_status: string; updated_at: string }) : null;
}

export async function getPersonalEventStatuses(
  userId: string,
  eventIds: string[],
): Promise<Record<string, PlanRsvpStatus>> {
  if (!supabaseConfigured || !userId || eventIds.length === 0) return {};
  const { data, error } = await supabase.from('user_event_attendance')
    .select('event_id,status')
    .eq('user_id', userId)
    .in('event_id', eventIds);
  if (error) throw new Error(error.message);
  return Object.fromEntries(
    ((data ?? []) as { event_id: string; status: PlanRsvpStatus }[])
      .map((row) => [row.event_id, row.status]),
  );
}

export async function savePersonalEventRsvp(
  userId: string,
  eventId: string,
  status: PlanRsvpStatus,
): Promise<PersonalEventAttendance> {
  if (!supabaseConfigured) throw new Error('Sign in to RSVP to events.');
  await verifyOwner(userId);
  if (!eventId.trim()) throw new Error('Event unavailable.');
  // Use a targeted UPDATE first to preserve previously confirmed ticket status.
  const { data: existing, error: lookupError } = await supabase
    .from('user_event_attendance')
    .select('event_id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  const now = new Date().toISOString();
  const mutation = existing
    ? supabase.from('user_event_attendance')
      .update({ status, updated_at: now })
      .eq('user_id', userId)
      .eq('event_id', eventId)
    : supabase.from('user_event_attendance')
      .insert({ user_id: userId, event_id: eventId, status, updated_at: now });
  const { data, error } = await mutation
    .select('status,ticket_status,updated_at')
    .single();
  if (error) throw new Error(error.message);
  return toPersonalAttendance(data as { status: string; ticket_status: string; updated_at: string });
}

export async function savePersonalTicketStatus(
  userId: string,
  eventId: string,
  ticketStatus: TicketStatus,
): Promise<PersonalEventAttendance> {
  if (!supabaseConfigured) throw new Error('Sign in to update your ticket status.');
  await verifyOwner(userId);
  const { data, error } = await supabase.from('user_event_attendance')
    .update({ ticket_status: ticketStatus, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .select('status,ticket_status,updated_at')
    .single();
  if (error) throw new Error(error.message);
  return toPersonalAttendance(data as { status: string; ticket_status: string; updated_at: string });
}
