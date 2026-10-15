import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getSkiddleApiKeyFromEnv } from '@/backend/utils/skiddleApiKey';
import { getTicketmasterApiKeyFromEnv } from '@/backend/utils/ticketmasterApiKey';
import type { NearbyEventsResult, NearbyEventsSource } from '@/types/events';
import { fetchMergedDiscoveryEvents } from '@/utils/eventDiscoveryFetch';
import { attachDistanceKm } from '@/utils/eventDiscovery';
import { rankGlobalSearchResults } from '@/utils/eventSearch';

const CACHE_TTL_MS = 3 * 60 * 1000;

interface CacheEntry {
  data: NearbyEventsResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(input: Record<string, unknown>): string {
  return `events:search:v3:${JSON.stringify(input)}`;
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

function resolveSource(ticketmasterCount: number, skiddleCount: number, eventbriteCount = 0, billettoCount = 0, feverCount = 0, fientaCount = 0, dataThistleCount = 0, ents24Count = 0, meetupCount = 0): NearbyEventsSource {
  if ([ticketmasterCount, skiddleCount, eventbriteCount, billettoCount, feverCount, fientaCount, dataThistleCount, ents24Count, meetupCount].filter(x => x > 0).length > 1) return 'mixed';
  if (ticketmasterCount > 0) return 'ticketmaster';
  if (skiddleCount > 0) return 'skiddle';
  if (eventbriteCount > 0) return 'eventbrite';
  if (billettoCount > 0) return 'billetto';
  if (feverCount > 0) return 'fever';
  if (fientaCount > 0) return 'fienta';
  if (dataThistleCount > 0) return 'datathistle';
  if (ents24Count > 0) return 'ents24';
  if (meetupCount > 0) return 'meetup';
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
      lat: Math.round(input.latitude * 100) / 100,
      lng: Math.round(input.longitude * 100) / 100,
    });

    const cached = getCached(cacheKey);
    if (cached) {
      console.log('⚡ Global event search cache HIT');
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
    const dataThistleToken = process.env.DATATHISTLE_ACCESS_TOKEN?.trim();
    const meetupToken = process.env.MEETUP_ACCESS_TOKEN?.trim();
    const meetupNetwork = process.env.MEETUP_PRO_NETWORK?.trim();
    const ents24EventsUrl = process.env.ENTS24_EVENTS_URL?.trim();
    const ents24Authorization = process.env.ENTS24_AUTHORIZATION?.trim();


    console.log(`🔎 Global event search: "${input.keyword}" (worldwide)`);

    const { events, ticketmasterCount, skiddleCount, eventbriteCount, billettoCount, feverCount, fientaCount, dataThistleCount, ents24Count, meetupCount } = await fetchMergedDiscoveryEvents(
      {
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMiles: input.radiusMiles ?? 100,
        size: input.size,
        keyword: input.keyword,
        searchScope: 'worldwide',
      },
      { ticketmaster: ticketmasterKey, skiddle: skiddleKey, eventbrite: eventbriteKey, billettoId, billettoSecret, feverClientId, feverClientSecret, feverAudience, dataThistleToken, meetupToken, meetupNetwork, ents24EventsUrl, ents24Authorization },
    );

    const withDistance = attachDistanceKm(events, {
      latitude: input.latitude,
      longitude: input.longitude,
    });
    const ranked = rankGlobalSearchResults(withDistance, input.keyword, {
      latitude: input.latitude,
      longitude: input.longitude,
    });
    const result: NearbyEventsResult = {
      events: ranked,
      source: resolveSource(ticketmasterCount, skiddleCount, eventbriteCount, billettoCount, feverCount, fientaCount, dataThistleCount, ents24Count, meetupCount),
    };

    setCached(cacheKey, result);
    console.log(`✅ Global search: ${ranked.length} events (${result.source})`);
    return result;
  });
