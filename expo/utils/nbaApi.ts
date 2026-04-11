import { NBAGame, NBATeamStanding, getTeamLogo, getTeamColor } from '@/constants/nbaData';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

interface ESPNCompetitor {
  id: string;
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    logo: string;
    color?: string;
  };
  score?: string;
  winner?: boolean;
  records?: { summary: string }[];
}

interface ESPNCompetition {
  id: string;
  date: string;
  status: {
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
      detail: string;
      shortDetail: string;
    };
    period?: number;
    displayClock?: string;
  };
  competitors: ESPNCompetitor[];
  venue?: {
    fullName: string;
    address?: {
      city: string;
      state?: string;
    };
  };
  broadcasts?: { names: string[] }[];
  series?: {
    summary: string;
  };
  notes?: { headline: string }[];
}

interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  season: {
    year: number;
    type: number;
    slug: string;
  };
  competitions: ESPNCompetition[];
}

interface ESPNScoreboardResponse {
  events: ESPNEvent[];
}

interface ESPNStandingsEntry {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo: string;
  };
  stats: { name: string; value: number; displayValue: string }[];
}

interface ESPNStandingsGroup {
  name: string;
  standings: {
    entries: ESPNStandingsEntry[];
  };
}

function mapGameStatus(state: string, completed: boolean): 'upcoming' | 'completed' | 'live' {
  if (completed) return 'completed';
  if (state === 'in') return 'live';
  return 'upcoming';
}

function mapESPNEventToGame(event: ESPNEvent): NBAGame | null {
  const comp = event.competitions[0];
  if (!comp || comp.competitors.length < 2) return null;

  const home = comp.competitors.find((c: any) => c.homeAway === 'home') || comp.competitors[0];
  const away = comp.competitors.find((c: any) => c.homeAway === 'away') || comp.competitors[1];

  const status = mapGameStatus(comp.status.type.state, comp.status.type.completed);

  const seasonType = event.season.type;
  let seasonLabel = `${event.season.year - 1}-${String(event.season.year).slice(2)} Regular Season`;
  if (seasonType === 3) {
    const noteHeadline = comp.notes?.[0]?.headline || '';
    seasonLabel = noteHeadline || `${event.season.year - 1}-${String(event.season.year).slice(2)} Playoffs`;
  } else if (seasonType === 4) {
    seasonLabel = `${event.season.year - 1}-${String(event.season.year).slice(2)} Finals`;
  } else if (seasonType === 5) {
    seasonLabel = `${event.season.year - 1}-${String(event.season.year).slice(2)} Play-In`;
  }

  const broadcastNames = comp.broadcasts?.[0]?.names || [];

  const game: NBAGame = {
    id: parseInt(event.id, 10) || Math.random() * 100000,
    date: comp.date || event.date,
    status,
    season: seasonLabel,
    arena: comp.venue?.fullName || 'TBD',
    city: comp.venue?.address?.city || '',
    broadcast: broadcastNames.length > 0 ? broadcastNames[0] : undefined,
    series: comp.series?.summary,
    team1: {
      name: home.team.displayName,
      abbreviation: home.team.abbreviation,
      conference: '',
      record: home.records?.[0]?.summary,
      score: status !== 'upcoming' && home.score ? parseInt(home.score, 10) : undefined,
      logo: home.team.logo || getTeamLogo(home.team.abbreviation),
      winner: status === 'completed' ? home.winner : undefined,
    },
    team2: {
      name: away.team.displayName,
      abbreviation: away.team.abbreviation,
      conference: '',
      record: away.records?.[0]?.summary,
      score: status !== 'upcoming' && away.score ? parseInt(away.score, 10) : undefined,
      logo: away.team.logo || getTeamLogo(away.team.abbreviation),
      winner: status === 'completed' ? away.winner : undefined,
    },
  };

  if (status === 'live') {
    game.quarter = comp.status.period;
    game.timeRemaining = comp.status.displayClock;
  }

  return game;
}

export async function fetchNBAScoreboard(dateStr?: string): Promise<NBAGame[]> {
  try {
    const url = dateStr
      ? `${ESPN_BASE}/scoreboard?dates=${dateStr}`
      : `${ESPN_BASE}/scoreboard`;

    console.log('[NBA API] Fetching scoreboard:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log('[NBA API] Scoreboard response not ok:', response.status);
      return [];
    }

    const data: ESPNScoreboardResponse = await response.json();
    console.log('[NBA API] Got', data.events?.length || 0, 'events');

    const games = (data.events || [])
      .map(mapESPNEventToGame)
      .filter((g): g is NBAGame => g !== null);

    return games;
  } catch (error) {
    console.error('[NBA API] Error fetching scoreboard:', error);
    return [];
  }
}

export async function fetchNBAGamesMultipleDays(daysBefore: number = 3, daysAfter: number = 3): Promise<{
  live: NBAGame[];
  upcoming: NBAGame[];
  completed: NBAGame[];
}> {
  try {
    const dates: string[] = [];
    const now = new Date();

    for (let i = -daysBefore; i <= daysAfter; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}${month}${day}`);
    }

    console.log('[NBA API] Fetching games for dates:', dates.join(', '));

    const allGames: NBAGame[] = [];
    const results = await Promise.allSettled(
      dates.map(date => fetchNBAScoreboard(date))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allGames.push(...result.value);
      }
    }

    const seen = new Set<number>();
    const unique = allGames.filter(g => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });

    const live = unique.filter(g => g.status === 'live');
    const upcoming = unique
      .filter(g => g.status === 'upcoming')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const completed = unique
      .filter(g => g.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('[NBA API] Results - Live:', live.length, 'Upcoming:', upcoming.length, 'Completed:', completed.length);

    return { live, upcoming, completed };
  } catch (error) {
    console.error('[NBA API] Error fetching multiple days:', error);
    return { live: [], upcoming: [], completed: [] };
  }
}

export async function fetchNBAStandings(): Promise<{
  eastern: NBATeamStanding[];
  western: NBATeamStanding[];
}> {
  try {
    const url = `${ESPN_BASE}/standings`;
    console.log('[NBA API] Fetching standings:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log('[NBA API] Standings response not ok:', response.status);
      return { eastern: [], western: [] };
    }

    const data = await response.json();
    const children: ESPNStandingsGroup[] = data.children || [];

    const eastern: NBATeamStanding[] = [];
    const western: NBATeamStanding[] = [];

    for (const group of children) {
      const isEastern = group.name?.toLowerCase().includes('east');
      const entries = group.standings?.entries || [];

      for (const entry of entries) {
        const getStat = (name: string) => {
          const stat = entry.stats?.find((s: any) => s.name === name);
          return stat ? stat : null;
        };

        const wins = getStat('wins')?.value || 0;
        const losses = getStat('losses')?.value || 0;
        const pct = getStat('winPercent')?.displayValue || (wins / Math.max(wins + losses, 1)).toFixed(3);
        const streak = getStat('streak')?.displayValue || '-';
        const last10 = getStat('record')?.displayValue || '';

        const standing: NBATeamStanding = {
          id: entry.team.id,
          name: entry.team.displayName,
          abbreviation: entry.team.abbreviation,
          conference: isEastern ? 'Eastern' : 'Western',
          wins,
          losses,
          pct: typeof pct === 'number' ? `.${String(pct).replace('0.', '')}` : `.${pct.replace('0.', '')}`,
          streak,
          last10,
        };

        if (isEastern) {
          eastern.push(standing);
        } else {
          western.push(standing);
        }
      }
    }

    eastern.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    western.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    console.log('[NBA API] Standings - Eastern:', eastern.length, 'Western:', western.length);

    return { eastern, western };
  } catch (error) {
    console.error('[NBA API] Error fetching standings:', error);
    return { eastern: [], western: [] };
  }
}
