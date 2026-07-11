import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityEvent } from '@/utils/activityService';
import { unifiedStorage } from '@/utils/unifiedStorage';
import {
  SOCIAL_LAST_SEEN_KEY,
  countUnreadActivitySince,
  countUnreadCheersSince,
} from '@/utils/socialAccountability';

export function socialLastSeenStorageKey(userId: string): string {
  return `${SOCIAL_LAST_SEEN_KEY}_${userId}`;
}

export function useSocialUnread(
  userId: string | undefined,
  feed: ActivityEvent[],
) {
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLastSeenAt(null);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const stored = await unifiedStorage.getItem(socialLastSeenStorageKey(userId));
        if (!cancelled) {
          setLastSeenAt(stored);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const unreadActivityCount = useMemo(
    () => countUnreadActivitySince(feed, lastSeenAt, userId),
    [feed, lastSeenAt, userId],
  );

  const unreadCheerCount = useMemo(
    () => countUnreadCheersSince(feed, lastSeenAt, userId),
    [feed, lastSeenAt, userId],
  );

  const unreadFeedCount = unreadActivityCount + unreadCheerCount;

  const markSocialSeen = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setLastSeenAt(now);
    try {
      await unifiedStorage.setItem(socialLastSeenStorageKey(userId), now);
    } catch {
      // best effort
    }
  }, [userId]);

  return {
    loaded,
    lastSeenAt,
    unreadActivityCount,
    unreadCheerCount,
    unreadFeedCount,
    markSocialSeen,
  };
}
