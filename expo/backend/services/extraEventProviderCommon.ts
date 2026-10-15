import type { LocalEvent } from '@/types/events';
import { haversineDistanceKm } from '@/utils/eventDiscovery';
import { normalizeEventCategories } from '@/utils/eventCategories';

export type EventsFetchInput = {
  latitude: number; longitude: number; radiusMiles: number; size: number;
  keyword?: string; category?: string; searchScope?: string; includeOtherCategories?: boolean;
};
export type RecordData = Record<string, unknown>;
export const record = (x: unknown): RecordData => x !== null && typeof x === 'object' && !Array.isArray(x) ? x as RecordData : {};
export const text = (x: unknown): string => typeof x === 'string' ? x.trim() : '';
export const numeric = (x: unknown): number => typeof x === 'number' ? x : typeof x === 'string' && x.trim() ? Number(x) : NaN;
export const validCoordinates = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0);
export function safeHttpUrl(x: unknown, allowedHosts?: RegExp): string {
  try {
    const u = new URL(text(x));
    return u.protocol === 'https:' && (!allowedHosts || allowedHosts.test(u.hostname)) ? u.toString() : '';
  } catch { return ''; }
}
export function asList(x: unknown): RecordData[] { return Array.isArray(x) ? x.map(record) : []; }

export async function getJson(url: string, options: RequestInit = {}, timeout = 9000): Promise<unknown> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: abort.signal });
    if (!response.ok) throw new Error('Events provider HTTP ' + response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
}

const postcodeCache = new Map<string, { lat: number; lon: number; city: string } | null>();
export function extractUkPostcode(value: string): string | null {
  const match = value.toUpperCase().match(/\b(GIR\s?0AA|(?:[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}))\b/i);
  return match ? match[0].replace(/\s+/g, '').replace(/(.{3})$/, ' $1') : null;
}
/** Postcodes.io returns surveyed coordinates; never substitute user location for missing event coordinates. */
export async function geocodeUkPostcodes(postcodes: string[]): Promise<Map<string, { lat: number; lon: number; city: string }>> {
  const unique = [...new Set(postcodes.map(extractUkPostcode).filter((x): x is string => !!x))];
  const missing = unique.filter(x => !postcodeCache.has(x)).slice(0, 100);
  if (missing.length) {
    try {
      const payload = record(await getJson('https://api.postcodes.io/postcodes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: missing }),
      }, 9000));
      const rows = asList(payload.result);
      for (const item of rows) {
        const key = extractUkPostcode(text(item.query)), result = record(item.result);
        if (!key) continue;
        const lat = numeric(result.latitude), lon = numeric(result.longitude);
        postcodeCache.set(key, validCoordinates(lat, lon)
          ? { lat, lon, city: text(result.admin_district) || text(result.parish) || 'United Kingdom' } : null);
      }
    } catch (error) {
      console.warn('[Events] UK postcode lookup unavailable:', error instanceof Error ? error.message : 'Unknown error');
    }
    for (const key of missing) if (!postcodeCache.has(key)) postcodeCache.set(key, null);
    if (postcodeCache.size > 1500) postcodeCache.clear();
  }
  const out = new Map<string, { lat: number; lon: number; city: string }>();
  for (const code of unique) { const geo = postcodeCache.get(code); if (geo) out.set(code, geo); }
  return out;
}
export function categoryFromText(title: string, hints = ''): string {
  const t = (title + ' ' + hints).toLowerCase();
  if (/\b(food|dinner|brunch|supper|tasting|culinary|cocktail|wine)\b/.test(t)) return 'food';
  if (/\b(comedy|stand.?up|comedian)\b/.test(t)) return 'comedy';
  if (/\b(yoga|fitness|pilates|running|workout|marathon)\b/.test(t)) return 'fitness';
  if (/\b(football|rugby|basketball|sport|boxing|cricket)\b/.test(t)) return 'sports';
  if (/\b(theatre|theater|opera|stage|ballet|musical)\b/.test(t)) return 'theatre';
  if (/\b(concert|music|gig|candlelight|orchestra|jazz|choir|festival)\b/.test(t)) return 'music';
  if (/\b(technology|startup|business|networking|meetup|conference)\b/.test(t)) return 'networking';
  if (/\b(club|rave|nightlife|dj set)\b/.test(t)) return 'nightlife';
  if (/\b(children|kids|family)\b/.test(t)) return 'family';
  return 'arts';
}
export type Candidate = {
  id: string; title: string; venue: string; city: string; startIso: string;
  ticketUrl: string; image?: string; description?: string; source: 'fienta' | 'datathistle' | 'ents24' | 'meetup';
  lat: number; lon: number; categoryHints?: string; price?: string;
};
export function normalizeCandidate(c: Candidate, now = Date.now()): LocalEvent | null {
  const when = Date.parse(c.startIso);
  if (!c.id || !c.title.trim() || !c.venue.trim() || !validCoordinates(c.lat, c.lon) ||
      !Number.isFinite(when) || when < now - 2 * 3600_000 || !safeHttpUrl(c.ticketUrl)) return null;
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(when));
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(new Date(when));
  return normalizeEventCategories({
    id: c.source.slice(0, 2) + '-' + c.id, title: c.title, venue: c.venue, location: c.city || 'United Kingdom',
    latitude: c.lat, longitude: c.lon, date, time, startIso: c.startIso, ticketUrl: c.ticketUrl,
    description: c.description || '', category: categoryFromText(c.title, c.categoryHints || ''),
    price: c.price || 'See tickets', image: c.image || '', isSaved: false,
    attendees: 0, rating: 0, tags: [c.source], listingSource: c.source, marketCode: 'GB',
  });
}
export function filterProviderEvents(events: LocalEvent[], input: EventsFetchInput): LocalEvent[] {
  const q = input.keyword?.trim().toLowerCase();
  return events.filter(event => {
    if (q && ![event.title, event.description, event.venue].some(s => s.toLowerCase().includes(q))) return false;
    if (!input.includeOtherCategories && input.category && input.category !== 'all' && event.category !== input.category) return false;
    if (input.searchScope !== 'worldwide' &&
      haversineDistanceKm(input.latitude, input.longitude, event.latitude, event.longitude) > input.radiusMiles * 1.609344) return false;
    return true;
  });
}
export function cacheProvider<T>(cache: Map<string, {expires: number;value: T}>, key: string, value: T, ttlMs = 300000) {
  cache.set(key, { expires: Date.now() + ttlMs, value });
  while (cache.size > 40) cache.delete(cache.keys().next().value!);
}

const detailsCache = new Map<string, LocalEvent>();
export function rememberExtraEvents(events: LocalEvent[]): void {
  for (const e of events) detailsCache.set(e.id, e);
  while (detailsCache.size > 1000) detailsCache.delete(detailsCache.keys().next().value!);
}
export function findExtraEvent(id: string): LocalEvent | null { return detailsCache.get(id) || null; }
