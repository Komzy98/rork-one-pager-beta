import type { Show } from '@/types/habit';
import { fetchForYouTrendingPopular } from '@/utils/forYouTmdbFeed';
import {
  buildForYouHeroCandidates,
  buildForYouPersonalizationContext,
  pickForYouHeroItems,
  toForYouMediaItem,
  type ForYouMediaItem,
} from '@/utils/showsForYouPersonalization';
import { tmdbApi, type TMDBMovie, type TMDBTVShow } from '@/utils/tmdbApi';

export type DiscoverShowArtwork = {
  tmdbId: number | null;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number | null;
  overview: string | null;
};

export type DiscoverMediaPick = {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number | null;
  overview: string;
  reason: string;
};

function normalizeTitle(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferShowMediaType(show: Show): 'movie' | 'tv' {
  if (show.mediaType === 'movie' || show.mediaType === 'tv') return show.mediaType;
  return show.type === 'Movie' || show.type === 'Documentary' ? 'movie' : 'tv';
}

function movieTitle(item: TMDBMovie | TMDBTVShow, mediaType: 'movie' | 'tv'): string {
  return mediaType === 'movie'
    ? String((item as TMDBMovie).title ?? '')
    : String((item as TMDBTVShow).name ?? '');
}

function pickBestTitleMatch<T extends TMDBMovie | TMDBTVShow>(
  rows: readonly T[],
  title: string,
  mediaType: 'movie' | 'tv',
): T | null {
  if (!rows.length) return null;
  const wanted = normalizeTitle(title);
  const exact = rows.find((row) => normalizeTitle(movieTitle(row, mediaType)) === wanted);
  if (exact) return exact;
  const close = rows.find((row) => {
    const candidate = normalizeTitle(movieTitle(row, mediaType));
    return candidate.includes(wanted) || wanted.includes(candidate);
  });
  return close ?? rows[0] ?? null;
}

/** Resolve real TMDB artwork for a locally tracked show without requiring a TMDB id. */
export async function resolveDiscoverShowArtwork(show: Show): Promise<DiscoverShowArtwork | null> {
  const mediaType = inferShowMediaType(show);

  try {
    if (show.tmdbId && Number.isFinite(show.tmdbId)) {
      const details = mediaType === 'movie'
        ? await tmdbApi.getMovieDetails(show.tmdbId)
        : await tmdbApi.getTVShowDetails(show.tmdbId);
      return {
        tmdbId: show.tmdbId,
        mediaType,
        posterUrl: tmdbApi.getImageUrl(details.poster_path ?? null, 'w500'),
        backdropUrl: tmdbApi.getImageUrl(details.backdrop_path ?? null, 'w780'),
        rating: Number.isFinite(details.vote_average) ? details.vote_average : null,
        overview: String(details.overview ?? '').trim() || null,
      };
    }

    let best: TMDBMovie | TMDBTVShow | null = null;
    if (mediaType === 'movie') {
      const search = await tmdbApi.searchMovies(show.title, 1);
      best = pickBestTitleMatch<TMDBMovie>(search.results ?? [], show.title, 'movie');
    } else {
      const search = await tmdbApi.searchTVShows(show.title, 1);
      best = pickBestTitleMatch<TMDBTVShow>(search.results ?? [], show.title, 'tv');
    }
    if (!best) return null;

    return {
      tmdbId: best.id,
      mediaType,
      posterUrl: tmdbApi.getImageUrl(best.poster_path ?? null, 'w500'),
      backdropUrl: tmdbApi.getImageUrl(best.backdrop_path ?? null, 'w780'),
      rating: Number.isFinite(best.vote_average) ? best.vote_average : null,
      overview: String(best.overview ?? '').trim() || null,
    };
  } catch {
    return null;
  }
}

function asPick(item: ForYouMediaItem, personalized: boolean): DiscoverMediaPick {
  const mediaType = item.media_type ?? 'movie';
  const title = mediaType === 'movie' ? String(item.title ?? '') : String(item.name ?? '');
  return {
    id: item.id,
    mediaType,
    title,
    posterUrl: tmdbApi.getImageUrl((item.poster_path as string | null | undefined) ?? null, 'w500'),
    backdropUrl: tmdbApi.getImageUrl((item.backdrop_path as string | null | undefined) ?? null, 'w780'),
    rating: Number.isFinite(Number(item.vote_average)) ? Number(item.vote_average) : null,
    overview: String(item.overview ?? '').trim(),
    reason: personalized ? 'Shaped by your watchlist' : 'Trending this week',
  };
}

/**
 * A discovery-only entertainment rail: known titles are used as taste signals, then filtered out
 * so the result contains genuinely new things rather than re-recommending the user's own library.
 */
export async function fetchDiscoverMediaPicks(shows: readonly Show[], limit = 10): Promise<DiscoverMediaPick[]> {
  const payload = await fetchForYouTrendingPopular();
  const movies = (payload.movies ?? []).filter((item) => !item.adult);
  const tvShows = payload.tvShows ?? [];

  const movieCandidates = movies.map((item) => toForYouMediaItem(item, 'movie', 'trending'));
  const tvCandidates = tvShows.map((item) => toForYouMediaItem(item, 'tv', 'trending'));
  const candidates = buildForYouHeroCandidates({
    trendingMovies: movieCandidates,
    trendingTv: tvCandidates,
  });

  const knownIds = new Set(
    shows
      .map((show) => show.tmdbId)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
  );
  const continueIds = new Set(
    shows
      .filter((show) => show.status === 'Watching')
      .map((show) => show.tmdbId)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
  );

  const ctx = buildForYouPersonalizationContext({
    savedTmdbIds: knownIds,
    continueWatchingTmdbIds: continueIds,
    younifyLinkedTmdbIds: [],
    regionalTmdbIds: [],
    heroCandidates: candidates,
  });

  const freshCandidates = candidates.filter((item) => !knownIds.has(item.id));
  const ranked = pickForYouHeroItems(freshCandidates, ctx, Math.max(limit, 6));
  const personalized = knownIds.size > 0 || shows.length > 0;

  return ranked
    .filter((item) => Boolean(item.poster_path || item.backdrop_path))
    .map((item) => asPick(item, personalized))
    .slice(0, limit);
}
