import type {
  LocalEvent,
  OnePagerEvent,
  OnePagerEventSource,
  SavedEventSnapshot,
} from '@/types/events';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';

function inferSource(id: string): OnePagerEventSource {
  if (id.startsWith('tm-')) return 'ticketmaster';
  if (id.startsWith('sk-')) return 'skiddle';
  if (id.startsWith('sample-')) return 'mock';
  return 'manual';
}

function parsePriceFromLabel(price?: string): number | undefined {
  if (!price || price === 'Free' || price === 'See tickets') return undefined;
  const match = price.match(/[\d.]+/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

export function localEventToOnePager(event: LocalEvent, source?: OnePagerEventSource): OnePagerEvent {
  const resolvedSource = source ?? inferSource(event.id);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.image,
    category: event.category,
    startAt: event.startIso ?? new Date().toISOString(),
    venueName: event.venue,
    city: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    priceLabel: event.price,
    priceFrom: parsePriceFromLabel(event.price),
    distanceKm: event.distanceKm,
    ticketUrl: event.ticketUrl,
    source: resolvedSource,
    isSaved: event.isSaved,
    dateLabel: event.date,
    timeLabel: event.time,
    tags: event.tags,
    isFeatured: event.isFeatured,
    isHot: event.isHot,
    isLiveNow: event.isLiveNow,
    rating: event.rating,
    attendees: event.attendees,
    subCategory: event.subCategory,
  };
}

export function onePagerToLocalEvent(event: OnePagerEvent): LocalEvent {
  return {
    id: event.id,
    title: event.title,
    venue: event.venueName,
    location: event.city ?? '',
    date: event.dateLabel ?? '',
    time: event.timeLabel ?? '',
    category: event.category,
    price: event.priceLabel ?? 'See tickets',
    image: event.imageUrl ?? '',
    isSaved: event.isSaved ?? false,
    attendees: event.attendees ?? 0,
    rating: event.rating ?? 4.5,
    tags: event.tags ?? [],
    description: event.description ?? '',
    isFeatured: event.isFeatured,
    isHot: event.isHot,
    isLiveNow: event.isLiveNow,
    latitude: event.latitude ?? 0,
    longitude: event.longitude ?? 0,
    startIso: event.startAt,
    ticketUrl: event.ticketUrl,
    distanceKm: event.distanceKm,
    subCategory: event.subCategory,
    listingSource: inferSource(event.id),
  };
}

export function localEventToSavedSnapshot(event: LocalEvent): SavedEventSnapshot {
  const resolvedStart = parseEventStartDateTime(event);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.image,
    category: event.category,
    startAt: resolvedStart ? resolvedStart.toISOString() : event.startIso ?? new Date().toISOString(),
    venueName: event.venue,
    city: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    priceLabel: event.price,
    ticketUrl: event.ticketUrl,
    source: inferSource(event.id),
    savedAt: new Date().toISOString(),
    dateLabel: event.date,
    timeLabel: event.time,
    tags: event.tags,
    subCategory: event.subCategory,
  };
}

export function savedSnapshotToOnePager(snapshot: SavedEventSnapshot): OnePagerEvent {
  return {
    id: snapshot.id,
    title: snapshot.title,
    description: snapshot.description,
    imageUrl: snapshot.imageUrl,
    category: snapshot.category,
    startAt: snapshot.startAt,
    endAt: snapshot.endAt,
    venueName: snapshot.venueName || 'Event',
    address: snapshot.address,
    city: snapshot.city,
    latitude: snapshot.latitude ?? 0,
    longitude: snapshot.longitude ?? 0,
    priceLabel: snapshot.priceLabel,
    priceFrom: parsePriceFromLabel(snapshot.priceLabel),
    ticketUrl: snapshot.ticketUrl,
    source: snapshot.source,
    isSaved: true,
    dateLabel: snapshot.dateLabel,
    timeLabel: snapshot.timeLabel,
    tags: snapshot.tags,
    subCategory: snapshot.subCategory,
  };
}

export function savedSnapshotToLocalEvent(snapshot: SavedEventSnapshot): LocalEvent {
  return onePagerToLocalEvent(savedSnapshotToOnePager(snapshot));
}
