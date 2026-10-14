/** Eventbrite private token is only read on the server. Never use EXPO_PUBLIC_ variables. */
export function getEventbriteToken(): string {
  return process.env.EVENTBRITE_TOKEN?.trim() ?? '';
}

type EventbriteUser = { id: string; name?: string };
type EventbriteEvent = {
  id: string; name?: { text?: string }; summary?: string; url?: string;
  start?: { local?: string; utc?: string }; end?: { local?: string; utc?: string };
  status?: string; listed?: boolean; online_event?: boolean;
  logo?: { original?: { url?: string }; url?: string };
  venue?: { name?: string; latitude?: string; longitude?: string; address?: { city?: string; localized_address_display?: string } };
};
type OwnedResponse = { events?: EventbriteEvent[]; pagination?: { has_more_items?: boolean; continuation?: string } };

export async function eventbriteGet<T>(path: string, token = getEventbriteToken(), fetcher: typeof fetch = fetch): Promise<T> {
  if (!token) throw new Error('EVENTBRITE_NOT_CONFIGURED');
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('INVALID_EVENTBRITE_PATH');
  const response = await fetcher('https://www.eventbriteapi.com/v3' + path, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('EVENTBRITE_HTTP_' + response.status);
  return response.json() as Promise<T>;
}

export async function verifyEventbriteAuthentication(token = getEventbriteToken(), fetcher: typeof fetch = fetch): Promise<{ id: string; connected: true }> {
  const user = await eventbriteGet<EventbriteUser>('/users/me/', token, fetcher);
  if (!user.id) throw new Error('EVENTBRITE_INVALID_USER_RESPONSE');
  return { id: String(user.id), connected: true };
}

type OrganisationResponse = { organizations?: { id: string }[] };

/** Retrieve public live listings only from organisations accessible to this token. */
export async function fetchOwnPublicEventbriteEvents(token = getEventbriteToken(), fetcher: typeof fetch = fetch): Promise<EventbriteEvent[]> {
  const organisations = await eventbriteGet<OrganisationResponse>('/users/me/organizations/', token, fetcher);
  const results: EventbriteEvent[] = [];
  for (const organisation of (organisations.organizations ?? []).slice(0, 10)) {
    if (!/^[0-9]+$/.test(organisation.id)) continue;
    let continuation: string | undefined;
    for (let page = 0; page < 3; page += 1) {
      const query = '?status=live&expand=venue' + (continuation ? '&continuation=' + encodeURIComponent(continuation) : '');
      const data = await eventbriteGet<OwnedResponse>('/organizations/' + organisation.id + '/events/' + query, token, fetcher);
      results.push(...(data.events ?? []).filter(e => e.listed === true && e.status === 'live' && !!e.url));
      continuation = data.pagination?.continuation;
      if (!data.pagination?.has_more_items || !continuation) break;
    }
  }
  return results;
}

type EventbriteOrder = {
  id: string; status?: string; event_id?: string; event?: EventbriteEvent;
};
type OrderResponse = { orders?: EventbriteOrder[]; pagination?: { has_more_items?: boolean; continuation?: string; page_number?: number } };
type EventbriteAccount = { id: string; emails?: { email?: string; primary?: boolean; verified?: boolean }[] };
export type EventbriteBooking = {
  id: string; title: string; startAt: string; endAt?: string; venueName: string;
  city: string; address?: string; latitude: number; longitude: number;
  imageUrl?: string; ticketUrl?: string; description?: string;
};
/** Never return order attendee details or purchaser email to the mobile app. */
export function normaliseEventbriteOrders(orders: EventbriteOrder[]): EventbriteBooking[] {
  const byEvent = new Map<string, EventbriteBooking>();
  for (const order of orders) {
    if (order.status !== 'placed') continue;
    const e = order.event;
    if (!e?.id || !e.start?.utc || !e.url) continue;
    const venue = e.venue;
    byEvent.set(e.id, {
      id: 'eb-' + e.id,
      title: e.name?.text || 'Eventbrite booking',
      startAt: e.start.utc,
      endAt: e.end?.utc,
      venueName: venue?.name || (e.online_event ? 'Online event' : 'Venue TBC'),
      city: venue?.address?.city || '',
      address: venue?.address?.localized_address_display,
      latitude: Number(venue?.latitude) || 0,
      longitude: Number(venue?.longitude) || 0,
      imageUrl: e.logo?.original?.url || e.logo?.url,
      ticketUrl: e.url,
      description: e.summary,
    });
  }
  return [...byEvent.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
}
export async function getEventbriteAccount(token = getEventbriteToken(), fetcher: typeof fetch = fetch): Promise<EventbriteAccount> {
  return eventbriteGet<EventbriteAccount>('/users/me/', token, fetcher);
}
export async function fetchEventbriteBookings(token = getEventbriteToken(), fetcher: typeof fetch = fetch): Promise<EventbriteBooking[]> {
  const orders: EventbriteOrder[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const data = await eventbriteGet<OrderResponse>(
      '/users/me/orders/?expand=event.venue&page=' + page, token, fetcher,
    );
    orders.push(...(data.orders ?? []));
    if (!data.pagination?.has_more_items) break;
  }
  return normaliseEventbriteOrders(orders);
}
