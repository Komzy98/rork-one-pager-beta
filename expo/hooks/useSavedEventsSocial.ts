import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import type { LocalEvent } from '@/types/events';
import {
  checkSharedPlansAvailable,
  getSavedEventsSocialSummaries,
  type PlanRsvpStatus,
  type SavedEventSocialSummary,
} from '@/utils/sharedPlansService';
import { supabaseConfigured } from '@/utils/supabaseClient';
import { savePersonalEventRsvp, getPersonalEventStatuses } from '@/utils/personalEventAttendance';

export function useSavedEventsSocial(savedEvents: LocalEvent[]) {
  const { supabaseUser, isGuest } = useAuth();
  const { friends } = useFriends();
  const queryClient = useQueryClient();
  const myUserId = supabaseUser?.id;
  const eventIds = useMemo(() => savedEvents.map((event) => event.id), [savedEvents]);
  const friendIds = useMemo(() => friends.map((friend) => friend.id), [friends]);
  const enabled = !!myUserId && supabaseConfigured && !isGuest && eventIds.length > 0;

  const query = useQuery({
    queryKey: ['saved-events-social', myUserId, eventIds.join('|'), friendIds.join('|')],
    queryFn: async () => {
      const available = await checkSharedPlansAvailable();
      if (!available || !myUserId) return {} as Record<string, SavedEventSocialSummary>;
      const [summaries, statuses] = await Promise.all([
        getSavedEventsSocialSummaries(eventIds, myUserId, friendIds),
        getPersonalEventStatuses(myUserId, eventIds),
      ]);
      for (const [eventId, status] of Object.entries(statuses)) {
        if (summaries[eventId]) summaries[eventId].myStatus = status;
      }
      return summaries;
    },
    enabled,
    staleTime: 20_000,
  });

  const summaries = query.data ?? {};

  const getSummary = useCallback(
    (eventId: string): SavedEventSocialSummary => {
      return (
        summaries[eventId] ?? {
          eventId,
          plan: null,
          myStatus: null,
          goingCount: 0,
          maybeCount: 0,
          friendsSavedCount: 0,
          goingNames: [],
          hasGroupActivity: false,
        }
      );
    },
    [summaries],
  );

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const setRsvp = useCallback(
    async (event: LocalEvent, status: PlanRsvpStatus) => {
      if (!enabled || !myUserId) {
        throw new Error('Sign in to respond to this plan.');
      }

      await savePersonalEventRsvp(myUserId, event.id, status);
      await queryClient.invalidateQueries({ queryKey: ['saved-events-social', myUserId] });
      await queryClient.invalidateQueries({ queryKey: ['event-plan', event.id] });
      await queryClient.invalidateQueries({ queryKey: ['personal-event-attendance', myUserId, event.id] });
    },
    [enabled, myUserId, queryClient],
  );

  return {
    available: enabled,
    summaries,
    getSummary,
    isLoading: query.isLoading,
    refresh,
    setRsvp,
  };
}
