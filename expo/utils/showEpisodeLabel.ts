import type { Show } from '@/types/habit';
import { getContinueWatchingProgressPercent } from '@/utils/streamingLinks';
import { readSeasonEpisodeFromYounifyRow } from '@/utils/younifyProviderIndex';

export type ShowEpisodeLabelStyle = 'compact' | 'spaced' | 'bullet';

function formatSeasonEpisode(
  season: number,
  episode: number,
  style: ShowEpisodeLabelStyle,
): string {
  switch (style) {
    case 'spaced':
      return `S${season} E${episode}`;
    case 'bullet':
      return `S${season} • E${episode}`;
    default:
      return `S${season}E${episode}`;
  }
}

/** True when list storage still has the placeholder S1E1 from adding a title (no real progress). */
export function isUntouchedDefaultEpisodeProgress(
  show: Pick<Show, 'currentSeason' | 'currentEpisode' | 'createdAt' | 'updatedAt'>,
): boolean {
  return (
    show.currentSeason === 1 &&
    show.currentEpisode === 1 &&
    show.createdAt != null &&
    show.updatedAt != null &&
    show.createdAt === show.updatedAt
  );
}

/**
 * Episode label for a tracked show — prefers linked streaming progress, hides bogus S1E1 on add.
 * Returns null when there is no meaningful episode to show.
 */
export function formatShowEpisodeLabel(
  show: Show,
  younifyRow?: Record<string, unknown>,
  style: ShowEpisodeLabelStyle = 'bullet',
): string | null {
  if (show.type !== 'Series') return null;

  if (younifyRow) {
    const fromYounify = readSeasonEpisodeFromYounifyRow(younifyRow);
    if (fromYounify) {
      return formatSeasonEpisode(fromYounify.season, fromYounify.episode, style);
    }
  }

  const season = show.currentSeason;
  const episode = show.currentEpisode;
  if (season == null || episode == null) return null;
  if (isUntouchedDefaultEpisodeProgress(show)) return null;

  // Legacy list rows often store placeholder S1E1 — only show when streaming confirms watch progress.
  if (season === 1 && episode === 1) {
    if (!younifyRow) return null;
    if (getContinueWatchingProgressPercent(younifyRow) <= 0) return null;
  }

  return formatSeasonEpisode(season, episode, style);
}

/** Continue-watching rail row from Younify — hide S1E1 when there is no playback progress. */
export function formatYounifyContinueEpisodeLabel(row: Record<string, unknown>): string | null {
  const progress = readSeasonEpisodeFromYounifyRow(row);
  if (!progress) return null;
  const watchPct = getContinueWatchingProgressPercent(row);
  if (progress.season === 1 && progress.episode === 1 && watchPct <= 0) return null;
  return formatSeasonEpisode(progress.season, progress.episode, 'spaced');
}
