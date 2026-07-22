export type ForYouMediaType = 'movie' | 'tv';

export type ForYouMediaItem = {
  id: number;
  media_type: ForYouMediaType;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  [key: string]: unknown;
};

export type ForYouCandidateSource =
  | 'region'
  | 'trending'
  | 'popular'
  | 'top-rated'
  | 'now-playing'
  | 'on-the-air'
  | 'airing-today'
  | 'upcoming';

const SOURCE_BONUS: Record<ForYouCandidateSource, number> = {
  region: 40,
  trending: 20,
  popular: 8,
  'top-rated': 6,
  'now-playing': 12,
  'on-the-air': 10,
  'airing-today': 10,
  upcoming: 8,
};

export type ForYouPersonalizationContext = {
  savedTmdbIds: ReadonlySet<number>;
  continueWatchingTmdbIds: ReadonlySet<number>;
  younifyLinkedTmdbIds: ReadonlySet<number>;
  regionalTmdbIds: ReadonlySet<number>;
  preferredGenreIds: ReadonlySet<number>;
};

export function inferPreferredGenreIds(
  candidates: readonly ForYouMediaItem[],
  savedTmdbIds: ReadonlySet<number>,
): Set<number> {
  const counts = new Map<number, number>();
  for (const item of candidates) {
    if (!savedTmdbIds.has(item.id)) continue;
    for (const genreId of item.genre_ids ?? []) {
      counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
    }
  }
  return new Set(counts.keys());
}

export function collectYounifyLinkedTmdbIds(
  younifyContent: readonly unknown[],
  continueWatchingRows: readonly unknown[],
): Set<number> {
  const ids = new Set<number>();
  const consider = (row: unknown) => {
    const id = extractTmdbId(row);
    if (id != null) ids.add(id);
  };
  for (const row of younifyContent) consider(row);
  for (const row of continueWatchingRows) consider(row);
  return ids;
}

function extractTmdbId(row: unknown): number | null {
  const r = row as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return null;
  const tryNum = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };
  for (const key of ['tmdbId', 'tmdbID', 'tmdb_id', 'theMovieDbId']) {
    const id = tryNum(r[key]);
    if (id != null) return id;
  }
  return null;
}

export function toForYouMediaItem(
  item: object,
  mediaType: ForYouMediaType,
  source: ForYouCandidateSource,
): ForYouMediaItem {
  const record = item as Record<string, unknown>;
  return {
    ...record,
    id: Number(record.id),
    media_type: mediaType,
    _forYouSource: source,
  };
}

export type ForYouHeroCandidatePools = {
  regionMovies?: readonly ForYouMediaItem[];
  regionTv?: readonly ForYouMediaItem[];
  trendingMovies?: readonly ForYouMediaItem[];
  trendingTv?: readonly ForYouMediaItem[];
};

/** Merge TMDB pools — region first when available, then global trending. */
export function buildForYouHeroCandidates(pools: ForYouHeroCandidatePools): ForYouMediaItem[] {
  const merged: ForYouMediaItem[] = [];
  const seen = new Set<number>();

  const push = (items: readonly ForYouMediaItem[] | undefined) => {
    if (!items?.length) return;
    for (const item of items) {
      if (!Number.isFinite(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  };

  push(pools.regionMovies);
  push(pools.regionTv);
  push(pools.trendingMovies);
  push(pools.trendingTv);

  return merged;
}

export function scoreForYouItem(
  item: ForYouMediaItem,
  ctx: ForYouPersonalizationContext,
): number {
  const source = item._forYouSource as ForYouCandidateSource | undefined;
  let score = source ? (SOURCE_BONUS[source] ?? 0) : 0;

  if (ctx.continueWatchingTmdbIds.has(item.id)) score += 90;
  if (ctx.savedTmdbIds.has(item.id)) score += 55;
  if (ctx.younifyLinkedTmdbIds.has(item.id)) score += 45;
  if (ctx.regionalTmdbIds.has(item.id)) score += 30;

  const genreMatches = (item.genre_ids ?? []).filter((g) => ctx.preferredGenreIds.has(g)).length;
  score += genreMatches * 10;

  score += (item.vote_average ?? 0) * 0.4;
  score += Math.min((item.popularity ?? 0) / 120, 4);

  return score;
}

/** Stable sort: highest score first, then higher TMDB id as tie-break (no random shuffle). */
export function pickForYouHeroItems(
  candidates: readonly ForYouMediaItem[],
  ctx: ForYouPersonalizationContext,
  limit = 6,
): ForYouMediaItem[] {
  if (!candidates.length) return [];

  const ranked = candidates
    .map((item) => ({ item, score: scoreForYouItem(item, ctx) }))
    .sort((a, b) => b.score - a.score || b.item.id - a.item.id);

  return ranked.slice(0, limit).map((entry) => entry.item);
}

export function sortForYouRailItems<T extends ForYouMediaItem>(
  items: readonly T[],
  ctx: ForYouPersonalizationContext,
): T[] {
  if (items.length <= 1) return [...items];
  return [...items].sort((a, b) => {
    const diff = scoreForYouItem(b, ctx) - scoreForYouItem(a, ctx);
    return diff !== 0 ? diff : b.id - a.id;
  });
}

export function forYouMediaKey(mediaType: ForYouMediaType, id: number): string {
  return `${mediaType}:${id}`;
}

export function forYouItemKey(item: Pick<ForYouMediaItem, 'id' | 'media_type'>): string {
  const mediaType = item.media_type ?? 'movie';
  return forYouMediaKey(mediaType, item.id);
}

/**
 * Personalized rail order, skipping titles already used in the hero or an earlier For You row.
 */
export function takeUniqueForYouRailItems<T extends { id: number }>(
  items: readonly T[],
  mediaType: ForYouMediaType,
  source: ForYouCandidateSource,
  ctx: ForYouPersonalizationContext,
  usedKeys: Set<string>,
  limit = 15,
): T[] {
  if (!items.length) return [];
  const sorted = sortForYouRailItems(
    items.map((item) => toForYouMediaItem(item, mediaType, source)),
    ctx,
  );
  const out: T[] = [];
  for (const entry of sorted) {
    const key = forYouItemKey(entry);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    out.push(entry as unknown as T);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildForYouPersonalizationContext(input: {
  savedTmdbIds: Iterable<number>;
  continueWatchingTmdbIds: Iterable<number>;
  younifyLinkedTmdbIds: Iterable<number>;
  regionalTmdbIds: Iterable<number>;
  heroCandidates: readonly ForYouMediaItem[];
}): ForYouPersonalizationContext {
  const savedTmdbIds = new Set(input.savedTmdbIds);
  return {
    savedTmdbIds,
    continueWatchingTmdbIds: new Set(input.continueWatchingTmdbIds),
    younifyLinkedTmdbIds: new Set(input.younifyLinkedTmdbIds),
    regionalTmdbIds: new Set(input.regionalTmdbIds),
    preferredGenreIds: inferPreferredGenreIds(input.heroCandidates, savedTmdbIds),
  };
}
