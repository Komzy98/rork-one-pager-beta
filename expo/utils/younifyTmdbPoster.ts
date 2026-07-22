import { extractTmdbIdFromYounifyRow, type TmdbPosterSize } from "@/utils/aroundYouImages";
import {
  extractSeriesTitleFromYounifyRow,
  inferYounifyRowMediaType,
} from "@/utils/younifyRowMedia";
import { tmdbApi, type TMDBMovie, type TMDBTVShow } from "@/utils/tmdbApi";
import {
  normalizeComparableYounifyTitle,
  scoreYounifyRowTitleMatch,
  YOUNIFY_TMDB_ID_MIN_TITLE_MATCH,
  younifyRowTitleCandidates,
} from "@/utils/younifyRowTitleMatch";

export {
  scoreYounifyRowTitleMatch,
  YOUNIFY_TMDB_ID_MIN_TITLE_MATCH,
} from "@/utils/younifyRowTitleMatch";

/**
 * Younify suggests supplementing provider artwork with TMDB (free, with attribution).
 * @see https://www.themoviedb.org/documentation/api/terms-of-use
 */
export const TMDB_POSTER_ATTRIBUTION =
  "This product uses the TMDB API but is not endorsed or certified by TMDB.";

const MAX_CACHE = 200;
const cache = new Map<string, string | null>();
const rowResolveCache = new Map<string, string | null>();

function rowResolveCacheSet(key: string, value: string | null) {
  if (rowResolveCache.size >= MAX_CACHE) {
    const first = rowResolveCache.keys().next().value;
    if (first !== undefined) rowResolveCache.delete(first);
  }
  rowResolveCache.set(key, value);
}

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

function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function normalizeComparableTitle(title: string): string {
  return normalizeComparableYounifyTitle(title);
}

/**
 * Best-effort portrait poster from TMDB search/multi (first movie or TV hit with a poster).
 * Returns a direct `image.tmdb.org` HTTPS URL (no API key in URL).
 */
export async function resolveTmdbPosterUrlForTitle(
  title: string,
  size: TmdbPosterSize = "w500",
  options?: {
    preferredMediaType?: "movie" | "tv" | null;
    year?: number | null;
    synopsis?: string | null;
  },
): Promise<string | null> {
  const nk = normalizeTitleKey(title);
  if (nk.length < 2) return null;
  const synopsisKey = normalizeTitleKey(String(options?.synopsis ?? "")).slice(0, 96);
  const key = `${nk}::${size}::${options?.preferredMediaType ?? ""}::${options?.year ?? ""}::${synopsisKey}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const preferred = options?.preferredMediaType ?? null;
    const rows: Array<(TMDBMovie | TMDBTVShow) & { media_type: "movie" | "tv" }> = [];
    if (preferred === "tv") {
      const tvRes = await tmdbApi.searchTVShows(title, 1);
      rows.push(...(tvRes?.results ?? []).map((r) => ({ ...r, media_type: "tv" as const })));
    } else if (preferred === "movie") {
      const mvRes = await tmdbApi.searchMovies(title, 1);
      rows.push(...(mvRes?.results ?? []).map((r) => ({ ...r, media_type: "movie" as const })));
    }
    if (rows.length === 0) {
      const res = await tmdbApi.searchMulti(title, 1);
      rows.push(...(res?.results ?? []));
    }
    let bestUrl: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    const wantedTitle = normalizeComparableTitle(title);
    const wantedYear = options?.year ?? null;
    const synopsisTokens = tokenizeSynopsis(String(options?.synopsis ?? ""));

    for (const row of rows) {
      const mt = (row as { media_type?: string }).media_type;
      if (mt !== "movie" && mt !== "tv") continue;
      const item = row as TMDBMovie | TMDBTVShow;
      const path = mt === "movie" ? (item as TMDBMovie).poster_path : (item as TMDBTVShow).poster_path;
      const url = tmdbApi.getImageUrl(path, size);
      if (!url) continue;

      const rawName =
        mt === "movie"
          ? String((item as TMDBMovie).title ?? "")
          : String((item as TMDBTVShow).name ?? "");
      const candidateTitle = normalizeComparableTitle(rawName);
      const candYearRaw =
        mt === "movie"
          ? String((item as TMDBMovie).release_date ?? "")
          : String((item as TMDBTVShow).first_air_date ?? "");
      const candYear = Number(candYearRaw.slice(0, 4));
      let score = Number((item as any).popularity ?? 0) * 0.05;
      if (preferred && mt === preferred) score += 20;
      if (candidateTitle === wantedTitle) score += 40;
      else if (candidateTitle.includes(wantedTitle) || wantedTitle.includes(candidateTitle)) score += 15;
      else score -= 8;
      if (synopsisTokens.size > 0) {
        const tmdbOverview = String((item as any).overview ?? "");
        const overlap = overlapRatio(synopsisTokens, tokenizeSynopsis(tmdbOverview));
        score += overlap * 45;
      }
      if (wantedYear && Number.isFinite(candYear)) {
        const d = Math.abs(candYear - wantedYear);
        if (d === 0) score += 16;
        else if (d === 1) score += 8;
        else if (d > 4) score -= 12;
      }
      if (score > bestScore) {
        bestScore = score;
        bestUrl = url;
      }
    }

    if (bestUrl) {
      cacheSet(key, bestUrl);
      return bestUrl;
    }
    cacheSet(key, null);
    return null;
  } catch {
    return null;
  }
}

function pickTmdbPosterPathFromRow(row: Record<string, unknown>): string | null {
  for (const k of ["poster_path", "posterPath"] as const) {
    const p = row[k];
    if (typeof p === "string" && p.startsWith("/")) return p;
  }
  return null;
}

export { extractTmdbMediaTypeFromYounifyRow } from "@/utils/younifyRowMedia";

function extractYearFromYounifyRow(row: Record<string, unknown>): number | null {
  const candidates: unknown[] = [
    row.year,
    row.releaseYear,
    row.firstAirYear,
    row.release_date,
    row.releaseDate,
    row.first_air_date,
    row.firstAirDate,
    dig(row, ["metadata", "year"]),
    dig(row, ["metadata", "releaseDate"]),
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 1800 && c < 2200) {
      return Math.floor(c);
    }
    if (typeof c === "string" && c.trim()) {
      const m = c.match(/\b(19|20)\d{2}\b/);
      if (m) return Number(m[0]);
    }
  }
  return null;
}

function extractSynopsisFromYounifyRow(row: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    row.description,
    row.overview,
    row.summary,
    row.synopsis,
    row.plot,
    row.storyline,
    row.longDescription,
    dig(row, ["metadata", "description"]),
    dig(row, ["metadata", "overview"]),
    dig(row, ["metadata", "summary"]),
    dig(row, ["details", "description"]),
  ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s.length >= 24) return s;
  }
  return null;
}

function tokenizeSynopsis(text: string): Set<string> {
  const stop = new Set([
    "the","and","for","with","this","that","from","into","onto","your","their","they","them","about","after","before",
    "while","where","when","what","have","has","had","are","was","were","you","his","her","its","our","but","not","too",
    "than","then","who","she","him","out","off","all","one","two","three","new","old","over","under","more","most","some",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stop.has(w));
  return new Set(words);
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const t of a) {
    if (b.has(t)) common++;
  }
  return common / Math.max(1, Math.min(a.size, b.size));
}

type IdPosterCandidate = { url: string; score: number; order: number };

async function tmdbPosterUrlFromId(
  id: number,
  preferred: "movie" | "tv" | null,
  size: TmdbPosterSize,
  row: Record<string, unknown>,
): Promise<string | null> {
  const rowTitles = younifyRowTitleCandidates(row);
  const requireTitleMatch = rowTitles.length > 0;

  const order: ("movie" | "tv")[] =
    preferred === "tv"
      ? ["tv", "movie"]
      : preferred === "movie"
        ? ["movie", "tv"]
        : ["movie", "tv"];

  const candidates: IdPosterCandidate[] = [];
  for (let i = 0; i < order.length; i++) {
    const kind = order[i]!;
    try {
      if (kind === "movie") {
        const d = await tmdbApi.getMovieDetails(id);
        const url = tmdbApi.getImageUrl(d.poster_path, size);
        if (!url) continue;
        const score = scoreYounifyRowTitleMatch(String(d.title ?? ""), row);
        candidates.push({ url, score, order: i });
        if (score >= 100) return url;
      } else {
        const d = await tmdbApi.getTVShowDetails(id);
        const url = tmdbApi.getImageUrl(d.poster_path, size);
        if (!url) continue;
        const score = scoreYounifyRowTitleMatch(String(d.name ?? ""), row);
        candidates.push({ url, score, order: i });
        if (score >= 100) return url;
      }
    } catch {
      /* try next kind */
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);
  const best = candidates[0]!;
  if (requireTitleMatch && best.score < YOUNIFY_TMDB_ID_MIN_TITLE_MATCH) return null;
  return best.url;
}

/**
 * TMDB portrait poster for a Younify streaming row (SDK shapes vary).
 * Prefers on-row `poster_path`, then TMDB id + type, then title search — never provider CDN URLs.
 */
export async function resolveTmdbPosterUrlForYounifyRow(
  row: Record<string, unknown>,
  size: TmdbPosterSize = "w500",
): Promise<string | null> {
  const stableKey = `${String(row.itemID ?? row.id ?? "")}|${String(
    row.showTitle ?? row.series ?? row.title ?? row.name ?? "",
  ).trim()}|${size}`;
  if (rowResolveCache.has(stableKey)) {
    return rowResolveCache.get(stableKey) ?? null;
  }

  const rel = pickTmdbPosterPathFromRow(row);
  if (rel) {
    const direct = tmdbApi.getImageUrl(rel, size);
    if (direct) {
      rowResolveCacheSet(stableKey, direct);
      return direct;
    }
  }

  const tmdbId = extractTmdbIdFromYounifyRow(row);
  const mt = inferYounifyRowMediaType(row);
  const year = extractYearFromYounifyRow(row);
  const synopsis = extractSynopsisFromYounifyRow(row);
  const seriesTitle = extractSeriesTitleFromYounifyRow(row);

  if (mt === "tv" && seriesTitle) {
    const fromSeries = await resolveTmdbPosterUrlForTitle(seriesTitle, size, {
      preferredMediaType: "tv",
      year,
      synopsis,
    });
    if (fromSeries) {
      rowResolveCacheSet(stableKey, fromSeries);
      return fromSeries;
    }
  }

  if (tmdbId != null) {
    const fromId = await tmdbPosterUrlFromId(tmdbId, mt, size, row);
    if (fromId) {
      rowResolveCacheSet(stableKey, fromId);
      return fromId;
    }
  }

  const titles = younifyRowTitleCandidates(row);
  if (titles.length > 0) {
    for (const candidate of titles) {
      const fromTitle = await resolveTmdbPosterUrlForTitle(candidate, size, {
        preferredMediaType: mt,
        year,
        synopsis,
      });
      if (fromTitle) {
        rowResolveCacheSet(stableKey, fromTitle);
        return fromTitle;
      }
    }
    rowResolveCacheSet(stableKey, null);
    return null;
  }

  rowResolveCacheSet(stableKey, null);
  return null;
}

export function isTmdbImageHostUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.hostname === "image.tmdb.org" && u.protocol === "https:";
  } catch {
    return false;
  }
}

type ResolvedYounifyTmdbDetails =
  | { mediaType: "movie"; details: TMDBMovie }
  | { mediaType: "tv"; details: TMDBTVShow };

/**
 * TMDB record for a Younify row — validates id lookups against row titles so movie/TV id collisions
 * do not open the wrong franchise (e.g. Young Justice poster for Diary of a Wimpy Kid).
 */
export async function resolveTmdbDetailsForYounifyRow(
  row: Record<string, unknown>,
): Promise<ResolvedYounifyTmdbDetails | null> {
  const tmdbId = extractTmdbIdFromYounifyRow(row);
  const mt = inferYounifyRowMediaType(row);
  const year = extractYearFromYounifyRow(row);
  const synopsis = extractSynopsisFromYounifyRow(row);
  const rowTitles = younifyRowTitleCandidates(row);
  const requireTitleMatch = rowTitles.length > 0;

  if (tmdbId != null) {
    const order: ("movie" | "tv")[] =
      mt === "tv" ? ["tv", "movie"] : mt === "movie" ? ["movie", "tv"] : ["movie", "tv"];
    type Scored = ResolvedYounifyTmdbDetails & { score: number; order: number };
    const scored: Scored[] = [];

    for (let i = 0; i < order.length; i++) {
      const kind = order[i]!;
      try {
        if (kind === "movie") {
          const details = await tmdbApi.getMovieDetails(tmdbId);
          const score = scoreYounifyRowTitleMatch(String(details.title ?? ""), row);
          scored.push({ mediaType: "movie", details, score, order: i });
          if (score >= 100) return { mediaType: "movie", details };
        } else {
          const details = await tmdbApi.getTVShowDetails(tmdbId);
          const score = scoreYounifyRowTitleMatch(String(details.name ?? ""), row);
          scored.push({ mediaType: "tv", details, score, order: i });
          if (score >= 100) return { mediaType: "tv", details };
        }
      } catch {
        /* try next */
      }
    }

    scored.sort((a, b) => b.score - a.score || a.order - b.order);
    const best = scored[0];
    if (best && (!requireTitleMatch || best.score >= YOUNIFY_TMDB_ID_MIN_TITLE_MATCH)) {
      return best.mediaType === 'movie'
        ? { mediaType: 'movie', details: best.details as TMDBMovie }
        : { mediaType: 'tv', details: best.details as TMDBTVShow };
    }
  }

  for (const candidate of rowTitles) {
    const preferred = mt;
    const rows: Array<(TMDBMovie | TMDBTVShow) & { media_type: "movie" | "tv" }> = [];
    if (preferred === "tv") {
      const tvRes = await tmdbApi.searchTVShows(candidate, 1);
      rows.push(...(tvRes?.results ?? []).map((r) => ({ ...r, media_type: "tv" as const })));
    } else if (preferred === "movie") {
      const mvRes = await tmdbApi.searchMovies(candidate, 1);
      rows.push(...(mvRes?.results ?? []).map((r) => ({ ...r, media_type: "movie" as const })));
    }
    if (rows.length === 0) {
      const res = await tmdbApi.searchMulti(candidate, 1);
      for (const r of res?.results ?? []) {
        if (r.media_type === "movie" || r.media_type === "tv") rows.push(r as any);
      }
    }

    let bestHit: { id: number; mediaType: "movie" | "tv"; score: number } | null = null;
    const wantedTitle = normalizeComparableTitle(candidate);
    for (const hit of rows) {
      const rawName =
        hit.media_type === "movie"
          ? String((hit as TMDBMovie).title ?? "")
          : String((hit as TMDBTVShow).name ?? "");
      let score = scoreYounifyRowTitleMatch(rawName, row);
      if (normalizeComparableTitle(rawName) === wantedTitle) score += 20;
      if (preferred && hit.media_type === preferred) score += 10;
      if (year != null) {
        const candYearRaw =
          hit.media_type === "movie"
            ? String((hit as TMDBMovie).release_date ?? "")
            : String((hit as TMDBTVShow).first_air_date ?? "");
        const candYear = Number(candYearRaw.slice(0, 4));
        if (Number.isFinite(candYear)) {
          const d = Math.abs(candYear - year);
          if (d === 0) score += 16;
          else if (d === 1) score += 8;
          else if (d > 4) score -= 12;
        }
      }
      if (synopsis) {
        const overlap = overlapRatio(tokenizeSynopsis(synopsis), tokenizeSynopsis(String((hit as any).overview ?? "")));
        score += overlap * 45;
      }
      if (!bestHit || score > bestHit.score) {
        bestHit = { id: hit.id, mediaType: hit.media_type, score };
      }
    }

    if (bestHit && bestHit.score >= YOUNIFY_TMDB_ID_MIN_TITLE_MATCH) {
      if (bestHit.mediaType === "movie") {
        const details = await tmdbApi.getMovieDetails(bestHit.id);
        return { mediaType: "movie", details };
      }
      const details = await tmdbApi.getTVShowDetails(bestHit.id);
      return { mediaType: "tv", details };
    }
  }

  return null;
}
