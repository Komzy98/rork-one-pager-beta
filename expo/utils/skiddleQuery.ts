export interface BuildSkiddleEventsSearchInput {
  apiKey: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  limit: number;
  /** Skiddle eventcode — LIVE, CLUB, COMEDY, etc. */
  eventCode?: string;
  daysAhead?: number;
}

const SKIDDLE_SEARCH_BASE = 'https://www.skiddle.com/api/v1/events/search/';

function formatSkiddleDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildSkiddleEventsSearchUrl(input: BuildSkiddleEventsSearchInput): string {
  const {
    apiKey,
    latitude,
    longitude,
    radiusMiles,
    limit,
    eventCode,
    daysAhead = 90,
  } = input;

  const minDate = new Date();
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + daysAhead);

  const params = new URLSearchParams({
    api_key: apiKey,
    latitude: String(latitude),
    longitude: String(longitude),
    radius: String(Math.min(Math.max(Math.round(radiusMiles), 1), 100)),
    limit: String(Math.min(Math.max(limit, 1), 100)),
    minDate: formatSkiddleDate(minDate),
    maxDate: formatSkiddleDate(maxDate),
    order: 'date',
    description: '1',
    imagefilter: '1',
    ticketsavailable: '0',
    getdistance: '1',
  });

  if (eventCode) {
    params.set('eventcode', eventCode.toUpperCase());
  }

  return `${SKIDDLE_SEARCH_BASE}?${params.toString()}`;
}

export function buildSkiddleEventDetailUrl(apiKey: string, eventId: string): string {
  const params = new URLSearchParams({ api_key: apiKey });
  return `https://www.skiddle.com/api/v1/events/${encodeURIComponent(eventId)}/?${params.toString()}`;
}

export function parseSkiddleError(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as { error?: number | string; errormessage?: string; message?: string };
  if (record.errormessage) return String(record.errormessage);
  if (record.message) return String(record.message);
  if (record.error != null && Number(record.error) !== 0) {
    return `Skiddle error ${record.error}`;
  }
  return null;
}
