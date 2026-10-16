import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabaseConfigured } from '@/utils/supabaseClient';
import {
  getPersonalEventAttendance,
  savePersonalEventRsvp,
  savePersonalTicketStatus,
  type TicketStatus,
} from '@/utils/personalEventAttendance';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';

export function usePersonalEventAttendance(eventId: string | undefined) {
  const { supabaseUser, isGuest } = useAuth();
  const userId: string | undefined = supabaseUser?.id;
  const queryClient = useQueryClient();
  const enabled = !!userId && !!eventId && !isGuest && supabaseConfigured;
  const queryKey = ['personal-event-attendance', userId, eventId];

  const query = useQuery({
    queryKey,
    queryFn: () => getPersonalEventAttendance(userId!, eventId!),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });

  const setRsvp = useCallback(async (status: PlanRsvpStatus) => {
    if (!enabled) throw new Error('Sign in to save your RSVP.');
    const result = await savePersonalEventRsvp(userId!, eventId!, status);
    queryClient.setQueryData(queryKey, result);
    void queryClient.invalidateQueries({ queryKey: ['saved-events-social', userId] });
    return result;
  }, [enabled, userId, eventId, queryClient]);

  const setTicketStatus = useCallback(async (status: TicketStatus) => {
    if (!enabled) throw new Error('Sign in to update your ticket status.');
    const result = await savePersonalTicketStatus(userId!, eventId!, status);
    queryClient.setQueryData(queryKey, result);
    return result;
  }, [enabled, userId, eventId, queryClient]);

  return {
    available: enabled,
    isLoading: query.isLoading,
    status: query.data?.status ?? null,
    ticketStatus: query.data?.ticketStatus ?? 'unknown' as TicketStatus,
    setRsvp,
    setTicketStatus,
    refresh: query.refetch,
  };
}
