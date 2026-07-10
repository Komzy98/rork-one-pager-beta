import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useUserProfile } from '@/hooks/useUserProfile';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { syncSavedEventsToPartners } from '@/utils/sharedPlansService';

const SYNC_FLAG_PREFIX = 'partners_event_saves_synced_';

function syncStorageKey(userId: string): string {
  return `${SYNC_FLAG_PREFIX}${userId}`;
}

/**
 * One-time backfill: publish existing profile.savedEvents to user_event_saves
 * so partners see Who's going / Friends' picks for saves made before social sync.
 */
export function usePartnerEventSaveSync(): void {
  const { supabaseUser, isGuest } = useAuth();
  const { profile, isLoading } = useUserProfile();
  const { myProfile, available: friendsAvailable } = useFriends();
  const inFlightRef = useRef(false);

  useEffect(() => {
    const userId = supabaseUser?.id;
    if (isLoading || isGuest || !userId || friendsAvailable !== true) return;
    // Never publish saves while the previous account's profile is still in memory.
    if (!profile || profile.id !== userId) return;

    const visibility = myProfile?.activityVisibility ?? 'friends';
    if (visibility === 'private') return;

    const snapshots = profile.savedEvents ?? [];
    if (snapshots.length === 0) return;

    let cancelled = false;

    void (async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const flag = await unifiedStorage.getItem(syncStorageKey(userId));
        if (flag === '1' || cancelled) return;

        const ok = await syncSavedEventsToPartners(userId, snapshots);
        if (cancelled || !ok) return;

        await unifiedStorage.setItem(syncStorageKey(userId), '1');
      } catch (e) {
        if (__DEV__) {
          console.warn('[PartnerEventSaveSync] backfill failed', e);
        }
      } finally {
        inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    isGuest,
    supabaseUser?.id,
    friendsAvailable,
    myProfile?.activityVisibility,
    profile?.id,
    profile?.savedEvents,
  ]);
}

/** Headless mount inside FriendsProvider after profile load. */
export function PartnerEventSaveSync() {
  usePartnerEventSaveSync();
  return null;
}
