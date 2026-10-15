import type { LocalEvent } from '@/types/events';
import { haversineDistanceKm } from '@/utils/eventDiscovery';
import { normalizeEventCategories } from '@/utils/eventCategories';

const AUTH_URL = 'https://feverup.us.auth0.com/oauth/token';
const MCP_URL = 'https://data-search.apigw.feverup.com/mcp/';
const CACHE_TTL_MS = 5 * 60_000;
type Obj = Record<string, unknown>;
export type FeverInput = {
  latitude: number; longitude: number; radiusMiles: number; size: number;
  category?: string; keyword?: string; searchScope?: string; includeOtherCategories?: boolean;
};
export type FeverCredentials = { clientId: string; clientSecret: string; audience: string };
type Venue = { name: string; latitude: number; longitude: number; city: string; countryCode?: string };

const object = (value: unknown): Obj =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const string = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const number = (value: unknown): number =>
  typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
const validGeo = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0);
const cache = new Map<string, { expires: number; events: LocalEvent[] }>();
const inFlight = new Map<string, Promise<LocalEvent[]>>();
const details = new Map<string, LocalEvent>();
let tokenCache: { key: string; token: string; expires: number } | null = null;

function feverUrl(value: unknown): string | null {
  try {
    const u = new URL(string(value));
    return u.protocol === 'https:' && /(^|\.)feverup\.com$/i.test(u.hostname) ? u.toString() : null;
  } catch { return null; }
}
async function timedFetch(url: string, init: RequestInit, duration = 6000): Promise<Response> {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), duration);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
async function accessToken(credentials: FeverCredentials): Promise<string> {
  const key = credentials.clientId + ':' + credentials.audience;
  if (tokenCache?.key === key && tokenCache.expires > Date.now() + 45_000) return tokenCache.token;
  const response = await timedFetch(AUTH_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials', client_id: credentials.clientId,
      client_secret: credentials.clientSecret, audience: credentials.audience, scope: 'mcp:service',
    }),
  });
  if (!response.ok) throw new Error('Fever OAuth HTTP ' + response.status);
  const body = object(await response.json()), token = string(body.access_token);
  if (!token) throw new Error('Fever OAuth token absent');
  const seconds = number(body.expires_in);
  tokenCache = {
    key, token, expires: Date.now() + (Number.isFinite(seconds) ? Math.max(seconds, 60) : 300) * 1000,
  };
  return token;
}
function readRpc(body: string, type: string): Obj {
  if (!body) return {};
  if (!type.includes('text/event-stream')) return object(JSON.parse(body));
  const messages = body.split(/\r?\n/).filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim()).filter(line => line && line !== '[DONE]');
  for (const line of messages.reverse()) {
    try {
      const result = object(JSON.parse(line));
      if ('result' in result || 'error' in result) return result;
    } catch { /* Ignore keepalive/malformed frames. */ }
  }
  throw new Error('Fever MCP response missing JSON-RPC result');
}
function unwrapTool(payload: unknown): Obj {
  const r = object(payload);
  if (r.isError) throw new Error('Fever MCP tool error');
  if (Object.keys(object(r.structuredContent)).length) return object(r.structuredContent);
  for (const item of Array.isArray(r.content) ? r.content : []) {
    try {
      const value = JSON.parse(string(object(item).text));
      if (Array.isArray(value)) return { results: value };
      if (value && typeof value === 'object') return object(value);
    } catch { /* Skip non-JSON MCP text. */ }
  }
  return r;
}
export class FeverMcpClient {
  private token = '';
  private sessionId = '';
  private sequence = 0;
  private protocolVersion = '2025-06-18';
  constructor(private credentials: FeverCredentials) {}
  private async request(method: string, params?: Obj, notification = false): Promise<Obj> {
    const body = notification ? { jsonrpc: '2.0', method }
      : { jsonrpc: '2.0', method, id: ++this.sequence, params: params ?? {} };
    const headers: Record<string, string> = {
      Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': this.protocolVersion,
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const response = await timedFetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('Fever MCP HTTP ' + response.status);
    this.sessionId = response.headers.get('mcp-session-id') || this.sessionId;
    if (notification || response.status === 202 || response.status === 204) return {};
    const json = readRpc(await response.text(), response.headers.get('content-type') || '');
    if (json.error) throw new Error('Fever MCP request failed');
    return object(json.result);
  }
  async open(): Promise<void> {
    this.token = await accessToken(this.credentials);
    const hello = await this.request('initialize', {
      protocolVersion: '2025-06-18', capabilities: {},
      clientInfo: { name: 'onepager-events', version: '1.0' },
    });
    if (!hello.protocolVersion) throw new Error('Fever MCP initialization failed');
    this.protocolVersion = string(hello.protocolVersion);
    await this.request('notifications/initialized', undefined, true);
  }
  async call(name: 'search_events' | 'search_venues', args: Obj): Promise<Obj> {
    return unwrapTool(await this.request('tools/call', { name, arguments: args }));
  }
}
function rows(payload: Obj): Obj[] {
  const inner = object(payload.data);
  const arr = [payload.results, payload.events, payload.venues, payload.items,
    inner.results, inner.events, inner.venues, inner.items].find(Array.isArray);
  return Array.isArray(arr) ? arr.map(object) : [];
}
/** Convert a timezone-naive Fever local session datetime to a real UTC instant. */
export function feverSessionUtc(raw: string, timezone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw);
  if (!match || !timezone) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    let instant = wall;
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, Number(p.value)]));
      const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      instant += wall - shown;
    }
    const check = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, Number(p.value)]));
    if (check.year !== year || check.month !== month || check.day !== day ||
        check.hour !== hour || check.minute !== minute) return null;
    return new Date(instant).toISOString();
  } catch { return null; }
}
function parseVenues(payload: Obj): Venue[] {
  return rows(payload).flatMap(v => {
    const latitude = number(v.latitude), longitude = number(v.longitude), name = string(v.name);
    if (!name || !validGeo(latitude, longitude)) return [];
    return [{
      name, latitude, longitude, city: string(v.location).split(',')[0].trim(),
      countryCode: string(v.country_code),
    }];
  });
}
function matchVenue(location: string, venues: Venue[]): Venue | null {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const [venuePart, ...cityParts] = location.split(',');
  const locationVenue = norm(venuePart || '');
  if (locationVenue.length < 4) return null;
  const matches = venues.filter(v => norm(v.name) === locationVenue);
  const city = norm(cityParts.join(' '));
  const inCity = city ? matches.filter(v => !!v.city && city.includes(norm(v.city))) : matches;
  // Ambiguous venue names must not be assigned arbitrary map coordinates.
  return inCity.length === 1 ? inCity[0] : null;
}
function categoryFor(event: Obj): string {
  // Descriptions of unrelated events often mention refreshments or entertainment.
  // Use the event title and provider keywords rather than incidental prose.
  const terms = [string(event.name),
    Array.isArray(event.keywords) ? event.keywords.join(' ') : '',
    Array.isArray(event.music_genres) ? event.music_genres.join(' ') : ''].join(' ').toLowerCase();
  if (/\b(food|drink|dining|cocktail|brunch|tasting)\b/.test(terms)) return 'food';
  if (/\b(jazz|music|concert|orchestra|candlelight|gig)\b/.test(terms)) return 'music';
  if (/\b(comedy|stand.up)\b/.test(terms)) return 'comedy';
  if (/\b(theatre|theater|musical|opera|ballet)\b/.test(terms)) return 'theatre';
  if (/\b(yoga|fitness|pilates|wellness)\b/.test(terms)) return 'fitness';
  if (/\b(tech|startup|networking|conference)\b/.test(terms)) return 'networking';
  if (/\b(dj|club|rave|nightlife)\b/.test(terms)) return 'nightlife';
  if (/\b(family|children|kids)\b/.test(terms)) return 'family';
  return 'arts';
}
export function mapFeverEvent(raw: Obj, venues: Venue[], now = Date.now()): LocalEvent | null {
  const id = String(raw.id ?? '').trim(), title = string(raw.name), url = feverUrl(raw.url);
  const venue = matchVenue(string(raw.location), venues), timezone = string(raw.timezone);
  if (!id || !title || !url || !venue || !validGeo(venue.latitude, venue.longitude) || !timezone) return null;
  const iso = (Array.isArray(raw.session_start_times) ? raw.session_start_times : [])
    .map(v => feverSessionUtc(string(v), timezone)).filter((v): v is string => Boolean(v))
    .filter(value => Date.parse(value) >= now - 60 * 60_000).sort()[0];
  if (!iso) return null;
  const instant = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short',
  }).format(instant);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit',
  }).format(instant);
  const priceAmount = number(raw.min_price), currency = string(raw.currency);
  const price = string(raw.price) || (Number.isFinite(priceAmount) && currency
    ? priceAmount === 0 ? 'Free' : 'From ' + priceAmount + ' ' + currency : 'See tickets');
  const city = venue.city || string(raw.location).split(',').at(-1)?.trim() || 'Nearby';
  return normalizeEventCategories({
    id: 'fv-' + id, title, description: string(raw.description), venue: venue.name, location: city,
    date, time, category: categoryFor(raw), price, image: string(raw.cover_image_url),
    isSaved: false, attendees: 0, rating: 0, tags: ['fever', city.toLowerCase()],
    latitude: venue.latitude, longitude: venue.longitude, startIso: iso, ticketUrl: url,
    listingSource: 'fever', marketCode: venue.countryCode || undefined,
  });
}
function keyOf(input: FeverInput): string {
  return [Math.round(input.latitude * 100) / 100, Math.round(input.longitude * 100) / 100,
    Math.ceil(input.radiusMiles), input.keyword?.trim().toLowerCase() || ''].join('|');
}
export async function fetchFeverEvents(input: FeverInput, credentials: FeverCredentials): Promise<LocalEvent[]> {
  if (!credentials.clientId || !credentials.clientSecret || !credentials.audience) return [];
  const key = keyOf(input), existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.events;
  if (inFlight.has(key)) return inFlight.get(key)!;
  const work = (async () => {
    const client = new FeverMcpClient(credentials);
    await client.open();
    const radius = Math.max(1609, Math.min(160934, Math.round(input.radiusMiles * 1609.344)));
    const [rawEvents, rawVenues] = await Promise.all([
      client.call('search_events', {
        latitude: input.latitude, longitude: input.longitude, radius,
        query: input.keyword?.trim() || '', sort_by: 'popularity',
        page: 0, page_size: Math.min(60, Math.max(12, input.size * 2)),
        include_description: true, locale: 'en', start_datetime: new Date().toISOString(),
      }),
      client.call('search_venues', {
        latitude: input.latitude, longitude: input.longitude, radius, limit: 50, locale: 'en',
      }),
    ]);
    const venues = parseVenues(rawVenues), mapped = new Map<string, LocalEvent>();
    for (const raw of rows(rawEvents)) {
      const event = mapFeverEvent(raw, venues);
      if (event) { mapped.set(event.id, event); details.set(event.id, event); }
    }
    const events = [...mapped.values()];
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, events });
    while (cache.size > 50) cache.delete(cache.keys().next().value!);
    while (details.size > 750) details.delete(details.keys().next().value!);
    return events;
  })();
  inFlight.set(key, work);
  try { return await work; } finally { inFlight.delete(key); }
}
export function filterFeverEvents(events: LocalEvent[], input: FeverInput): LocalEvent[] {
  const q = input.keyword?.trim().toLowerCase();
  return events.filter(e => {
    if (q && ![e.title, e.description, e.venue].some(s => s.toLowerCase().includes(q))) return false;
    if (!input.includeOtherCategories && input.category && input.category !== 'all' && e.category !== input.category) return false;
    if (input.searchScope !== 'worldwide' &&
        haversineDistanceKm(input.latitude, input.longitude, e.latitude, e.longitude) > input.radiusMiles * 1.609344) return false;
    return true;
  });
}
export function findCachedFeverEvent(id: string): LocalEvent | null {
  return details.get(id) ?? null;
}
