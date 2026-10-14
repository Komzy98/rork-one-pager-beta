import type { LocalEvent } from '@/types/events';
import { haversineDistanceKm } from '@/utils/eventDiscovery';
import { normalizeEventCategories } from '@/utils/eventCategories';

type JsonObject = Record<string, unknown>;
type BillettoInput = { latitude: number; longitude: number; radiusMiles: number; keyword?: string; category?: string; searchScope?: string; includeOtherCategories?: boolean };
const BASE = 'https://billetto.co.uk/api/v3/public/events';
const TTL = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; events: LocalEvent[] }>();
const inFlight = new Map<string, Promise<LocalEvent[]>>();
let lastDiagnostics: { rawCount: number; mappedCount: number; sampleFields: string[]; locationFields: string[] } | null = null;
export function getBillettoDiagnostics() { return lastDiagnostics; }

function obj(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}
function first(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}
function coord(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return NaN;
}
function validHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.toString() : null; }
  catch { return null; }
}
function categoryFrom(raw: JsonObject, title: string): string {
  const categories = obj(raw.categorization);
  const category = obj(raw.category ?? categories.category);
  const subCategory = obj(raw.subcategory ?? categories.subcategory);
  const tags = [first(category.name, raw.category, raw.category_name, categories.category), first(subCategory.name, raw.subcategory, categories.subcategory), first(obj(raw.type).name, obj(raw.kind).name, raw.kind), title].join(' ').toLowerCase();
  if (/\b(comedy|stand.up)\b/.test(tags)) return 'comedy';
  if (/\b(food|drink|dining|supper|brunch|tasting|culinary)\b/.test(tags)) return 'food';
  if (/\b(tech|startup|networking|conference|business)\b/.test(tags)) return 'networking';
  if (/\b(sport|football|fitness|run club|yoga)\b/.test(tags)) return 'sports';
  if (/\b(theatre|theater|musical|stage)\b/.test(tags)) return 'theatre';
  if (/\b(dj|club night|rave|nightlife)\b/.test(tags)) return 'nightlife';
  if (/\b(music|concert|gig|jazz|festival)\b/.test(tags)) return 'music';
  if (/\b(art|gallery|museum|exhibition)\b/.test(tags)) return 'arts';
  return 'other';
}

/** Validate provider fields instead of synthesising dates, locations, or ticket links. */
export function mapBillettoPublicEvent(value: unknown, now = Date.now()): LocalEvent | null {
  const raw = obj(value);
  const id = first(raw.id, raw.event_id);
  const title = first(raw.title, raw.name);
  const starts = first(raw.starts_at, raw.start_at, raw.start_time, raw.start_date, raw.start, raw.startsAt, raw.startAt, raw.startdate);
  const time = Date.parse(starts);
  if (!id || !title || !Number.isFinite(time) || time < now - 6 * 60 * 60 * 1000) return null;
  const status = first(raw.state, raw.status).toLowerCase();
  if (/^(cancelled|canceled|draft|hidden|private|deleted|postponed)$/.test(status)) return null;
  const venue = obj(raw.venue);
  const location = obj(raw.location);
  const address = obj(raw.address);
  const physical = obj(raw.physical_location);
  const geo = obj(location.geo);
  const nested = location.coordinates ?? geo.coordinates;
  const point = obj(nested);
  const xy = Array.isArray(nested) ? nested
    : Array.isArray(point.coordinates) ? point.coordinates : null;
  // GeoJSON is usually [longitude, latitude], but providers can use [latitude, longitude].
  // Accept only the ordering consistent with a physical UK event.
  const a = xy ? coord(xy[0]) : NaN, b = xy ? coord(xy[1]) : NaN;
  const uk = (lat: number, lon: number) => lat >= 49 && lat <= 61.5 && lon >= -11 && lon <= 3;
  const arrayLatitude = uk(b, a) ? b : uk(a, b) ? a : NaN;
  const arrayLongitude = uk(b, a) ? a : uk(a, b) ? b : NaN;
  const latitude = coord(raw.latitude ?? raw.lat ?? venue.latitude ?? venue.lat ?? location.latitude ?? location.lat ?? physical.latitude ?? address.latitude ?? point.latitude ?? point.lat ?? point.y ?? arrayLatitude);
  const longitude = coord(raw.longitude ?? raw.lng ?? raw.lon ?? venue.longitude ?? venue.lng ?? location.longitude ?? location.lng ?? physical.longitude ?? address.longitude ?? point.longitude ?? point.lng ?? point.lon ?? point.x ?? arrayLongitude);
  // Never turn an absent location into (0,0), or guess coordinates from a postcode.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) return null;
  const ticketUrl = validHttpUrl(first(raw.url, raw.public_url, raw.branded_url, raw.event_url, raw.ticket_url));
  if (!ticketUrl || !/(^|\.)billetto\.(co\.uk|dk|se|no|de)$/i.test(new URL(ticketUrl).hostname)) return null;
  const image = obj(raw.image);
  const cover = obj(raw.cover_image);
  const imageUrl = validHttpUrl(first(raw.image_url, raw.image_link, raw.cover_image_url, raw.banner_url, image.url, cover.url)) || '';
  const city = first(raw.city, venue.city, location.city, physical.city, address.city, 'Nearby');
  const venueName = first(venue.name, raw.venue_name, physical.name, location.location_name, location.name, city);
  const date = new Date(time);
  const priceValue = raw.price_from ?? raw.minimum_price;
  const price = raw.is_free === true || priceValue === 0 ? 'Free'
    : typeof priceValue === 'number' && priceValue > 0 ? `£${priceValue.toFixed(0)}+` : 'See tickets';
  const event: LocalEvent = {
    id: `bl-${id}`, title, venue: venueName, location: city,
    date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }),
    category: categoryFrom(raw, title), price, image: imageUrl, isSaved: false,
    attendees: 0, rating: 0, tags: ['billetto', city.toLowerCase()], description: first(raw.description, raw.summary, title),
    latitude, longitude, startIso: starts, ticketUrl, listingSource: 'billetto', marketCode: 'GB',
  };
  return normalizeEventCategories(event);
}
function unpack(payload: unknown): { items: unknown[]; more: boolean } {
  if (Array.isArray(payload)) return { items: payload, more: false };
  const root = obj(payload);
  const data = obj(root.data);
  const items = [root.events, root.results, root.items, root.data, data.events, data.items]
    .find(Array.isArray) as unknown[] | undefined;
  if (!items) throw new Error('Unexpected Billetto response shape');
  return { items, more: Boolean(root.has_more ?? data.has_more ?? obj(root.pagination).has_more) };
}
export async function fetchBillettoPublicEvents(keyId: string, keySecret: string): Promise<LocalEvent[]> {
  if (!keyId || !keySecret) return [];
  const key = 'gb-public';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.events;
  const running = inFlight.get(key);
  if (running) return running;
  const work = (async () => {
    const collected = new Map<string, LocalEvent>();
    let rawCount = 0;
    let sampleFields: string[] = [];
    let locationFields: string[] = [];
    for (let page = 0; page < 3; page++) {
      const url = new URL(BASE);
      url.searchParams.set('limit', '100');
      if (page) url.searchParams.set('offset', String(page * 100));
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 11000);
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: { 'Api-Keypair': `${keyId}:${keySecret}`, Accept: 'application/json' }, signal: abort.signal,
        });
      } finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error(`Billetto public API HTTP ${response.status}`);
      const parsed = unpack(await response.json());
      rawCount += parsed.items.length;
      if (parsed.items.length && sampleFields.length === 0) {
        const sample = obj(parsed.items[0]);
        sampleFields = Object.keys(sample).sort();
        locationFields = Object.keys(obj(sample.location ?? sample.venue ?? sample.address ?? sample.physical_location)).sort();
      }
      for (const item of parsed.items) {
        const event = mapBillettoPublicEvent(item);
        if (event) collected.set(event.id, event);
      }
      if (!parsed.more || parsed.items.length < 100) break;
    }
    const events = [...collected.values()];
    lastDiagnostics = { rawCount, mappedCount: events.length, sampleFields, locationFields };
    cache.set(key, { expires: Date.now() + TTL, events });
    return events;
  })();
  inFlight.set(key, work);
  try { return await work; } finally { inFlight.delete(key); }
}
export function filterBillettoEvents(events: LocalEvent[], input: BillettoInput): LocalEvent[] {
  const q = input.keyword?.trim().toLowerCase();
  return events.filter(event => {
    if (q && ![event.title, event.description, event.venue, event.location].some(s => s.toLowerCase().includes(q))) return false;
    if (!input.includeOtherCategories && input.category && input.category !== 'all' && event.category !== input.category) return false;
    if (input.searchScope !== 'worldwide' && haversineDistanceKm(input.latitude, input.longitude, event.latitude, event.longitude) > input.radiusMiles * 1.609344) return false;
    return true;
  });
}
