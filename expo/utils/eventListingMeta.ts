import type { LocalEvent, OnePagerEventSource } from '@/types/events';

export type EventMarketBadge = 'UK' | 'US' | 'EU' | 'INTL';

const EU_MARKET_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'NO',
  'CH',
]);

export function inferListingSourceFromEventId(id: string): OnePagerEventSource | null {
  if (id.startsWith('tm-')) return 'ticketmaster';
  if (id.startsWith('sk-')) return 'skiddle';
  return null;
}

export function getEventListingSource(event: LocalEvent): OnePagerEventSource | null {
  if (event.listingSource) return event.listingSource;
  return inferListingSourceFromEventId(event.id);
}

export function getListingSourceLabel(source: OnePagerEventSource | null): string | null {
  if (source === 'ticketmaster') return 'Ticketmaster';
  if (source === 'skiddle') return 'Skiddle';
  return null;
}

export function marketCodeToBadge(code: string | undefined | null): EventMarketBadge | null {
  const c = code?.trim().toUpperCase();
  if (!c) return null;
  if (c === 'GB' || c === 'UK') return 'UK';
  if (c === 'US') return 'US';
  if (EU_MARKET_CODES.has(c)) return 'EU';
  return 'INTL';
}

/** User-facing market chip for worldwide search (UK vs US vs other). */
export function getEventMarketBadge(event: LocalEvent): EventMarketBadge | null {
  const listing = getEventListingSource(event);
  if (listing === 'skiddle') return 'UK';

  const fromCode = marketCodeToBadge(event.marketCode);
  if (fromCode) return fromCode;

  const loc = `${event.location} ${event.venue}`.toLowerCase();
  if (
    /\b(united kingdom|uk\b|england|scotland|wales|manchester|london|salford|birmingham|glasgow|edinburgh|leeds|liverpool|bristol|cardiff|belfast)\b/.test(
      loc,
    )
  ) {
    return 'UK';
  }
  if (
    /\b(united states|usa\b|\bu\.s\.|new york|los angeles|chicago|boston|austin|dallas|miami|las vegas|san francisco|seattle|denver|philadelphia)\b/.test(
      loc,
    )
  ) {
    return 'US';
  }
  return listing === 'ticketmaster' ? 'INTL' : null;
}

export function getEventListingBadges(event: LocalEvent): {
  sourceLabel: string | null;
  marketBadge: EventMarketBadge | null;
} {
  const listing = getEventListingSource(event);
  return {
    sourceLabel: getListingSourceLabel(listing),
    marketBadge: getEventMarketBadge(event),
  };
}
