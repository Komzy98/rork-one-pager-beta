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
  input: { tmdbId?: number | null; title?: string | null },
): YounifyRow | null {
  if (input.tmdbId != null) {
    const byId = index.rowsByTmdbId.get(input.tmdbId);
    if (byId && byId.length) return byId[0];
  }

  const normalized = normalizeTitle(String(input.title ?? ''));
  if (!normalized) return null;

  const byExactTitle = index.rowsByTitle.get(normalized);
  if (byExactTitle && byExactTitle.length) return byExactTitle[0];

  // Deterministic loose fallback: shortest containing title wins.
  let best: YounifyRow | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const [title, rows] of index.rowsByTitle) {
    if (!title.includes(normalized) && !normalized.includes(title)) continue;
    const candidate = rows[0];
    if (!candidate) continue;
    if (title.length < bestLen) {
      best = candidate;
      bestLen = title.length;
    }
  }
  return best;
}
