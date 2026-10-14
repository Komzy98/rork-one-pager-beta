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
