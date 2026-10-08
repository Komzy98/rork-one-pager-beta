export type EpisodeTiming =
  | 'recent'
  | 'today'
  | 'tomorrow'
  | 'upcoming'
  | 'past'
  | 'unknown';

export type EpisodeLike = {
  name: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
};

export type ResolvedEpisode = {
  episode: EpisodeLike;
  timing: EpisodeTiming;
  daysFromToday: number | null;
};

function parseDateOnly(value: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

function dateOnlyToUtcDays(value: string | null | undefined): number | null {
  const parts = parseDateOnly(value);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / 86_400_000);
}

export function daysBetweenDateOnly(
  airDate: string | null | undefined,
  todayYmd: string,
): number | null {
  const air = dateOnlyToUtcDays(airDate);
  const today = dateOnlyToUtcDays(todayYmd);
  if (air == null || today == null) return null;
  return air - today;
}

export function classifyEpisodeTiming(
  airDate: string | null | undefined,
  todayYmd: string,
): { timing: EpisodeTiming; daysFromToday: number | null } {
  const diff = daysBetweenDateOnly(airDate, todayYmd);
  if (diff == null) return { timing: 'unknown', daysFromToday: null };
  if (diff === 0) return { timing: 'today', daysFromToday: 0 };
  if (diff === 1) return { timing: 'tomorrow', daysFromToday: 1 };
  if (diff > 1) return { timing: 'upcoming', daysFromToday: diff };
  if (diff >= -7) return { timing: 'recent', daysFromToday: diff };
  return { timing: 'past', daysFromToday: diff };
}

function episodeKey(episode: EpisodeLike): string {
  return `${episode.seasonNumber}:${episode.episodeNumber}:${episode.airDate ?? ''}`;
}

/**
 * Pick the single episode that deserves surfacing for a tracked show.
 *
 * Truth rules:
 * - future dates are never treated as released;
 * - today/tomorrow outrank older releases;
 * - recent releases are limited to the previous seven calendar days;
 * - future episodes are limited to the next fourteen calendar days;
 * - date-only TMDB values are compared as calendar dates, not JS UTC timestamps.
 */
export function resolveEpisodeForSurface(
  latestEpisode: EpisodeLike | null | undefined,
  nextEpisode: EpisodeLike | null | undefined,
  todayYmd: string,
): ResolvedEpisode | null {
  const unique = new Map<string, EpisodeLike>();
  for (const episode of [latestEpisode, nextEpisode]) {
    if (!episode) continue;
    unique.set(episodeKey(episode), episode);
  }

  const ranked = Array.from(unique.values())
    .flatMap((episode) => {
      const classification = classifyEpisodeTiming(episode.airDate, todayYmd);
      const diff = classification.daysFromToday;
      if (diff == null || diff < -7 || diff > 14) return [];

      let score: number | null = null;
      switch (classification.timing) {
        case 'today':
          score = 100;
          break;
        case 'tomorrow':
          score = 96;
          break;
        case 'recent':
          score = 90 - Math.abs(diff);
          break;
        case 'upcoming':
          score = 88 - diff;
          break;
        default:
          return [];
      }

      return [{
        episode,
        timing: classification.timing,
        daysFromToday: diff,
        score,
      }];
    })
    .sort((a, b) => b.score - a.score);

  const chosen = ranked[0];
  if (!chosen) return null;
  return {
    episode: chosen.episode,
    timing: chosen.timing,
    daysFromToday: chosen.daysFromToday,
  };
}

export function formatEpisodeTimingLabel(resolved: ResolvedEpisode): string {
  switch (resolved.timing) {
    case 'today':
      return 'OUT TODAY';
    case 'tomorrow':
      return 'TOMORROW';
    case 'recent':
      return 'NOW STREAMING';
    case 'upcoming':
      return resolved.daysFromToday === 1
        ? 'TOMORROW'
        : `IN ${resolved.daysFromToday} DAYS`;
    default:
      return '';
  }
}
