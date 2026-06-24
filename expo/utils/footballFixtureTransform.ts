import type { LiveFootballMatch } from '@/types/habit';
import type { SportsMatchCardModel } from '@/components/PremiumSportsMatchCard';
import {
  formatFootballLeagueLabel,
  resolveMatchLeagueLogo,
  isWorldCupLeague,
} from '@/utils/footballLeagueLabel';

const LIVE_SHORT_STATUSES = new Set(['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT', 'INT', 'SUSP']);
const COMPLETED_SHORT_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

/** Max realistic window for a fixture still being live (regular time + ET + pens). */
const LIVE_MATCH_MAX_MS = 2.5 * 60 * 60 * 1000;

export function apiFixtureToLiveFootballMatch(fixture: any): LiveFootballMatch | null {
  if (!fixture?.fixture?.id) return null;

  const status = fixture.fixture?.status?.short;
  let matchStatus: LiveFootballMatch['status'] = 'Upcoming';

  if (LIVE_SHORT_STATUSES.has(String(status || '').toUpperCase())) {
    matchStatus = 'Live';
  } else if (COMPLETED_SHORT_STATUSES.has(String(status || '').toUpperCase())) {
    matchStatus = 'Completed';
  }

  const date = new Date(fixture.fixture?.date || Date.now());
  const timeString = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    id: String(fixture.fixture.id),
    homeTeam: fixture.teams?.home?.name || 'Home Team',
    awayTeam: fixture.teams?.away?.name || 'Away Team',
    homeTeamId: fixture.teams?.home?.id,
    awayTeamId: fixture.teams?.away?.id,
    homeScore: fixture.goals?.home ?? null,
    awayScore: fixture.goals?.away ?? null,
    status: matchStatus,
    league: formatFootballLeagueLabel(
      fixture.league?.name || 'League',
      fixture.league?.country,
      fixture.league?.id,
    ),
    leagueId: typeof fixture.league?.id === 'number' ? fixture.league.id : undefined,
    date: fixture.fixture?.date || new Date().toISOString(),
    time: timeString,
    venue: fixture.fixture?.venue?.name,
    elapsed: fixture.fixture?.status?.elapsed ?? undefined,
    homeTeamLogo: fixture.teams?.home?.logo,
    awayTeamLogo: fixture.teams?.away?.logo,
    leagueLogo: resolveMatchLeagueLogo({
      leagueId: fixture.league?.id,
      league: fixture.league?.name,
      leagueLogo: fixture.league?.logo,
    }),
    round: fixture.league?.round,
    statusText: fixture.fixture?.status?.long,
  };
}

export function apiFixturesToLiveFootballMatches(fixtures: unknown): LiveFootballMatch[] {
  if (!Array.isArray(fixtures)) return [];
  return fixtures
    .map((fixture) => apiFixtureToLiveFootballMatch(fixture))
    .filter((match): match is LiveFootballMatch => match != null);
}

function kickoffMs(match: LiveFootballMatch): number {
  const ms = new Date(match.date).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Pinned cards keep an AsyncStorage snapshot. When the match drops out of the
 * bundle (finished + filtered), we used to show that snapshot forever — including
 * a frozen LIVE minute. Expire obvious stale live snapshots by kickoff time.
 */
export function reconcileStalePinnedSnapshot(snapshot: LiveFootballMatch): LiveFootballMatch {
  if (snapshot.status !== 'Live') return snapshot;

  const started = kickoffMs(snapshot);
  if (started <= 0) return snapshot;

  if (Date.now() - started <= LIVE_MATCH_MAX_MS) return snapshot;

  return {
    ...snapshot,
    status: 'Completed',
    elapsed: undefined,
    statusText: 'FT',
  };
}

export function isPinnedSnapshotLikelyStale(snapshot: LiveFootballMatch): boolean {
  if (snapshot.status !== 'Live') return false;
  const started = kickoffMs(snapshot);
  if (started <= 0) return false;
  return Date.now() - started > LIVE_MATCH_MAX_MS;
}
