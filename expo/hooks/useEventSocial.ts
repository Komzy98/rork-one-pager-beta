import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import type { LocalEvent } from '@/types/events';
import {
  checkSharedPlansAvailable,
  getEventPlanBundle,
  getFriendsGoingToEvent,
  getOrCreateEventPlan,
  setPlanRsvp,
  updatePlanMeetAt,
  type FriendEventSave,
  type PlanRsvp,
  type PlanRsvpStatus,
  type SharedPlan,
} from '@/utils/sharedPlansService';
import { defaultGroupMeetTime } from '@/utils/eventNightOutPlanner';
import { supabaseConfigured } from '@/utils/supabaseClient';

export function useEventSocial(event: LocalEvent | null) {
  const { supabaseUser, isGuest } = useAuth();
  const { friends } = useFriends();
  const queryClient = useQueryClient();
  const myUserId = supabaseUser?.id;
  const enabled = !!event && !!myUserId && supabaseConfigured && !isGuest;

  const [available, setAvailable] = useState<boolean | null>(enabled ? null : false);

  useEffect(() => {
    if (!enabled) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    void checkSharedPlansAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const queriesEnabled = enabled && available === true;
  const eventId = event?.id ?? '';
  const friendIds = friends.map((f) => f.id);

  const planQuery = useQuery({
    queryKey: ['event-plan', eventId, myUserId],
    queryFn: () => getEventPlanBundle(eventId, myUserId as string),
    enabled: queriesEnabled,
    staleTime: 20_000,
  });

  const goingQuery = useQuery({
    queryKey: ['friends-going', eventId, friendIds.length],
    queryFn: () => getFriendsGoingToEvent(eventId, friendIds),
    enabled: queriesEnabled && friendIds.length > 0,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['event-plan', eventId] });
    queryClient.invalidateQueries({ queryKey: ['friends-going', eventId] });
  }, [queryClient, eventId]);

  const ensurePlan = useCallback(async (): Promise<SharedPlan | null> => {
    if (!queriesEnabled || !event || !myUserId) return null;
    const plan = await getOrCreateEventPlan(myUserId, event);
    invalidate();
    return plan;
  }, [queriesEnabled, event, myUserId, invalidate]);

  const setRsvp = useCallback(
    async (status: PlanRsvpStatus) => {
      if (!queriesEnabled || !event || !myUserId) return;
      const plan = planQuery.data?.plan ?? (await getOrCreateEventPlan(myUserId, event));
      if (!plan) return;
      await setPlanRsvp(plan.id, myUserId, status);

      if (status === 'in') {
        const bundle = await getEventPlanBundle(event.id, myUserId);
        const goingCount = bundle.rsvps.filter((r) => r.status === 'in').length;
        if (goingCount >= 2 && !bundle.plan?.meetAt) {
          const meetAt = defaultGroupMeetTime(event);
          if (meetAt && bundle.plan) {
            await updatePlanMeetAt(bundle.plan.id, meetAt);
          }
        }
      }

      invalidate();
    },
    [queriesEnabled, event, myUserId, planQuery.data?.plan, invalidate]
  );

  const setGroupMeetAt = useCallback(
    async (meetAt: Date) => {
      const plan = planQuery.data?.plan;
      if (!plan) return;
      await updatePlanMeetAt(plan.id, meetAt);
      invalidate();
    },
    [planQuery.data?.plan, invalidate]
  );

  const goingRsvps = (planQuery.data?.rsvps ?? []).filter((r) => r.status === 'in');
  const maybeRsvps = (planQuery.data?.rsvps ?? []).filter((r) => r.status === 'maybe');

  return {
    available,
    plan: planQuery.data?.plan ?? null,
    rsvps: planQuery.data?.rsvps ?? [],
    myRsvpStatus: planQuery.data?.myStatus ?? null,
    goingRsvps,
    maybeRsvps,
    friendsSaved: (goingQuery.data ?? []) as FriendEventSave[],
    isLoading: planQuery.isLoading || goingQuery.isLoading,
    ensurePlan,
    setRsvp,
    setGroupMeetAt,
    refresh: invalidate,
  };
}

export type { PlanRsvp, PlanRsvpStatus, FriendEventSave };
