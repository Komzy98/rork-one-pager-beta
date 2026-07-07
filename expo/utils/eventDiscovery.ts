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

const KM_TO_MI = 0.621371;

export function kmToMiles(km: number): number {
  return km * KM_TO_MI;
}

/** Formats a distance stored in km for display (miles). */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '';
  const mi = kmToMiles(km);
  if (mi < 0.1) return 'Nearby';
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
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

export function getEventCountdownLabel(event: LocalEvent): string {
  const days = getDaysUntilEvent(event);
  if (days === null) return 'Soon';
  if (days < 0) return 'Past';
  if (days === 0) return 'Tonight';
  if (days === 1) return 'Tomorrow';
  if (days === 2) return '2 days';
  return `${days} days`;
}

export function getEventCountdownShort(event: LocalEvent): string {
  const days = getDaysUntilEvent(event);
  if (days === null) return 'Soon';
  if (days < 0) return 'Past';
  if (days === 0) return 'Tonight';
  if (days === 1) return 'Tomorrow';
  return `${days} days to go`;
}

function shortenTeamName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.trim();
  return parts[parts.length - 1] ?? name.trim();
}

/** Short hero headline — full title stays on the detail screen. */
export function shortenEventTitleForHero(title: string): string {
  const trimmed = title.trim();
  const vsMatch = trimmed.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) {
    const home = shortenTeamName(vsMatch[1] ?? trimmed);
    const away = shortenTeamName(vsMatch[2] ?? trimmed);
    return `${home} vs. ${away}`;
  }
  return trimmed;
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

export function filterThisWeekEvents(events: LocalEvent[]): LocalEvent[] {
  return events.filter((event) => {
    const days = getDaysUntilEvent(event);
    return days !== null && days >= 0 && days <= 7;
  });
}

export function regionsDifferSignificantly(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  thresholdKm = 2
): boolean {
  return haversineDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude) > thresholdKm;
}

export function compareEventsByStart(a: LocalEvent, b: LocalEvent): number {
  const ta = parseEventStartDateTime(a)?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = parseEventStartDateTime(b)?.getTime() ?? Number.POSITIVE_INFINITY;
  return ta - tb;
}

export function sortEventsByStartDate(events: LocalEvent[]): LocalEvent[] {
  return [...events].sort(compareEventsByStart);
}

export function getEventCalendarRange(event: LocalEvent): { start: Date; end: Date } | null {
  const start = parseEventStartDateTime(event);
  if (!start) return null;
  const end = new Date(start);
  if (event.time.includes('-')) {
    const endPart = event.time.split('-')[1]?.trim();
    if (endPart) {
      const [h, m] = endPart.split(':');
      const hours = Number(h);
      const minutes = Number(m);
      if (!Number.isNaN(hours)) {
        end.setHours(hours, minutes || 0, 0, 0);
        if (end <= start) end.setHours(start.getHours() + 2);
        return { start, end };
      }
    }
  }
  end.setHours(end.getHours() + 2);
  return { start, end };
}
