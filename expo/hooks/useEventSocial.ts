import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import type { LocalEvent } from '@/types/events';
import {
  checkSharedPlansAvailable,
  getEventPlanBundle,
  getFriendsGoingToEvent,
  getGuestRsvpsForEvent,
  getOrCreateEventPlan,
  setPlanRsvp,
  updatePlanMeetAt,
  type FriendEventSave,
  type GuestRsvp,
  type PlanRsvp,
  type PlanRsvpStatus,
  type SharedPlan,
} from '@/utils/sharedPlansService';
import { sendNudge } from '@/utils/friendsService';
import { buildInviteRsvpNudgeMessage } from '@/utils/inviteRsvpNotifications';
import { defaultGroupMeetTime } from '@/utils/eventNightOutPlanner';
import { supabaseConfigured } from '@/utils/supabaseClient';

type EventPlanCache = Awaited<ReturnType<typeof getEventPlanBundle>>;

export function useEventSocial(event: LocalEvent | null) {
  const { supabaseUser, isGuest } = useAuth();
  const { friends, myProfile } = useFriends();
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

  const guestRsvpQuery = useQuery({
    queryKey: ['guest-rsvps', eventId],
    queryFn: () => getGuestRsvpsForEvent(eventId),
    enabled: queriesEnabled,
    staleTime: 20_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['event-plan', eventId] });
    queryClient.invalidateQueries({ queryKey: ['friends-going', eventId] });
    queryClient.invalidateQueries({ queryKey: ['guest-rsvps', eventId] });
  }, [queryClient, eventId]);

  const ensurePlan = useCallback(async (): Promise<SharedPlan | null> => {
    if (!queriesEnabled || !event || !myUserId) return null;
    const plan = await getOrCreateEventPlan(myUserId, event);
    invalidate();
    return plan;
  }, [queriesEnabled, event, myUserId, invalidate]);

  const applyOptimisticRsvp = useCallback(
    (status: PlanRsvpStatus) => {
      if (!myUserId) return;
      queryClient.setQueryData<EventPlanCache>(['event-plan', eventId, myUserId], (prev) => {
        const base = prev ?? { plan: null, rsvps: [], myStatus: null };
        const others = base.rsvps.filter((r) => r.userId !== myUserId);
        return {
          ...base,
          myStatus: status,
          rsvps: [
            ...others,
            {
              planId: base.plan?.id ?? 'optimistic',
              userId: myUserId,
              status,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [queryClient, eventId, myUserId],
  );

  const setRsvp = useCallback(
    async (status: PlanRsvpStatus) => {
      if (!queriesEnabled || !event || !myUserId) {
        throw new Error('Sign in to respond to this plan.');
      }

      applyOptimisticRsvp(status);

      try {
        const previousStatus = planQuery.data?.myStatus ?? null;
        const plan = planQuery.data?.plan ?? (await getOrCreateEventPlan(myUserId, event));
        if (!plan) {
          throw new Error('Could not start a plan for this event. Try again in a moment.');
        }

        await setPlanRsvp(plan.id, myUserId, status);

        if (plan.ownerId !== myUserId && previousStatus !== status) {
          const responderName =
            myProfile?.displayName?.trim() ||
            myProfile?.username?.trim() ||
            'Your friend';
          try {
            await sendNudge(
              myUserId,
              plan.ownerId,
              buildInviteRsvpNudgeMessage({
                responderName,
                status,
                eventTitle: event.title,
                eventId: event.id,
              }),
            );
          } catch {
            // Non-partners cannot nudge — ignore.
          }
        }

        if (status === 'in') {
          const bundle = await getEventPlanBundle(event.id, myUserId);
          const goingCount = bundle.rsvps.filter((r) => r.status === 'in').length;
          const guestGoingCount = (guestRsvpQuery.data ?? []).filter((g) => g.status === 'in').length;
          const totalGoing = goingCount + guestGoingCount;
          if (
            totalGoing >= 2 &&
            !bundle.plan?.meetAt &&
            bundle.plan &&
            bundle.plan.ownerId === myUserId
          ) {
            const meetAt = defaultGroupMeetTime(event);
            if (meetAt) {
              try {
                await updatePlanMeetAt(bundle.plan.id, meetAt);
              } catch {
                // Meet-time suggestion is best-effort; RSVP already saved.
              }
            }
          }
        }

        invalidate();
      } catch (error) {
        invalidate();
        throw error;
      }
    },
    [queriesEnabled, event, myUserId, myProfile, planQuery.data, guestRsvpQuery.data, applyOptimisticRsvp, invalidate],
  );

  const setGroupMeetAt = useCallback(
    async (meetAt: Date) => {
      const plan = planQuery.data?.plan;
      if (!plan) return;
      await updatePlanMeetAt(plan.id, meetAt);
      invalidate();
    },
    [planQuery.data?.plan, invalidate],
  );

  const goingRsvps = (planQuery.data?.rsvps ?? []).filter((r) => r.status === 'in');
  const maybeRsvps = (planQuery.data?.rsvps ?? []).filter((r) => r.status === 'maybe');
  const guestRsvps = (guestRsvpQuery.data ?? []) as GuestRsvp[];
  const guestGoing = guestRsvps.filter((g) => g.status === 'in');
  const guestMaybe = guestRsvps.filter((g) => g.status === 'maybe');

  return {
    available,
    canRsvp: queriesEnabled,
    plan: planQuery.data?.plan ?? null,
    rsvps: planQuery.data?.rsvps ?? [],
    myRsvpStatus: planQuery.data?.myStatus ?? null,
    goingRsvps,
    maybeRsvps,
    guestRsvps,
    guestGoing,
    guestMaybe,
    goingCount: goingRsvps.length + guestGoing.length,
    maybeCount: maybeRsvps.length + guestMaybe.length,
    friendsSaved: (goingQuery.data ?? []) as FriendEventSave[],
    isLoading: planQuery.isLoading || goingQuery.isLoading || guestRsvpQuery.isLoading,
    ensurePlan,
    setRsvp,
    setGroupMeetAt,
    refresh: invalidate,
  };
}

export type { PlanRsvp, PlanRsvpStatus, FriendEventSave, GuestRsvp };
