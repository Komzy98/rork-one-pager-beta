import { useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { LocalEvent, SavedEventSnapshot } from '@/types/events';
import { localEventToSavedSnapshot, savedSnapshotToLocalEvent } from '@/utils/eventMappers';
import { getDaysUntilEvent } from '@/utils/eventDiscovery';
import {
  applyJoyPatches,
  getEventsNeedingFeedback,
  inferJoyPatchesFromSavedEvent,
  type EventFeedbackRating,
} from '@/utils/eventJoyFeedback';
import { useSocialActivity } from '@/hooks/useSocialActivity';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { publishEventSave, unpublishEventSave } from '@/utils/sharedPlansService';

export function useSavedEvents() {
  const { profile, updateProfile } = useUserProfile();
  const { logEventSaved } = useSocialActivity();
  const { supabaseUser, isGuest } = useAuth();
  const { myProfile } = useFriends();

  const savedSnapshots = useMemo(
    () => profile?.savedEvents ?? [],
    [profile?.savedEvents]
  );

  const savedIds = useMemo(
    () => new Set(savedSnapshots.map((e) => e.id)),
    [savedSnapshots]
  );

  const isSaved = useCallback((eventId: string) => savedIds.has(eventId), [savedIds]);

  const shareSavesWithFriends =
    !isGuest &&
    !!supabaseUser?.id &&
    (myProfile?.activityVisibility ?? 'friends') !== 'private';

  const addToOnePager = useCallback(
    async (event: LocalEvent) => {
      const existing = savedSnapshots.find((e) => e.id === event.id);
      if (existing) return existing;

      const snapshot = localEventToSavedSnapshot(event);
      const next = [snapshot, ...savedSnapshots.filter((e) => e.id !== event.id)].slice(0, 50);
      await updateProfile({ savedEvents: next });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void logEventSaved(event);
      if (shareSavesWithFriends && supabaseUser?.id) {
        void publishEventSave(supabaseUser.id, snapshot);
      }
      return snapshot;
    },
    [savedSnapshots, updateProfile, logEventSaved, shareSavesWithFriends, supabaseUser?.id]
  );

  const removeFromOnePager = useCallback(
    async (eventId: string) => {
      if (!savedIds.has(eventId)) return;
      const next = savedSnapshots.filter((e) => e.id !== eventId);
      await updateProfile({ savedEvents: next });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (shareSavesWithFriends && supabaseUser?.id) {
        void unpublishEventSave(supabaseUser.id, eventId);
      }
    },
    [savedIds, savedSnapshots, updateProfile, shareSavesWithFriends, supabaseUser?.id]
  );

  const toggleSaved = useCallback(
    async (event: LocalEvent) => {
      if (savedIds.has(event.id)) {
        await removeFromOnePager(event.id);
        return false;
      }
      await addToOnePager(event);
      return true;
    },
    [addToOnePager, removeFromOnePager, savedIds]
  );

  const savedAsLocalEvents = useMemo((): LocalEvent[] => {
    return [...savedSnapshots]
      .map((s) => ({ ...savedSnapshotToLocalEvent(s), isSaved: true }))
      .sort((a, b) => {
        const da = getDaysUntilEvent(a);
        const db = getDaysUntilEvent(b);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
  }, [savedSnapshots]);

  const getSnapshotById = useCallback(
    (id: string): SavedEventSnapshot | undefined => savedSnapshots.find((e) => e.id === id),
    [savedSnapshots]
  );

  const upcomingSaved = useMemo(() => {
    return savedAsLocalEvents.filter((e) => {
      const days = getDaysUntilEvent(e);
      return days === null || days >= 0;
    });
  }, [savedAsLocalEvents]);

  const eventsNeedingFeedback = useMemo(
    () => getEventsNeedingFeedback(savedSnapshots),
    [savedSnapshots],
  );

  const recordEventFeedback = useCallback(
    async (eventId: string, rating: EventFeedbackRating) => {
      const snapshot = savedSnapshots.find((entry) => entry.id === eventId);
      if (!snapshot) return;

      const patches = inferJoyPatchesFromSavedEvent(snapshot, rating);
      const nextSaved = savedSnapshots.map((entry) =>
        entry.id === eventId
          ? {
              ...entry,
              feedbackRating: rating,
              attendedAt: entry.attendedAt ?? new Date().toISOString(),
            }
          : entry,
      );

      await updateProfile({
        savedEvents: nextSaved,
        ...(patches ? { joySources: applyJoyPatches(profile?.joySources, patches) } : {}),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [savedSnapshots, profile?.joySources, updateProfile],
  );

  const dismissEventFeedback = useCallback(
    async (eventId: string) => {
      const nextSaved = savedSnapshots.map((entry) =>
        entry.id === eventId
          ? { ...entry, feedbackDismissedAt: new Date().toISOString() }
          : entry,
      );
      await updateProfile({ savedEvents: nextSaved });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [savedSnapshots, updateProfile],
  );

  return {
    savedSnapshots,
    savedAsLocalEvents,
    upcomingSaved,
    eventsNeedingFeedback,
    savedCount: savedSnapshots.length,
    isSaved,
    addToOnePager,
    removeFromOnePager,
    toggleSaved,
    getSnapshotById,
    recordEventFeedback,
    dismissEventFeedback,
  };
}
