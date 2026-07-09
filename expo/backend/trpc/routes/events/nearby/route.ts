import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getSkiddleApiKeyFromEnv } from '@/backend/utils/skiddleApiKey';
import { getTicketmasterApiKeyFromEnv } from '@/backend/utils/ticketmasterApiKey';
import type { NearbyEventsResult, NearbyEventsBatchResult, NearbyEventsSource } from '@/types/events';
import {
  EVENTS_PER_CATEGORY,
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';
import { BENTO_CATEGORY_IDS } from '@/utils/eventCategoryMeta';
import { mergeDiscoveryEvents } from '@/utils/mergeDiscoveryEvents';
import {
  buildSkiddleEventsSearchUrl,
  parseSkiddleError,
} from '@/utils/skiddleQuery';
import {
  filterSkiddleEventsByCategory,
  mapSkiddleResponse,
  SKIDDLE_EVENT_CODES_BY_CATEGORY,
} from '@/utils/skiddleTransform';
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

interface BatchCacheEntry {
  data: NearbyEventsBatchResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const batchCache = new Map<string, BatchCacheEntry>();

function getCacheKey(input: Record<string, unknown>): string {
  return `events:nearby:v3:${JSON.stringify(input)}`;
}

function getBatchCacheKey(input: Record<string, unknown>): string {
  return `events:nearby:batch:v1:${JSON.stringify(input)}`;
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

function getBatchCached(key: string): NearbyEventsBatchResult | null {
  const entry = batchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    batchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setBatchCached(key: string, data: NearbyEventsBatchResult): void {
  batchCache.set(key, { data, timestamp: Date.now() });
  if (batchCache.size > 40) {
    const oldest = [...batchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 5; i++) batchCache.delete(oldest[i][0]);
  }
}

type FetchInput = {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  category?: string;
  size: number;
};

type LocalEventPayload = NearbyEventsResult['events'][number];

async function fetchJsonWithTimeout(url: string, label: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`❌ ${label} HTTP ${response.status}`);
      return null;
    }

    return payload;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`💥 ${label} fetch error:`, error);
    return null;
  }
}

async function fetchTicketmasterEvents(
  apiKey: string,
  input: FetchInput,
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

  const payload = await fetchJsonWithTimeout(url, 'Ticketmaster');
  if (!payload) return [];

  const fault = parseTicketmasterFault(payload);
  if (fault) {
    console.error(`❌ Ticketmaster: ${fault}`);
    return [];
  }

  const mapped = mapTicketmasterResponse(payload);
  const events = sortEventsByStartDate(filterUpcomingEvents(mapped));
  console.log(`✅ Ticketmaster: ${events.length} upcoming events (${mapped.length} raw)`);
  return events;
}

async function fetchSkiddleEventsForCode(
  apiKey: string,
  input: FetchInput,
  eventCode: string | undefined,
  limit: number,
): Promise<LocalEventPayload[]> {
  const url = buildSkiddleEventsSearchUrl({
    apiKey,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMiles: input.radiusMiles,
    limit,
    eventCode,
    daysAhead: 90,
  });

  const payload = await fetchJsonWithTimeout(
    url,
    eventCode ? `Skiddle (${eventCode})` : 'Skiddle',
  );
  if (!payload) return [];

  const error = parseSkiddleError(payload);
  if (error) {
    console.error(`❌ Skiddle: ${error}`);
    return [];
  }

  const mapped = mapSkiddleResponse(payload);
  const filtered = filterSkiddleEventsByCategory(mapped, input.category);
  return sortEventsByStartDate(filterUpcomingEvents(filtered));
}

async function fetchSkiddleEvents(
  apiKey: string,
  input: FetchInput,
): Promise<LocalEventPayload[]> {
  const codes = input.category ? SKIDDLE_EVENT_CODES_BY_CATEGORY[input.category] : undefined;

  console.log(
    `🎶 Skiddle: radius=${input.radiusMiles}mi size=${input.size} category=${input.category ?? 'all'}`,
  );

  if (!codes || codes.length === 0) {
    const events = await fetchSkiddleEventsForCode(apiKey, input, undefined, input.size);
    console.log(`✅ Skiddle: ${events.length} upcoming events`);
    return events;
  }

  if (codes.length === 1) {
    const events = await fetchSkiddleEventsForCode(apiKey, input, codes[0], input.size);
    console.log(`✅ Skiddle: ${events.length} upcoming events (${codes[0]})`);
    return events;
  }

  const perCode = Math.max(5, Math.ceil(input.size / codes.length));
  const batches = await Promise.all(
    codes.map((code) => fetchSkiddleEventsForCode(apiKey, input, code, perCode)),
  );
  const events = mergeDiscoveryEvents(batches, input.size);
  console.log(`✅ Skiddle: ${events.length} upcoming events (${codes.join('+')})`);
  return events;
}

function resolveSource(
  ticketmasterCount: number,
  skiddleCount: number,
): NearbyEventsSource {
  if (ticketmasterCount > 0 && skiddleCount > 0) return 'mixed';
  if (ticketmasterCount > 0) return 'ticketmaster';
  if (skiddleCount > 0) return 'skiddle';
  return 'none';
}

async function resolveNearbyEvents(input: FetchInput): Promise<NearbyEventsResult> {
  const cacheKey = getCacheKey({
    lat: Math.round(input.latitude * 100) / 100,
    lng: Math.round(input.longitude * 100) / 100,
    radius: input.radiusMiles,
    category: input.category ?? 'all',
    size: input.size,
  });

  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const ticketmasterKey = getTicketmasterApiKeyFromEnv();
  const skiddleKey = getSkiddleApiKeyFromEnv();

  if (!ticketmasterKey && !skiddleKey) {
    return { events: [], source: 'none' };
  }

  const [ticketmasterEvents, skiddleEvents] = await Promise.all([
    ticketmasterKey ? fetchTicketmasterEvents(ticketmasterKey, input) : Promise.resolve([]),
    skiddleKey ? fetchSkiddleEvents(skiddleKey, input) : Promise.resolve([]),
  ]);

  const events = mergeDiscoveryEvents([ticketmasterEvents, skiddleEvents], input.size);
  const result: NearbyEventsResult = {
    events,
    source: resolveSource(ticketmasterEvents.length, skiddleEvents.length),
  };

  setCached(cacheKey, result);
  return result;
}

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

    const ticketmasterKey = getTicketmasterApiKeyFromEnv();
    const skiddleKey = getSkiddleApiKeyFromEnv();

    if (!ticketmasterKey && !skiddleKey) {
      console.warn(
        '⚠️ No event API keys set — add TICKETMASTER_API_KEY and/or SKIDDLE_API_KEY on the API server (Railway) or in expo/.env for local Metro',
      );
      return { events: [], source: 'none' };
    }

    const result = await resolveNearbyEvents({
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMiles: input.radiusMiles,
      category: input.category,
      size: input.size,
    });

    console.log(`✅ getNearby: ${result.events.length} events (${input.category ?? 'all'})`);
    return result;
  });

export const getNearbyEventsBatchRoute = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusMiles: z.number().min(1).max(100).default(25),
      sizePerCategory: z.number().min(1).max(50).default(EVENTS_PER_CATEGORY),
    }),
  )
  .query(async ({ input }): Promise<NearbyEventsBatchResult> => {
    const batchCacheKey = getBatchCacheKey({
      lat: Math.round(input.latitude * 100) / 100,
      lng: Math.round(input.longitude * 100) / 100,
      radius: input.radiusMiles,
      size: input.sizePerCategory,
    });

    const cachedBatch = getBatchCached(batchCacheKey);
    if (cachedBatch) {
      console.log('⚡ Events batch cache HIT');
      return cachedBatch;
    }

    const ticketmasterKey = getTicketmasterApiKeyFromEnv();
    const skiddleKey = getSkiddleApiKeyFromEnv();

    if (!ticketmasterKey && !skiddleKey) {
      console.warn('⚠️ No event API keys set — batch returns empty');
      return {
        categories: {},
        categoryCounts: {},
        allEvents: [],
        source: 'none',
      };
    }

    console.log(
      `📦 Events batch: ${BENTO_CATEGORY_IDS.length} categories × ${input.sizePerCategory} (radius=${input.radiusMiles}mi)`,
    );

    const categoryResults = await Promise.all(
      BENTO_CATEGORY_IDS.map(async (category) => {
        const result = await resolveNearbyEvents({
          latitude: input.latitude,
          longitude: input.longitude,
          radiusMiles: input.radiusMiles,
          category,
          size: input.sizePerCategory,
        });
        return { category, result };
      }),
    );

    const categories: NearbyEventsBatchResult['categories'] = {};
    const categoryCounts: Record<string, number> = {};
    let hasTicketmaster = false;
    let hasSkiddle = false;

    for (const { category, result } of categoryResults) {
      const count = result.events.length;
      categories[category] = { events: result.events, count };
      categoryCounts[category] = count;
      if (result.source === 'ticketmaster' || result.source === 'mixed') hasTicketmaster = true;
      if (result.source === 'skiddle' || result.source === 'mixed') hasSkiddle = true;
    }

    const allEvents = mergeDiscoveryEvents(
      BENTO_CATEGORY_IDS.map((category) => categories[category]?.events ?? []),
      BENTO_CATEGORY_IDS.length * input.sizePerCategory,
    );

    const batchResult: NearbyEventsBatchResult = {
      categories,
      categoryCounts,
      allEvents,
      source: resolveSource(hasTicketmaster ? 1 : 0, hasSkiddle ? 1 : 0),
    };

    setBatchCached(batchCacheKey, batchResult);
    console.log(`✅ Events batch: ${allEvents.length} merged events`);
    return batchResult;
  });

/** Used by /health/events and CI — catches missing keys or stale deploys without Skiddle merge. */
export async function runEventsDiscoverySmokeCheck(): Promise<{
  ok: boolean;
  ticketmasterKeyConfigured: boolean;
  skiddleKeyConfigured: boolean;
  source: NearbyEventsSource;
  total: number;
  ticketmaster: number;
  skiddle: number;
  minRequired: number;
  errors: string[];
}> {
  const minRequired = 1;
  const errors: string[] = [];
  const ticketmasterKey = getTicketmasterApiKeyFromEnv();
  const skiddleKey = getSkiddleApiKeyFromEnv();

  if (!ticketmasterKey && !skiddleKey) {
    errors.push('No event API keys configured (TICKETMASTER_API_KEY / SKIDDLE_API_KEY)');
  }
  if (!skiddleKey) {
    errors.push('SKIDDLE_API_KEY not set — Skiddle listings will be skipped');
  }

  const input: FetchInput = {
    latitude: 51.5074,
    longitude: -0.1278,
    radiusMiles: 25,
    size: 20,
  };

  const [ticketmasterEvents, skiddleEvents] = await Promise.all([
    ticketmasterKey ? fetchTicketmasterEvents(ticketmasterKey, input) : Promise.resolve([]),
    skiddleKey ? fetchSkiddleEvents(skiddleKey, input) : Promise.resolve([]),
  ]);

  const events = mergeDiscoveryEvents([ticketmasterEvents, skiddleEvents], input.size);
  const source = resolveSource(ticketmasterEvents.length, skiddleEvents.length);
  const skiddle = events.filter((e) => e.id.startsWith('sk-')).length;
  const ticketmaster = events.filter((e) => e.id.startsWith('tm-')).length;

  if (events.length < minRequired) {
    errors.push(`Expected at least ${minRequired} events, got ${events.length}`);
  }
  if (skiddleKey && skiddle === 0) {
    errors.push('Skiddle key is set but returned 0 events for London smoke coords');
  }

  return {
    ok: events.length >= minRequired && errors.length === 0,
    ticketmasterKeyConfigured: Boolean(ticketmasterKey),
    skiddleKeyConfigured: Boolean(skiddleKey),
    source,
    total: events.length,
    ticketmaster,
    skiddle,
    minRequired,
    errors,
  };
}
