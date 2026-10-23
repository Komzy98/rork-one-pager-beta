import type { LocalEvent } from '@/types/events';
export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';
export type Coordinates = { latitude: number; longitude: number };
export type TravelLeg = { minutes: number; distanceKm: number };
export function validCoordinates(p: Coordinates | null): p is Coordinates {
  return !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180 && (p.latitude !== 0 || p.longitude !== 0);
}
/** Requires an OSRM-compatible production HTTPS service configured by the app operator. */
export async function getRealTravelLeg(from: Coordinates, to: Coordinates, mode: TravelMode, endpoint = process.env.EXPO_PUBLIC_EVENT_ROUTING_URL): Promise<TravelLeg | null> {
  // OSRM road graphs cannot calculate public-transport schedules. Never label a driving ETA as transit.
  if (mode === 'transit' || !endpoint || !endpoint.startsWith('https://') || !validCoordinates(from) || !validCoordinates(to)) return null;
  const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'driving';
  const url = endpoint.replace(/\/$/, '') + '/route/v1/' + profile + '/' + from.longitude + ',' + from.latitude + ';' + to.longitude + ',' + to.latitude + '?overview=false';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json() as { routes?: {duration?: number;distance?: number}[] };
    const route = data.routes?.[0];
    if (!route || !Number.isFinite(route.duration) || !Number.isFinite(route.distance)) return null;
    return { minutes: Math.ceil((route.duration ?? 0) / 60), distanceKm: (route.distance ?? 0) / 1000 };
  } catch { return null; } finally { clearTimeout(timeout); }
}
export function findEventDeparture(event: LocalEvent, leg: TravelLeg | null, bufferMinutes = 20): Date | null {
  if (!leg || !event.startIso) return null;
  const start = Date.parse(event.startIso);
  return Number.isFinite(start) ? new Date(start - (leg.minutes + bufferMinutes) * 60000) : null;
}
