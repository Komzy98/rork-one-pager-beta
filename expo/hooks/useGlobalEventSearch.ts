import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import type { LocalEvent, NearbyEventsSource } from '@/types/events';
import { attachDistanceKm } from '@/utils/eventDiscovery';
import { rankGlobalSearchResults } from '@/utils/eventSearch';
import {
  DISCOVERY_CACHE_KEYS,
  formatCacheAgeLabel,
  readDiscoveryCache,
  writeDiscoveryCache,
} from '@/utils/discoveryOfflineCache';

/** Allow serving last-good search results when the network fails. */
const SEARCH_STALE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type CachedSearchPayload = {
  events: LocalEvent[];
  source: NearbyEventsSource;
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

export function useGlobalEventSearch(
  keyword: string,
  coords: { latitude: number; longitude: number },
  enabled: boolean,
) {
  const trimmed = keyword.trim();
  const [debouncedKeyword, setDebouncedKeyword] = useState(trimmed);

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setDebouncedKeyword('');
      return;
    }
    const timer = setTimeout(() => setDebouncedKeyword(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const active = enabled && debouncedKeyword.length >= MIN_QUERY_LENGTH;

  const [staleCache, setStaleCache] = useState<{
    payload: CachedSearchPayload;
    savedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!debouncedKeyword) {
      setStaleCache(null);
      return;
    }
    let cancelled = false;
    void readDiscoveryCache<CachedSearchPayload>(
      DISCOVERY_CACHE_KEYS.globalSearch(debouncedKeyword),
      SEARCH_STALE_MAX_AGE_MS,
    ).then((hit) => {
      if (!cancelled && hit?.data?.events?.length) {
        setStaleCache({ payload: hit.data, savedAt: hit.savedAt });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword]);

  const query = trpc.events.searchGlobal.useQuery(
    {
      keyword: debouncedKeyword,
      latitude: coords.latitude,
      longitude: coords.longitude,
      size: 50,
    },
    {
      enabled: active,
      staleTime: 3 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!active || !query.data?.events?.length) return;
    void writeDiscoveryCache(DISCOVERY_CACHE_KEYS.globalSearch(debouncedKeyword), {
      events: query.data.events,
      source: (query.data.source ?? 'mixed') as NearbyEventsSource,
    });
  }, [active, debouncedKeyword, query.data?.events, query.data?.source]);

  const usingCachedResults =
    active && !!query.error && !query.isFetching && !!staleCache?.payload.events.length;

  const events = useMemo((): LocalEvent[] => {
    if (!active) return [];
    const list =
      query.data?.events ??
      (usingCachedResults ? staleCache?.payload.events : undefined) ??
      [];
    const normalized = list.map((event) => ({
      ...event,
      tags: event.tags ?? [],
      price: event.price ?? 'See tickets',
      description: event.description ?? '',
    }));
    const withDistance = attachDistanceKm(normalized, coords);
    return rankGlobalSearchResults(withDistance, debouncedKeyword, coords);
  }, [active, query.data?.events, coords, debouncedKeyword, staleCache?.payload.events, usingCachedResults]);

  const source: NearbyEventsSource =
    query.data?.source ?? (usingCachedResults ? staleCache?.payload.source : undefined) ?? 'none';

  return {
    events,
    source,
    isSearching: active && (query.isLoading || query.isFetching),
    isActive: active,
    debouncedKeyword,
    error: usingCachedResults ? null : query.error,
    networkError: query.error,
    usingCachedResults,
    cachedResultsAgeLabel: staleCache ? formatCacheAgeLabel(staleCache.savedAt) : null,
    refetch: query.refetch,
  };
}
