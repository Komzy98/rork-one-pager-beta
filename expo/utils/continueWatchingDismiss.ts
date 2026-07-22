import { extractTmdbIdFromYounifyRow } from '@/utils/aroundYouImages';
import type { Show } from '@/types/habit';

export const DISMISSED_CONTINUE_WATCHING_STORAGE_BASE = 'dismissed_continue_watching';

export function getYounifyContinueWatchingDismissKey(
  row: Record<string, unknown>,
  fallbackKey: string,
): string {
  const tmdbId = extractTmdbIdFromYounifyRow(row);
  if (tmdbId != null) return `tmdb:${tmdbId}`;
  return `younify:${String(row.itemID ?? row.itemId ?? row.id ?? fallbackKey)}`;
}

export function getLocalShowContinueWatchingDismissKey(show: Pick<Show, 'id' | 'tmdbId'>): string {
  if (show.tmdbId != null) return `tmdb:${show.tmdbId}`;
  return `local:${show.id}`;
}

export type ContinueWatchingDismissItem =
  | { kind: 'local'; show: Pick<Show, 'id' | 'tmdbId' | 'title'> }
  | { kind: 'younify'; row: Record<string, unknown>; key: string };

export function getContinueWatchingDismissKey(item: ContinueWatchingDismissItem): string {
  if (item.kind === 'local') return getLocalShowContinueWatchingDismissKey(item.show);
  return getYounifyContinueWatchingDismissKey(item.row, item.key);
}

export function getContinueWatchingTitle(item: ContinueWatchingDismissItem): string {
  if (item.kind === 'local') return item.show.title;
  const row = item.row;
  return String(row.showTitle || row.title || 'This title');
}
