import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import type { LiveFootballMatch } from '@/types/habit';
import {
  PINNED_MATCHES_STORAGE_BASE,
  type PinnedMatchRecord,
  mergePinnedWithLiveData,
} from '@/utils/pinnedMatches';

export function usePinnedMatches() {
  const { user } = useAuth();
  const storageKey = `${PINNED_MATCHES_STORAGE_BASE}_${user?.id || 'guest'}`;
  const [records, setRecords] = useState<PinnedMatchRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) {
        setRecords([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecords(
          parsed.filter(
            (r): r is PinnedMatchRecord =>
              r != null &&
              typeof r.id === 'string' &&
              r.snapshot != null &&
              typeof r.snapshot.homeTeam === 'string',
          ),
        );
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pinnedIdSet = useMemo(() => new Set(records.map((r) => r.id)), [records]);

  const isPinned = useCallback((matchId: string) => pinnedIdSet.has(matchId), [pinnedIdSet]);

  const togglePin = useCallback(
    async (match: LiveFootballMatch) => {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setRecords((prev) => {
        const exists = prev.some((r) => r.id === match.id);
        const next = exists
          ? prev.filter((r) => r.id !== match.id)
          : [{ id: match.id, snapshot: match, pinnedAt: new Date().toISOString() }, ...prev];
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch((e) =>
          console.log('Failed to save pinned matches:', e),
        );
        return next;
      });
    },
    [storageKey],
  );

  const resolvePinnedMatches = useCallback(
    (
      live: readonly LiveFootballMatch[],
      upcoming: readonly LiveFootballMatch[],
      completed: readonly LiveFootballMatch[],
      refreshedById?: ReadonlyMap<string, LiveFootballMatch>,
    ) => mergePinnedWithLiveData(records, [live, upcoming, completed], refreshedById),
    [records],
  );

  return {
    records,
    loaded,
    pinnedIdSet,
    isPinned,
    togglePin,
    resolvePinnedMatches,
  };
}
