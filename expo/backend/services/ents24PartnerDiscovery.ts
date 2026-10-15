import type { LocalEvent } from '@/types/events';
import {
  asList, cacheProvider, extractUkPostcode, filterProviderEvents, geocodeUkPostcodes,
  getJson, normalizeCandidate, numeric, record, safeHttpUrl, text, type EventsFetchInput,
} from '@/backend/services/extraEventProviderCommon';

const cache = new Map<string, {expires: number;value: LocalEvent[]}>();
/** Ents24's public schema repo is explicitly archived/outdated.
 * The partner must provide the current licensed endpoint + authorization header.
 * No guessed third-party endpoints or HTML scraping are used.
 */
export async function fetchEnts24LicensedEvents(input: EventsFetchInput, endpoint: string, authHeader: string): Promise<LocalEvent[]> {
  if (!endpoint.trim() || !authHeader.trim()) return [];
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || !/(^|\.)ents24\.com$/i.test(url.hostname)) throw new Error('Ents24 URL is not an approved provider host');
  const key = [input.latitude.toFixed(2), input.longitude.toFixed(2), input.radiusMiles, input.keyword || ''].join('|');
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return filterProviderEvents(saved.value, input);
  url.searchParams.set('latitude', String(input.latitude));
  url.searchParams.set('longitude', String(input.longitude));
  url.searchParams.set('radius', String(input.radiusMiles));
  const payload = record(await getJson(url.toString(), { headers: { Authorization: authHeader.trim(), Accept: 'application/json' } }, 10000));
  const rows = asList(payload.events || record(payload.data).events);
  const locations = await geocodeUkPostcodes(rows.map(r => text(record(r.venue).postcode) || text(r.postcode)));
  const events: LocalEvent[] = [];
  for (const raw of rows) {
    const place = record(raw.venue);
    const code = extractUkPostcode(text(place.postcode) || text(raw.postcode));
    const geo = code && locations.get(code);
    if (!geo) continue;
    const ev = normalizeCandidate({
      id: String(raw.id || ''), title: text(raw.name || raw.title),
      venue: text(place.name || raw.venue_name), city: text(place.city) || geo.city,
      lat: numeric(place.lat) || geo.lat, lon: numeric(place.lon) || geo.lon,
      startIso: text(raw.start_at || raw.starts_at || raw.dateTime),
      ticketUrl: safeHttpUrl(raw.ticket_url || raw.url),
      image: safeHttpUrl(raw.image_url), description: text(raw.description),
      source: 'ents24', categoryHints: text(raw.category), price: text(raw.price),
    });
    if (ev) events.push(ev);
  }
  cacheProvider(cache, key, events);
  return filterProviderEvents(events, input);
}
