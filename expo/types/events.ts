export type EventCategory =
  | 'music'
  | 'sports'
  | 'comedy'
  | 'theatre'
  | 'food'
  | 'arts'
  | 'tech'
  | 'nightlife'
  | 'fitness'
  | 'networking'
  | 'family'
  | 'other';

export type OnePagerEventSource = 'mock' | 'ticketmaster' | 'skiddle' | 'manual';

/** Normalised event shape used across discovery, detail, and AI. */
export interface OnePagerEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: EventCategory | string;
  startAt: string;
  endAt?: string;
  venueName: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  priceFrom?: number;
  priceLabel?: string;
  distanceKm?: number;
  ticketUrl?: string;
  source: OnePagerEventSource;
  isSaved?: boolean;
  /** Display labels from provider */
  dateLabel?: string;
  timeLabel?: string;
  tags?: string[];
  isFeatured?: boolean;
  isHot?: boolean;
  isLiveNow?: boolean;
  rating?: number;
  attendees?: number;
}

/** Persisted snapshot when user adds an event to their One Pager. */
export interface SavedEventSnapshot {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: EventCategory | string;
  startAt: string;
  endAt?: string;
  venueName: string;
  address?: string;
  city?: string;
  latitude: number;
  longitude: number;
  priceLabel?: string;
  ticketUrl?: string;
  source: OnePagerEventSource;
  savedAt: string;
  dateLabel?: string;
  timeLabel?: string;
  tags?: string[];
}

/** @deprecated Use OnePagerEvent — kept for backward compatibility in hooks. */
export interface LocalEvent {
  id: string;
  title: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  category: EventCategory | string;
  price: string;
  image: string;
  isSaved: boolean;
  attendees: number;
  rating: number;
  tags: string[];
  description: string;
  isFeatured?: boolean;
  isHot?: boolean;
  isLiveNow?: boolean;
  latitude: number;
  longitude: number;
  startIso?: string;
  ticketUrl?: string;
  distanceKm?: number;
}

export type NearbyEventsSource = 'ticketmaster' | 'skiddle' | 'mixed' | 'fallback' | 'none';

export interface NearbyEventsResult {
  events: LocalEvent[];
  source: NearbyEventsSource;
  areaLabel?: string;
}
