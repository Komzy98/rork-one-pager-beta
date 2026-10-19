import type { Show } from '../types/habit';

export type LibrarySection = 'Watching' | 'Plan to Watch' | 'Completed' | 'On Hold' | 'all';
export type LibraryMediaFilter = 'all' | 'movie' | 'tv';
export type LibrarySort = 'recent' | 'title' | 'added';

export const LIBRARY_SECTION_LABELS: Record<LibrarySection, string> = {
  Watching: 'Watching',
  'Plan to Watch': 'Watchlist',
  Completed: 'Watched',
  'On Hold': 'Paused',
  all: 'All',
};

export function libraryMediaType(show: Show): 'movie' | 'tv' {
  return show.mediaType === 'movie' || show.type === 'Movie' ? 'movie' : 'tv';
}

export function normalizeLibraryKey(tmdbId: number | undefined, mediaType: 'movie' | 'tv' | undefined) {
  return tmdbId && mediaType ? `${mediaType}:${tmdbId}` : null;
}

export function filterLibrary(shows: readonly Show[], opts: {
  section: LibrarySection; media: LibraryMediaFilter; search?: string; sort?: LibrarySort;
}): Show[] {
  const term = opts.search?.trim().toLowerCase() ?? '';
  return shows
    .filter(s => opts.section === 'all' || s.status === opts.section)
    .filter(s => opts.media === 'all' || libraryMediaType(s) === opts.media)
    .filter(s => !term || s.title.toLowerCase().includes(term))
    .sort((a, b) => {
      if (opts.sort === 'title') return a.title.localeCompare(b.title);
      const aTime = Date.parse(opts.sort === 'added' ? a.createdAt : a.updatedAt) || 0;
      const bTime = Date.parse(opts.sort === 'added' ? b.createdAt : b.updatedAt) || 0;
      return bTime - aTime;
    });
}

export type EpisodePosition = { season: number; episode: number };
export type SeasonInventory = { season_number: number; episodes?: readonly { episode_number: number; air_date?: string | null }[] };
export type ProgressResult = { next: EpisodePosition | null; completed: EpisodePosition; isFinale: boolean };

export function nextWatchedEpisode(
  watched: EpisodePosition,
  seasons: readonly SeasonInventory[],
  nowYmd: string,
): ProgressResult {
  const available = seasons
    .filter(s => s.season_number > 0)
    .flatMap(s => (s.episodes || []).map(ep => ({
      season: s.season_number, episode: ep.episode_number, air_date: ep.air_date,
    })))
    .filter(ep => ep.episode > 0 && !!ep.air_date && ep.air_date <= nowYmd)
    .sort((a, b) => a.season - b.season || a.episode - b.episode);
  const next = available.find(ep =>
    ep.season > watched.season || (ep.season === watched.season && ep.episode > watched.episode)
  );
  return {
    next: next ? { season: next.season, episode: next.episode } : null,
    completed: watched,
    isFinale: !next,
  };
}
