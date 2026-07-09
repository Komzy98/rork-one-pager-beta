import type { EventCategory, LocalEvent } from '@/types/events';
import { isEventLiveNow, isEventStartingSoon } from '@/utils/eventDiscovery';
import { normalizeEventCategories } from '@/utils/eventCategories';

type TmClassification = {
  segment?: { name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
};

type TmEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  images?: { url: string; width?: number; ratio?: string }[];
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
    };
    status?: { code?: string };
  };
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  classifications?: TmClassification[];
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      country?: { countryCode?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600';

function mapCategory(classifications?: TmClassification[]): EventCategory | string {
  const names = (classifications ?? [])
    .flatMap((c) => [c.segment?.name, c.genre?.name, c.subGenre?.name])
    .filter(Boolean)
    .map((n) => String(n).toLowerCase());

  if (names.some((n) => n.includes('sport'))) return 'sports';
  if (names.some((n) => n.includes('comedy'))) return 'comedy';
  if (names.some((n) => n.includes('theatre') || n.includes('theater'))) return 'theatre';
  if (names.some((n) => n.includes('food') || n.includes('culinary'))) return 'food';
  if (names.some((n) => n.includes('family') || n.includes('kids') || n.includes('children'))) {
    return 'family';
  }
  if (names.some((n) => n.includes('health') || n.includes('wellness') || n.includes('fitness'))) {
    return 'fitness';
  }
  if (names.some((n) => n.includes('dance') || n.includes('club') || n.includes('electronic'))) {
    return 'nightlife';
  }
  if (
    names.some(
      (n) =>
        n.includes('tech') ||
        n.includes('conference') ||
        n.includes('network') ||
        n.includes('meetup'),
    )
  ) {
    return 'tech';
  }
  if (names.some((n) => n.includes('art') || n.includes('museum'))) return 'arts';
  if (names.some((n) => n.includes('music'))) return 'music';
  return 'music';
}

function formatPrice(ranges?: TmEvent['priceRanges']): string {
  const first = ranges?.[0];
  if (!first || first.min == null) return 'See tickets';
  if (first.min <= 0) return 'Free';
  const currency = first.currency === 'GBP' ? '£' : first.currency === 'EUR' ? '€' : '$';
  return `${currency}${Math.round(first.min)}+`;
}

function formatDateLabel(localDate?: string): string {
  if (!localDate) return 'Date TBA';
  const [year, month, day] = localDate.split('-').map(Number);
  if (!year || !month || !day) return localDate;
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return localDate;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeLabel(localTime?: string): string {
  if (!localTime) return 'Time TBA';
  const [h, m] = localTime.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours)) return localTime;
  const d = new Date();
  d.setHours(hours, minutes || 0, 0, 0);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function pickImage(images?: TmEvent['images']): string {
  if (!images?.length) return FALLBACK_IMAGE;
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.url || FALLBACK_IMAGE;
}

function buildTags(classifications?: TmClassification[], city?: string): string[] {
  const tags = new Set<string>();
  if (city) tags.add(city.toLowerCase());
  for (const c of classifications ?? []) {
    if (c.genre?.name) tags.add(c.genre.name.toLowerCase());
    if (c.segment?.name) tags.add(c.segment.name.toLowerCase());
  }
  tags.add('live');
  return [...tags].slice(0, 6);
}

export function mapTicketmasterEvent(raw: TmEvent): LocalEvent | null {
  const venue = raw._embedded?.venues?.[0];
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const localDate = raw.dates?.start?.localDate;
  const localTime = raw.dates?.start?.localTime;
  // Prefer venue-local date/time — Ticketmaster UTC dateTime is often midnight UTC
  // (e.g. Sea Life 10:00 local → 00:00Z → 1am BST if parsed as local instant).
  const startIso = localDate
    ? `${localDate}T${localTime || '19:00:00'}`
    : raw.dates?.start?.dateTime;

  const category = mapCategory(raw.classifications);
  const city = venue?.city?.name || 'Nearby';
  const event: LocalEvent = {
    id: `tm-${raw.id}`,
    title: raw.name,
    venue: venue?.name || 'Venue TBA',
    location: city,
    date: formatDateLabel(localDate),
    time: formatTimeLabel(localTime),
    category,
    price: formatPrice(raw.priceRanges),
    image: pickImage(raw.images),
    isSaved: false,
    attendees: 0,
    rating: 4.5,
    tags: buildTags(raw.classifications, city),
    description:
      raw.info?.trim() ||
      raw.pleaseNote?.trim() ||
      `${raw.name} at ${venue?.name || city}.`,
    isFeatured: false,
    isHot: false,
    isLiveNow: false,
    latitude: lat,
    longitude: lng,
    startIso,
    ticketUrl: raw.url,
  };

  event.isLiveNow = isEventLiveNow(event);
  event.isHot = isEventStartingSoon(event, 72);
  return normalizeEventCategories(event);
}

export function mapTicketmasterResponse(payload: unknown): LocalEvent[] {
  const root = payload as { _embedded?: { events?: TmEvent[] } };
  const rawEvents = root._embedded?.events ?? [];
  return rawEvents
    .map(mapTicketmasterEvent)
    .filter((e): e is LocalEvent => e != null);
}

export function mapTicketmasterSingleResponse(payload: unknown): LocalEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as TmEvent;
  if (!root.id || !root.name) return null;
  return mapTicketmasterEvent(root);
}

export const TICKETMASTER_CATEGORY_FILTER: Record<string, string | undefined> = {
  music: 'Music',
  sports: 'Sports',
  comedy: 'Comedy',
  theatre: 'Arts & Theatre',
  arts: 'Arts & Theatre',
  food: 'Food & Drink',
  tech: 'Miscellaneous',
  nightlife: 'Music',
};
