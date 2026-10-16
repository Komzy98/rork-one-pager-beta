/**
 * User-initiated directions using OpenStreetMap-based OSRM routers.
 *
 * Lightweight MVP routing, not live traffic or transit data. Calls must only
 * originate from an explicit location action in the app. Do not log locations.
 * Keep a short cache and conservative upstream call limit; for production scale
 * replace these community-hosted routes with a contracted routing provider.
 */
export type EventRouteMode = 'walking' | 'driving';
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface EventRouteEstimate {
  durationMinutes: number;
  distanceKm: number;
  mode: EventRouteMode;
  provider: 'OpenStreetMap routing';
  isLiveTraffic: false;
  calculatedAt: string;
}

export function validRoutingCoordinates(coords: Coordinates): boolean {
  return Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude) &&
    Math.abs(coords.latitude) <= 90 && Math.abs(coords.longitude) <= 180 &&
    (coords.latitude !== 0 || coords.longitude !== 0);
}

/** Round to ~100m to avoid treating a user's precise location as a cache key. */
function coarseKey(coords: Coordinates): string {
  return [coords.latitude.toFixed(3), coords.longitude.toFixed(3)].join(',');
}

export function buildOsrmRouteUrl(
  origin: Coordinates,
  destination: Coordinates,
  mode: EventRouteMode,
): string {
  if (!validRoutingCoordinates(origin) || !validRoutingCoordinates(destination)) {
    throw new Error('A valid starting point and venue are required.');
  }
  const base = mode === 'walking'
    ? 'https://routing.openstreetmap.de/routed-foot'
    : 'https://routing.openstreetmap.de/routed-car';
  return `${base}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false&steps=false`;
}

export function parseOsrmRoute(
  payload: unknown,
  mode: EventRouteMode,
  calculatedAt = new Date().toISOString(),
): EventRouteEstimate | null {
  const body = payload as {
    code?: string;
    routes?: { duration?: number; distance?: number }[];
  } | null;
  if (!body || body.code !== 'Ok') return null;
  const route = body.routes?.[0];
  if (!route || !Number.isFinite(route.duration) || !Number.isFinite(route.distance) ||
      !route.duration || route.duration <= 0 || route.distance == null || route.distance < 0) return null;
  return {
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    distanceKm: Math.round(route.distance / 100) / 10,
    mode,
    provider: 'OpenStreetMap routing',
    isLiveTraffic: false,
    calculatedAt,
  };
}

const resultCache = new Map<string, { data: EventRouteEstimate; time: number }>();
const CACHE_MS = 10 * 60 * 1000;
const perClientRequests = new Map<string, { count: number; since: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_QUERIES_PER_WINDOW = 12;
// Conserve the community routing server; open Maps if this MVP hits capacity.
const MAX_GLOBAL_UPSTREAM_QUERIES = 120;
let globalWindow = { since: Date.now(), count: 0 };

export async function estimateEventRoute(
  origin: Coordinates,
  destination: Coordinates,
  mode: EventRouteMode,
  clientKey: string,
): Promise<EventRouteEstimate> {
  if (!validRoutingCoordinates(origin) || !validRoutingCoordinates(destination)) {
    throw new Error('Choose a valid location and a real venue.');
  }
  // Only local/regional trips. This is not suitable for intercity or overseas routing.
  const dLat = (origin.latitude - destination.latitude) * 111;
  const dLng = (origin.longitude - destination.longitude) * 111 * Math.cos(origin.latitude * Math.PI / 180);
  if (Math.hypot(dLat, dLng) > 100) {
    throw new Error('This journey is too far for in-app estimates. Open Maps for long-distance routes.');
  }

  const key = [coarseKey(origin), coarseKey(destination), mode].join('|');
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.data;

  const now = Date.now();
  const current = perClientRequests.get(clientKey);
  const entry = current && now - current.since < WINDOW_MS
    ? current : { count: 0, since: now };
  if (entry.count >= MAX_QUERIES_PER_WINDOW) {
    throw new Error('Route estimates are temporarily limited. Open Maps to continue.');
  }
  if (now - globalWindow.since >= WINDOW_MS) {
    globalWindow = { since: now, count: 0 };
  }
  if (globalWindow.count >= MAX_GLOBAL_UPSTREAM_QUERIES) {
    throw new Error('In-app routing is busy. Open Maps for reliable directions.');
  }
  globalWindow.count++;
  entry.count++;
  perClientRequests.set(clientKey, entry);
  if (perClientRequests.size > 750) {
    for (const [k, v] of perClientRequests) {
      if (now - v.since >= WINDOW_MS) perClientRequests.delete(k);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(buildOsrmRouteUrl(origin, destination, mode), {
      headers: { Accept: 'application/json', 'User-Agent': 'OnePager/1.0 event-route (lightweight routed estimate)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Route service unavailable. Open Maps instead.');
    const estimate = parseOsrmRoute(await response.json(), mode);
    if (!estimate) throw new Error('No suitable road or walking route was found.');
    resultCache.set(key, { data: estimate, time: now });
    if (resultCache.size > 300) resultCache.delete(resultCache.keys().next().value!);
    return estimate;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Route lookup took too long. Open Maps instead.');
    }
    if (e instanceof Error && /Route service|No suitable/.test(e.message)) throw e;
    throw new Error('Could not calculate this route. Open Maps instead.');
  } finally {
    clearTimeout(timeout);
  }
}
