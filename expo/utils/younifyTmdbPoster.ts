import { tmdbApi, type TMDBMovie, type TMDBTVShow } from "@/utils/tmdbApi";

/**
 * Younify suggests supplementing provider artwork with TMDB (free, with attribution).
 * @see https://www.themoviedb.org/documentation/api/terms-of-use
 */
export const TMDB_POSTER_ATTRIBUTION =
  "This product uses the TMDB API but is not endorsed or certified by TMDB.";

const MAX_CACHE = 200;
const cache = new Map<string, string | null>();

function cacheSet(key: string, value: string | null) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, value);
}

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Best-effort portrait poster from TMDB search/multi (first movie or TV hit with a poster).
 * Returns a direct `image.tmdb.org` HTTPS URL (no API key in URL).
 */
export async function resolveTmdbPosterUrlForTitle(title: string): Promise<string | null> {
  const key = normalizeTitleKey(title);
  if (key.length < 2) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const res = await tmdbApi.searchMulti(title, 1);
    const rows = res?.results ?? [];
    for (const r of rows) {
      const mt = (r as { media_type?: string }).media_type;
      if (mt !== "movie" && mt !== "tv") continue;
      const path =
        mt === "movie"
          ? (r as TMDBMovie).poster_path
          : (r as TMDBTVShow).poster_path;
      const url = tmdbApi.getImageUrl(path, "w500");
      if (url) {
        cacheSet(key, url);
        return url;
      }
    }
    cacheSet(key, null);
    return null;
  } catch {
    return null;
  }
}

export function isTmdbImageHostUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.hostname === "image.tmdb.org" && u.protocol === "https:";
  } catch {
    return false;
  }
}
