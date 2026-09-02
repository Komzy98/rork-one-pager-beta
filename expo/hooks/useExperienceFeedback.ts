import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { unifiedStorage } from '@/utils/unifiedStorage';
import {
  applyExperienceSignal,
  EMPTY_EXPERIENCE_FEEDBACK,
  experienceKey,
  type ExperienceFeedbackState,
  type ExperienceKind,
  type ExperienceSignal,
} from '@/utils/experienceFeedback';

const STORAGE_PREFIX = 'experience_feedback_v1';

function storageKey(userId?: string) {
  return `${STORAGE_PREFIX}_${userId || 'guest'}`;
}

function queryKey(userId?: string) {
  return ['experience-feedback-v1', userId || 'guest'] as const;
}

function parseState(raw: string | null): ExperienceFeedbackState {
  if (!raw) return EMPTY_EXPERIENCE_FEEDBACK;
  try {
    const parsed = JSON.parse(raw) as Partial<ExperienceFeedbackState>;
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
      kindAffinity: parsed.kindAffinity && typeof parsed.kindAffinity === 'object' ? parsed.kindAffinity : {},
      tagAffinity: parsed.tagAffinity && typeof parsed.tagAffinity === 'object' ? parsed.tagAffinity : {},
    };
  } catch {
    return EMPTY_EXPERIENCE_FEEDBACK;
  }
}

export function useExperienceFeedback() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const key = queryKey(userId);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => parseState(await unifiedStorage.getItem(storageKey(userId))),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const state = query.data ?? EMPTY_EXPERIENCE_FEEDBACK;

  const record = useCallback(async (signal: ExperienceSignal) => {
    // Query cache is the in-app source of truth, so all hooks share one coherent state.
    const current = queryClient.getQueryData<ExperienceFeedbackState>(key)
      ?? parseState(await unifiedStorage.getItem(storageKey(userId)));
    const next = applyExperienceSignal(current, signal);
    queryClient.setQueryData(key, next);
    await unifiedStorage.setItem(storageKey(userId), JSON.stringify(next));
    return next;
  }, [key, queryClient, userId]);

  const getEntry = useCallback((kind: ExperienceKind, subjectId: string) => {
    return state.entries[experienceKey(kind, subjectId)] ?? null;
  }, [state.entries]);

  const recentEntries = useMemo(
    () => Object.values(state.entries)
      .sort((a, b) => {
        const aAt = a.lastFeedbackAt ?? a.lastCompletedAt ?? a.lastChosenAt ?? a.lastDeclaredAt ?? '';
        const bAt = b.lastFeedbackAt ?? b.lastCompletedAt ?? b.lastChosenAt ?? b.lastDeclaredAt ?? '';
        return bAt.localeCompare(aAt);
      }),
    [state.entries],
  );

  const reset = useCallback(async () => {
    queryClient.setQueryData(key, EMPTY_EXPERIENCE_FEEDBACK);
    await unifiedStorage.setItem(storageKey(userId), JSON.stringify(EMPTY_EXPERIENCE_FEEDBACK));
  }, [key, queryClient, userId]);

  return {
    hydrated: query.isFetched,
    state,
    recentEntries,
    record,
    getEntry,
    reset,
  };
}
