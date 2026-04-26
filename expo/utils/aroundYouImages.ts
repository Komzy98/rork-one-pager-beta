import { PixelRatio } from "react-native";
import type { YounifyBrowseSection } from "@/services/younify";

export type TmdbPosterSize = "w200" | "w300" | "w500" | "w780";
export type TmdbBackdropSize = "w500" | "w780" | "original";

/** Physical pixels needed to fill a logical-width container on this screen. */
export function physicalWidthPx(logicalWidthDp: number): number {
  return Math.max(1, Math.ceil(logicalWidthDp * PixelRatio.get()));
}

/**
 * TMDB still (poster) profile size from how wide the image is drawn on screen.
 * Smaller tiles → lighter assets; hero / large tiles → sharper fetches.
 */
export function tmdbPosterSizeForContainerWidth(logicalWidthDp: number): TmdbPosterSize {
  const px = physicalWidthPx(logicalWidthDp);
  if (px <= 260) return "w200";
  if (px <= 420) return "w300";
  if (px <= 780) return "w500";
  return "w780";
}

/** Wide backdrop strip — bias toward larger TMDB assets as the card gets wider. */
export function tmdbBackdropSizeForContainerWidth(logicalWidthDp: number): TmdbBackdropSize {
  const px = physicalWidthPx(logicalWidthDp);
  if (px <= 640) return "w500";
  if (px <= 1280) return "w780";
  return "original";
}

/** Best-effort TMDB numeric id on a Younify content row (SDK shapes vary). */
export function extractTmdbIdFromYounifyRow(row: unknown): number | null {
  const r = row as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const tryNum = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };
  const dig = (obj: unknown, path: string[]): unknown => {
    let cur: unknown = obj;
    for (const p of path) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  };

  const direct = [
    r.tmdbId,
    r.tmdbID,
    r.tmdb_id,
    r.theMovieDbId,
    r.themoviedb_id,
    r.movieDatabaseId,
    dig(r, ["externalIds", "tmdb"]),
    dig(r, ["external_ids", "tmdb"]),
    dig(r, ["extensions", "tmdb", "id"]),
    dig(r, ["metadata", "tmdbId"]),
  ];
  for (const v of direct) {
    const id = tryNum(v);
    if (id != null) return id;
  }
  return null;
}

/**
 * First Younify row per TMDB id across browse sections + optional flat rail (Connected services).
 */
export function buildYounifyRowByTmdbId(
  sections: YounifyBrowseSection[] | undefined,
  flatConnectedRows: unknown[] | undefined,
): Map<number, unknown> {
  const m = new Map<number, unknown>();
  const consider = (row: unknown) => {
    const id = extractTmdbIdFromYounifyRow(row);
    if (id != null && !m.has(id)) m.set(id, row);
  };
  for (const sec of sections ?? []) {
    for (const it of sec.items ?? []) consider(it);
  }
  for (const it of flatConnectedRows ?? []) consider(it);
  return m;
}

/** Small portrait tiles: prefer provider artwork when linked (Younify handles fetchImage). */
export function preferYounifyPosterForContainer(logicalWidthDp: number): boolean {
  return physicalWidthPx(logicalWidthDp) < 520;
}
