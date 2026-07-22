import { extractTmdbIdFromYounifyRow } from '@/utils/aroundYouImages';
import { pickWatchNowUrlFromRow, younifySourceToTmdbProviderId } from '@/utils/streamingLinks';

export type YounifyRow = Record<string, unknown>;

export type YounifyProviderIndex = {
  rowsByTmdbId: Map<number, YounifyRow[]>;
  rowsByTitle: Map<string, YounifyRow[]>;
  linkedProviderOrder: number[];
};

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

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

/** Best-effort season/episode from varied Younify SDK row shapes. */
export function readSeasonEpisodeFromYounifyRow(row: YounifyRow): { season: number; episode: number } | null {
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

function rowMatchesEpisode(row: YounifyRow, season: number, episode: number): boolean {
  const got = readSeasonEpisodeFromYounifyRow(row);
  if (!got) return false;
  return got.season === season && got.episode === episode;
}

function rowTitle(row: YounifyRow): string {
  return String(row.title ?? row.name ?? '').trim();
}

function rankRow(
  row: YounifyRow,
  linkedProviderOrder: number[],
): number {
  const providerId = younifySourceToTmdbProviderId(
    row.younifySourceService as { id?: string; name?: string } | undefined,
  );
  const providerRank = providerId != null ? linkedProviderOrder.indexOf(providerId) : -1;
  const hasDirectWatchUrl = !!pickWatchNowUrlFromRow(row);

  // Lower rank is better.
  const providerScore = providerRank >= 0 ? providerRank : 10_000;
  const watchUrlPenalty = hasDirectWatchUrl ? 0 : 2_000;
  return providerScore + watchUrlPenalty;
}

function dedupeRows(rows: YounifyRow[]): YounifyRow[] {
  const out: YounifyRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = String(row.itemID ?? row.id ?? JSON.stringify(row).slice(0, 120));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function sortedRows(rows: YounifyRow[], linkedProviderOrder: number[]): YounifyRow[] {
  return dedupeRows(rows).sort((a, b) => rankRow(a, linkedProviderOrder) - rankRow(b, linkedProviderOrder));
}

/** Prefer linked-provider rows with episode metadata when multiple Continue watching rows share a TMDB id. */
export function pickBestYounifyContinueRow(
  rows: YounifyRow[],
  linkedProviderOrder: number[],
): YounifyRow | null {
  if (!rows.length) return null;
  const withEpisode = rows.filter((r) => readSeasonEpisodeFromYounifyRow(r) != null);
  const pool = withEpisode.length ? withEpisode : rows;
  return sortedRows(pool, linkedProviderOrder)[0] ?? rows[0] ?? null;
}

export function buildYounifyProviderIndex(
  sections: Array<{ items?: unknown[] }> | null | undefined,
  linkedProviderOrder: number[],
): YounifyProviderIndex {
  const rowsByTmdbId = new Map<number, YounifyRow[]>();
  const rowsByTitle = new Map<string, YounifyRow[]>();

  const rows: YounifyRow[] = (Array.isArray(sections) ? sections : []).flatMap((section) =>
    Array.isArray(section?.items) ? (section.items as YounifyRow[]) : [],
  );

  for (const row of rows) {
    const tmdbId = extractTmdbIdFromYounifyRow(row);
    if (tmdbId != null) {
      const current = rowsByTmdbId.get(tmdbId) ?? [];
      current.push(row);
      rowsByTmdbId.set(tmdbId, current);
    }

    const title = normalizeTitle(rowTitle(row));
    if (title) {
      const current = rowsByTitle.get(title) ?? [];
      current.push(row);
      rowsByTitle.set(title, current);
    }
  }

  for (const [k, list] of rowsByTmdbId) {
    rowsByTmdbId.set(k, sortedRows(list, linkedProviderOrder));
  }
  for (const [k, list] of rowsByTitle) {
    rowsByTitle.set(k, sortedRows(list, linkedProviderOrder));
  }

  return { rowsByTmdbId, rowsByTitle, linkedProviderOrder };
}

export function pickBestYounifyRowForEpisode(
  index: YounifyProviderIndex,
  input: {
    tmdbId?: number | null;
    title?: string | null;
    /** Prefer a browse row that targets this episode when metadata is present (new episodes, latest episode cards). */
    seasonNumber?: number | null;
    episodeNumber?: number | null;
  },
): YounifyRow | null {
  const wantS = input.seasonNumber;
  const wantE = input.episodeNumber;
  const wantEpisode = wantS != null && wantE != null;

  const pickFromList = (list: YounifyRow[] | undefined): YounifyRow | null => {
    if (!list?.length) return null;
    if (wantEpisode) {
      const matching = list.filter((r) => rowMatchesEpisode(r, wantS!, wantE!));
      if (matching.length) return matching[0];
    }
    return list[0];
  };

  if (input.tmdbId != null) {
    const picked = pickFromList(index.rowsByTmdbId.get(input.tmdbId));
    if (picked) return picked;
  }

  const normalized = normalizeTitle(String(input.title ?? ''));
  if (!normalized) return null;

  const byExactTitle = pickFromList(index.rowsByTitle.get(normalized));
  if (byExactTitle) return byExactTitle;

  // Deterministic loose fallback: shortest containing title wins.
  let best: YounifyRow | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const [title, rows] of index.rowsByTitle) {
    if (!title.includes(normalized) && !normalized.includes(title)) continue;
    const candidate = pickFromList(rows);
    if (!candidate) continue;
    if (title.length < bestLen) {
      best = candidate;
      bestLen = title.length;
    }
  }
  return best;
}
