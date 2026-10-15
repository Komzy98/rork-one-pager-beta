import type { LocalEvent } from '@/types/events';
import {
  asList, cacheProvider, extractUkPostcode, filterProviderEvents, geocodeUkPostcodes, getJson,
  normalizeCandidate, numeric, record, safeHttpUrl, text, type EventsFetchInput,
} from '@/backend/services/extraEventProviderCommon';

const BASE = 'https://api.datathistle.com/v1/events';
const cache = new Map<string, {expires: number;value: LocalEvent[]}>();
const inFlight = new Map<string, Promise<LocalEvent[]>>();
export async function fetchDataThistleEvents(input: EventsFetchInput, token: string): Promise<LocalEvent[]> {
  if (!token.trim()) return [];
  const key = [input.latitude.toFixed(2), input.longitude.toFixed(2), input.radiusMiles, input.keyword || ''].join('|');
  const stored = cache.get(key);
  if (stored && stored.expires > Date.now()) return filterProviderEvents(stored.value, input);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = (async () => {
      const rows: Record<string, unknown>[] = [];
      for (let page = 1; page <= 2; page++) {
        const uri = new URL(BASE);
        uri.searchParams.set('lat', String(input.latitude));
        uri.searchParams.set('lon', String(input.longitude));
        uri.searchParams.set('distance', String(input.radiusMiles));
        uri.searchParams.set('min_date', new Date().toISOString());
        uri.searchParams.set('max_date', new Date(Date.now() + 90 * 86400000).toISOString());
        uri.searchParams.set('limit', '20');
        uri.searchParams.set('page', String(page));
        uri.searchParams.set('status', 'live');
        if (input.keyword?.trim()) uri.searchParams.set('name', input.keyword.trim());
        const data = await getJson(uri.toString(), { headers: { Authorization: 'Bearer ' + token.trim(), Accept: 'application/json' } }, 10000);
        const batch = asList(data);
        rows.push(...batch);
        if (batch.length < 20) break;
      }
      const schedules = rows.flatMap(r => asList(r.schedules).map(s => ({ raw: r, schedule: s })));
      const codes = schedules.map(v => text(record(v.schedule.place).postal_code)).filter(Boolean);
      const geo = await geocodeUkPostcodes(codes);
      const results: LocalEvent[] = [];
      for (const { raw, schedule } of schedules) {
        const place = record(schedule.place);
        const postal = extractUkPostcode(text(place.postal_code)), location = postal && geo.get(postal);
        if (!location || text(raw.status) === 'deleted') continue;
        const performances = asList(schedule.performances);
        const upcoming = performances.filter(p => Number.isFinite(Date.parse(text(p.ts))))
          .filter(p => Date.parse(text(p.ts)) >= Date.now() - 3600000)
          .sort((a,b) => Date.parse(text(a.ts)) - Date.parse(text(b.ts)));
        const first = upcoming[0];
        if (!first) continue;
        const booking = asList(first.links).find(l => text(l.type) === 'booking');
        const externalUrl = safeHttpUrl(booking?.url) || safeHttpUrl(raw.website);
        const image = safeHttpUrl(asList(raw.images)[0]?.url);
        const description = text(asList(raw.description)[0]?.description);
        const name = text(raw.name);
        const ev = normalizeCandidate({
          id: text(raw.event_id) + '-' + text(schedule.place_id).slice(0, 8),
          title: name, venue: text(place.name), city: text(place.town) || location.city,
          startIso: text(first.ts).replace(' ', 'T'), ticketUrl: externalUrl,
          image, description, lat: location.lat, lon: location.lon,
          source: 'datathistle', categoryHints: Array.isArray(raw.tags) ? raw.tags.join(' ') : '',
          price: Number.isFinite(numeric(asList(first.tickets)[0]?.min_price))
            ? 'From £' + numeric(asList(first.tickets)[0]?.min_price).toFixed(0) : 'See tickets',
        });
        if (ev) results.push(ev);
      }
      cacheProvider(cache, key, results);
      return results;
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return filterProviderEvents(await pending, input);
}
