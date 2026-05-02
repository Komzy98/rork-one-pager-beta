import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './useAuth';

// Web-compatible storage
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      } catch {
        return;
      }
    }
    return AsyncStorage.setItem(key, value);
  }
};

const STORAGE_KEY = 'ui-state';

export type ShowsFilterValue = 'all' | 'watching' | 'plan' | 'completed';
export type SportsFilterValue = 'all' | 'live' | 'today' | 'upcoming' | 'results';

export interface UIStateShape {
  showsFilter: ShowsFilterValue;
  setShowsFilter: (value: ShowsFilterValue) => void;
  sportsFilter: SportsFilterValue;
  setSportsFilter: (value: SportsFilterValue) => void;
}

interface PersistedState {
  showsFilter: ShowsFilterValue;
  sportsFilter: SportsFilterValue;
}

const initialState: PersistedState = {
  showsFilter: 'all',
  sportsFilter: 'all',
};

export const [UIStateProvider, useUIState] = createContextHook<UIStateShape>(() => {
  const { user } = useAuth();
  const scopedStorageKey = `${STORAGE_KEY}_${user?.id || 'guest'}`;

  const stateQuery = useQuery<PersistedState>({
    queryKey: ['ui-state', user?.id || 'guest'],
    queryFn: async () => {
      try {
        let raw = await storage.getItem(scopedStorageKey);
        if (!raw) {
          const legacy = await storage.getItem(STORAGE_KEY);
          if (legacy) {
            raw = legacy;
            await storage.setItem(scopedStorageKey, legacy);
          }
        }
        if (!raw) {
          await storage.setItem(scopedStorageKey, JSON.stringify(initialState));
          return initialState;
        }
        try {
          const parsed = JSON.parse(raw) as PersistedState;
          return { ...initialState, ...parsed };
        } catch {
          await storage.setItem(scopedStorageKey, JSON.stringify(initialState));
          return initialState;
        }
      } catch {
        return initialState;
      }
    },
    staleTime: 1000 * 60 * 60,
  });

  const [showsFilter, setShowsFilterLocal] = useState<ShowsFilterValue>('all');
  const [sportsFilter, setSportsFilterLocal] = useState<SportsFilterValue>('all');

  useEffect(() => {
    if (stateQuery.data) {
      setShowsFilterLocal(stateQuery.data.showsFilter);
      setSportsFilterLocal(stateQuery.data.sportsFilter);
    }
  }, [stateQuery.data]);

  const { mutate } = useMutation({
    mutationFn: async (next: PersistedState) => {
      await storage.setItem(scopedStorageKey, JSON.stringify(next));
      return next;
    },
  });

  const setShowsFilter = useCallback((value: ShowsFilterValue) => {
    if (value === showsFilter) return; // Prevent unnecessary updates
    const next = { ...(stateQuery.data ?? initialState), showsFilter: value };
    setShowsFilterLocal(value);
    mutate(next);
  }, [stateQuery.data, mutate, showsFilter]);

  const setSportsFilter = useCallback((value: SportsFilterValue) => {
    if (value === sportsFilter) return; // Prevent unnecessary updates
    const next = { ...(stateQuery.data ?? initialState), sportsFilter: value };
    setSportsFilterLocal(value);
    mutate(next);
  }, [stateQuery.data, mutate, sportsFilter]);

  return {
    showsFilter,
    setShowsFilter,
    sportsFilter,
    setSportsFilter,
  };
});
