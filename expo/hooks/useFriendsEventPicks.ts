import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import type { LocalEvent } from '@/types/events';
import { savedSnapshotToLocalEvent, onePagerToLocalEvent } from '@/utils/eventMappers';
import {
  checkSharedPlansAvailable,
  getFriendsSavedEventIds,
  getFriendsSavedEvents,
} from '@/utils/sharedPlansService';
import { supabaseConfigured } from '@/utils/supabaseClient';
import { listCatalogEvents } from '@/utils/eventCatalog';
import { groupFriendsByEventId } from '@/utils/eventSocialProof';

export function useFriendsEventPicks(pool: LocalEvent[]) {
  const { supabaseUser, isGuest } = useAuth();
  const { friends } = useFriends();
  const myUserId = supabaseUser?.id;
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const enabled = !!myUserId && supabaseConfigured && !isGuest && friendIds.length > 0;

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

  const countsQuery = useQuery({
    queryKey: ['friends-event-picks-counts', friendIds.join(',')],
    queryFn: () => getFriendsSavedEventIds(friendIds),
    enabled: enabled && available === true,
    staleTime: 60_000,
  });

  const savesQuery = useQuery({
    queryKey: ['friends-event-picks-saves', friendIds.join(',')],
    queryFn: () => getFriendsSavedEvents(friendIds, 30),
    enabled: enabled && available === true,
    staleTime: 60_000,
  });

  const friendsPickEvents = useMemo(() => {
    const counts = countsQuery.data ?? new Map<string, number>();
    if (counts.size === 0 && !(savesQuery.data?.length)) return [];

    const catalog = pool.length > 0 ? pool : listCatalogEvents().map((e) => onePagerToLocalEvent({ ...e, isSaved: false }));

    const ranked = catalog
      .map((event) => ({
        event,
        friendCount: counts.get(event.id) ?? 0,
      }))
      .filter((row) => row.friendCount > 0)
      .sort((a, b) => b.friendCount - a.friendCount || (a.event.distanceKm ?? 999) - (b.event.distanceKm ?? 999));

    if (ranked.length > 0) {
      return ranked.map((r) => r.event);
    }

    const fromSaves = (savesQuery.data ?? [])
      .map((save) => {
        try {
          return savedSnapshotToLocalEvent(save.snapshot);
        } catch {
          return null;
        }
      })
      .filter((e): e is LocalEvent => e != null);

    const seen = new Set<string>();
    return fromSaves.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [countsQuery.data, savesQuery.data, pool]);

  const friendCountByEventId = countsQuery.data ?? new Map<string, number>();

  const friendsByEventId = useMemo(
    () => groupFriendsByEventId(savesQuery.data ?? []),
    [savesQuery.data],
  );

  return {
    available: available === true,
    friendsPickEvents,
    friendCountByEventId,
    friendsByEventId,
    friendSaves: savesQuery.data ?? [],
    isLoading: countsQuery.isLoading || savesQuery.isLoading,
  };
}
