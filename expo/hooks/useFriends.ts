import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import * as Notifications from 'expo-notifications';
import { useAuth } from './useAuth';
import { useGamification } from './useHabitsEnhancement';
import { useUserProfile } from './useUserProfile';
import { supabaseConfigured } from '@/utils/supabaseClient';
import { isLocalAvatarUri, resolveDisplayAvatarUrl } from '@/utils/avatarUtils';
import { uploadProfileAvatar } from '@/utils/avatarService';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  ensureMyProfile,
  getProfileByUsername,
  isSocialUnavailableError,
  listFriends,
  listIncomingRequests,
  listNudges,
  listOutgoingRequests,
  markNudgesRead,
  countFriendships,
  rejectFriendRequest,
  removeFriend as removeFriendSvc,
  searchProfiles,
  sendFriendRequest,
  sendNudge,
  subscribeToSocialChanges,
  updateProfileAvatar,
  updateSocialPrivacy,
  enrichSocialProfile,
  type SendRequestResult,
  type SocialProfile,
} from '@/utils/friendsService';
import { blockPartner, reportPartner, type PartnerReportReason } from '@/utils/socialCompliance';
import { mergeSocialPrivacy } from '@/utils/socialPrivacy';
import { preferLocalActivityVisibility } from '@/utils/visibilityWriteGuard';
import { canUseSocialFeatures } from '@/utils/socialAgeConsent';
import type { Leaderboard } from '@/types/gamification';
import {
  getInviteRsvpNotificationContent,
  parseInviteRsvpNudgeMessage,
} from '@/utils/inviteRsvpNotifications';

async function notifyLocal(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // permissions not granted / unavailable — fine, in-app badge still shows.
  }
}

export const [FriendsProvider, useFriends] = createContextHook(() => {
  const { supabaseUser, user, isGuest } = useAuth();
  const { stats } = useGamification();
  const { profile, updateProfile } = useUserProfile();
  const queryClient = useQueryClient();

  const myUserId: string | undefined = supabaseUser?.id;
  const enabled = !!myUserId && supabaseConfigured && !isGuest;
  const socialAllowed = canUseSocialFeatures(profile);
  const socialNotifsEnabled = profile?.notificationSettings?.socialNotifications !== false;
  const socialNotifsRef = useRef(socialNotifsEnabled);
  socialNotifsRef.current = socialNotifsEnabled;

  const publishedAvatarUrl = resolveDisplayAvatarUrl({
    profileAvatar: profile?.avatar,
    authAvatar: user?.avatar,
    socialAvatar: null,
  });

  // null = initializing, true = social tables ready, false = migrations missing
  const [backendReady, setBackendReady] = useState<boolean | null>(enabled ? null : false);
  const [initError, setInitError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<SocialProfile | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);

  const currentStreak = stats?.currentStreak ?? 0;
  const totalCompletions = stats?.totalCompletions ?? 0;
  const level = stats?.level ?? 1;

  const available = backendReady === true && socialAllowed;
  const isInitializing = enabled && backendReady === null;

  // Ensure my published profile row exists + keep streak fresh.
  useEffect(() => {
    if (!enabled || !myUserId) {
      if (!enabled) setBackendReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setInitError(null);
        const privacy = mergeSocialPrivacy(profile?.socialPrivacy);
        const prof = await ensureMyProfile({
          userId: myUserId,
          displayName: user?.name?.trim() || profile?.name?.trim() || null,
          email: user?.email ?? null,
          avatarUrl: publishedAvatarUrl,
          currentStreak,
          totalCompletions,
          level,
          shareStreakOnly: privacy.shareStreakOnly,
          shareEventsOnly: privacy.shareEventsOnly,
          hideLastActive: privacy.hideLastActive,
          blockNudges: privacy.blockNudges,
        });
        if (!cancelled) {
          setMyProfile({
            ...prof,
            activityVisibility: preferLocalActivityVisibility(
              myUserId,
              prof.activityVisibility,
            ),
          });
          setBackendReady(true);
          setInitError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBackendReady(false);
          const msg = (e as { message?: string })?.message?.trim() || 'Could not connect to social backend';
          setInitError(isSocialUnavailableError(e) ? null : msg);
        }
        if (!isSocialUnavailableError(e) && __DEV__) {
          console.warn('useFriends: ensureMyProfile failed', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    myUserId,
    currentStreak,
    totalCompletions,
    level,
    user?.name,
    user?.email,
    profile?.name,
    profile?.socialPrivacy,
    publishedAvatarUrl,
    initAttempt,
  ]);

  const myProfileForUi = useMemo(
    () =>
      enrichSocialProfile(myProfile, {
        profileName: profile?.name,
        authName: user?.name,
        authEmail: user?.email,
        profileAvatar: profile?.avatar,
        authAvatar: user?.avatar,
      }),
    [myProfile, profile?.name, profile?.avatar, user?.name, user?.email, user?.avatar],
  );

  // Backfill local-only avatars to Supabase Storage so friends can see them.
  useEffect(() => {
    if (!enabled || !myUserId || !profile?.avatar || !isLocalAvatarUri(profile.avatar)) return;
    let cancelled = false;

    void (async () => {
      try {
        const remoteUrl = await uploadProfileAvatar(myUserId, profile.avatar!);
        if (!remoteUrl || cancelled) return;
        updateProfile({ avatar: remoteUrl });
        const updated = await updateProfileAvatar(myUserId, remoteUrl);
        if (!cancelled && updated) {
          setMyProfile(updated);
          queryClient.invalidateQueries({ queryKey: ['social', 'friends', myUserId] });
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('useFriends: avatar upload backfill failed', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, myUserId, profile?.avatar, queryClient, updateProfile]);

  const patchMyProfile = useCallback((patch: Partial<SocialProfile>) => {
    setMyProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const queriesEnabled = enabled && backendReady === true && socialAllowed;

  const friendsQuery = useQuery({
    queryKey: ['social', 'friends', myUserId],
    queryFn: () => listFriends(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 30_000,
    retry: 2,
  });

  const friendshipCountQuery = useQuery({
    queryKey: ['social', 'friendship-count', myUserId],
    queryFn: () => countFriendships(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const incomingQuery = useQuery({
    queryKey: ['social', 'incoming', myUserId],
    queryFn: () => listIncomingRequests(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const outgoingQuery = useQuery({
    queryKey: ['social', 'outgoing', myUserId],
    queryFn: () => listOutgoingRequests(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const nudgesQuery = useQuery({
    queryKey: ['social', 'nudges', myUserId],
    queryFn: () => listNudges(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 15_000,
  });

  const retryInit = useCallback(() => {
    setInitError(null);
    setBackendReady(null);
    setInitAttempt((n) => n + 1);
  }, []);

  const invalidateAll = useCallback(() => {
    if (!myUserId) return;
    queryClient.invalidateQueries({ queryKey: ['social', 'friends', myUserId] });
    queryClient.invalidateQueries({ queryKey: ['social', 'friendship-count', myUserId] });
    queryClient.invalidateQueries({ queryKey: ['social', 'incoming', myUserId] });
    queryClient.invalidateQueries({ queryKey: ['social', 'outgoing', myUserId] });
    queryClient.invalidateQueries({ queryKey: ['social', 'nudges', myUserId] });
    queryClient.invalidateQueries({ queryKey: ['social', 'habit-shares', myUserId] });
  }, [queryClient, myUserId]);

  // Realtime: live friend/request/nudge updates + local notifications.
  useEffect(() => {
    if (!queriesEnabled || !myUserId) return;
    const unsubscribe = subscribeToSocialChanges(myUserId, {
      onChange: invalidateAll,
      onIncomingRequest: () => {
        void notifyLocal('New friend request', 'Someone wants to be your accountability partner on One Pager.');
      },
      onNudge: ({ message }) => {
        if (!socialNotifsRef.current) return;
        if (mergeSocialPrivacy(profile?.socialPrivacy).blockNudges) return;
        const inviteRsvp = parseInviteRsvpNudgeMessage(message);
        if (inviteRsvp) {
          const { title, body } = getInviteRsvpNotificationContent(inviteRsvp);
          void notifyLocal(title, body);
          return;
        }
        void notifyLocal(
          'You got nudged 👋',
          message?.trim() ? message : 'A friend is cheering you on — keep your streak alive!',
        );
      },
    });
    return unsubscribe;
  }, [queriesEnabled, myUserId, invalidateAll, profile?.socialPrivacy]);

  // --- Actions --------------------------------------------------------------
  const requestByUserId = useCallback(
    async (
      toUserId: string,
      inviteHabits?: { habitId: string; habitName: string }[],
    ): Promise<SendRequestResult> => {
      if (!myUserId) return { ok: false, reason: 'error', message: 'Not signed in' };
      const res = await sendFriendRequest(myUserId, toUserId, inviteHabits);
      invalidateAll();
      return res;
    },
    [myUserId, invalidateAll],
  );

  const requestByUsername = useCallback(
    async (
      username: string,
      inviteHabits?: { habitId: string; habitName: string }[],
    ): Promise<SendRequestResult> => {
      if (!myUserId) return { ok: false, reason: 'error', message: 'Not signed in' };
      try {
        const profile = await getProfileByUsername(username);
        if (!profile) return { ok: false, reason: 'error', message: 'No user found with that username' };
        return await requestByUserId(profile.id, inviteHabits);
      } catch (e) {
        return { ok: false, reason: 'error', message: (e as Error)?.message };
      }
    },
    [myUserId, requestByUserId],
  );

  const search = useCallback(
    async (query: string): Promise<SocialProfile[]> => {
      if (!myUserId) return [];
      try {
        return await searchProfiles(query, myUserId);
      } catch {
        return [];
      }
    },
    [myUserId],
  );

  const accept = useCallback(
    async (requestId: string) => {
      await acceptFriendRequest(requestId);
      invalidateAll();
    },
    [invalidateAll],
  );

  const reject = useCallback(
    async (requestId: string) => {
      await rejectFriendRequest(requestId);
      invalidateAll();
    },
    [invalidateAll],
  );

  const cancel = useCallback(
    async (requestId: string) => {
      await cancelFriendRequest(requestId);
      invalidateAll();
    },
    [invalidateAll],
  );

  const unfriend = useCallback(
    async (otherUserId: string) => {
      await removeFriendSvc(otherUserId);
      invalidateAll();
    },
    [invalidateAll],
  );

  const block = useCallback(
    async (otherUserId: string) => {
      await blockPartner(otherUserId);
      invalidateAll();
    },
    [invalidateAll],
  );

  const report = useCallback(
    async (otherUserId: string, reason: PartnerReportReason, details?: string) => {
      await reportPartner(otherUserId, reason, details);
    },
    [],
  );

  const nudge = useCallback(
    async (toUserId: string, message?: string) => {
      if (!myUserId) return;
      await sendNudge(myUserId, toUserId, message);
    },
    [myUserId],
  );

  const markAllNudgesRead = useCallback(async () => {
    if (!myUserId) return;
    try {
      await markNudgesRead(myUserId);
      invalidateAll();
    } catch {
      // ignore
    }
  }, [myUserId, invalidateAll]);

  const blockNudges = mergeSocialPrivacy(profile?.socialPrivacy).blockNudges;

  const unreadNudges = useMemo(
    () =>
      blockNudges
        ? []
        : (nudgesQuery.data ?? []).filter((n) => !n.read),
    [nudgesQuery.data, blockNudges],
  );

  const socialAlertCount = useMemo(
    () => (incomingQuery.data ?? []).length + unreadNudges.length,
    [incomingQuery.data, unreadNudges.length],
  );

  const updatePartnerPrivacy = useCallback(
    async (patch: {
      shareStreakOnly?: boolean;
      shareEventsOnly?: boolean;
      hideLastActive?: boolean;
      blockNudges?: boolean;
    }) => {
      if (!myUserId) return null;
      const updated = await updateSocialPrivacy(myUserId, patch);
      if (updated) setMyProfile(updated);
      return updated;
    },
    [myUserId],
  );

  // Live leaderboard built from real partners (+ me), ranked by current streak.
  const friendsLeaderboard = useMemo<Leaderboard | null>(() => {
    if (backendReady !== true) return null;
    const friendsData = friendsQuery.data ?? [];
    const entries = friendsData.map((f) => ({
      rank: 0,
      userId: f.id,
      userName: f.displayName || f.username,
      avatar: f.avatarUrl ?? undefined,
      score: f.currentStreak,
      change: 0,
      isCurrentUser: false,
    }));
    entries.push({
      rank: 0,
      userId: myUserId ?? 'me',
      userName: myProfile?.displayName || myProfile?.username || 'You',
      avatar: myProfile?.avatarUrl ?? undefined,
      score: currentStreak,
      change: 0,
      isCurrentUser: true,
    });
    entries.sort((a, b) => b.score - a.score);
    return {
      id: 'partners_streaks',
      name: 'Partner Streaks 🔥',
      type: 'friends',
      period: 'all_time',
      entries: entries.map((e, i) => ({ ...e, rank: i + 1 })),
      updatedAt: new Date().toISOString(),
    };
  }, [backendReady, friendsQuery.data, myUserId, myProfile, currentStreak]);

  const friendsError = friendsQuery.error as Error | null;
  const hasFriendsError = friendsQuery.isError;

  return {
    available,
    backendReady,
    initError,
    isInitializing,
    isSignedIn: enabled,
    myProfile: myProfileForUi,
    patchMyProfile,
    friends: friendsQuery.data ?? [],
    friendshipCount: friendshipCountQuery.data ?? 0,
    incomingRequests: incomingQuery.data ?? [],
    outgoingRequests: outgoingQuery.data ?? [],
    nudges: nudgesQuery.data ?? [],
    unreadNudges,
    socialAlertCount,
    friendsLeaderboard,
    friendsError,
    hasFriendsError,
    isLoading:
      friendsQuery.isLoading ||
      friendshipCountQuery.isLoading ||
      incomingQuery.isLoading ||
      outgoingQuery.isLoading,
    isRefreshing:
      friendsQuery.isFetching ||
      friendshipCountQuery.isFetching ||
      incomingQuery.isFetching,
    refresh: invalidateAll,
    retryInit,
    search,
    requestByUserId,
    requestByUsername,
    accept,
    reject,
    cancel,
    unfriend,
    block,
    report,
    nudge,
    markAllNudgesRead,
    updatePartnerPrivacy,
    blockNudges,
    socialAllowed,
  };
});
