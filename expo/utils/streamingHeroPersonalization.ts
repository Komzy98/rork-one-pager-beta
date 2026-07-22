import type { ForYouPersonalizationContext } from '@/utils/showsForYouPersonalization';

type YounifyRow = Record<string, unknown>;

function extractTmdbIdFromRow(row: YounifyRow): number | null {
  const tryNum = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };
  for (const key of ['tmdbId', 'tmdbID', 'tmdb_id', 'theMovieDbId']) {
    const id = tryNum(row[key]);
    if (id != null) return id;
  }
  return null;
}

function platformName(row: YounifyRow): string {
  const svc = row.younifySourceService as { name?: string; id?: string } | undefined;
  const name = svc?.name?.trim();
  if (name) return name;
  const id = svc?.id?.trim();
  return id || 'your service';
}

const SECTION_HEADLINE: Record<string, (platform: string) => string> = {
  recommended: (p) => `Recommended on ${p}`,
  trending: (p) => `Trending on ${p}`,
  acclaimed: (p) => `Acclaimed on ${p}`,
  watchlist: (p) => `On your watchlist · ${p}`,
};

/** User-visible “Why this?” copy for streaming hero slides. */
export function buildStreamingHeroWhyLabel(
  sectionId: string,
  row: YounifyRow,
  personalization: ForYouPersonalizationContext | null,
): string {
  const platform = platformName(row);
  const headlineFn = SECTION_HEADLINE[sectionId];
  let headline = headlineFn ? headlineFn(platform) : `Popular on ${platform}`;

  const tmdbId = extractTmdbIdFromRow(row);
  if (personalization && tmdbId != null) {
    if (personalization.savedTmdbIds.has(tmdbId)) {
      headline = `${headline} · Matches your list`;
    } else if (personalization.younifyLinkedTmdbIds.has(tmdbId)) {
      headline = `${headline} · In your linked catalog`;
    } else if (personalization.continueWatchingTmdbIds.has(tmdbId)) {
      headline = `${headline} · Continue watching`;
    }
  }

  return headline;
}

export const STREAMING_HERO_WHY_FIELD = 'streamingWhyLabel';

export function readStreamingHeroWhyLabel(row: YounifyRow): string | null {
  const v = row[STREAMING_HERO_WHY_FIELD];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
