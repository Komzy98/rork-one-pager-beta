import { extractTmdbIdFromYounifyRow, type TmdbPosterSize } from "@/utils/aroundYouImages";
import { tmdbApi, type TMDBMovie, type TMDBTVShow } from "@/utils/tmdbApi";

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
  return normalizeTitleKey(
    title
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " "),
  );
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

/** Best-effort movie vs TV for a Younify row (SDK shapes vary). */
export function extractTmdbMediaTypeFromYounifyRow(row: Record<string, unknown>): "movie" | "tv" | null {
  const raw =
    row.media_type ??
    row.mediaType ??
    row.contentType ??
    row.type ??
    row.kind ??
    dig(row, ["metadata", "type"]) ??
    dig(row, ["extensions", "content", "type"]);
  const s = String(raw ?? "").toLowerCase();
  if (s === "movie" || s === "feature" || s === "film") return "movie";
  if (
    s === "tv" ||
    s === "show" ||
    s === "series" ||
    s === "episode" ||
    s === "season"
  ) return "tv";
  return null;
}

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

function titleSearchCandidates(rawTitle: string): string[] {
  const base = rawTitle.trim();
  if (base.length < 2) return [];
  const out = new Set<string>();
  const push = (v: string) => {
    const s = v.trim().replace(/\s+/g, " ");
    if (s.length >= 2) out.add(s);
  };
  push(base);
  push(base.replace(/\([^)]*\)/g, " "));
  push(base.replace(/\[[^\]]*\]/g, " "));
  // Prefer canonical title when rows include episode/program suffixes.
  push(base.split(":")[0] ?? base);
  push(base.split(" - ")[0] ?? base);
  push(base.split("|")[0] ?? base);
  push(base.replace(/\b(S\d+|E\d+|Season\s*\d+|Episode\s*\d+)\b/gi, " "));
  return [...out];
}

function rowTitleCandidates(row: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const pushAll = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return;
    for (const c of titleSearchCandidates(s)) out.add(c);
  };
  pushAll(row.series);
  pushAll(row.showTitle);
  pushAll(row.programTitle);
  pushAll(row.title);
  pushAll(row.name);
  pushAll(dig(row, ["metadata", "title"]));
  pushAll(dig(row, ["metadata", "series"]));
  return [...out];
}

async function tmdbPosterUrlFromId(
  id: number,
  preferred: "movie" | "tv" | null,
  size: TmdbPosterSize,
): Promise<string | null> {
  const tryMovie = async (): Promise<string | null> => {
    try {
      const d = await tmdbApi.getMovieDetails(id);
      return tmdbApi.getImageUrl(d.poster_path, size);
    } catch {
      return null;
    }
  };
  const tryTv = async (): Promise<string | null> => {
    try {
      const d = await tmdbApi.getTVShowDetails(id);
      return tmdbApi.getImageUrl(d.poster_path, size);
    } catch {
      return null;
    }
  };
  if (preferred === "tv") {
    return (await tryTv()) ?? (await tryMovie());
  }
  if (preferred === "movie") {
    return (await tryMovie()) ?? (await tryTv());
  }
  return (await tryMovie()) ?? (await tryTv());
}

/**
 * TMDB portrait poster for a Younify streaming row (SDK shapes vary).
 * Prefers on-row `poster_path`, then TMDB id + type, then title search — never provider CDN URLs.
 */
export async function resolveTmdbPosterUrlForYounifyRow(
  row: Record<string, unknown>,
  size: TmdbPosterSize = "w500",
): Promise<string | null> {
  const stableKey = `${String(row.itemID ?? row.id ?? "")}|${String(row.title ?? row.name ?? "").trim()}|${size}`;
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
  const mt = extractTmdbMediaTypeFromYounifyRow(row);
  const year = extractYearFromYounifyRow(row);
  const synopsis = extractSynopsisFromYounifyRow(row);
  if (tmdbId != null) {
    const fromId = await tmdbPosterUrlFromId(tmdbId, mt, size);
    if (fromId) {
      rowResolveCacheSet(stableKey, fromId);
      return fromId;
    }
  }

  const titles = rowTitleCandidates(row);
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
