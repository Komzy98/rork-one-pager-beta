import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { ActivityEvent } from '@/utils/activityService';
import type { ActivityRowActionKind } from '@/utils/socialAccountability';
import { getActivityEventRoute } from '@/utils/activityFeedMeta';
import { getEventIdFromActivity } from '@/utils/socialAccountability';
import { savedSnapshotToLocalEvent } from '@/utils/eventMappers';
import { getOrCreateEventPlan, setPlanRsvp } from '@/utils/sharedPlansService';

export function usePartnerActivityActions(options: {
  onCheer: (eventId: string, on: boolean) => void | Promise<void>;
}) {
  const router = useRouter();
  const { supabaseUser } = useAuth();
  const { nudge } = useFriends();
  const { profile } = useUserProfile();
  const myUserId = supabaseUser?.id;

  const quickRsvpJoin = useCallback(
    async (event: ActivityEvent) => {
      if (!myUserId) {
        Alert.alert('Sign in required', 'Sign in to RSVP with partners.');
        return;
      }

      const eventId = getEventIdFromActivity(event);
      if (!eventId) {
        const route = getActivityEventRoute(event);
        if (route) router.push(route as any);
        return;
      }

      const snapshot = profile?.savedEvents?.find((item) => item.id === eventId);
      if (!snapshot) {
        router.push(`/(root)/event/${eventId}` as any);
        return;
      }

      try {
        const localEvent = savedSnapshotToLocalEvent(snapshot);
        const plan = await getOrCreateEventPlan(myUserId, localEvent);
        if (!plan) throw new Error('Could not create plan');
        await setPlanRsvp(plan.id, myUserId, 'in');
        Alert.alert("You're in!", `You're going with ${event.author?.displayName || 'your partner'}.`);
      } catch {
        router.push(`/(root)/event/${eventId}` as any);
      }
    },
    [myUserId, profile?.savedEvents, router],
  );

  const runAction = useCallback(
    async (event: ActivityEvent, kind: ActivityRowActionKind) => {
      switch (kind) {
        case 'rsvp_join':
          await quickRsvpJoin(event);
          return;
        case 'open_event': {
          const route = getActivityEventRoute(event);
          if (route) router.push(route as any);
          return;
        }
        case 'nudge_back':
          if (event.userId) {
            try {
              await nudge(event.userId, 'Great work — keeping the streak alive! 🔥');
              Alert.alert('Sent!', 'Your partner will get a nudge.');
            } catch (e) {
              const code = (e as { code?: string })?.code;
              if (code === 'NUDGES_BLOCKED') {
                Alert.alert('Nudges off', 'This partner is not accepting nudges right now.');
              } else {
                Alert.alert('Could not send', 'Please try again in a moment.');
              }
            }
          }
          return;
        case 'view_habits':
          router.push('/(tabs)/tasks' as any);
          return;
        case 'open_habit': {
          const route = getActivityEventRoute(event);
          if (route) router.push(route as any);
          else router.push('/(tabs)/tasks' as any);
          return;
        }
        case 'open_sports':
          router.push('/(tabs)/sports' as any);
          return;
        case 'open_shows':
          router.push('/(tabs)/shows' as any);
          return;
        case 'view_partners':
          router.push('/friends' as any);
          return;
        case 'cheer':
          await options.onCheer(event.id, !event.cheeredByMe);
          return;
        default:
          return;
      }
    },
    [nudge, options, quickRsvpJoin, router],
  );

  return { runAction, quickRsvpJoin };
}
