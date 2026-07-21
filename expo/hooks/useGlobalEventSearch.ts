import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import type { LocalEvent, NearbyEventsSource } from '@/types/events';
import {
  attachDistanceKm,
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';

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

  const events = useMemo((): LocalEvent[] => {
    if (!active) return [];
    const list = query.data?.events ?? [];
    const normalized = list.map((event) => ({
      ...event,
      tags: event.tags ?? [],
      price: event.price ?? 'See tickets',
      description: event.description ?? '',
    }));
    return sortEventsByStartDate(
      filterUpcomingEvents(attachDistanceKm(normalized, coords)),
    );
  }, [active, query.data?.events, coords]);

  const source: NearbyEventsSource = query.data?.source ?? 'none';

  return {
    events,
    source,
    isSearching: active && (query.isLoading || query.isFetching),
    isActive: active,
    debouncedKeyword,
    error: query.error,
    refetch: query.refetch,
  };
}
