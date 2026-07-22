import type { WatchProvider } from '@/utils/tmdbApi';

const MS_PER_DAY = 86_400_000;

/** UK/US typical window before PVOD — digital JustWatch rows often point at same-title catalog mistakes. */
export const DEFAULT_MIN_DAYS_BEFORE_DIGITAL_WATCH = 84;

export type WatchProviderBuckets = {
  streaming: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  link?: string;
};

export type ReleaseAwareWatchProviders = WatchProviderBuckets & {
  suppressDigitalReason?: 'recent_or_upcoming_release' | null;
};

function parseReleaseDate(releaseDateYmd: string): Date | null {
  const raw = releaseDateYmd.trim();
  if (!raw) return null;
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the title is still in (or before) its cinema window — hide rent/buy/stream tiles. */
export function isInTheatricalWindow(
  releaseDateYmd: string | null | undefined,
  now: Date = new Date(),
  minDaysBeforeDigital = DEFAULT_MIN_DAYS_BEFORE_DIGITAL_WATCH,
): boolean {
  if (!releaseDateYmd?.trim()) return false;
  const release = parseReleaseDate(releaseDateYmd);
  if (!release) return false;
  const daysSinceRelease = (now.getTime() - release.getTime()) / MS_PER_DAY;
  return daysSinceRelease < minDaysBeforeDigital;
}

/**
 * Strip streaming / rent / buy when a movie is new in cinemas.
 * TMDB+JustWatch frequently surfaces older same-title listings (e.g. Prime “Obsession” 2016).
 */
export function applyReleaseAwareWatchProviders(
  providers: WatchProviderBuckets,
  releaseDateYmd: string | null | undefined,
  options?: { now?: Date; minDaysBeforeDigital?: number },
): ReleaseAwareWatchProviders {
  const minDays = options?.minDaysBeforeDigital ?? DEFAULT_MIN_DAYS_BEFORE_DIGITAL_WATCH;
  if (!isInTheatricalWindow(releaseDateYmd, options?.now, minDays)) {
    return { ...providers, suppressDigitalReason: null };
  }
  return {
    streaming: [],
    rent: [],
    buy: [],
    link: undefined,
    suppressDigitalReason: 'recent_or_upcoming_release',
  };
}
