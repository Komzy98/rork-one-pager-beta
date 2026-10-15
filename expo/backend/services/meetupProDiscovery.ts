import type { LocalEvent } from '@/types/events';
import {
  asList, cacheProvider, filterProviderEvents, getJson, normalizeCandidate, numeric,
  record, text, type EventsFetchInput,
} from '@/backend/services/extraEventProviderCommon';

const ENDPOINT = 'https://api.meetup.com/gql-ext';
const QUERY = `query Upcoming($network: ID!) {
  proNetwork(urlname: $network) {
    eventsSearch(input: { first: 50, filter: { status: "UPCOMING" } }) {
      edges {
        node {
          id
          title
          description
          dateTime
          eventUrl
          venue { name city lat lon }
          featuredEventPhoto { id baseUrl }
        }
      }
    }
  }
}`;
const cache = new Map<string, {expires: number;value: LocalEvent[]}>();
const inFlight = new Map<string, Promise<LocalEvent[]>>();
/** Only Meetup Pro network events authorised by the token; not a global public catalogue. */
export async function fetchMeetupProEvents(input: EventsFetchInput, token: string, network: string): Promise<LocalEvent[]> {
  if (!token.trim() || !network.trim()) return [];
  const key = network.trim();
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return filterProviderEvents(saved.value, input);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = (async () => {
      const payload = record(await getJson(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { network: network.trim() } }),
      }, 10000));
      if (Array.isArray(payload.errors) && payload.errors.length) throw new Error('Meetup GraphQL rejected event query');
      const edges = asList(record(record(record(payload.data).proNetwork).eventsSearch).edges);
      const results: LocalEvent[] = [];
      for (const edge of edges) {
        const node = record(edge.node), venue = record(node.venue), photo = record(node.featuredEventPhoto);
        const photoBase = text(photo.baseUrl);
        const image = /^https:\/\/(?:secure-content\.meetupstatic\.com)\//.test(photoBase) &&
          /^[0-9]+$/.test(String(photo.id)) ? photoBase + photo.id + '/676x380.webp' : '';
        const dateTime = text(node.dateTime);
        const ev = normalizeCandidate({
          id: String(node.id || ''), title: text(node.title), venue: text(venue.name),
          city: text(venue.city), lat: numeric(venue.lat), lon: numeric(venue.lon),
          startIso: dateTime, ticketUrl: text(node.eventUrl), description: text(node.description).replace(/<[^>]*>/g,' ').slice(0,700),
          image, source: 'meetup', categoryHints: text(record(node.group).name),
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
