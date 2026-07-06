import type { LocalEvent } from '@/types/events';

export const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const EVENT_END_GRACE_MS = 6 * 60 * 60 * 1000;

function applyTimeToDate(base: Date, timeLabel: string): Date {
  const timeStart = timeLabel.split('-')[0]?.trim();
  if (!timeStart) return base;
  const parts = timeStart.split(':');
  if (parts.length >= 2) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      base.setHours(hours, minutes, 0, 0);
    }
  }
  return base;
}

/** Pick the next occurrence when a display label has no year (e.g. "Sat, 12 Apr"). */
function rollForwardIfPast(candidate: Date, referenceMs = Date.now()): Date {
  if (candidate.getTime() >= referenceMs - EVENT_END_GRACE_MS) return candidate;
  const next = new Date(candidate);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

export function parseEventStartDateTime(event: LocalEvent, referenceMs = Date.now()): Date | null {
  if (event.startIso) {
    const d = new Date(event.startIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (!event.date || !event.time) return null;
  const dateStr = event.date.trim();
  if (dateStr.toLowerCase().includes('ongoing')) return null;

  const year = new Date(referenceMs).getFullYear();
  let base = new Date(`${dateStr} ${year}`);
  if (Number.isNaN(base.getTime())) return null;

  base = applyTimeToDate(base, event.time);
  return rollForwardIfPast(base, referenceMs);
}

export function getDaysUntilEvent(event: LocalEvent): number | null {
  const start = parseEventStartDateTime(event);
  if (!start) return null;
  const diffMs = start.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isEventLiveNow(event: LocalEvent, now = Date.now()): boolean {
  if (event.isLiveNow) return true;
  const start = parseEventStartDateTime(event);
  if (!start) return false;
  const startMs = start.getTime();
  const twoHoursBefore = startMs - 2 * 60 * 60 * 1000;
  const sixHoursAfter = startMs + 6 * 60 * 60 * 1000;
  return now >= twoHoursBefore && now <= sixHoursAfter;
}

export function isEventStartingSoon(event: LocalEvent, withinHours = 48): boolean {
  const start = parseEventStartDateTime(event);
  if (!start) return false;
  const diff = start.getTime() - Date.now();
  return diff >= 0 && diff <= withinHours * 60 * 60 * 1000;
}

export function attachDistanceKm(
  events: LocalEvent[],
  origin: { latitude: number; longitude: number }
): LocalEvent[] {
  return events.map((e) => ({
    ...e,
    distanceKm: haversineDistanceKm(
      origin.latitude,
      origin.longitude,
      e.latitude,
      e.longitude
    ),
  }));
}

export function sortEventsByDistance(
  events: LocalEvent[],
  origin: { latitude: number; longitude: number }
): LocalEvent[] {
  return [...attachDistanceKm(events, origin)].sort(
    (a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
  );
}

export function filterHappeningNow(events: LocalEvent[]): LocalEvent[] {
  return events.filter((e) => isEventLiveNow(e) || e.isHot || isEventStartingSoon(e, 24));
}

export function isUpcomingEvent(event: LocalEvent, referenceMs = Date.now()): boolean {
  if (event.date?.toLowerCase().includes('ongoing')) return true;
  const start = parseEventStartDateTime(event, referenceMs);
  if (!start) return true;
  return start.getTime() >= referenceMs - EVENT_END_GRACE_MS;
}

export function filterUpcomingEvents(events: LocalEvent[], referenceMs = Date.now()): LocalEvent[] {
  return events.filter((event) => isUpcomingEvent(event, referenceMs));
}

export function compareEventsByStart(a: LocalEvent, b: LocalEvent): number {
  const ta = parseEventStartDateTime(a)?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = parseEventStartDateTime(b)?.getTime() ?? Number.POSITIVE_INFINITY;
  return ta - tb;
}

export function sortEventsByStartDate(events: LocalEvent[]): LocalEvent[] {
  return [...events].sort(compareEventsByStart);
}
