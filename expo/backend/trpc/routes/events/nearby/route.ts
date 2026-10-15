import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getSkiddleApiKeyFromEnv } from '@/backend/utils/skiddleApiKey';
import { getTicketmasterApiKeyFromEnv } from '@/backend/utils/ticketmasterApiKey';
import type { NearbyEventsResult, NearbyEventsBatchResult, NearbyEventsSource } from '@/types/events';
import {
  EVENTS_PER_CATEGORY,
} from '@/utils/eventDiscovery';
import { BENTO_CATEGORY_IDS, eventMatchesBentoCategory } from '@/utils/eventCategories';
import { mergeDiscoveryEvents } from '@/utils/mergeDiscoveryEvents';
import { fetchMergedDiscoveryEvents } from '@/utils/eventDiscoveryFetch';

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
  return `events:nearby:batch:v2:${JSON.stringify(input)}`;
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
  includeOtherCategories?: boolean;
  size: number;
};

type LocalEventPayload = NearbyEventsResult['events'][number];

function resolveSource(
  ticketmasterCount: number,
  skiddleCount: number,
  eventbriteCount = 0,
  billettoCount = 0,
  feverCount = 0,
): NearbyEventsSource {
  if ([ticketmasterCount, skiddleCount, eventbriteCount, billettoCount, feverCount].filter(count => count > 0).length > 1) return 'mixed';
  if (ticketmasterCount > 0) return 'ticketmaster';
  if (skiddleCount > 0) return 'skiddle';
  if (eventbriteCount > 0) return 'eventbrite';
  if (billettoCount > 0) return 'billetto';
  if (feverCount > 0) return 'fever';
  return 'none';
}

async function resolveNearbyEvents(input: FetchInput): Promise<NearbyEventsResult> {
  const cacheKey = getCacheKey({
    lat: Math.round(input.latitude * 100) / 100,
    lng: Math.round(input.longitude * 100) / 100,
    radius: input.radiusMiles,
    category: input.category ?? 'all',
    includeOtherCategories: Boolean(input.includeOtherCategories),
    size: input.size,
  });

  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const ticketmasterKey = getTicketmasterApiKeyFromEnv();
  const skiddleKey = getSkiddleApiKeyFromEnv();
  const eventbriteKey = process.env.EVENTBRITE_TOKEN?.trim();
  const billettoId = process.env.BILLETTO_ACCESS_KEY_ID?.trim();
  const billettoSecret = process.env.BILLETTO_ACCESS_KEY_SECRET?.trim();
  const feverClientId = process.env.FEVER_CLIENT_ID?.trim();
  const feverClientSecret = process.env.FEVER_CLIENT_SECRET?.trim();
  const feverAudience = process.env.FEVER_AUDIENCE?.trim();

  if (!ticketmasterKey && !skiddleKey && !eventbriteKey && !(billettoId && billettoSecret) && !(feverClientId && feverClientSecret && feverAudience)) {
    return { events: [], source: 'none' };
  }

  const { events, ticketmasterCount, skiddleCount, eventbriteCount, billettoCount, feverCount } = await fetchMergedDiscoveryEvents(
    input,
    { ticketmaster: ticketmasterKey, skiddle: skiddleKey, eventbrite: eventbriteKey, billettoId, billettoSecret, feverClientId, feverClientSecret, feverAudience },
  );

  const result: NearbyEventsResult = {
    events,
    source: resolveSource(ticketmasterCount, skiddleCount, eventbriteCount, billettoCount, feverCount),
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
  const eventbriteKey = process.env.EVENTBRITE_TOKEN?.trim();
  const billettoId = process.env.BILLETTO_ACCESS_KEY_ID?.trim();
  const billettoSecret = process.env.BILLETTO_ACCESS_KEY_SECRET?.trim();
  const feverClientId = process.env.FEVER_CLIENT_ID?.trim();
  const feverClientSecret = process.env.FEVER_CLIENT_SECRET?.trim();
  const feverAudience = process.env.FEVER_AUDIENCE?.trim();

    if (!ticketmasterKey && !skiddleKey && !eventbriteKey && !(billettoId && billettoSecret) && !(feverClientId && feverClientSecret && feverAudience)) {
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
  const eventbriteKey = process.env.EVENTBRITE_TOKEN?.trim();
  const billettoId = process.env.BILLETTO_ACCESS_KEY_ID?.trim();
  const billettoSecret = process.env.BILLETTO_ACCESS_KEY_SECRET?.trim();
  const feverClientId = process.env.FEVER_CLIENT_ID?.trim();
  const feverClientSecret = process.env.FEVER_CLIENT_SECRET?.trim();
  const feverAudience = process.env.FEVER_AUDIENCE?.trim();

    if (!ticketmasterKey && !skiddleKey && !eventbriteKey && !(billettoId && billettoSecret) && !(feverClientId && feverClientSecret && feverAudience)) {
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
          includeOtherCategories: true,
          size: input.sizePerCategory,
        });
        return { category, result };
      }),
    );

    // Providers can classify Food Fest as Arts. Merge first and re-bucket
    // by our normalized category to prevent listings disappearing from both.
    const discovered = mergeDiscoveryEvents(
      categoryResults.map(({ result }) => result.events),
      BENTO_CATEGORY_IDS.length * input.sizePerCategory * 2,
    );
    const categories: NearbyEventsBatchResult['categories'] = {};
    const categoryCounts: Record<string, number> = {};
    for (const category of BENTO_CATEGORY_IDS) {
      const events = discovered
        .filter(event => eventMatchesBentoCategory(event, category))
        .slice(0, input.sizePerCategory);
      categories[category] = { events, count: events.length };
      categoryCounts[category] = events.length;
    }
    const allEvents = mergeDiscoveryEvents(
      BENTO_CATEGORY_IDS.map(category => categories[category]?.events ?? []),
      BENTO_CATEGORY_IDS.length * input.sizePerCategory,
    );
    const sources = new Set(discovered.map(event => event.listingSource).filter(Boolean));
    const source: NearbyEventsSource = sources.size > 1
      ? 'mixed'
      : sources.has('ticketmaster') ? 'ticketmaster'
      : sources.has('skiddle') ? 'skiddle'
      : sources.has('eventbrite') ? 'eventbrite'
      : sources.has('billetto') ? 'billetto'
      : sources.has('fever') ? 'fever'
      : 'none';

    const batchResult: NearbyEventsBatchResult = {
      categories,
      categoryCounts,
      allEvents,
      source,
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
  const eventbriteKey = process.env.EVENTBRITE_TOKEN?.trim();
  const billettoId = process.env.BILLETTO_ACCESS_KEY_ID?.trim();
  const billettoSecret = process.env.BILLETTO_ACCESS_KEY_SECRET?.trim();
  const feverClientId = process.env.FEVER_CLIENT_ID?.trim();
  const feverClientSecret = process.env.FEVER_CLIENT_SECRET?.trim();
  const feverAudience = process.env.FEVER_AUDIENCE?.trim();

  if (!ticketmasterKey && !skiddleKey && !eventbriteKey && !(billettoId && billettoSecret) && !(feverClientId && feverClientSecret && feverAudience)) {
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

  const { events, ticketmasterCount, skiddleCount } = await fetchMergedDiscoveryEvents(
    input,
    { ticketmaster: ticketmasterKey, skiddle: skiddleKey, eventbrite: eventbriteKey, billettoId, billettoSecret, feverClientId, feverClientSecret, feverAudience },
  );
  const source = resolveSource(ticketmasterCount, skiddleCount);
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
