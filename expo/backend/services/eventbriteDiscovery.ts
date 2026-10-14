import type { LocalEvent } from '@/types/events';
import { haversineDistanceKm } from '@/utils/eventDiscovery';

/** Public, live events owned by the account whose token is configured on Railway. */
type EventbriteEvent = {
  id: string; name?: { text?: string }; description?: { text?: string };
  url?: string; logo?: { url?: string }; status?: string; listed?: boolean;
  online_event?: boolean; start?: { utc?: string }; end?: { utc?: string };
  venue?: { name?: string; latitude?: string; longitude?: string; address?: { city?: string; country?: string; localized_address_display?: string } };
  category_id?: string; is_free?: boolean;
};
const cache = new Map<string, { at: number; events: LocalEvent[] }>();
async function getJson(url: string, token: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Eventbrite HTTP ${response.status}`);
    return response.json();
  } finally { clearTimeout(timeout); }
}
export async function fetchEventbriteAccountEvents(token: string): Promise<LocalEvent[]> {
  if (!token.trim()) return [];
  const cached = cache.get('published');
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.events;
  const organisations = await getJson('https://www.eventbriteapi.com/v3/users/me/organizations/', token);
  const ids: string[] = (organisations.organizations ?? []).map((o: { id?: string }) => o.id).filter(Boolean).slice(0, 10);
  const batches = await Promise.all(ids.map(async (id) => {
    const events: EventbriteEvent[] = [];
    let continuation: string | undefined;
    for (let page = 0; page < 5; page++) {
      const query = new URLSearchParams({ status: 'live', expand: 'venue', page_size: '50' });
      if (continuation) query.set('continuation', continuation);
      const payload = await getJson(`https://www.eventbriteapi.com/v3/organizations/${encodeURIComponent(id)}/events/?${query}`, token);
      events.push(...(payload.events ?? []));
      continuation = payload.pagination?.has_more_items ? payload.pagination?.continuation : undefined;
      if (!continuation) break;
    }
    return events;
  }));
  const deduped = new Map<string, LocalEvent>();
  for (const item of batches.flat()) {
    // Account events must be explicitly public, live and upcoming before being served to app users.
    if (!item.id || item.status !== 'live' || item.listed !== true || !item.start?.utc) continue;
    if (Date.parse(item.end?.utc || item.start.utc) < Date.now()) continue;
    const latitude = Number(item.venue?.latitude), longitude = Number(item.venue?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const start = new Date(item.start.utc);
    if (Number.isNaN(start.getTime())) continue;
    const city = item.venue?.address?.city || 'Nearby';
    deduped.set(item.id, {
      id: `eb-${item.id}`, title: item.name?.text || 'Event',
      description: item.description?.text || item.name?.text || '',
      venue: item.venue?.name || 'Venue TBA', location: city,
      date: start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      category: 'other', price: item.is_free ? 'Free' : 'See tickets',
      image: item.logo?.url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
      isSaved: false, attendees: 0, rating: 0, tags: ['eventbrite', city.toLowerCase()],
      latitude, longitude, startIso: item.start.utc, ticketUrl: item.url,
      listingSource: 'eventbrite', marketCode: item.venue?.address?.country,
    });
  }
  const result = [...deduped.values()];
  cache.set('published', { at: Date.now(), events: result });
  return result;
}
export function filterEventbriteDiscovery(events: LocalEvent[], input: { latitude: number; longitude: number; radiusMiles: number; category?: string; keyword?: string; searchScope?: string }): LocalEvent[] {
  return events.filter(event => {
    if (input.keyword && ![event.title, event.description, event.venue].some(v => v.toLowerCase().includes(input.keyword!.toLowerCase()))) return false;
    if (input.category && input.category !== 'all' && event.category !== input.category) return false;
    if (input.searchScope !== 'worldwide' && haversineDistanceKm(input.latitude, input.longitude, event.latitude, event.longitude) > input.radiusMiles * 1.609344) return false;
    return true;
  });
}
