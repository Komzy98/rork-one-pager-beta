/**
 * Unified discovery fetch for Ticketmaster, Skiddle, and future ticketing providers.
 * Used by nearby browse + global keyword search.
 */

import type { NearbyEventsResult } from '@/types/events';
import {
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';
import { eventMatchesBentoCategory } from '@/utils/eventCategories';
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
  TICKETMASTER_KEYWORD_MARKETS,
  type TicketmasterCountryCode,
} from '@/utils/ticketmasterQuery';
import {
  mapTicketmasterResponse,
  TICKETMASTER_CATEGORY_FILTER,
} from '@/utils/ticketmasterTransform';

export type DiscoverySearchScope = 'nearby' | 'worldwide';

export type DiscoveryFetchInput = {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  category?: string;
  size: number;
  /** Artist, venue, or event name — forwarded to all configured providers. */
  keyword?: string;
  /** Nearby browse vs keyword search without distance limits. */
  searchScope?: DiscoverySearchScope;
};

/** Skiddle is UK-focused; use national center for worldwide keyword queries. */
const SKIDDLE_UK_SEARCH_CENTER = { latitude: 51.5074, longitude: -0.1278 };
const SKIDDLE_MAX_RADIUS_MILES = 100;

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

async function fetchTicketmasterMarketKeyword(
  apiKey: string,
  input: DiscoveryFetchInput,
  marketCountryCode: TicketmasterCountryCode,
  size: number,
): Promise<LocalEventPayload[]> {
  const keyword = input.keyword!.trim();
  const url = buildTicketmasterEventsSearchUrl({
    apiKey,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMiles: input.radiusMiles,
    size,
    keyword,
    daysAhead: 180,
    keywordMarketwide: true,
    marketCountryCode,
  });

  const payload = await fetchJsonWithTimeout(url, `Ticketmaster (${marketCountryCode})`);
  if (!payload) return [];

  const fault = parseTicketmasterFault(payload);
  if (fault) {
    console.error(`❌ Ticketmaster ${marketCountryCode}: ${fault}`);
    return [];
  }

  const mapped = mapTicketmasterResponse(payload);
  return sortEventsByStartDate(filterUpcomingEvents(mapped));
}

async function fetchTicketmasterWorldwideKeyword(
  apiKey: string,
  input: DiscoveryFetchInput,
): Promise<LocalEventPayload[]> {
  const userMarket = inferTicketmasterCountryCode(input.latitude, input.longitude);
  const markets: TicketmasterCountryCode[] = [
    userMarket,
    ...TICKETMASTER_KEYWORD_MARKETS.filter((code) => code !== userMarket),
  ];
  const perMarket = Math.min(25, Math.max(6, Math.ceil(input.size / markets.length)));

  console.log(
    `🎟️ Ticketmaster worldwide keyword="${input.keyword?.trim()}" markets=${markets.join(',')}`,
  );

  const batches = await Promise.all(
    markets.map((marketCountryCode) =>
      fetchTicketmasterMarketKeyword(apiKey, input, marketCountryCode, perMarket),
    ),
  );

  const events = mergeDiscoveryEvents(batches, input.size);
  console.log(`✅ Ticketmaster worldwide: ${events.length} upcoming`);
  return events;
}

async function fetchTicketmasterEvents(
  apiKey: string,
  input: DiscoveryFetchInput,
): Promise<LocalEventPayload[]> {
  const keyword = input.keyword?.trim();
  if (keyword && input.searchScope === 'worldwide') {
    return fetchTicketmasterWorldwideKeyword(apiKey, input);
  }

  if (!keyword && input.category && input.category !== 'all') {
    const classification = TICKETMASTER_CATEGORY_FILTER[input.category];
    if (!classification) return [];
  }

  const classification =
    !keyword && input.category ? TICKETMASTER_CATEGORY_FILTER[input.category] : undefined;

  const url = buildTicketmasterEventsSearchUrl({
    apiKey,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMiles: input.radiusMiles,
    size: input.size,
    classificationName: classification,
    keyword,
    daysAhead: 180,
  });

  const country = inferTicketmasterCountryCode(input.latitude, input.longitude);
  console.log(
    `🎟️ Ticketmaster: country=${country} radius=${input.radiusMiles}mi keyword=${keyword ?? '—'}`,
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
  console.log(`✅ Ticketmaster: ${events.length} upcoming (${mapped.length} raw)`);
  return events;
}

async function fetchSkiddleEventsForCode(
  apiKey: string,
  input: DiscoveryFetchInput,
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
    keyword: input.keyword?.trim(),
    daysAhead: 180,
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
  input: DiscoveryFetchInput,
): Promise<LocalEventPayload[]> {
  const keyword = input.keyword?.trim();
  const skiddleInput: DiscoveryFetchInput =
    keyword && input.searchScope === 'worldwide'
      ? {
          ...input,
          latitude: SKIDDLE_UK_SEARCH_CENTER.latitude,
          longitude: SKIDDLE_UK_SEARCH_CENTER.longitude,
          radiusMiles: SKIDDLE_MAX_RADIUS_MILES,
        }
      : input;

  console.log(
    `🎶 Skiddle: radius=${skiddleInput.radiusMiles}mi keyword=${keyword ?? '—'} category=${input.category ?? 'all'} scope=${input.searchScope ?? 'nearby'}`,
  );

  if (keyword) {
    const events = await fetchSkiddleEventsForCode(
      apiKey,
      skiddleInput,
      undefined,
      input.size,
    );
    console.log(`✅ Skiddle keyword: ${events.length} events`);
    return events;
  }

  const codes = input.category ? SKIDDLE_EVENT_CODES_BY_CATEGORY[input.category] : undefined;

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

export type DiscoveryProviderKeys = {
  ticketmaster?: string | null;
  skiddle?: string | null;
};

export async function fetchMergedDiscoveryEvents(
  input: DiscoveryFetchInput,
  keys: DiscoveryProviderKeys,
): Promise<{ events: LocalEventPayload[]; ticketmasterCount: number; skiddleCount: number }> {
  const ticketmasterKey = keys.ticketmaster?.trim() || '';
  const skiddleKey = keys.skiddle?.trim() || '';

  const [ticketmasterEvents, skiddleEvents] = await Promise.all([
    ticketmasterKey ? fetchTicketmasterEvents(ticketmasterKey, input) : Promise.resolve([]),
    skiddleKey ? fetchSkiddleEvents(skiddleKey, input) : Promise.resolve([]),
  ]);

  const merged = mergeDiscoveryEvents([ticketmasterEvents, skiddleEvents], input.size);
  const events =
    input.category && input.category !== 'all' && !input.keyword?.trim()
      ? merged.filter((event) => eventMatchesBentoCategory(event, input.category!))
      : merged;

  return {
    events,
    ticketmasterCount: ticketmasterEvents.length,
    skiddleCount: skiddleEvents.length,
  };
}
