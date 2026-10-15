import type { LocalEvent } from '@/types/events';
import { feverSessionUtc } from '@/backend/services/feverDiscovery';
import {
  asList, cacheProvider, extractUkPostcode, filterProviderEvents, geocodeUkPostcodes,
  getJson, normalizeCandidate, record, text, type EventsFetchInput,
} from '@/backend/services/extraEventProviderCommon';

const ENDPOINT = 'https://fienta.com/api/v1/public/events';
const cache = new Map<string, {expires: number;value: LocalEvent[]}>();
const active = new Map<string, Promise<LocalEvent[]>>();

/** Fienta is a real public country-wide discovery API: no organizer token needed. */
export async function fetchFientaUkEvents(input: EventsFetchInput): Promise<LocalEvent[]> {
  const keyword = input.keyword?.trim().toLowerCase() || '';
  const key = keyword || 'all-uk';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return filterProviderEvents(cached.value, input);
  let task = active.get(key);
  if (!task) {
    task = (async () => {
      const rows: Record<string, unknown>[] = [];
      for (let page = 1; page <= 3; page++) {
        const uri = new URL(ENDPOINT);
        uri.searchParams.set('country', 'GB');
        uri.searchParams.set('locale', 'en');
        uri.searchParams.set('per_page', '180');
        uri.searchParams.set('page', String(page));
        uri.searchParams.set('starts_from', new Date(Date.now() - 2 * 3600_000).toISOString().slice(0, 10) + ' 00:00:00');
        if (keyword) uri.searchParams.set('search', keyword);
        const response = record(await getJson(uri.toString(), {}, 10000));
        const items = asList(response.events);
        rows.push(...items);
        if (page >= Number(record(response.pagination).last_page || 1) || items.length < 180) break;
      }
      const foundCodes = rows.map(r => extractUkPostcode(text(r.address_postal_code) || text(r.address)))
        .filter((x): x is string => !!x);
      const coordinates = new Map<string, {lat: number; lon: number; city: string}>();
      for (let i = 0; i < foundCodes.length; i += 100) {
        const batch = await geocodeUkPostcodes(foundCodes.slice(i, i + 100));
        for (const [k, v] of batch) coordinates.set(k, v);
      }
      const mapped: LocalEvent[] = [];
      for (const raw of rows) {
        const code = extractUkPostcode(text(raw.address_postal_code) || text(raw.address));
        const geo = code && coordinates.get(code);
        if (!geo || raw.is_public === false || /cancelled|canceled|postponed|draft/i.test(text(raw.event_status))) continue;
        const start = text(raw.starts_at).replace(' ', 'T');
        const end = text(raw.ends_at).replace(' ', 'T');
        const startIso = feverSessionUtc(start, 'Europe/London');
        const endIso = feverSessionUtc(end, 'Europe/London');
        if (!startIso || (endIso && (Date.parse(endIso) - Date.parse(startIso)) > 14 * 86400000)) continue;
        if (Date.parse(startIso) > Date.now() + 180 * 86400000) continue;
        const url = text(raw.buy_tickets_url) || text(raw.url);
        if (!/^https:\/\/(?:[a-z0-9-]+\.)?fienta\.com\//i.test(url)) continue;
        const event = normalizeCandidate({
          id: String(raw.id || ''), source: 'fienta', title: text(raw.title), venue: text(raw.venue),
          city: geo.city, lat: geo.lat, lon: geo.lon, startIso, ticketUrl: url,
          image: text(raw.image_url), description: text(raw.description).replace(/<[^>]*>/g, ' ').slice(0, 700),
          categoryHints: asList(raw.categories).map(c => text(c.name)).join(' '),
          price: text(raw.price_from_string),
        });
        if (event) mapped.push(event);
      }
      cacheProvider(cache, key, mapped);
      return mapped;
    })().finally(() => active.delete(key));
    active.set(key, task);
  }
  return filterProviderEvents(await task, input);
}
