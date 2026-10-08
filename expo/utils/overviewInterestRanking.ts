import type { PersonalSignal } from '@/utils/interestSignalEngine';
import {
  formatEpisodeTimingLabel,
  resolveEpisodeForSurface,
  type EpisodeLike,
  type EpisodeTiming,
} from '@/utils/episodeReleaseTiming';

export type OverviewInterestSignal =
  | {
      id: string;
      kind: 'football';
      category: 'sports';
      priority: number;
      title: string;
      subtitle: string;
      reason: string;
      occurredAt: string;
      football: PersonalSignal;
    }
  | {
      id: string;
      kind: 'episode';
      category: 'shows';
      priority: number;
      title: string;
      subtitle: string;
      reason: string;
      occurredAt: string;
      timing: EpisodeTiming;
      show: ShowEpisodeInterestInput;
      episode: EpisodeLike;
    };

export interface ShowEpisodeInterestInput {
  showId: string;
  showTitle: string;
  tmdbId: number;
  platform: string;
  posterUrl: string | null;
  showStatus: string;
  latestEpisode: EpisodeLike | null;
  nextEpisode: EpisodeLike | null;
}

function scoreEpisodeSignal(
  timing: EpisodeTiming,
  daysFromToday: number | null,
  showStatus: string,
): number {
  const affinity = showStatus === 'Watching' ? 7 : showStatus === 'Plan to Watch' ? 2 : 0;

  switch (timing) {
    case 'today':
      return 94 + affinity;
    case 'tomorrow':
      return 88 + affinity;
    case 'recent':
      return 82 - Math.abs(daysFromToday ?? 0) + affinity;
    case 'upcoming':
      return Math.max(60, 78 - Math.max(2, daysFromToday ?? 14)) + affinity;
    default:
      return 0;
  }
}

function formatEpisodeSubtitle(
  episode: EpisodeLike,
  timing: EpisodeTiming,
  daysFromToday: number | null,
  platform: string,
): string {
  const label = formatEpisodeTimingLabel({
    episode,
    timing,
    daysFromToday,
  });
  const code = `S${episode.seasonNumber}E${episode.episodeNumber}`;
  return [label, code, platform].filter(Boolean).join(' · ');
}

/**
 * Ranks heterogeneous personal-interest signals for the tiny amount of space
 * available on Overview.
 *
 * The score intentionally favours:
 * - things happening now/today;
 * - explicit favourites/tracked shows;
 * - imminent changes the user can act on;
 * - confidence from deterministic source data.
 *
 * Full feeds stay in their dedicated tabs. Overview only surfaces the best few.
 */
export function buildOverviewInterestSignals(params: {
  footballSignals: readonly PersonalSignal[];
  showEpisodes: readonly ShowEpisodeInterestInput[];
  todayYmd: string;
  limit?: number;
}): OverviewInterestSignal[] {
  const { footballSignals, showEpisodes, todayYmd, limit = 4 } = params;
  const signals: OverviewInterestSignal[] = [];

  for (const football of footballSignals) {
    signals.push({
      id: football.id,
      kind: 'football',
      category: 'sports',
      priority: football.priority,
      title: football.title,
      subtitle: football.subtitle,
      reason: football.reason,
      occurredAt: football.occurredAt,
      football,
    });
  }

  for (const show of showEpisodes) {
    const resolved = resolveEpisodeForSurface(
      show.latestEpisode,
      show.nextEpisode,
      todayYmd,
    );
    if (!resolved) continue;

    const score = scoreEpisodeSignal(
      resolved.timing,
      resolved.daysFromToday,
      show.showStatus,
    );
    if (score <= 0) continue;

    signals.push({
      id: `episode:${show.tmdbId}:s${resolved.episode.seasonNumber}e${resolved.episode.episodeNumber}`,
      kind: 'episode',
      category: 'shows',
      priority: score,
      title:
        resolved.timing === 'today'
          ? `${show.showTitle} has a new episode today`
          : resolved.timing === 'tomorrow'
            ? `${show.showTitle} has a new episode tomorrow`
            : resolved.timing === 'recent'
              ? `A new ${show.showTitle} episode is out`
              : `${show.showTitle} returns soon`,
      subtitle: formatEpisodeSubtitle(
        resolved.episode,
        resolved.timing,
        resolved.daysFromToday,
        show.platform,
      ),
      reason:
        show.showStatus === 'Watching'
          ? `Because you’re watching ${show.showTitle}`
          : `Because ${show.showTitle} is on your list`,
      occurredAt: resolved.episode.airDate ?? todayYmd,
      timing: resolved.timing,
      show,
      episode: resolved.episode,
    });
  }

  return signals
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.occurredAt.localeCompare(b.occurredAt);
    })
    .slice(0, Math.max(0, limit));
}
