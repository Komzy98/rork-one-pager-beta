import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  DISMISSED_CONTINUE_WATCHING_STORAGE_BASE,
  getContinueWatchingDismissKey,
  getContinueWatchingTitle,
  getYounifyContinueWatchingDismissKey,
  type ContinueWatchingDismissItem,
} from '@/utils/continueWatchingDismiss';

export function useDismissedContinueWatching(userId: string | undefined) {
  const scopedStorageKey = useCallback(
    (base: string) => `${base}_${userId || 'guest'}`,
    [userId],
  );
  const [dismissedContinueWatching, setDismissedContinueWatching] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(scopedStorageKey(DISMISSED_CONTINUE_WATCHING_STORAGE_BASE)).then(async (raw) => {
      let stored = raw;
      if (!stored) {
        const legacy = await AsyncStorage.getItem(DISMISSED_CONTINUE_WATCHING_STORAGE_BASE);
        if (legacy) {
          stored = legacy;
          await AsyncStorage.setItem(scopedStorageKey(DISMISSED_CONTINUE_WATCHING_STORAGE_BASE), legacy);
        }
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[];
          if (Array.isArray(parsed)) setDismissedContinueWatching(parsed);
        } catch (e) {
          if (__DEV__) console.warn('Failed to parse dismissed continue watching', e);
        }
      } else {
        setDismissedContinueWatching([]);
      }
    });
  }, [scopedStorageKey]);

  const dismissContinueWatching = useCallback(
    (key: string) => {
      setDismissedContinueWatching((prev) => {
        const next = prev.includes(key) ? prev : [...prev, key];
        AsyncStorage.setItem(scopedStorageKey(DISMISSED_CONTINUE_WATCHING_STORAGE_BASE), JSON.stringify(next)).catch(
          (e) => {
            if (__DEV__) console.warn('Failed to save dismissed continue watching', e);
          },
        );
        return next;
      });
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [scopedStorageKey],
  );

  const confirmDismissContinueWatching = useCallback(
    (item: ContinueWatchingDismissItem) => {
      const key = getContinueWatchingDismissKey(item);
      const title = getContinueWatchingTitle(item);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      Alert.alert('Remove from Continue Watching', `Hide "${title}" from Continue watching?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => dismissContinueWatching(key) },
      ]);
    },
    [dismissContinueWatching],
  );

  const confirmDismissYounifyRow = useCallback(
    (row: Record<string, unknown>, fallbackKey: string) => {
      confirmDismissContinueWatching({ kind: 'younify', row, key: fallbackKey });
    },
    [confirmDismissContinueWatching],
  );

  const isContinueWatchingDismissed = useCallback(
    (row: Record<string, unknown>, fallbackKey: string) => {
      const key = getYounifyContinueWatchingDismissKey(row, fallbackKey);
      return dismissedContinueWatching.includes(key);
    },
    [dismissedContinueWatching],
  );

  return {
    dismissedContinueWatching,
    dismissContinueWatching,
    confirmDismissContinueWatching,
    confirmDismissYounifyRow,
    isContinueWatchingDismissed,
  };
}
