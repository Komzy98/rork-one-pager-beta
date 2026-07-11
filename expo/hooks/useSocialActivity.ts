import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabaseConfigured } from '@/utils/supabaseClient';
import type { LocalEvent } from '@/types/events';
import type { LiveFootballMatch } from '@/types/habit';
import { logEvent, type ActivityType } from '@/utils/activityService';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { getTodayFormatted } from '@/utils/dateUtils';
import {
  buildEventPlannedActivity,
  buildEventSavedActivity,
  buildHabitCompletedActivity,
  buildMatchPinnedActivity,
  buildPublishedHabitActivity,
  buildShowSavedActivity,
  sanitizePublishedActivity,
  type HabitPublishInput,
} from '@/utils/socialActivityPublish';
import {
  mergeSocialPrivacy,
  shouldForceGenericHabits,
  shouldPublishActivityType,
} from '@/utils/socialPrivacy';
import { canWriteSocialActivity } from '@/utils/socialPublishGuard';
import { trackSocialAnalyticsEvent } from '@/utils/socialAnalytics';

async function shouldPublish(dedupeKey: string, scope: 'forever' | 'day'): Promise<boolean> {
  const stored = await unifiedStorage.getItem(`social_dedupe_${dedupeKey}`);
  if (!stored) return true;
  if (scope === 'forever') return false;
  return stored !== getTodayFormatted();
}

async function markPublished(dedupeKey: string): Promise<void> {
  await unifiedStorage.setItem(`social_dedupe_${dedupeKey}`, getTodayFormatted());
}

async function canPublishSocially(userId: string): Promise<boolean> {
  return canWriteSocialActivity(userId);
}

/** Best-effort social activity logging — safe to call from any provider level. */
export function useSocialActivity() {
  const { supabaseUser, isGuest } = useAuth();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const userId = supabaseUser?.id;
  const canPublish = !!userId && supabaseConfigured && !isGuest;

  const publishContext = useCallback(
    () => {
      const privacy = mergeSocialPrivacy(profile?.socialPrivacy);
      return {
        genericCopy: shouldForceGenericHabits(
          privacy,
          profile?.displayPreferences?.genericSocialActivity,
        ),
        recoveryModeActive: profile?.recoveryMode?.active === true,
        privacy,
      };
    },
    [
      profile?.socialPrivacy,
      profile?.displayPreferences?.genericSocialActivity,
      profile?.recoveryMode?.active,
    ],
  );

  const publish = useCallback(
    async (
      dedupeKey: string,
      scope: 'forever' | 'day',
      input: {
        type: ActivityType;
        title: string;
        body?: string | null;
        metadata?: Record<string, unknown>;
      },
    ) => {
      if (!canPublish || !userId) return;
      try {
        if (!(await canPublishSocially(userId))) return;
        const privacy = mergeSocialPrivacy(profile?.socialPrivacy);
        if (!shouldPublishActivityType(input.type, privacy)) return;
        const ok = await shouldPublish(dedupeKey, scope);
        if (!ok) return;
        const sanitized = sanitizePublishedActivity({
          ...input,
          genericCopy: shouldForceGenericHabits(
            privacy,
            profile?.displayPreferences?.genericSocialActivity,
          ),
        });
        trackSocialAnalyticsEvent(
          {
            name: 'social_activity_published',
            properties: {
              activityType: input.type,
              domain: sanitized.metadata.domain,
            },
          },
          { genericSocialActivity: profile?.displayPreferences?.genericSocialActivity },
        );
        await logEvent({ userId, type: input.type, ...sanitized });
        queryClient.invalidateQueries({ queryKey: ['activity'] });
        await markPublished(dedupeKey);
      } catch {
        // best effort — never block UX
      }
    },
    [canPublish, userId, queryClient, profile?.socialPrivacy],
  );

  const logEventSaved = useCallback(
    (event: LocalEvent) => {
      const payload = buildEventSavedActivity(event, publishContext());
      return publish(`event_saved_${event.id}`, 'forever', {
        type: 'event_saved',
        ...payload,
      });
    },
    [publish, publishContext],
  );

  const logEventPlanned = useCallback(
    (event: LocalEvent) => {
      const payload = buildEventPlannedActivity(event, publishContext());
      return publish(`event_planned_${event.id}`, 'forever', {
        type: 'event_planned',
        ...payload,
      });
    },
    [publish, publishContext],
  );

  const logMatchPinned = useCallback(
    (match: LiveFootballMatch) => {
      const payload = buildMatchPinnedActivity(
        match.homeTeam,
        match.awayTeam,
        match.id,
        match.leagueId,
        match.league ?? match.time,
        publishContext(),
      );
      return publish(`match_pinned_${match.id}`, 'forever', {
        type: 'match_pinned',
        ...payload,
      });
    },
    [publish, publishContext],
  );

  const logShowSaved = useCallback(
    (showId: string, title: string, tmdbId?: number, mediaType?: string) => {
      const payload = buildShowSavedActivity(showId, title, tmdbId, mediaType, publishContext());
      return publish(`show_saved_${showId}`, 'forever', {
        type: 'show_saved',
        ...payload,
      });
    },
    [publish, publishContext],
  );

  const logHabitCompleted = useCallback(
    (input: HabitPublishInput) => {
      const payload = buildHabitCompletedActivity(input, publishContext());
      if (!payload) return Promise.resolve();
      trackSocialAnalyticsEvent(
        {
          name: 'social_habit_completed',
          properties: { activityType: 'workout', habitId: input.habitId },
        },
        { genericSocialActivity: profile?.displayPreferences?.genericSocialActivity },
      );
      return publish(`habit_done_${input.habitId}_${getTodayFormatted()}`, 'day', {
        type: 'workout',
        ...payload,
      });
    },
    [publish, publishContext, profile?.displayPreferences?.genericSocialActivity],
  );

  const logPublishedHabit = useCallback(
    (habitName: string, category: string) => {
      const payload = buildPublishedHabitActivity(habitName, category, publishContext());
      trackSocialAnalyticsEvent(
        {
          name: 'social_habit_published',
          properties: { activityType: 'published_habit', category: payload.metadata.category },
        },
        { genericSocialActivity: profile?.displayPreferences?.genericSocialActivity },
      );
      return publish(`published_habit_${category}_${getTodayFormatted()}`, 'day', {
        type: 'published_habit',
        ...payload,
      });
    },
    [publish, publishContext, profile?.displayPreferences?.genericSocialActivity],
  );

  return {
    logEventSaved,
    logEventPlanned,
    logMatchPinned,
    logShowSaved,
    logHabitCompleted,
    logPublishedHabit,
  };
}
