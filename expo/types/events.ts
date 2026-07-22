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
  /** Merged sub-tag when category is rolled into a bento parent (fitness → sports, etc.). */
  subCategory?: 'fitness' | 'tech' | 'family';
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
  /** Set when the user confirms they went (post-event feedback). */
  attendedAt?: string;
  /** 1–5 post-event rating; 4+ can reinforce joy sources. */
  feedbackRating?: number;
  /** ISO timestamp when the user skipped the feedback prompt. */
  feedbackDismissedAt?: string;
  subCategory?: 'fitness' | 'tech' | 'family';
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
  /** Merged sub-tag when category is rolled into a bento parent (fitness → sports, etc.). */
  subCategory?: 'fitness' | 'tech' | 'family';
  /** Per-listing provider (from id prefix or normalisation). */
  listingSource?: OnePagerEventSource;
  /** ISO 3166-1 alpha-2 — Ticketmaster venue country; Skiddle listings are GB. */
  marketCode?: string;
}

export type NearbyEventsSource = 'ticketmaster' | 'skiddle' | 'mixed' | 'fallback' | 'none';

export interface NearbyEventsResult {
  events: LocalEvent[];
  source: NearbyEventsSource;
  areaLabel?: string;
}

export interface NearbyCategoryBucket {
  events: LocalEvent[];
  count: number;
}

export interface NearbyEventsBatchResult {
  categories: Record<string, NearbyCategoryBucket>;
  categoryCounts: Record<string, number>;
  allEvents: LocalEvent[];
  source: NearbyEventsSource;
}
