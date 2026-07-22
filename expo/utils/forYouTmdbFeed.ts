import { tmdbApi, type TMDBMovie, type TMDBTVShow } from '@/utils/tmdbApi';

export type ForYouTrendingPopular = {
  movies: TMDBMovie[];
  tvShows: TMDBTVShow[];
};

export function forYouDiscoveryHasItems(payload: ForYouTrendingPopular | null | undefined): boolean {
  return (payload?.movies?.length ?? 0) + (payload?.tvShows?.length ?? 0) > 0;
}

/** Resilient TMDB bundle for For You — partial success + popular/now-playing fallbacks. */
export async function fetchForYouTrendingPopular(): Promise<ForYouTrendingPopular> {
  const [moviesResult, tvResult] = await Promise.allSettled([
    tmdbApi.getTrendingMovies('week'),
    tmdbApi.getTrendingTVShows('week'),
  ]);

  let movies =
    moviesResult.status === 'fulfilled' ? (moviesResult.value.results ?? []) : [];
  let tvShows = tvResult.status === 'fulfilled' ? (tvResult.value.results ?? []) : [];

  if (forYouDiscoveryHasItems({ movies, tvShows })) {
    return { movies, tvShows };
  }

  const [popMovies, popTv] = await Promise.allSettled([
    tmdbApi.getPopularMovies(),
    tmdbApi.getPopularTVShows(),
  ]);
  if (!movies.length && popMovies.status === 'fulfilled') {
    movies = popMovies.value.results ?? [];
  }
  if (!tvShows.length && popTv.status === 'fulfilled') {
    tvShows = popTv.value.results ?? [];
  }

  if (forYouDiscoveryHasItems({ movies, tvShows })) {
    return { movies, tvShows };
  }

  // Do not fall back to now-playing / on-the-air here — For You already has dedicated rails for those.
  const [topMovies, topTv] = await Promise.allSettled([
    tmdbApi.getTopRatedMovies(),
    tmdbApi.getTopRatedTVShows(),
  ]);
  if (!movies.length && topMovies.status === 'fulfilled') {
    movies = topMovies.value.results ?? [];
  }
  if (!tvShows.length && topTv.status === 'fulfilled') {
    tvShows = topTv.value.results ?? [];
  }

  if (!forYouDiscoveryHasItems({ movies, tvShows })) {
    throw new Error('Could not load movie & TV picks');
  }

  return { movies, tvShows };
}

export async function fetchForYouPopular(): Promise<ForYouTrendingPopular> {
  const [moviesResult, tvResult] = await Promise.allSettled([
    tmdbApi.getPopularMovies(),
    tmdbApi.getPopularTVShows(),
  ]);
  const movies = moviesResult.status === 'fulfilled' ? (moviesResult.value.results ?? []) : [];
  const tvShows = tvResult.status === 'fulfilled' ? (tvResult.value.results ?? []) : [];
  if (forYouDiscoveryHasItems({ movies, tvShows })) {
    return { movies, tvShows };
  }
  return fetchForYouTrendingPopular();
}
