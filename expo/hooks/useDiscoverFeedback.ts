import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { unifiedStorage } from '@/utils/unifiedStorage';
import type {
  DiscoverFeedbackReason,
  DiscoverFeedbackState,
  DiscoverOpportunityKind,
} from '@/utils/discoverLifeEngine';

const STORAGE_PREFIX = 'discover_feedback_v2';
const EMPTY: DiscoverFeedbackState = { entries: {}, kindAffinity: {} };

function storageKey(userId?: string) {
  return `${STORAGE_PREFIX}_${userId || 'guest'}`;
}

function clampAffinity(value: number) {
  return Math.max(-30, Math.min(30, value));
}

export function useDiscoverFeedback() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<DiscoverFeedbackState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void unifiedStorage.getItem(storageKey(userId)).then((raw) => {
      if (cancelled) return;
      if (!raw) {
        setState(EMPTY);
        setHydrated(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as DiscoverFeedbackState;
        setState({
          entries: parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
          kindAffinity: parsed?.kindAffinity && typeof parsed.kindAffinity === 'object' ? parsed.kindAffinity : {},
        });
      } catch {
        setState(EMPTY);
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback((next: DiscoverFeedbackState) => {
    setState(next);
    void unifiedStorage.setItem(storageKey(userId), JSON.stringify(next));
  }, [userId]);

  const markPositive = useCallback((key: string, kind: DiscoverOpportunityKind) => {
    const now = new Date().toISOString();
    const current = state.entries[key];
    const entry = {
      key,
      kind,
      positive: Math.min(20, (current?.positive ?? 0) + 1),
      negative: current?.negative ?? 0,
      lastPositiveAt: now,
      lastNegativeAt: current?.lastNegativeAt,
      reasons: current?.reasons ?? {},
    };
    persist({
      entries: { ...state.entries, [key]: entry },
      kindAffinity: {
        ...state.kindAffinity,
        [kind]: clampAffinity((state.kindAffinity[kind] ?? 0) + 1.5),
      },
    });
  }, [persist, state]);

  const dismiss = useCallback((
    key: string,
    kind: DiscoverOpportunityKind,
    reason: DiscoverFeedbackReason = 'not_for_me',
  ) => {
    const now = new Date().toISOString();
    const current = state.entries[key];
    const reasons = {
      ...(current?.reasons ?? {}),
      [reason]: Math.min(20, (current?.reasons?.[reason] ?? 0) + 1),
    };
    const kindPenalty = reason === 'bad_timing' ? 0.5 : reason === 'too_far' || reason === 'too_expensive' ? 0.75 : 1.5;
    const entry = {
      key,
      kind,
      positive: current?.positive ?? 0,
      negative: Math.min(20, (current?.negative ?? 0) + 1),
      lastPositiveAt: current?.lastPositiveAt,
      lastNegativeAt: now,
      reasons,
    };
    persist({
      entries: { ...state.entries, [key]: entry },
      kindAffinity: {
        ...state.kindAffinity,
        [kind]: clampAffinity((state.kindAffinity[kind] ?? 0) - kindPenalty),
      },
    });
  }, [persist, state]);

  const resetFeedback = useCallback(() => {
    persist(EMPTY);
  }, [persist]);

  const dismissedKeys = useMemo(
    () => new Set(
      Object.values(state.entries)
        .filter((entry) => entry.negative > entry.positive && entry.lastNegativeAt)
        .map((entry) => entry.key),
    ),
    [state.entries],
  );

  return {
    hydrated,
    feedback: state,
    dismissedKeys,
    markPositive,
    dismiss,
    resetFeedback,
  };
}
