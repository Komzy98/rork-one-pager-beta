import { useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useExperienceFeedback } from '@/hooks/useExperienceFeedback';
import type { EventPlanningStatus, LocalEvent, SavedEventSnapshot } from '@/types/events';
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
import { mergeSocialPrivacy, shouldPublishEventSaves } from '@/utils/socialPrivacy';
import { addSavedEvent, removeSavedEvent } from '@/utils/savedEventList';

function eventExperienceTags(snapshot: Pick<SavedEventSnapshot, 'category' | 'tags' | 'subCategory'>) {
  return [snapshot.category, snapshot.subCategory, ...(snapshot.tags ?? [])].filter((value): value is string => Boolean(value));
}

export function useSavedEvents() {
  const { profile, updateProfile } = useUserProfile();
  const { logEventSaved } = useSocialActivity();
  const { supabaseUser, isGuest } = useAuth();
  const { myProfile } = useFriends();
  const experience = useExperienceFeedback();

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
    (myProfile?.activityVisibility ?? 'friends') !== 'private' &&
    shouldPublishEventSaves(mergeSocialPrivacy(profile?.socialPrivacy));

  const addToOnePager = useCallback(
    async (event: LocalEvent) => {
      const snapshot = localEventToSavedSnapshot(event);
      let added = false;
      await updateProfile((current) => {
        const snapshots = current.savedEvents ?? [];
        if (snapshots.some((entry) => entry.id === event.id)) return {};
        added = true;
        return { savedEvents: addSavedEvent(snapshots, snapshot) };
      });
      if (!added) return snapshot;
      await experience.record({
        kind: 'event', subjectId: snapshot.id, title: snapshot.title,
        action: 'chosen', tags: eventExperienceTags(snapshot), source: 'saved-event',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      void logEventSaved(event);
      if (shareSavesWithFriends && supabaseUser?.id) {
        void publishEventSave(supabaseUser.id, snapshot).catch(() => {});
      }
      return snapshot;
    },
    [updateProfile, experience.record, logEventSaved, shareSavesWithFriends, supabaseUser?.id]
  );

  const setPlanningStatus = useCallback(
    async (eventId: string, status: EventPlanningStatus) => {
      await updateProfile((current) => {
        const snapshots = current.savedEvents ?? [];
        if (!snapshots.some((entry) => entry.id === eventId)) return {};
        return { savedEvents: snapshots.map(snapshot =>
          snapshot.id === eventId ? { ...snapshot, planningStatus: status } : snapshot
        ) };
      });
      void Haptics.selectionAsync().catch(() => {});
    },
    [updateProfile],
  );

  const removeFromOnePager = useCallback(
    async (eventId: string) => {
      let removed = false;
      await updateProfile((current) => {
        const snapshots = current.savedEvents ?? [];
        if (!snapshots.some((entry) => entry.id === eventId)) return {};
        removed = true;
        return { savedEvents: removeSavedEvent(snapshots, eventId) };
      });
      if (!removed) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (shareSavesWithFriends && supabaseUser?.id) {
        void unpublishEventSave(supabaseUser.id, eventId).catch(() => {});
      }
    },
    [updateProfile, shareSavesWithFriends, supabaseUser?.id]
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
    () => getEventsNeedingFeedback(savedSnapshots.filter(event => event.planningStatus === 'going' || Boolean(event.attendedAt))),
    [savedSnapshots],
  );

  const recordEventAttendance = useCallback(
    async (eventId: string, attended: boolean) => {
      let snapshot: SavedEventSnapshot | undefined;
      const now = new Date().toISOString();
      await updateProfile((current) => {
        const events = current.savedEvents ?? [];
        snapshot = events.find((entry) => entry.id === eventId);
        if (!snapshot) return {};
        return {
          savedEvents: events.map((entry) =>
            entry.id === eventId
              ? {
                  ...entry,
                  attendanceStatus: attended ? 'attended' as const : 'missed' as const,
                  attendedAt: attended ? (entry.attendedAt ?? now) : undefined,
                }
              : entry,
          ),
        };
      });
      if (!snapshot) return;
      const learned = experience.getEntry('event', snapshot.id);
      if (attended) {
        if ((learned?.completedCount ?? 0) === 0) {
          await experience.record({
            kind: 'event', subjectId: snapshot.id, title: snapshot.title,
            action: 'completed', tags: eventExperienceTags(snapshot), source: 'post-event',
          });
        }
      } else {
        await experience.record({
          kind: 'event', subjectId: snapshot.id, title: snapshot.title,
          action: 'skipped', tags: eventExperienceTags(snapshot), source: 'post-event',
        });
      }
      void Haptics.impactAsync(attended ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [updateProfile, experience.getEntry, experience.record],
  );

  const recordEventFeedback = useCallback(
    async (eventId: string, rating: EventFeedbackRating) => {
      let snapshot: SavedEventSnapshot | undefined;
      const now = new Date().toISOString();
      await updateProfile((current) => {
        const events = current.savedEvents ?? [];
        snapshot = events.find((entry) => entry.id === eventId);
        if (!snapshot) return {};
        const patches = inferJoyPatchesFromSavedEvent(snapshot, rating);
        return {
          savedEvents: events.map((entry) =>
            entry.id === eventId
              ? {
                  ...entry,
                  attendanceStatus: 'attended' as const,
                  feedbackRating: rating,
                  attendedAt: entry.attendedAt ?? now,
                }
              : entry,
          ),
          ...(patches ? { joySources: applyJoyPatches(current.joySources, patches) } : {}),
        };
      });
      if (!snapshot) return;
      const learned = experience.getEntry('event', snapshot.id);
      if ((learned?.completedCount ?? 0) === 0) {
        await experience.record({
          kind: 'event', subjectId: snapshot.id, title: snapshot.title,
          action: 'completed', tags: eventExperienceTags(snapshot), source: 'post-event',
        });
      }
      await experience.record({
        kind: 'event', subjectId: snapshot.id, title: snapshot.title,
        action: 'enjoyed', value: rating,
        tags: eventExperienceTags(snapshot), source: 'post-event',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    [updateProfile, experience.getEntry, experience.record],
  );

  const dismissEventFeedback = useCallback(
    async (eventId: string) => {
      await updateProfile((current) => {
        const events = current.savedEvents ?? [];
        if (!events.some((entry) => entry.id === eventId)) return {};
        return {
          savedEvents: events.map((entry) =>
            entry.id === eventId
              ? { ...entry, feedbackDismissedAt: new Date().toISOString() }
              : entry,
          ),
        };
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [updateProfile],
  );

  return {
    savedSnapshots,
    savedAsLocalEvents,
    upcomingSaved,
    eventsNeedingFeedback,
    savedCount: savedSnapshots.length,
    isSaved,
    addToOnePager,
    setPlanningStatus,
    removeFromOnePager,
    toggleSaved,
    getSnapshotById,
    recordEventAttendance,
    recordEventFeedback,
    dismissEventFeedback,
  };
}
