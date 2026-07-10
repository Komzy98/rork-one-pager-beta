import { useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { getFallbackEvents } from '@/constants/mockEvents';
import type { LocalEvent, NearbyEventsSource } from '@/types/events';
import {
  attachDistanceKm,
  EVENTS_PER_CATEGORY,
  EVENTS_PREVIEW_SIZE,
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';
import { mergeDiscoveryEvents } from '@/utils/mergeDiscoveryEvents';
import { BENTO_CATEGORY_IDS } from '@/utils/eventCategoryMeta';
import { eventMatchesBentoCategory } from '@/utils/eventCategories';

export { EVENTS_PER_CATEGORY, EVENTS_PREVIEW_SIZE } from '@/utils/eventDiscovery';

const BENTO_CATEGORIES = [...BENTO_CATEGORY_IDS];

function normalizeEvents(events: LocalEvent[], queryCoords: { latitude: number; longitude: number }) {
  const normalized = events.map((event) => ({
    ...event,
    tags: event.tags ?? [],
    price: event.price ?? 'See tickets',
    description: event.description ?? '',
  }));

  return sortEventsByStartDate(
    filterUpcomingEvents(attachDistanceKm(normalized, queryCoords)),
  );
}

function applyFallbackIfNeeded(
  list: LocalEvent[],
  category: string | undefined,
  shouldFallback: boolean,
): LocalEvent[] {
  if (list.length > 0 || !shouldFallback) return list;
  const fallback = getFallbackEvents();
  if (category) return fallback.filter((event) => eventMatchesBentoCategory(event, category));
  return fallback;
}

export interface UsePerCategoryEventsOptions {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  enabled?: boolean;
}

export function usePerCategoryEvents(options: UsePerCategoryEventsOptions) {
  const { latitude, longitude, radiusMiles = 25, enabled = true } = options;
  const queryCoords = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);

  const previewQuery = trpc.events.getNearby.useQuery(
    {
      latitude: queryCoords.latitude,
      longitude: queryCoords.longitude,
      radiusMiles,
      size: EVENTS_PREVIEW_SIZE,
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const batchEnabled =
    enabled && (previewQuery.isSuccess || previewQuery.isError);

  const batchQuery = trpc.events.getNearbyBatch.useQuery(
    {
      latitude: queryCoords.latitude,
      longitude: queryCoords.longitude,
      radiusMiles,
      sizePerCategory: EVENTS_PER_CATEGORY,
    },
    {
      enabled: batchEnabled,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const previewEvents = useMemo(() => {
    const shouldFallback =
      previewQuery.isError || previewQuery.data?.source === 'none';
    const raw = applyFallbackIfNeeded(
      previewQuery.data?.events ?? [],
      undefined,
      shouldFallback,
    );
    return normalizeEvents(raw, queryCoords);
  }, [previewQuery.data, previewQuery.isError, queryCoords]);

  const eventsByCategory = useMemo(() => {
    const map = new Map<string, LocalEvent[]>();

    if (batchQuery.data) {
      for (const category of BENTO_CATEGORIES) {
        const bucket = batchQuery.data.categories[category];
        const raw = (bucket?.events ?? []).filter((event) =>
          eventMatchesBentoCategory(event, category),
        );
        map.set(category, normalizeEvents(raw, queryCoords));
      }
      return map;
    }

    for (const category of BENTO_CATEGORIES) {
      map.set(
        category,
        normalizeEvents(
          previewEvents.filter((event) => eventMatchesBentoCategory(event, category)),
          queryCoords,
        ),
      );
    }
    return map;
  }, [batchQuery.data, previewEvents, queryCoords]);

  const allEvents = useMemo(() => {
    if (batchQuery.data?.allEvents?.length) {
      return normalizeEvents(batchQuery.data.allEvents, queryCoords);
    }
    return previewEvents;
  }, [batchQuery.data, previewEvents, queryCoords]);

  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of BENTO_CATEGORIES) {
      counts.set(category, eventsByCategory.get(category)?.length ?? 0);
    }
    return counts;
  }, [eventsByCategory]);

  const source: NearbyEventsSource = useMemo(() => {
    if (batchQuery.data?.source && batchQuery.data.source !== 'none') {
      return batchQuery.data.source;
    }
    if (previewQuery.data?.source === 'ticketmaster' ||
        previewQuery.data?.source === 'skiddle' ||
        previewQuery.data?.source === 'mixed') {
      return previewQuery.data.source;
    }
    if (previewEvents.length > 0) return 'fallback';
    return 'none';
  }, [batchQuery.data?.source, previewQuery.data?.source, previewEvents.length]);

  const isPreviewLoading = enabled && previewQuery.isLoading && previewEvents.length === 0;
  const isBatchLoading = enabled && batchEnabled && batchQuery.isLoading && !batchQuery.data;
  const isLoading = isPreviewLoading;

  const refetch = useCallback(async () => {
    await Promise.all([previewQuery.refetch(), batchQuery.refetch()]);
  }, [previewQuery, batchQuery]);

  const getEventsForCategory = useCallback(
    (category: string) => {
      if (category === 'all') return allEvents;
      if (batchQuery.data) return eventsByCategory.get(category) ?? [];
      return previewEvents.filter((event) => eventMatchesBentoCategory(event, category));
    },
    [allEvents, batchQuery.data, eventsByCategory, previewEvents],
  );

  return {
    allEvents,
    previewEvents,
    eventsByCategory,
    countsByCategory,
    getEventsForCategory,
    source,
    isLoading,
    isPreviewLoading,
    isBatchLoading,
    refetch,
  };
}
