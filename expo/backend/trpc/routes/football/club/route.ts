import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getFootballApiKeyFromEnv } from '@/backend/utils/footballApiKey';
import {
  FOOTBALL_API_BASE_URL,
  CACHE_TTL,
  cachedFetch,
  getCurrentSeason,
} from '@/backend/trpc/routes/football/matches/route';
import {
  findTeamStandingRow,
  pickPrimaryLeagueForTeam,
  type ApiStandingRow,
  type CoachLite,
  type SquadPlayerLite,
  type TeamLeagueEntry,
} from '@/utils/footballApi';

const LIVE_SHORT = new Set(['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT', 'INT', 'SUSP']);
const COMPLETED_SHORT = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

function transformFixtureToLite(fixture: any) {
  const status = String(fixture.fixture?.status?.short ?? '').toUpperCase();
  let matchStatus: 'Live' | 'Upcoming' | 'Completed' = 'Upcoming';
  if (LIVE_SHORT.has(status)) matchStatus = 'Live';
  else if (COMPLETED_SHORT.has(status)) matchStatus = 'Completed';

  const date = new Date(fixture.fixture?.date || Date.now());
  const timeString = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    id: String(fixture.fixture?.id ?? ''),
    homeTeam: fixture.teams?.home?.name || 'Home Team',
    awayTeam: fixture.teams?.away?.name || 'Away Team',
    homeTeamId: fixture.teams?.home?.id,
    awayTeamId: fixture.teams?.away?.id,
    homeScore: fixture.goals?.home ?? null,
    awayScore: fixture.goals?.away ?? null,
    status: matchStatus,
    league: fixture.league?.name || 'League',
    date: fixture.fixture?.date || new Date().toISOString(),
    time: timeString,
    venue: fixture.fixture?.venue?.name,
    elapsed: fixture.fixture?.status?.elapsed,
    homeTeamLogo: fixture.teams?.home?.logo,
    awayTeamLogo: fixture.teams?.away?.logo,
    leagueLogo: fixture.league?.logo,
  };
}

export const searchTeamsRoute = publicProcedure
  .input(
    z.object({
      query: z.string().trim().min(2).max(80),
    }),
  )
  .query(async ({ input }) => {
    const apiKey = getFootballApiKeyFromEnv();
    if (!apiKey) {
      return { teams: [] as { id: number; name: string; logo: string }[], errors: { config: 'API key not configured' } };
    }

    const headers = { 'x-apisports-key': apiKey };
    const url = `${FOOTBALL_API_BASE_URL}/teams?search=${encodeURIComponent(input.query)}`;
    const data = await cachedFetch(url, headers, `teams:search:${input.query.toLowerCase()}`, 24 * 60 * 60 * 1000);
    const teams = (data.response ?? [])
      .map((item: any) => ({
        id: item.team?.id as number,
        name: String(item.team?.name ?? ''),
        logo: String(item.team?.logo ?? ''),
      }))
      .filter((t: { id: number; name: string }) => Number.isFinite(t.id) && t.name.length > 0);

    return { teams, errors: data.errors?.rateLimit ? { rateLimit: data.errors.rateLimit } : {} };
  });

export const getClubProfileRoute = publicProcedure
  .input(
    z.object({
      teamId: z.number().int().positive().max(99999),
      season: z.number().int().min(1900).max(2100).optional(),
      nextFixtures: z.number().int().min(1).max(30).optional(),
    }),
  )
  .query(async ({ input }) => {
    const { teamId } = input;
    const season = input.season ?? getCurrentSeason();
    const nextN = input.nextFixtures ?? 15;
    const apiKey = getFootballApiKeyFromEnv();

    if (!apiKey) {
      return {
        info: null,
        leagues: [] as TeamLeagueEntry[],
        primaryLeague: null as TeamLeagueEntry | null,
        season,
        standing: null as ApiStandingRow | null,
        statsForm: undefined as string | undefined,
        upcoming: [] as ReturnType<typeof transformFixtureToLite>[],
        squad: [] as SquadPlayerLite[],
        coaches: [] as CoachLite[],
        errors: { config: 'API key not configured' as const },
      };
    }

    const headers = { 'x-apisports-key': apiKey };
    const detailTtl = 15 * 60 * 1000;

    const [teamData, leaguesData, fixturesData, squadData, coachesData] = await Promise.all([
      cachedFetch(
        `${FOOTBALL_API_BASE_URL}/teams?id=${teamId}`,
        headers,
        `club:team:${teamId}`,
        detailTtl,
      ),
      cachedFetch(
        `${FOOTBALL_API_BASE_URL}/leagues?team=${teamId}&current=true`,
        headers,
        `club:leagues:${teamId}`,
        detailTtl,
      ),
      cachedFetch(
        `${FOOTBALL_API_BASE_URL}/fixtures?team=${teamId}&next=${nextN}`,
        headers,
        `club:fixtures:next:${teamId}:${nextN}`,
        CACHE_TTL.upcoming,
      ),
      cachedFetch(
        `${FOOTBALL_API_BASE_URL}/players/squads?team=${teamId}`,
        headers,
        `club:squad:${teamId}`,
        detailTtl,
      ),
      cachedFetch(
        `${FOOTBALL_API_BASE_URL}/coachs?team=${teamId}`,
        headers,
        `club:coaches:${teamId}`,
        detailTtl,
      ),
    ]);

    const teamRow = teamData.response?.[0];
    const info = teamRow
      ? {
          id: teamRow.team?.id ?? teamId,
          name: String(teamRow.team?.name ?? ''),
          logo: String(teamRow.team?.logo ?? ''),
          country: String(teamRow.team?.country ?? ''),
          venue: teamRow.venue?.name as string | undefined,
          founded: typeof teamRow.team?.founded === 'number' ? teamRow.team.founded : undefined,
        }
      : null;

    const leagues: TeamLeagueEntry[] = (leaguesData.response ?? [])
      .map((item: any) => ({
        id: item.league?.id as number | undefined,
        name: item.league?.name ?? '',
        logo: item.league?.logo,
        type: item.league?.type,
      }))
      .filter((l: TeamLeagueEntry): l is TeamLeagueEntry => typeof l.id === 'number' && Boolean(l.name));

    const primaryLeague = pickPrimaryLeagueForTeam(leagues);

    let standing: ApiStandingRow | null = null;
    let statsForm: string | undefined;

    if (primaryLeague?.id) {
      const [standingsRaw, statsData] = await Promise.all([
        cachedFetch(
          `${FOOTBALL_API_BASE_URL}/standings?league=${primaryLeague.id}&season=${season}`,
          headers,
          `club:standings:${primaryLeague.id}:${season}`,
          CACHE_TTL.standings,
        ),
        cachedFetch(
          `${FOOTBALL_API_BASE_URL}/teams/statistics?team=${teamId}&league=${primaryLeague.id}&season=${season}`,
          headers,
          `club:stats:${teamId}:${primaryLeague.id}:${season}`,
          detailTtl,
        ),
      ]);
      standing = findTeamStandingRow(standingsRaw.response ?? null, teamId);
      const stats = statsData.response;
      const form = stats && typeof stats === 'object' && 'form' in stats ? stats.form : undefined;
      statsForm = typeof form === 'string' ? form : undefined;
    }

    const upcoming = (fixturesData.response ?? []).map(transformFixtureToLite);

    const squadBlock = Array.isArray(squadData.response) ? squadData.response[0] : null;
    const rawPlayers = squadBlock?.players ?? [];
    const squad: SquadPlayerLite[] = [];
    for (const entry of rawPlayers) {
      const pl = entry?.player ?? entry;
      const id = Number(pl?.id ?? entry?.id);
      const name = String(pl?.name ?? '').trim();
      if (!Number.isFinite(id) || !name) continue;
      squad.push({
        id,
        name,
        photo: typeof pl.photo === 'string' ? pl.photo : undefined,
        position: pl.position ?? entry?.position,
        number: entry?.number ?? pl.number ?? null,
      });
    }

    const coaches: CoachLite[] = (coachesData.response ?? [])
      .map((c: any) => {
        const name =
          String(c?.name ?? '').trim() ||
          `${String(c?.firstname ?? '').trim()} ${String(c?.lastname ?? '').trim()}`.trim();
        return {
          name,
          photo: typeof c?.photo === 'string' ? c.photo : undefined,
        };
      })
      .filter((c: CoachLite) => c.name.length > 0);

    const rateLimit =
      teamData.errors?.rateLimit ||
      leaguesData.errors?.rateLimit ||
      fixturesData.errors?.rateLimit;

    return {
      info,
      leagues,
      primaryLeague,
      season,
      standing,
      statsForm,
      upcoming,
      squad,
      coaches,
      errors: rateLimit ? { rateLimit: String(rateLimit) } : {},
    };
  });
