import type { EventCategory, LocalEvent } from '@/types/events';
import { isEventLiveNow, isEventStartingSoon } from '@/utils/eventDiscovery';

type SkiddleVenue = {
  name?: string;
  town?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
};

export type SkiddleEvent = {
  id: string;
  eventname: string;
  EventCode?: string;
  description?: string;
  link?: string;
  date?: string;
  startdate?: string;
  enddate?: string;
  imageurl?: string;
  largeimageurl?: string;
  xlargeimageurl?: string;
  entryprice?: string;
  ticketpricing?: { minPrice?: number; maxPrice?: number };
  tickets?: boolean;
  ticketUrl?: string;
  hotSeller?: boolean;
  goingtocount?: string | number;
  venue?: SkiddleVenue;
  genres?: { name?: string }[];
  artists?: { name?: string }[];
  cancelled?: string;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600';

/** Skiddle eventcode → app category. */
export function mapSkiddleEventCode(eventCode?: string): EventCategory | string {
  switch ((eventCode ?? '').toUpperCase()) {
    case 'LIVE':
    case 'FEST':
      return 'music';
    case 'CLUB':
      return 'nightlife';
    case 'COMEDY':
      return 'comedy';
    case 'THEATRE':
      return 'theatre';
    case 'ARTS':
    case 'EXHIB':
      return 'arts';
    case 'SPORT':
      return 'sports';
    case 'KIDS':
      return 'family';
    case 'BARPUB':
      return 'food';
    case 'DATE':
      return 'other';
    default:
      return 'music';
  }
}

/** App category → Skiddle event codes (may require multiple fetches). */
export const SKIDDLE_EVENT_CODES_BY_CATEGORY: Record<string, string[] | undefined> = {
  music: ['LIVE', 'CLUB', 'FEST'],
  sports: ['SPORT'],
  comedy: ['COMEDY'],
  theatre: ['THEATRE'],
  arts: ['ARTS', 'EXHIB'],
  food: ['BARPUB'],
  nightlife: ['CLUB'],
  fitness: ['SPORT'],
  family: ['KIDS'],
};

function formatDateLabel(isoOrDate?: string): string {
  if (!isoOrDate) return 'Date TBA';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeLabel(iso?: string): string {
  if (!iso) return 'Time TBA';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Time TBA';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(raw: SkiddleEvent): string {
  const entry = raw.entryprice?.trim();
  if (entry) {
    if (/^free$/i.test(entry)) return 'Free';
    return entry;
  }
  const min = raw.ticketpricing?.minPrice;
  if (min == null || min <= 0) {
    return raw.tickets ? 'See tickets' : 'Free';
  }
  return `£${Math.round(min)}+`;
}

function pickImage(raw: SkiddleEvent): string {
  return raw.xlargeimageurl || raw.largeimageurl || raw.imageurl || FALLBACK_IMAGE;
}

function buildTags(raw: SkiddleEvent, city?: string): string[] {
  const tags = new Set<string>();
  if (city) tags.add(city.toLowerCase());
  if (raw.EventCode) tags.add(raw.EventCode.toLowerCase());
  for (const genre of raw.genres ?? []) {
    if (genre.name) tags.add(genre.name.toLowerCase());
  }
  for (const artist of raw.artists ?? []) {
    if (artist.name) tags.add(artist.name.toLowerCase());
  }
  tags.add('live');
  return [...tags].slice(0, 6);
}

export function mapSkiddleEvent(raw: SkiddleEvent): LocalEvent | null {
  if (raw.cancelled === '1') return null;

  const lat = Number(raw.venue?.latitude);
  const lng = Number(raw.venue?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const startIso = raw.startdate || (raw.date ? `${raw.date}T19:00:00` : undefined);
  const city = raw.venue?.town || raw.venue?.region || 'Nearby';
  const category = mapSkiddleEventCode(raw.EventCode);
  const goingCount = Number(raw.goingtocount ?? 0);

  const event: LocalEvent = {
    id: `sk-${raw.id}`,
    title: raw.eventname?.trim() || 'Event',
    venue: raw.venue?.name?.trim() || 'Venue TBA',
    location: city,
    date: formatDateLabel(startIso ?? raw.date),
    time: formatTimeLabel(startIso),
    category,
    price: formatPrice(raw),
    image: pickImage(raw),
    isSaved: false,
    attendees: Number.isFinite(goingCount) ? goingCount : 0,
    rating: 4.5,
    tags: buildTags(raw, city),
    description: raw.description?.trim() || `${raw.eventname} at ${raw.venue?.name || city}.`,
    isFeatured: raw.hotSeller === true,
    isHot: raw.hotSeller === true,
    isLiveNow: false,
    latitude: lat,
    longitude: lng,
    startIso,
    ticketUrl: raw.ticketUrl?.trim() || raw.link,
  };

  event.isLiveNow = isEventLiveNow(event);
  event.isHot = event.isHot || isEventStartingSoon(event, 72);
  return event;
}

export function mapSkiddleResponse(payload: unknown): LocalEvent[] {
  const root = payload as { results?: SkiddleEvent[] };
  const rawEvents = root.results ?? [];
  return rawEvents.map(mapSkiddleEvent).filter((e): e is LocalEvent => e != null);
}

export function filterSkiddleEventsByCategory(
  events: LocalEvent[],
  category?: string,
): LocalEvent[] {
  if (!category || category === 'all') return events;
  return events.filter((event) => event.category === category);
}
