import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabaseConfigured } from '@/utils/supabaseClient';
import type { LocalEvent } from '@/types/events';
import type { LiveFootballMatch } from '@/types/habit';
import { logEvent, type ActivityType } from '@/utils/activityService';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { getTodayFormatted } from '@/utils/dateUtils';

async function shouldPublish(dedupeKey: string, scope: 'forever' | 'day'): Promise<boolean> {
  const stored = await unifiedStorage.getItem(`social_dedupe_${dedupeKey}`);
  if (!stored) return true;
  if (scope === 'forever') return false;
  return stored !== getTodayFormatted();
}

async function markPublished(dedupeKey: string): Promise<void> {
  await unifiedStorage.setItem(`social_dedupe_${dedupeKey}`, getTodayFormatted());
}

/** Best-effort social activity logging — safe to call from any provider level. */
export function useSocialActivity() {
  const { supabaseUser, isGuest } = useAuth();
  const queryClient = useQueryClient();

  const userId = supabaseUser?.id;
  const canPublish = !!userId && supabaseConfigured && !isGuest;

  const publish = useCallback(
    async (
      dedupeKey: string,
      scope: 'forever' | 'day',
      input: {
        type: ActivityType;
        title: string;
        body?: string | null;
        metadata?: Record<string, unknown>;
      }
    ) => {
      if (!canPublish || !userId) return;
      try {
        const ok = await shouldPublish(dedupeKey, scope);
        if (!ok) return;
        await logEvent({ userId, ...input });
        queryClient.invalidateQueries({ queryKey: ['activity'] });
        await markPublished(dedupeKey);
      } catch {
        // best effort — never block UX
      }
    },
    [canPublish, userId, queryClient]
  );

  const logEventSaved = useCallback(
    (event: LocalEvent) =>
      publish(`event_saved_${event.id}`, 'forever', {
        type: 'event_saved',
        title: `Saved ${event.title}`,
        body: `${event.venue} · ${event.date}`,
        metadata: {
          domain: 'events',
          eventId: event.id,
          category: event.category,
        },
      }),
    [publish]
  );

  const logEventPlanned = useCallback(
    (event: LocalEvent) =>
      publish(`event_planned_${event.id}`, 'forever', {
        type: 'event_planned',
        title: `Planned ${event.title}`,
        body: `${event.date} · ${event.time} · added to calendar`,
        metadata: {
          domain: 'events',
          eventId: event.id,
          category: event.category,
        },
      }),
    [publish]
  );

  const logMatchPinned = useCallback(
    (match: LiveFootballMatch) =>
      publish(`match_pinned_${match.id}`, 'forever', {
        type: 'match_pinned',
        title: `Pinned ${match.homeTeam} vs ${match.awayTeam}`,
        body: match.league ?? match.time ?? 'Watch party ready',
        metadata: {
          domain: 'sports',
          matchId: match.id,
          leagueId: match.leagueId,
        },
      }),
    [publish]
  );

  const logShowSaved = useCallback(
    (showId: string, title: string, tmdbId?: number, mediaType?: string) =>
      publish(`show_saved_${showId}`, 'forever', {
        type: 'show_saved',
        title: `Added ${title} to watchlist`,
        body: mediaType === 'tv' ? 'Series queued up' : 'Film on the list',
        metadata: {
          domain: 'shows',
          showId,
          tmdbId,
          mediaType: mediaType ?? 'tv',
          showTitle: title,
        },
      }),
    [publish]
  );

  const logHabitCompleted = useCallback(
    (habitId: string, habitName: string) =>
      publish(`habit_done_${habitId}_${getTodayFormatted()}`, 'day', {
        type: 'workout',
        title: `Completed ${habitName}`,
        body: 'Another habit in the books today',
        metadata: {
          domain: 'tasks',
          habitId,
        },
      }),
    [publish]
  );

  return {
    logEventSaved,
    logEventPlanned,
    logMatchPinned,
    logShowSaved,
    logHabitCompleted,
  };
}
