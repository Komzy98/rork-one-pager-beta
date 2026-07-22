import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './useAuth';
import { useFriends } from './useFriends';
import { usePartnerHabitShares } from './usePartnerHabitShares';
import { filterFeedByHabitShares } from '@/utils/partnerHabitActivityFilter';
import { useGamification } from './useHabitsEnhancement';
import { useUserProfile } from './useUserProfile';
import { supabaseConfigured } from '@/utils/supabaseClient';
import {
  activityVisibilityStorageKey,
  sanitizePublishedActivity,
} from '@/utils/socialActivityPublish';
import { canWriteSocialActivity } from '@/utils/socialPublishGuard';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { notificationService } from '@/utils/notificationService';
import {
  updateActivityVisibility,
  type ActivityVisibility,
} from '@/utils/friendsService';
import {
  clearVisibilityWrite,
  hasPendingVisibilityWrite,
  markVisibilityWrite,
} from '@/utils/visibilityWriteGuard';
import {
  checkActivityAvailable,
  getActiveTodayCount,
  getFeed,
  logEvent,
  subscribeToActivity,
  toggleCheer,
  type ActivityEvent,
  type ActivityType,
  type LogEventInput,
} from '@/utils/activityService';

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 60, 100, 150, 200, 365];

export const [ActivityProvider, useActivity] = createContextHook(() => {
  const { supabaseUser, isGuest } = useAuth();
  const { friends, myProfile, patchMyProfile } = useFriends();
  const { shares: habitShares, enforced: habitShareEnforced } = usePartnerHabitShares();
  const { stats } = useGamification();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const myUserId: string | undefined = supabaseUser?.id;
  const enabled = !!myUserId && supabaseConfigured && !isGuest;

  const [available, setAvailable] = useState<boolean | null>(enabled ? null : false);
  const [visibility, setVisibilityState] = useState<ActivityVisibility>('private');

  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const currentStreak = stats?.currentStreak ?? 0;

  const socialNotifsEnabled = profile?.notificationSettings?.socialNotifications !== false;
  const socialNotifsRef = useRef(socialNotifsEnabled);
  socialNotifsRef.current = socialNotifsEnabled;

  useEffect(() => {
    if (!enabled) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    void checkActivityAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!myProfile?.activityVisibility || !myUserId) return;
    if (hasPendingVisibilityWrite(myUserId)) return;
    setVisibilityState(myProfile.activityVisibility);
    void unifiedStorage.setItem(
      activityVisibilityStorageKey(myUserId),
      myProfile.activityVisibility,
    );
  }, [myProfile?.activityVisibility, myUserId]);

  const friendIdsKey = useMemo(() => [...friendIds].sort().join(','), [friendIds]);

  const queriesEnabled = enabled && available === true;

  const feedQuery = useQuery({
    queryKey: ['activity', 'feed', myUserId, friendIdsKey],
    queryFn: () => getFeed(myUserId as string, friendIds),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const activeTodayQuery = useQuery({
    queryKey: ['activity', 'active-today', myUserId, friendIdsKey],
    queryFn: () => getActiveTodayCount(friends),
    enabled: queriesEnabled && friends.length > 0,
    staleTime: 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activity'] });
  }, [queryClient]);

  // Realtime: live feed + a notification when a friend cheers your post.
  useEffect(() => {
    if (!queriesEnabled || !myUserId) return;
    return subscribeToActivity(myUserId, {
      onChange: invalidate,
      onCheerOnMyEvent: () => {
        if (!socialNotifsRef.current) return;
        void notificationService
          .sendImmediateNotification(
            'You got a cheer 🎉',
            'A friend cheered your progress on One Pager.',
            { type: 'social' },
          )
          .catch(() => {});
      },
    });
  }, [queriesEnabled, myUserId, invalidate]);

  const logActivity = useCallback(
    async (input: Omit<LogEventInput, 'userId'>) => {
      if (!queriesEnabled || !myUserId) return;
      try {
        const visibility = await unifiedStorage.getItem(activityVisibilityStorageKey(myUserId));
        if (visibility === 'private') return;
        if (!(await canWriteSocialActivity(myUserId))) return;
        const sanitized = sanitizePublishedActivity({
          ...input,
          genericCopy: profile?.displayPreferences?.genericSocialActivity ?? true,
        });
        await logEvent({ type: input.type, ...sanitized, userId: myUserId });
        invalidate();
      } catch {
        // best effort
      }
    },
    [queriesEnabled, myUserId, invalidate, profile?.displayPreferences?.genericSocialActivity],
  );

  // Auto-log streak milestones once each.
  useEffect(() => {
    if (!queriesEnabled || !myUserId || currentStreak < STREAK_MILESTONES[0]) return;
    const milestone = [...STREAK_MILESTONES].reverse().find((m) => currentStreak >= m);
    if (!milestone) return;
    const key = `activity_last_milestone_${myUserId}`;
    let cancelled = false;
    (async () => {
      try {
        const stored = await unifiedStorage.getItem(key);
        const last = stored ? parseInt(stored, 10) : 0;
        if (cancelled || milestone <= last) return;
        const visibility = await unifiedStorage.getItem(activityVisibilityStorageKey(myUserId));
        if (visibility === 'private') return;
        if (!(await canWriteSocialActivity(myUserId))) return;
        const sanitized = sanitizePublishedActivity({
          type: 'streak_milestone',
          title: `${milestone}-day streak! 🔥`,
          body: 'Hit a streak milestone',
          metadata: { milestone },
          genericCopy: profile?.displayPreferences?.genericSocialActivity ?? true,
        });
        await logEvent({
          type: 'streak_milestone',
          userId: myUserId,
          ...sanitized,
        });
        await unifiedStorage.setItem(key, String(milestone));
        invalidate();
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queriesEnabled, myUserId, currentStreak, myProfile?.displayName, invalidate, profile?.displayPreferences?.genericSocialActivity]);

  const cheer = useCallback(
    async (eventId: string, on: boolean) => {
      // Optimistic feed update.
      queryClient.setQueryData<ActivityEvent[]>(
        ['activity', 'feed', myUserId, friendIdsKey],
        (prev) =>
          (prev ?? []).map((e) =>
            e.id === eventId
              ? { ...e, cheeredByMe: on, cheersCount: Math.max(0, e.cheersCount + (on ? 1 : -1)) }
              : e,
          ),
      );
      try {
        const total = await toggleCheer(eventId, on);
        queryClient.setQueryData<ActivityEvent[]>(
          ['activity', 'feed', myUserId, friendIdsKey],
          (prev) => (prev ?? []).map((e) => (e.id === eventId ? { ...e, cheersCount: total } : e)),
        );
      } catch {
        invalidate(); // reconcile from server on failure
      }
    },
    [queryClient, myUserId, friendIdsKey, invalidate],
  );

  const setVisibility = useCallback(
    async (v: ActivityVisibility) => {
      if (!myUserId) return;
      const previous = visibility;
      markVisibilityWrite(myUserId, v);
      setVisibilityState(v);
      patchMyProfile({ activityVisibility: v });
      try {
        await unifiedStorage.setItem(activityVisibilityStorageKey(myUserId), v);
        await updateActivityVisibility(myUserId, v);
        clearVisibilityWrite();
      } catch {
        clearVisibilityWrite();
        setVisibilityState(previous);
        patchMyProfile({ activityVisibility: previous });
        void unifiedStorage.setItem(activityVisibilityStorageKey(myUserId), previous);
        Alert.alert(
          'Could not save visibility',
          'Your privacy setting did not sync. Check your connection and try again.',
        );
      }
    },
    [myUserId, visibility, patchMyProfile],
  );

  const presenceLabel = useMemo(() => {
    const n = activeTodayQuery.data ?? 0;
    if (n <= 0) return null;
    return `${n} partner${n === 1 ? '' : 's'} active today`;
  }, [activeTodayQuery.data]);

  const feed = useMemo(() => {
    const raw = feedQuery.data ?? [];
    if (!myUserId || !habitShareEnforced) return raw;
    return filterFeedByHabitShares(raw, myUserId, habitShares);
  }, [feedQuery.data, myUserId, habitShares, habitShareEnforced]);

  return {
    available,
    isSignedIn: enabled,
    feed,
    isLoading: feedQuery.isLoading,
    isRefreshing: feedQuery.isFetching,
    activeTodayCount: activeTodayQuery.data ?? 0,
    presenceLabel,
    visibility,
    setVisibility,
    cheer,
    logActivity,
    refresh: invalidate,
  };
});

export type { ActivityEvent, ActivityType };
