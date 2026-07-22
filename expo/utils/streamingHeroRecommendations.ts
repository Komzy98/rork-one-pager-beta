import type { ForYouPersonalizationContext } from '@/utils/showsForYouPersonalization';
import {
  buildStreamingHeroWhyLabel,
  STREAMING_HERO_WHY_FIELD,
} from '@/utils/streamingHeroPersonalization';

export const STREAMING_HERO_MIN_ITEMS = 10;
export const STREAMING_HERO_MAX_ITEMS = 12;

export type StreamingBrowseSection = {
  id: string;
  items: readonly unknown[];
};

type YounifyRow = Record<string, unknown>;

function extractTmdbIdFromRow(row: YounifyRow): number | null {
  const tryNum = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };
  for (const key of ['tmdbId', 'tmdbID', 'tmdb_id', 'theMovieDbId']) {
    const id = tryNum(row[key]);
    if (id != null) return id;
  }
  return null;
}

function younifyServiceToTmdbProviderId(
  service: { id?: string; name?: string } | null | undefined,
): number | null {
  if (!service) return null;
  const raw = `${String(service.id ?? '')} ${String(service.name ?? '')}`.toLowerCase();
  if (!raw.trim()) return null;
  const rules: { re: RegExp; id: number }[] = [
    { re: /netflix|nflx/, id: 8 },
    { re: /disney|disney\+|disneyplus/, id: 337 },
    { re: /hbo max|hbomax/, id: 1899 },
    { re: /\bhbo\b(?!\s*max)/, id: 384 },
    { re: /^max$|\bmax app\b/, id: 1899 },
    { re: /hulu/, id: 15 },
    { re: /prime video|amazon prime|amazon video|\bprime\b(?=.*video)|\baiv\b/, id: 9 },
    { re: /peacock/, id: 386 },
    { re: /paramount/, id: 531 },
    { re: /apple tv|appletv|\btv\+\b/, id: 350 },
  ];
  for (const { re, id } of rules) {
    if (re.test(raw)) return id;
  }
  const numeric = Number(String(service.id ?? '').trim());
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null;
}

/** Provider recommendation rails — not in-progress continue rows. */
const HERO_SECTION_WEIGHT: Record<string, number> = {
  recommended: 100,
  trending: 72,
  acclaimed: 52,
  watchlist: 38,
};

function rowDedupeKey(row: YounifyRow): string {
  const tmdbId = extractTmdbIdFromRow(row);
  if (tmdbId != null) return `tmdb:${tmdbId}`;
  const title = String(row.title ?? row.name ?? '')
    .trim()
    .toLowerCase();
  const providerId = younifyServiceToTmdbProviderId(
    row.younifySourceService as { id?: string; name?: string } | undefined,
  );
  return `title:${title}:${providerId ?? 'unknown'}`;
}

function rowPopularity(row: YounifyRow): number {
  const v = row.popularity ?? row.score ?? row.rating ?? row.vote_average;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function scoreStreamingHeroRow(
  row: YounifyRow,
  sectionId: string,
  ctx: ForYouPersonalizationContext | null,
  linkedProviderIds: readonly number[],
): number {
  let score = HERO_SECTION_WEIGHT[sectionId] ?? 12;
  const tmdbId = extractTmdbIdFromRow(row);
  if (ctx && tmdbId != null) {
    if (ctx.savedTmdbIds.has(tmdbId)) score += 45;
    if (ctx.continueWatchingTmdbIds.has(tmdbId)) score += 20;
    if (ctx.younifyLinkedTmdbIds.has(tmdbId)) score += 18;
    if (ctx.regionalTmdbIds.has(tmdbId)) score += 12;
  }

  const providerId = younifyServiceToTmdbProviderId(
    row.younifySourceService as { id?: string; name?: string } | undefined,
  );
  if (providerId != null && linkedProviderIds.includes(providerId)) {
    const rank = linkedProviderIds.indexOf(providerId);
    score += Math.max(0, 10 - rank);
  }

  score += Math.min(rowPopularity(row), 10) * 2.5;
  return score;
}

/**
 * Hero carousel for the Streaming tab: platform "Recommended / Trending / Acclaimed" rows,
 * ranked with the same TMDB profile signals as For You, with at least `minItems` titles
 * balanced across linked services when possible.
 */
export function buildStreamingHeroRecommendations(
  sections: readonly StreamingBrowseSection[],
  linkedProviderIds: readonly number[],
  personalization: ForYouPersonalizationContext | null,
  options?: { minItems?: number; maxItems?: number },
): YounifyRow[] {
  const minItems = options?.minItems ?? STREAMING_HERO_MIN_ITEMS;
  const maxItems = Math.max(minItems, options?.maxItems ?? STREAMING_HERO_MAX_ITEMS);

  const scored: {
    row: YounifyRow;
    score: number;
    providerId: number | null;
    sectionId: string;
  }[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    if (section.id === 'continue') continue;
    const items = Array.isArray(section.items) ? section.items : [];
    for (const raw of items) {
      const row = raw as YounifyRow;
      const title = String(row.title ?? row.name ?? '').trim();
      if (title.length < 2 && !extractTmdbIdFromRow(row)) continue;

      const key = rowDedupeKey(row);
      if (seen.has(key)) continue;
      seen.add(key);

      const providerId = younifyServiceToTmdbProviderId(
        row.younifySourceService as { id?: string; name?: string } | undefined,
      );
      if (linkedProviderIds.length > 0 && providerId != null && !linkedProviderIds.includes(providerId)) {
        continue;
      }

      scored.push({
        row,
        score: scoreStreamingHeroRow(row, section.id, personalization, linkedProviderIds),
        providerId,
        sectionId: section.id,
      });
    }
  }

  if (!scored.length) return [];

  scored.sort((a, b) => b.score - a.score || rowPopularity(b.row) - rowPopularity(a.row));

  const byProvider = new Map<number | null, typeof scored>();
  for (const entry of scored) {
    const bucket = byProvider.get(entry.providerId) ?? [];
    bucket.push(entry);
    byProvider.set(entry.providerId, bucket);
  }

  const providerOrder = [...byProvider.keys()].sort((a, b) => {
    const ia = a != null ? linkedProviderIds.indexOf(a) : 999;
    const ib = b != null ? linkedProviderIds.indexOf(b) : 999;
    return ia - ib;
  });

  const picked: YounifyRow[] = [];
  const pickedKeys = new Set<string>();
  let round = 0;

  while (picked.length < maxItems && providerOrder.length > 0) {
    let addedThisRound = 0;
    for (const providerId of providerOrder) {
      const bucket = byProvider.get(providerId) ?? [];
      const entry = bucket[round];
      if (!entry) continue;
      const key = rowDedupeKey(entry.row);
      if (pickedKeys.has(key)) continue;
      const rowWithWhy = {
        ...entry.row,
        [STREAMING_HERO_WHY_FIELD]: buildStreamingHeroWhyLabel(
          entry.sectionId,
          entry.row,
          personalization,
        ),
      };
      picked.push(rowWithWhy);
      pickedKeys.add(key);
      addedThisRound++;
      if (picked.length >= maxItems) break;
    }
    if (addedThisRound === 0) break;
    round++;
  }

  if (picked.length < minItems) {
    for (const entry of scored) {
      const key = rowDedupeKey(entry.row);
      if (pickedKeys.has(key)) continue;
      const rowWithWhy = {
        ...entry.row,
        [STREAMING_HERO_WHY_FIELD]: buildStreamingHeroWhyLabel(
          entry.sectionId,
          entry.row,
          personalization,
        ),
      };
      picked.push(rowWithWhy);
      pickedKeys.add(key);
      if (picked.length >= minItems) break;
    }
  }

  return picked.slice(0, maxItems);
}
