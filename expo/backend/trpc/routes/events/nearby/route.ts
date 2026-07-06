import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getTicketmasterApiKeyFromEnv } from '@/backend/utils/ticketmasterApiKey';
import type { NearbyEventsResult } from '@/types/events';
import {
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';
import {
  buildTicketmasterEventsSearchUrl,
  inferTicketmasterCountryCode,
  parseTicketmasterFault,
} from '@/utils/ticketmasterQuery';
import {
  mapTicketmasterResponse,
  TICKETMASTER_CATEGORY_FILTER,
} from '@/utils/ticketmasterTransform';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: NearbyEventsResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(input: Record<string, unknown>): string {
  return `events:nearby:v2:${JSON.stringify(input)}`;
}

function getCached(key: string): NearbyEventsResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: NearbyEventsResult): void {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 80) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) cache.delete(oldest[i][0]);
  }
}

async function fetchTicketmasterEvents(
  apiKey: string,
  input: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
    category?: string;
    size: number;
  },
): Promise<LocalEventPayload[]> {
  const classification = input.category
    ? TICKETMASTER_CATEGORY_FILTER[input.category]
    : undefined;

  const url = buildTicketmasterEventsSearchUrl({
    apiKey,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMiles: input.radiusMiles,
    size: input.size,
    classificationName: classification,
    daysAhead: 90,
  });

  const country = inferTicketmasterCountryCode(input.latitude, input.longitude);
  console.log(
    `🎟️ Ticketmaster Discovery v2: country=${country} radius=${input.radiusMiles}mi size=${input.size}`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const fault = parseTicketmasterFault(payload);
      const detail = fault ?? `HTTP ${response.status}`;
      if (response.status === 401) {
        console.error(`❌ Ticketmaster auth failed — check TICKETMASTER_API_KEY: ${detail}`);
      } else {
        console.error(`❌ Ticketmaster HTTP ${response.status}: ${detail}`);
      }
      return [];
    }

    const mapped = mapTicketmasterResponse(payload);
    const events = sortEventsByStartDate(filterUpcomingEvents(mapped));
    console.log(`✅ Ticketmaster: ${events.length} upcoming events (${mapped.length} raw)`);
    return events;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('💥 Ticketmaster fetch error:', error);
    return [];
  }
}

type LocalEventPayload = NearbyEventsResult['events'][number];

export const getNearbyEventsRoute = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusMiles: z.number().min(1).max(100).default(25),
      category: z.string().optional(),
      size: z.number().min(1).max(50).default(30),
    }),
  )
  .query(async ({ input }): Promise<NearbyEventsResult> => {
    const cacheKey = getCacheKey({
      lat: Math.round(input.latitude * 100) / 100,
      lng: Math.round(input.longitude * 100) / 100,
      radius: input.radiusMiles,
      category: input.category ?? 'all',
      size: input.size,
    });

    const cached = getCached(cacheKey);
    if (cached) {
      console.log('⚡ Events cache HIT');
      return cached;
    }

    const apiKey = getTicketmasterApiKeyFromEnv();
    if (!apiKey) {
      console.warn(
        '⚠️ TICKETMASTER_API_KEY not set — set TICKETMASTER_API_KEY on the API server (Railway) or in expo/.env for local Metro',
      );
      return { events: [], source: 'none' };
    }

    const events = await fetchTicketmasterEvents(apiKey, input);
    const result: NearbyEventsResult = {
      events,
      source: events.length > 0 ? 'ticketmaster' : 'none',
    };

    setCached(cacheKey, result);
    return result;
  });
