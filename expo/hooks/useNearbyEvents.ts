import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { getFallbackEvents } from '@/constants/mockEvents';
import type { LocalEvent, NearbyEventsSource } from '@/types/events';
import {
  attachDistanceKm,
  EVENTS_PER_CATEGORY,
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';
import { useUserLocation } from '@/hooks/useUserLocation';

export interface UseNearbyEventsOptions {
  category?: string;
  radiusMiles?: number;
  enabled?: boolean;
  /** When set (e.g. map “search this area”), queries and distances use this center instead of GPS. */
  searchCenter?: { latitude: number; longitude: number } | null;
}

export interface UseNearbyEventsResult {
  events: LocalEvent[];
  source: NearbyEventsSource;
  userCoords: { latitude: number; longitude: number };
  areaLabel: string | null;
  isLoading: boolean;
  locationLoading: boolean;
  permissionDenied: boolean;
  refetch: () => Promise<unknown>;
  refreshLocation: () => Promise<void>;
}

export function useNearbyEvents(options: UseNearbyEventsOptions = {}): UseNearbyEventsResult {
  const { category = 'all', radiusMiles = 25, enabled = true, searchCenter = null } = options;
  const {
    coords,
    areaLabel,
    isLoading: locationLoading,
    permissionDenied,
    refresh: refreshLocation,
  } = useUserLocation();

  const queryCoords = searchCenter ?? coords;

  const query = trpc.events.getNearby.useQuery(
    {
      latitude: queryCoords.latitude,
      longitude: queryCoords.longitude,
      radiusMiles,
      category: category !== 'all' ? category : undefined,
      size: EVENTS_PER_CATEGORY,
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const events = useMemo(() => {
    let list: LocalEvent[] = query.data?.events ?? [];

    if (list.length === 0 && (query.data?.source === 'none' || query.isError)) {
      list = getFallbackEvents();
    }

    const normalized = list.map((event) => ({
      ...event,
      tags: event.tags ?? [],
      price: event.price ?? 'See tickets',
      description: event.description ?? '',
    }));

    return sortEventsByStartDate(
      filterUpcomingEvents(attachDistanceKm(normalized, queryCoords)),
    );
  }, [query.data, query.isError, queryCoords]);

  const source: NearbyEventsSource =
    query.data?.source === 'ticketmaster' ||
    query.data?.source === 'skiddle' ||
    query.data?.source === 'mixed'
      ? query.data.source
      : events.length > 0 && (query.data?.source === 'none' || query.isError)
        ? 'fallback'
        : 'none';

  return {
    events,
    source,
    userCoords: coords,
    areaLabel,
    isLoading: query.isLoading || locationLoading,
    locationLoading,
    permissionDenied,
    refetch: query.refetch,
    refreshLocation,
  };
}
