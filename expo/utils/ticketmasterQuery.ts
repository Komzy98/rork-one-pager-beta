/** Helpers for Ticketmaster Discovery API v2 event search. */

export type TicketmasterCountryCode = 'GB' | 'IE' | 'US' | 'CA' | 'AU' | 'NZ' | 'MX';

/** Markets queried for worldwide keyword search (no geo radius). */
export const TICKETMASTER_KEYWORD_MARKETS: TicketmasterCountryCode[] = [
  'US',
  'GB',
  'CA',
  'IE',
  'AU',
  'NZ',
  'MX',
];

export type BuildTicketmasterEventsQueryInput = {
  apiKey: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  size: number;
  classificationName?: string;
  /** Days ahead to search (default 90). */
  daysAhead?: number;
  /** Artist, venue, or event title (Discovery API `keyword`). */
  keyword?: string;
  /** Keyword search across an entire TM market (omit lat/long + radius). */
  keywordMarketwide?: boolean;
  /** TM market when `keywordMarketwide` is true. */
  marketCountryCode?: TicketmasterCountryCode;
};

export function formatTicketmasterDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Rough bbox → ISO country for Discovery `countryCode` + `locale`. */
export function inferTicketmasterCountryCode(
  latitude: number,
  longitude: number,
): TicketmasterCountryCode {
  if (latitude >= 49 && latitude <= 61 && longitude >= -8.5 && longitude <= 2.5) return 'GB';
  if (latitude >= 51 && latitude <= 55.5 && longitude >= -11 && longitude <= -5.5) return 'IE';
  if (latitude >= 24 && latitude <= 50 && longitude >= -125 && longitude <= -66) return 'US';
  if (latitude >= 41 && latitude <= 84 && longitude >= -141 && longitude <= -52) return 'CA';
  if (latitude >= -44 && latitude <= -10 && longitude >= 112 && longitude <= 154) return 'AU';
  if (latitude >= -47.5 && latitude <= -34 && longitude >= 166 && longitude <= 179) return 'NZ';
  if (latitude >= 14 && latitude <= 33 && longitude >= -118 && longitude <= -86) return 'MX';
  return 'GB';
}

export function ticketmasterLocaleForCountry(country: TicketmasterCountryCode): string {
  switch (country) {
    case 'GB':
      return 'en-gb';
    case 'IE':
      return 'en-ie';
    case 'US':
      return 'en-us';
    case 'CA':
      return 'en-ca';
    case 'AU':
      return 'en-au';
    case 'NZ':
      return 'en-nz';
    case 'MX':
      return 'es-mx';
    default:
      return 'en-gb';
  }
}

export function buildTicketmasterEventsSearchUrl(input: BuildTicketmasterEventsQueryInput): string {
  const {
    apiKey,
    latitude,
    longitude,
    radiusMiles,
    size,
    classificationName,
    daysAhead = 90,
    keyword,
    keywordMarketwide = false,
    marketCountryCode,
  } = input;

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + daysAhead);

  const countryCode =
    marketCountryCode ?? inferTicketmasterCountryCode(latitude, longitude);
  const locale = ticketmasterLocaleForCountry(countryCode);

  const trimmedKeyword = keyword?.trim();
  const marketwideKeyword = Boolean(trimmedKeyword && keywordMarketwide);

  const params = new URLSearchParams({
    apikey: apiKey,
    size: String(Math.min(Math.max(size, 1), 50)),
    sort: 'date,asc',
    startDateTime: formatTicketmasterDateTime(now),
    endDateTime: formatTicketmasterDateTime(end),
    countryCode,
    locale,
    includeTBA: 'no',
    includeTBD: 'no',
  });

  if (!marketwideKeyword) {
    params.set('latlong', `${latitude},${longitude}`);
    params.set('radius', String(Math.min(Math.max(radiusMiles, 1), 100)));
    params.set('unit', 'miles');
  }

  if (classificationName) {
    params.set('classificationName', classificationName);
  }

  if (trimmedKeyword) {
    params.set('keyword', trimmedKeyword);
  }

  return `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
}

export function buildTicketmasterEventDetailUrl(apiKey: string, eventId: string): string {
  const params = new URLSearchParams({ apikey: apiKey });
  return `https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(eventId)}.json?${params.toString()}`;
}

export function parseTicketmasterFault(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const fault = (body as { fault?: { faultstring?: string; detail?: { errorcode?: string } } }).fault;
  if (!fault) return null;
  const code = fault.detail?.errorcode;
  const msg = fault.faultstring ?? 'Ticketmaster API error';
  return code ? `${msg} (${code})` : msg;
}
