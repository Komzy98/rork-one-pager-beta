function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function readPositiveInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}

function readSeasonEpisodeFromYounifyRow(row: Record<string, unknown>): { season: number; episode: number } | null {
  const s =
    readPositiveInt(row.seasonNumber) ??
    readPositiveInt(row.season_number) ??
    readPositiveInt(row.season) ??
    readPositiveInt(row.tvSeasonNumber) ??
    readPositiveInt(dig(row, ['episodeDetails', 'season_number'])) ??
    readPositiveInt(dig(row, ['content', 'seasonNumber']));
  const e =
    readPositiveInt(row.episodeNumber) ??
    readPositiveInt(row.episode_number) ??
    readPositiveInt(row.episode) ??
    readPositiveInt(row.tvEpisodeNumber) ??
    readPositiveInt(dig(row, ['episodeDetails', 'episode_number'])) ??
    readPositiveInt(dig(row, ['content', 'episodeNumber']));
  if (s == null || e == null) return null;
  return { season: s, episode: e };
}

function normalizeComparableTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Best-effort movie vs TV for a Younify row (SDK shapes vary). */
export function extractTmdbMediaTypeFromYounifyRow(row: Record<string, unknown>): 'movie' | 'tv' | null {
  const raw =
    row.media_type ??
    row.mediaType ??
    row.contentType ??
    row.type ??
    row.kind ??
    dig(row, ['metadata', 'type']) ??
    dig(row, ['extensions', 'content', 'type']);
  const s = String(raw ?? '').toLowerCase();
  if (s === 'movie' || s === 'feature' || s === 'film') return 'movie';
  if (
    s === 'tv' ||
    s === 'show' ||
    s === 'series' ||
    s === 'episode' ||
    s === 'season'
  ) {
    return 'tv';
  }
  return null;
}

export function extractSeriesTitleFromYounifyRow(row: Record<string, unknown>): string | null {
  for (const key of ['showTitle', 'series', 'programTitle', 'show_title'] as const) {
    const s = String(row[key] ?? '').trim();
    if (s.length >= 2) return s;
  }
  const fromMeta = dig(row, ['metadata', 'series']);
  if (typeof fromMeta === 'string' && fromMeta.trim().length >= 2) return fromMeta.trim();
  return null;
}

/** Episode rows often omit `media_type`; season/episode + show title imply TV. */
export function inferYounifyRowMediaType(row: Record<string, unknown>): 'movie' | 'tv' | null {
  const explicit = extractTmdbMediaTypeFromYounifyRow(row);
  if (explicit) return explicit;
  if (readSeasonEpisodeFromYounifyRow(row)) return 'tv';
  const series = extractSeriesTitleFromYounifyRow(row);
  const title = String(row.title ?? row.name ?? '').trim();
  if (series && title && normalizeComparableTitle(series) !== normalizeComparableTitle(title)) {
    return 'tv';
  }
  return null;
}
