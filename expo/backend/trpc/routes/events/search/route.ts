import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getSkiddleApiKeyFromEnv } from '@/backend/utils/skiddleApiKey';
import { getTicketmasterApiKeyFromEnv } from '@/backend/utils/ticketmasterApiKey';
import type { NearbyEventsResult, NearbyEventsSource } from '@/types/events';
import { fetchMergedDiscoveryEvents } from '@/utils/eventDiscoveryFetch';
import { rankEventsBySearchKeyword } from '@/utils/eventSearch';

const CACHE_TTL_MS = 3 * 60 * 1000;

interface CacheEntry {
  data: NearbyEventsResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(input: Record<string, unknown>): string {
  return `events:search:v2:${JSON.stringify(input)}`;
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
  if (cache.size > 60) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 8; i++) cache.delete(oldest[i][0]);
  }
}

function resolveSource(ticketmasterCount: number, skiddleCount: number): NearbyEventsSource {
  if (ticketmasterCount > 0 && skiddleCount > 0) return 'mixed';
  if (ticketmasterCount > 0) return 'ticketmaster';
  if (skiddleCount > 0) return 'skiddle';
  return 'none';
}

/** Global keyword search across Ticketmaster + Skiddle (extensible via eventDiscoveryFetch). */
export const searchGlobalEventsRoute = publicProcedure
  .input(
    z.object({
      keyword: z.string().trim().min(2).max(120),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusMiles: z.number().min(5).max(100).default(100).optional(),
      size: z.number().min(1).max(50).default(50),
    }),
  )
  .query(async ({ input }): Promise<NearbyEventsResult> => {
    const cacheKey = getCacheKey({
      q: input.keyword.toLowerCase(),
      scope: 'worldwide',
      size: input.size,
    });

    const cached = getCached(cacheKey);
    if (cached) {
      console.log('⚡ Global event search cache HIT');
      return cached;
    }

    const ticketmasterKey = getTicketmasterApiKeyFromEnv();
    const skiddleKey = getSkiddleApiKeyFromEnv();

    if (!ticketmasterKey && !skiddleKey) {
      console.warn('⚠️ Global search: no TICKETMASTER_API_KEY / SKIDDLE_API_KEY');
      return { events: [], source: 'none' };
    }

    console.log(`🔎 Global event search: "${input.keyword}" (worldwide)`);

    const { events, ticketmasterCount, skiddleCount } = await fetchMergedDiscoveryEvents(
      {
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMiles: input.radiusMiles ?? 100,
        size: input.size,
        keyword: input.keyword,
        searchScope: 'worldwide',
      },
      { ticketmaster: ticketmasterKey, skiddle: skiddleKey },
    );

    const ranked = rankEventsBySearchKeyword(events, input.keyword);
    const result: NearbyEventsResult = {
      events: ranked,
      source: resolveSource(ticketmasterCount, skiddleCount),
    };

    setCached(cacheKey, result);
    console.log(`✅ Global search: ${ranked.length} events (${result.source})`);
    return result;
  });
