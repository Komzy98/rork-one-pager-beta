import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import type { LocalEvent } from '@/types/events';
import {
  checkSharedPlansAvailable,
  getOrCreateEventPlan,
  getSavedEventsSocialSummaries,
  setPlanRsvp,
  type PlanRsvpStatus,
  type SavedEventSocialSummary,
} from '@/utils/sharedPlansService';
import { supabaseConfigured } from '@/utils/supabaseClient';

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
      return getSavedEventsSocialSummaries(eventIds, myUserId, friendIds);
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

      const plan = await getOrCreateEventPlan(myUserId, event);
      if (!plan) {
        throw new Error('Could not start a plan for this event.');
      }

      await setPlanRsvp(plan.id, myUserId, status);
      await queryClient.invalidateQueries({ queryKey: ['saved-events-social', myUserId] });
      await queryClient.invalidateQueries({ queryKey: ['event-plan', event.id] });
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
