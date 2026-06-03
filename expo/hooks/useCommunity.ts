import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './useAuth';
import { useFriends } from './useFriends';
import { supabaseConfigured } from '@/utils/supabaseClient';
import {
  checkCommunityAvailable,
  deleteMyHabit,
  getMyLikedIds,
  getStats,
  isSocialUnavailableError,
  listMyPublishedHabits,
  listPublicHabits,
  publishHabit,
  subscribeToCommunity,
  toggleLike as toggleLikeSvc,
  toggleSave as toggleSaveSvc,
  type HabitStats,
  type PublishHabitInput,
} from '@/utils/communityService';
import type { CommunityHabit } from '@/types/habit';

export interface PublishInput {
  name: string;
  description?: string;
  longDescription?: string;
  category: string;
  color?: string;
  icon?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  estimatedDuration?: string;
  tags?: string[];
  benefits?: string[];
  frequency?: { type?: string; days: number[]; timesPerWeek?: number };
}

export const [CommunityProvider, useCommunity] = createContextHook(() => {
  const { supabaseUser, user, isGuest } = useAuth();
  const { myProfile } = useFriends();
  const queryClient = useQueryClient();

  const myUserId: string | undefined = supabaseUser?.id;
  const enabled = !!myUserId && supabaseConfigured && !isGuest;

  const [available, setAvailable] = useState<boolean | null>(enabled ? null : false);
  const [statsMap, setStatsMap] = useState<Map<string, HabitStats>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    void checkCommunityAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const queriesEnabled = enabled && available === true;

  const publishedQuery = useQuery({
    queryKey: ['community', 'published'],
    queryFn: () => listPublicHabits(),
    enabled: queriesEnabled,
    staleTime: 60_000,
  });

  const myPublishedQuery = useQuery({
    queryKey: ['community', 'mine', myUserId],
    queryFn: () => listMyPublishedHabits(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 60_000,
  });

  const likedQuery = useQuery({
    queryKey: ['community', 'liked', myUserId],
    queryFn: () => getMyLikedIds(myUserId as string),
    enabled: queriesEnabled,
    staleTime: 60_000,
  });

  // Seed the stats map from whatever the published lists already returned.
  useEffect(() => {
    const lists = [publishedQuery.data ?? [], myPublishedQuery.data ?? []];
    if (lists.every((l) => l.length === 0)) return;
    setStatsMap((prev) => {
      const next = new Map(prev);
      for (const list of lists) {
        for (const h of list) {
          if (!next.has(h.id)) next.set(h.id, { saves: h.saves, likes: h.likes });
        }
      }
      return next;
    });
  }, [publishedQuery.data, myPublishedQuery.data]);

  const mergeStats = useCallback((incoming: Map<string, HabitStats>) => {
    setStatsMap((prev) => {
      const next = new Map(prev);
      incoming.forEach((v, k) => next.set(k, v));
      return next;
    });
  }, []);

  /** Load real save/like counts for a set of (e.g. built-in catalog) habit ids. */
  const loadStats = useCallback(
    async (ids: string[]) => {
      if (!queriesEnabled || ids.length === 0) return;
      const missing = ids.filter((id) => !statsMap.has(id));
      if (missing.length === 0) return;
      try {
        const fetched = await getStats(missing);
        // Ensure every requested id is present (so we don't refetch zeros forever).
        const filled = new Map(fetched);
        for (const id of missing) if (!filled.has(id)) filled.set(id, { saves: 0, likes: 0 });
        mergeStats(filled);
      } catch {
        // ignore — counts simply fall back to the static values.
      }
    },
    [queriesEnabled, statsMap, mergeStats],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['community'] });
  }, [queryClient]);

  // Realtime: live counts + new publications.
  useEffect(() => {
    if (!queriesEnabled) return;
    return subscribeToCommunity(() => {
      // Light refresh of lists; counts also reconcile on next read.
      queryClient.invalidateQueries({ queryKey: ['community', 'published'] });
    });
  }, [queriesEnabled, queryClient]);

  const setStat = useCallback((habitId: string, patch: Partial<HabitStats>) => {
    setStatsMap((prev) => {
      const next = new Map(prev);
      const cur = next.get(habitId) ?? { saves: 0, likes: 0 };
      next.set(habitId, { ...cur, ...patch });
      return next;
    });
  }, []);

  const recordSave = useCallback(
    async (habitId: string, saved: boolean) => {
      if (!queriesEnabled) return;
      // Optimistic update.
      const cur = statsMap.get(habitId) ?? { saves: 0, likes: 0 };
      setStat(habitId, { saves: Math.max(0, cur.saves + (saved ? 1 : -1)) });
      try {
        const total = await toggleSaveSvc(habitId, saved);
        setStat(habitId, { saves: total });
      } catch {
        setStat(habitId, { saves: cur.saves }); // revert
      }
    },
    [queriesEnabled, statsMap, setStat],
  );

  const recordLike = useCallback(
    async (habitId: string, liked: boolean) => {
      if (!queriesEnabled) return;
      const cur = statsMap.get(habitId) ?? { saves: 0, likes: 0 };
      setStat(habitId, { likes: Math.max(0, cur.likes + (liked ? 1 : -1)) });
      queryClient.setQueryData<Set<string>>(['community', 'liked', myUserId], (prev) => {
        const next = new Set(prev ?? []);
        if (liked) next.add(habitId);
        else next.delete(habitId);
        return next;
      });
      try {
        const total = await toggleLikeSvc(habitId, liked);
        setStat(habitId, { likes: total });
      } catch {
        setStat(habitId, { likes: cur.likes });
      }
    },
    [queriesEnabled, statsMap, setStat, queryClient, myUserId],
  );

  const publish = useCallback(
    async (input: PublishInput): Promise<CommunityHabit> => {
      if (!myUserId) throw new Error('You must be signed in to publish.');
      const payload: PublishHabitInput = {
        creatorId: myUserId,
        creatorName: myProfile?.displayName || user?.name || null,
        creatorUsername: myProfile?.username || null,
        creatorAvatar: myProfile?.avatarUrl || user?.avatar || null,
        name: input.name,
        description: input.description ?? null,
        longDescription: input.longDescription ?? null,
        icon: input.icon ?? null,
        color: input.color ?? '#6366F1',
        category: input.category,
        difficulty: input.difficulty ?? null,
        estimatedDuration: input.estimatedDuration ?? null,
        tags: input.tags ?? [],
        benefits: input.benefits ?? [],
        frequency: input.frequency ?? { type: 'daily', days: [] },
      };
      const created = await publishHabit(payload);
      refresh();
      return created;
    },
    [myUserId, myProfile, user, refresh],
  );

  const unpublish = useCallback(
    async (habitId: string) => {
      await deleteMyHabit(habitId);
      refresh();
    },
    [refresh],
  );

  // Overlay live stats onto the published list.
  const publishedHabits = useMemo<CommunityHabit[]>(() => {
    const list = publishedQuery.data ?? [];
    return list.map((h) => {
      const s = statsMap.get(h.id);
      return s ? { ...h, saves: s.saves, likes: s.likes } : h;
    });
  }, [publishedQuery.data, statsMap]);

  const myPublishedHabits = useMemo<CommunityHabit[]>(() => {
    const list = myPublishedQuery.data ?? [];
    return list.map((h) => {
      const s = statsMap.get(h.id);
      return s ? { ...h, saves: s.saves, likes: s.likes } : h;
    });
  }, [myPublishedQuery.data, statsMap]);

  const getStatsFor = useCallback(
    (habitId: string): HabitStats | undefined => statsMap.get(habitId),
    [statsMap],
  );

  const isUnavailableErr = isSocialUnavailableError;

  return {
    available,
    isSignedIn: enabled,
    publishedHabits,
    myPublishedHabits,
    likedIds: likedQuery.data ?? new Set<string>(),
    statsMap,
    isLoading: publishedQuery.isLoading,
    loadStats,
    getStatsFor,
    recordSave,
    recordLike,
    publish,
    unpublish,
    refresh,
    isUnavailableErr,
  };
});
