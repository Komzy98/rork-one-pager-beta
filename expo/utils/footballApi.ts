import { ApiFootballResponse, ApiFootballFixture, LiveFootballMatch } from '@/types/habit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateStr } from '@/utils/dateUtils';
import { formatFootballLeagueLabel } from '@/utils/footballLeagueLabel';

// Using API-Football (api-football.com) - the only football data source
// Dashboard: https://dashboard.api-football.com
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY || '';
const BASE_URL = 'https://v3.football.api-sports.io';

const headers = {
  'x-apisports-key': API_KEY
};

/** European club season year for API-Football (e.g. 2024 → 2024/25 campaign). */
export function getFootballCurrentSeason(now: Date = new Date()): number {
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month < 7) return year - 1;
  return year;
}

export type {
  TeamLeagueEntry,
  SquadPlayerLite,
  CoachLite,
  ApiStandingRow,
} from '@/utils/footballClubProfileShared';
export {
  pickPrimaryLeagueForTeam,
  findTeamStandingRow,
} from '@/utils/footballClubProfileShared';

// Check if API key is configured
function isApiConfigured(): boolean {
  const configured = !!API_KEY && API_KEY.length > 0;
  if (!configured) {
    console.warn('⚠️ Football API key not configured. Set EXPO_PUBLIC_FOOTBALL_API_KEY environment variable.');
  }
  return configured;
}

// Function to check if we should make API calls (rate limiting)
async function canMakeApiCall(): Promise<boolean> {
  try {
    const lastApiCall = await AsyncStorage.getItem('football_api_last_call');
    if (lastApiCall) {
      const lastCallTime = new Date(lastApiCall);
      const now = new Date();
      const secondsSinceLastCall = (now.getTime() - lastCallTime.getTime()) / 1000;
      
      // 2 seconds between API calls to avoid overwhelming the API
      if (secondsSinceLastCall < 2) {
        console.log('🚫 API call blocked - too soon since last call');
        return false;
      }
    }
  } catch (error) {
    console.error('Error checking last API call:', error);
  }
  
  return true;
}

export const footballApi = {
  async getLiveMatches(teamIds?: number[]): Promise<LiveFootballMatch[]> {
    console.log('🚀 getLiveMatches called');
    
    if (!isApiConfigured()) {
      console.log('⚠️ API key not configured, returning empty array');
      return [];
    }
    
    try {
      const url = `${BASE_URL}/fixtures?live=all`;
      console.log('🌐 Fetching live matches from:', url.replace(API_KEY, 'HIDDEN'));
      
      const response = await fetch(url, { method: 'GET', headers });
      
      if (!response.ok) {
        console.error('❌ Live matches API error:', response.status);
        return [];
      }
      
      const data: ApiFootballResponse = await response.json();
      console.log('✅ Live matches received:', data.response?.length || 0);
      
      if (data.response && data.response.length > 0) {
        let matches = data.response.map(transformFixtureToMatch);
        
        if (teamIds && teamIds.length > 0) {
          matches = matches.filter(match => 
            teamIds.some(id => {
              const teamName = getTeamNameFromId(id)?.toLowerCase();
              if (!teamName) return false;
              const home = match.homeTeam.toLowerCase().trim();
              const away = match.awayTeam.toLowerCase().trim();
              return home === teamName || away === teamName ||
                (match as any).homeTeamId === id || (match as any).awayTeamId === id;
            })
          );
        }
        
        return matches;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching live matches:', error);
      return [];
    }
  },

  async getTodayMatches(_teamIds?: number[], leagueIds?: number[]): Promise<LiveFootballMatch[]> {
    console.log('🚀 getTodayMatches called');
    
    if (!isApiConfigured()) {
      console.log('⚠️ API key not configured, returning empty array');
      return [];
    }
    
    try {
      const today = getLocalDateStr();
      let url = `${BASE_URL}/fixtures?date=${today}`;
      
      if (leagueIds && leagueIds.length > 0) {
        url += `&league=${leagueIds.join(',')}`;
      }
      
      console.log('🌐 Fetching today matches from:', url.replace(API_KEY, 'HIDDEN'));
      
      const response = await fetch(url, { method: 'GET', headers });
      
      if (!response.ok) {
        console.error('❌ Today matches API error:', response.status);
        return [];
      }
      
      const data: ApiFootballResponse = await response.json();
      console.log('✅ Today matches received:', data.response?.length || 0);
      
      if (data.response && data.response.length > 0) {
        return data.response.map(transformFixtureToMatch);
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching today matches:', error);
      return [];
    }
  },

  async getCompletedTodayMatches(_teamIds?: number[], leagueIds?: number[]): Promise<LiveFootballMatch[]> {
    console.log('🚀 getCompletedTodayMatches called');
    
    if (!isApiConfigured()) {
      console.log('⚠️ API key not configured, returning empty array');
      return [];
    }
    
    try {
      const today = getLocalDateStr();
      let url = `${BASE_URL}/fixtures?date=${today}`;
      
      if (leagueIds && leagueIds.length > 0) {
        url += `&league=${leagueIds.join(',')}`;
      }
      
      console.log('🌐 Fetching completed matches from:', url.replace(API_KEY, 'HIDDEN'));
      
      const response = await fetch(url, { method: 'GET', headers });
      
      if (!response.ok) {
        console.error('❌ Completed matches API error:', response.status);
        return [];
      }
      
      const data: ApiFootballResponse = await response.json();
      console.log('✅ Completed matches received:', data.response?.length || 0);
      
      if (data.response && data.response.length > 0) {
        return data.response
          .map(transformFixtureToMatch)
          .filter(match => match.status === 'Completed');
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching completed matches:', error);
      return [];
    }
  },

  async getUpcomingMatches(days: number = 7, teamIds?: number[], leagueIds?: number[], forceRefresh: boolean = false): Promise<LiveFootballMatch[]> {
    console.log('🚀 getUpcomingMatches called');
    console.log('📊 Parameters:', { days, teamIds, leagueIds, forceRefresh });
    
    if (!isApiConfigured()) {
      console.log('⚠️ API key not configured, returning empty array');
      return [];
    }
    
    try {
      const today = getLocalDateStr();
      const futureDate = getLocalDateStr(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
      
      let allMatches: LiveFootballMatch[] = [];
      
      // If we have team IDs, fetch matches for each team specifically
      if (teamIds && teamIds.length > 0) {
        console.log('🏆 Fetching upcoming matches for specific teams:', teamIds);
        // API-Football needs `season` when using from/to with team — often returns [] without it.
        // `next=N` is the reliable way to load a club's upcoming fixtures (same as server tRPC path).
        const nextCount = Math.min(30, Math.max(10, Math.ceil(days / 8)));

        const teamPromises = teamIds.slice(0, 5).map(async (teamId) => {
          const url = `${BASE_URL}/fixtures?team=${teamId}&next=${nextCount}`;
          console.log('🌐 Fetching for team', teamId, ':', url.replace(API_KEY, 'HIDDEN'));
          
          try {
            const response = await fetch(url, { method: 'GET', headers });
            if (!response.ok) {
              console.error('❌ Team', teamId, 'API error:', response.status);
              return [];
            }
            const data: ApiFootballResponse = await response.json();
            console.log('✅ Team', teamId, 'matches received:', data.response?.length || 0);
            return data.response || [];
          } catch (err) {
            console.error('❌ Team', teamId, 'fetch error:', err);
            return [];
          }
        });
        
        const teamResults = await Promise.all(teamPromises);
        const combinedFixtures = teamResults.flat();
        
        // Remove duplicates by fixture ID
        const uniqueFixtures = combinedFixtures.filter((fixture, index, self) =>
          index === self.findIndex(f => f.fixture.id === fixture.fixture.id)
        );
        
        console.log('✅ Total unique upcoming matches for teams:', uniqueFixtures.length);
        allMatches = uniqueFixtures.map(transformFixtureToMatch);
      } else {
        // Fallback to league-based query
        let url = `${BASE_URL}/fixtures?from=${today}&to=${futureDate}`;
        
        if (leagueIds && leagueIds.length > 0) {
          url += `&league=${leagueIds.join(',')}`;
        } else {
          url += `&league=39,140,78,135,61,2,3`;
        }
        
        console.log('🌐 Fetching upcoming matches from:', url.replace(API_KEY, 'HIDDEN'));
        
        const response = await fetch(url, { method: 'GET', headers });
        
        if (!response.ok) {
          console.error('❌ Upcoming matches API error:', response.status);
          return [];
        }
        
        const data: ApiFootballResponse = await response.json();
        console.log('✅ Upcoming matches received:', data.response?.length || 0);
        
        if (data.response && data.response.length > 0) {
          allMatches = data.response.map(transformFixtureToMatch);
        }
      }
      
      // Filter to only upcoming matches
      const upcomingMatches = allMatches.filter(match => match.status === 'Upcoming');
      console.log('📅 Filtered to upcoming only:', upcomingMatches.length);
      
      return upcomingMatches;
    } catch (error) {
      console.error('❌ Error fetching upcoming matches:', error);
      return [];
    }
  },

  async getLeagueMatches(leagueId: number, season: number = new Date().getFullYear()): Promise<LiveFootballMatch[]> {
    try {
      const response = await fetch(`${BASE_URL}/fixtures?league=${leagueId}&season=${season}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiFootballResponse = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        console.error('API Football errors:', data.errors);
        return [];
      }
      
      return data.response.map(transformFixtureToMatch);
    } catch (error) {
      console.error('Error fetching league matches:', error);
      return [];
    }
  },

  async searchTeams(teamName: string): Promise<{ id: number; name: string; logo: string }[]> {
    if (!isApiConfigured()) return [];
    try {
      const url = `${BASE_URL}/teams?search=${encodeURIComponent(teamName)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.log('Team search failed:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (data.response && data.response.length > 0) {
        return data.response.map((item: any) => ({
          id: item.team.id,
          name: item.team.name,
          logo: item.team.logo || ''
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching teams:', error);
      return [];
    }
  },

  async getTeamInfo(teamId: number): Promise<{
    id: number;
    name: string;
    logo: string;
    country: string;
    venue?: string;
    founded?: number;
  } | null> {
    if (!isApiConfigured()) {
      console.log('⚠️ API key not configured');
      return null;
    }
    
    try {
      const url = `${BASE_URL}/teams?id=${teamId}`;
      console.log('🔍 Fetching team info for ID:', teamId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.log('Team info fetch failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data.response && data.response.length > 0) {
        const team = data.response[0];
        console.log('✅ Team info retrieved:', team.team.name, '- Logo:', team.team.logo ? 'Yes' : 'No');
        return {
          id: team.team.id,
          name: team.team.name,
          logo: team.team.logo || '',
          country: team.team.country || '',
          venue: team.venue?.name,
          founded: typeof team.team.founded === 'number' ? team.team.founded : undefined,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching team info:', error);
      return null;
    }
  },

  /** Current-season competitions for this team (`current=true`). */
  async getTeamLeaguesCurrent(teamId: number): Promise<TeamLeagueEntry[]> {
    if (!isApiConfigured()) return [];
    try {
      const url = `${BASE_URL}/leagues?team=${teamId}&current=true`;
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return [];
      const data = await response.json();
      const rows = data.response ?? [];
      return rows
        .map((item: any) => ({
          id: item.league?.id as number | undefined,
          name: item.league?.name ?? '',
          logo: item.league?.logo,
          type: item.league?.type,
        }))
        .filter((l: TeamLeagueEntry): l is TeamLeagueEntry => typeof l.id === 'number' && Boolean(l.name));
    } catch {
      return [];
    }
  },

  async getLeagueStandingsRaw(leagueId: number, season?: number): Promise<unknown | null> {
    if (!isApiConfigured()) return null;
    const s = season ?? getFootballCurrentSeason();
    try {
      const url = `${BASE_URL}/standings?league=${leagueId}&season=${s}`;
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return null;
      const data = await response.json();
      return data.response ?? null;
    } catch {
      return null;
    }
  },

  /** Per-team season stats (form, goals, cards) for a league campaign. */
  async getTeamSeasonStatistics(teamId: number, leagueId: number, season?: number): Promise<Record<string, unknown> | null> {
    if (!isApiConfigured()) return null;
    const s = season ?? getFootballCurrentSeason();
    try {
      const url = `${BASE_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${s}`;
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return null;
      const data = await response.json();
      const r = data.response;
      return r && typeof r === 'object' ? (r as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  },

  /** Full squad with photos (`/players/squads`). */
  async getTeamSquadPlayers(teamId: number): Promise<SquadPlayerLite[]> {
    if (!isApiConfigured()) return [];
    try {
      const url = `${BASE_URL}/players/squads?team=${teamId}`;
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return [];
      const data = await response.json();
      const block = Array.isArray(data.response) ? data.response[0] : null;
      const rawPlayers = block?.players ?? [];
      const out: SquadPlayerLite[] = [];
      for (const entry of rawPlayers) {
        const pl = entry?.player ?? entry;
        const id = Number(pl?.id ?? entry?.id);
        const name = String(pl?.name ?? '').trim();
        if (!Number.isFinite(id) || !name) continue;
        out.push({
          id,
          name,
          photo: typeof pl.photo === 'string' ? pl.photo : undefined,
          position: pl.position ?? entry?.position,
          number: entry?.number ?? pl.number ?? null,
        });
      }
      return out;
    } catch {
      return [];
    }
  },

  /** Coaching staff with photos (`/coachs` — API spelling). */
  async getTeamCoaches(teamId: number): Promise<CoachLite[]> {
    if (!isApiConfigured()) return [];
    try {
      const url = `${BASE_URL}/coachs?team=${teamId}`;
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return [];
      const data = await response.json();
      const rows = data.response ?? [];
      return rows
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
    } catch {
      return [];
    }
  },

  async getMultipleTeamLogos(teamIds: number[]): Promise<Map<number, string>> {
    const logos = new Map<number, string>();
    
    if (!isApiConfigured() || teamIds.length === 0) {
      return logos;
    }
    
    console.log('🔍 Fetching logos for teams:', teamIds);
    
    // Batch requests to avoid rate limiting - process 3 at a time with delay
    const batchSize = 3;
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = teamIds.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(async (teamId) => {
          try {
            const info = await this.getTeamInfo(teamId);
            return { teamId, logo: info?.logo || '' };
          } catch {
            return { teamId, logo: '' };
          }
        })
      );
      
      results.forEach(({ teamId, logo }) => {
        if (logo) {
          logos.set(teamId, logo);
        }
      });
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < teamIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('✅ Retrieved logos for', logos.size, 'teams');
    return logos;
  }
};

function transformFixtureToMatch(fixture: ApiFootballFixture): LiveFootballMatch {
  const status = getMatchStatus(fixture.fixture.status.short, fixture.fixture.status.long);
  const date = new Date(fixture.fixture.date);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error('❌ Invalid date from API:', fixture.fixture.date);
    console.error('Fixture details:', {
      id: fixture.fixture.id,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      rawDate: fixture.fixture.date
    });
    
    // Fallback to current date
    const fallbackDate = new Date();
    const localDate = fallbackDate.toLocaleDateString('en-CA');
    const localTime = 'TBD';
    
    return {
      id: fixture.fixture.id.toString(),
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeTeamLogo: fixture.teams.home.logo,
      awayTeamLogo: fixture.teams.away.logo,
      homeTeamId: fixture.teams.home.id,
      awayTeamId: fixture.teams.away.id,
      league: formatFootballLeagueLabel(fixture.league.name, fixture.league.country, fixture.league.id, fixture.league.round),
      leagueLogo: fixture.league.logo,
      country: fixture.league.country,
      date: localDate,
      time: localTime,
      status,
      statusText: fixture.fixture.status.long,
      elapsed: fixture.fixture.status.elapsed || undefined,
      homeScore: fixture.goals.home ?? null,
      awayScore: fixture.goals.away ?? null,
      venue: fixture.fixture.venue.name || undefined,
      round: fixture.league.round
    };
  }
  
  // Convert to user's local timezone for display
  const localDate = date.toLocaleDateString('en-CA');
  const localTime = date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  return {
    id: fixture.fixture.id.toString(),
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeTeamLogo: fixture.teams.home.logo,
    awayTeamLogo: fixture.teams.away.logo,
    homeTeamId: fixture.teams.home.id,
    awayTeamId: fixture.teams.away.id,
    league: formatFootballLeagueLabel(fixture.league.name, fixture.league.country, fixture.league.id, fixture.league.round),
    leagueLogo: fixture.league.logo,
    country: fixture.league.country,
    date: localDate,
    time: localTime,
    status,
    statusText: fixture.fixture.status.long,
    elapsed: fixture.fixture.status.elapsed || undefined,
    homeScore: fixture.goals.home ?? null,
    awayScore: fixture.goals.away ?? null,
    venue: fixture.fixture.venue.name || undefined,
    round: fixture.league.round
  };
}

function getMatchStatus(shortStatus: string, longStatus: string): 'Live' | 'Upcoming' | 'Completed' {
  console.log('🔍 Match status check:', { shortStatus, longStatus });
  
  // Live statuses - expanded list
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE', 'WU'].includes(shortStatus)) {
    console.log('✅ Status identified as LIVE');
    return 'Live';
  }
  
  // Completed statuses
  if (['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(shortStatus)) {
    console.log('✅ Status identified as COMPLETED');
    return 'Completed';
  }
  
  // Upcoming statuses - expanded list
  if (['TBD', 'NS', 'TIMED', 'SCHEDULED'].includes(shortStatus)) {
    console.log('✅ Status identified as UPCOMING');
    return 'Upcoming';
  }
  
  // Check if the match is in the future based on long status
  if (longStatus && longStatus.toLowerCase().includes('not started')) {
    console.log('✅ Status identified as UPCOMING (from long status)');
    return 'Upcoming';
  }
  
  // Default to upcoming for unknown statuses
  console.log('⚠️ Unknown status, defaulting to UPCOMING');
  return 'Upcoming';
}

// League categories for sophisticated filtering
export const LEAGUE_CATEGORIES = {
  TOP_5: {
    name: 'Top 5 Leagues',
    emoji: '⭐',
    leagues: {
      PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      LA_LIGA: { id: 140, name: 'La Liga', country: 'Spain', emoji: '🇪🇸' },
      BUNDESLIGA: { id: 78, name: 'Bundesliga', country: 'Germany', emoji: '🇩🇪' },
      SERIE_A: { id: 135, name: 'Serie A', country: 'Italy', emoji: '🇮🇹' },
      LIGUE_1: { id: 61, name: 'Ligue 1', country: 'France', emoji: '🇫🇷' }
    }
  },
  EUROPEAN_CUPS: {
    name: 'European Competitions',
    emoji: '🏆',
    leagues: {
      CHAMPIONS_LEAGUE: { id: 2, name: 'Champions League', country: 'Europe', emoji: '🏆' },
      EUROPA_LEAGUE: { id: 3, name: 'Europa League', country: 'Europe', emoji: '🥈' },
      CONFERENCE_LEAGUE: { id: 848, name: 'Conference League', country: 'Europe', emoji: '🥉' }
    }
  },
  INTERNATIONAL: {
    name: 'International',
    emoji: '🌍',
    leagues: {
      WORLD_CUP: { id: 1, name: 'World Cup', country: 'FIFA', emoji: '🏆' },
      EUROS: { id: 4, name: 'Euro Championship', country: 'UEFA', emoji: '🇪🇺' },
      NATIONS_LEAGUE: { id: 5, name: 'Nations League', country: 'UEFA', emoji: '🏅' },
      COPA_AMERICA: { id: 9, name: 'Copa America', country: 'CONMEBOL', emoji: '🏆' },
      EURO_QUALIFIERS: { id: 960, name: 'Euro Qualifiers', country: 'UEFA', emoji: '🇪🇺' },
      WORLD_CUP_QUALIFIERS_UEFA: { id: 15, name: 'World Cup Qualifiers UEFA', country: 'UEFA', emoji: '🌍' },
      WORLD_CUP_QUALIFIERS_CONMEBOL: { id: 16, name: 'World Cup Qualifiers CONMEBOL', country: 'CONMEBOL', emoji: '🌎' },
      WORLD_CUP_QUALIFIERS_CONCACAF: { id: 17, name: 'World Cup Qualifiers CONCACAF', country: 'CONCACAF', emoji: '🌎' },
      WORLD_CUP_QUALIFIERS_AFC: { id: 18, name: 'World Cup Qualifiers AFC', country: 'AFC', emoji: '🌏' },
      WORLD_CUP_QUALIFIERS_CAF: { id: 19, name: 'World Cup Qualifiers CAF', country: 'CAF', emoji: '🌍' },
      WORLD_CUP_QUALIFIERS_OFC: { id: 20, name: 'World Cup Qualifiers OFC', country: 'OFC', emoji: '🌏' },
      NATIONS_LEAGUE_A: { id: 961, name: 'Nations League A', country: 'UEFA', emoji: '🥇' },
      NATIONS_LEAGUE_B: { id: 962, name: 'Nations League B', country: 'UEFA', emoji: '🥈' },
      NATIONS_LEAGUE_C: { id: 963, name: 'Nations League C', country: 'UEFA', emoji: '🥉' },
      NATIONS_LEAGUE_D: { id: 964, name: 'Nations League D', country: 'UEFA', emoji: '🏅' }
    }
  },
  ENGLISH_SYSTEM: {
    name: 'English Football',
    emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    leagues: {
      PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England', emoji: '⭐' },
      CHAMPIONSHIP: { id: 40, name: 'Championship', country: 'England', emoji: '🥈' },
      LEAGUE_ONE: { id: 41, name: 'League One', country: 'England', emoji: '🥉' },
      LEAGUE_TWO: { id: 42, name: 'League Two', country: 'England', emoji: '4️⃣' },
      NATIONAL_LEAGUE: { id: 43, name: 'National League', country: 'England', emoji: '5️⃣' },
      FA_CUP: { id: 45, name: 'FA Cup', country: 'England', emoji: '🏆' },
      EFL_CUP: { id: 46, name: 'EFL Cup', country: 'England', emoji: '🏆' }
    }
  },
  DOMESTIC_CUPS: {
    name: 'Other Domestic Cups',
    emoji: '🏆',
    leagues: {
      COPA_DEL_REY: { id: 143, name: 'Copa del Rey', country: 'Spain', emoji: '🇪🇸' },
      DFB_POKAL: { id: 81, name: 'DFB Pokal', country: 'Germany', emoji: '🇩🇪' },
      COPPA_ITALIA: { id: 137, name: 'Coppa Italia', country: 'Italy', emoji: '🇮🇹' },
      COUPE_DE_FRANCE: { id: 66, name: 'Coupe de France', country: 'France', emoji: '🇫🇷' }
    }
  },
  OTHER_LEAGUES: {
    name: 'Other Top Leagues',
    emoji: '⚽',
    leagues: {
      EREDIVISIE: { id: 88, name: 'Eredivisie', country: 'Netherlands', emoji: '🇳🇱' },
      PRIMEIRA_LIGA: { id: 94, name: 'Primeira Liga', country: 'Portugal', emoji: '🇵🇹' },
      PREMIER_LEAGUE_RUS: { id: 235, name: 'Premier League', country: 'Russia', emoji: '🇷🇺' },
      MLS: { id: 253, name: 'MLS', country: 'USA', emoji: '🇺🇸' },
      LIGA_MX: { id: 262, name: 'Liga MX', country: 'Mexico', emoji: '🇲🇽' },
      BRASILEIRAO: { id: 71, name: 'Brasileirão', country: 'Brazil', emoji: '🇧🇷' }
    }
  },
  FRIENDLIES: {
    name: 'Friendlies & Preseason',
    emoji: '🤝',
    leagues: {
      CLUB_FRIENDLIES: { id: 667, name: 'Club Friendlies', country: 'International', emoji: '🤝' },
      INTERNATIONAL_FRIENDLIES: { id: 10, name: 'International Friendlies', country: 'FIFA', emoji: '🌍' }
    }
  }
};

// Flatten all leagues for easy access
export const ALL_LEAGUES = Object.values(LEAGUE_CATEGORIES)
  .reduce((acc, category) => ({ ...acc, ...category.leagues }), {} as Record<string, { id: number; name: string; country: string; emoji: string }>);

// Popular league IDs for quick access (backwards compatibility)
export const POPULAR_LEAGUES = Object.fromEntries(
  Object.entries(ALL_LEAGUES).map(([key, league]) => [key, league.id])
);

// Common team name to API ID mapping for optimization
const TEAM_ID_MAPPING: Record<string, number> = {
  // Premier League
  'manchester united': 33,
  'man united': 33,
  'man utd': 33,
  'manchester utd': 33,

  'mufc': 33,
  'manchester city': 50,
  'man city': 50,

  'mcfc': 50,
  'liverpool': 40,
  'lfc': 40,
  'liverpool fc': 40,
  'chelsea': 49,
  'chelsea fc': 49,
  'cfc': 49,
  'arsenal': 42,
  'arsenal fc': 42,
  'afc': 42,
  'tottenham': 47,
  'tottenham hotspur': 47,
  'spurs': 47,
  'thfc': 47,
  
  // La Liga
  'barcelona': 529,
  'fc barcelona': 529,
  'barca': 529,
  'barça': 529,
  'fcb': 529,
  'real madrid': 541,

  'rmcf': 541,
  'atletico madrid': 530,
  'atletico': 530,
  'atleti': 530,
  
  // Bundesliga
  'bayern munich': 157,
  'bayern': 157,
  'fc bayern': 157,
  'borussia dortmund': 165,
  'dortmund': 165,
  'bvb': 165,
  
  // Serie A
  'juventus': 496,
  'juve': 496,
  'juventus fc': 496,
  'ac milan': 489,

  'acm': 489,
  'inter milan': 505,

  'internazionale': 505,
  
  // Ligue 1
  'paris saint-germain': 85,
  'psg': 85,
  'paris sg': 85
};

// Helper function to get team API ID from name
export function getTeamIdFromName(teamName: string): number | undefined {
  const normalizedName = teamName.toLowerCase().trim();
  return TEAM_ID_MAPPING[normalizedName];
}

// Helper function to get team name from API ID
function getTeamNameFromId(teamId: number): string | undefined {
  const ID_TO_TEAM_NAME: Record<number, string> = {
    33: 'Manchester United',
    50: 'Manchester City',
    40: 'Liverpool',
    49: 'Chelsea',
    42: 'Arsenal',
    47: 'Tottenham',
    529: 'Barcelona',
    541: 'Real Madrid',
    530: 'Atletico Madrid',
    157: 'Bayern Munich',
    165: 'Borussia Dortmund',
    496: 'Juventus',
    489: 'AC Milan',
    505: 'Inter Milan',
    85: 'PSG'
  };
  return ID_TO_TEAM_NAME[teamId];
}

// Helper function to check if we have API ID for a team
export function hasTeamApiId(teamName: string): boolean {
  return getTeamIdFromName(teamName) !== undefined;
}

// Helper function to clear rate limit cache (for debugging)
export async function clearRateLimit(): Promise<void> {
  try {
    await AsyncStorage.removeItem('football_api_last_call');
  } catch (error) {
    console.error('Error clearing rate limit cache:', error);
  }
  console.log('✅ Rate limit cache cleared, will try real API on next request');
}

// Helper function to get current API status
export async function getApiStatus(): Promise<{ lastApiCall: string | null, canMakeCall: boolean }> {
  let lastApiCall: string | null = null;
  
  try {
    lastApiCall = await AsyncStorage.getItem('football_api_last_call');
  } catch (error) {
    console.error('Error getting API status:', error);
  }
  
  return {
    lastApiCall,
    canMakeCall: await canMakeApiCall()
  };
}

// Debug function to test Barcelona specifically
export async function debugBarcelonaMatches(): Promise<void> {
  console.log('🔍 === BARCELONA DEBUG START ===');
  
  try {
    // Clear rate limit first
    await clearRateLimit();
    
    const barcelonaId = 529;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    
    console.log('📅 Date range:', { today, nextWeek });
    console.log('🏆 Barcelona team ID:', barcelonaId);
    console.log('🕐 Current London time:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
    
    // Test 1: Get today's Barcelona matches
    console.log('\n🔍 Test 1: Today\'s Barcelona matches');
    let url = `${BASE_URL}/fixtures?date=${today}&team=${barcelonaId}`;
    console.log('🌐 URL:', url.replace(API_KEY, 'HIDDEN'));
    
    let response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Today Barcelona API Response:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🏆 Barcelona matches found today:');
        data.response.forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`);
          console.log(`   League: ${match.league.name} (ID: ${match.league.id})`);
          console.log(`   Date: ${match.fixture.date}`);
          console.log(`   Status: ${match.fixture.status.short} - ${match.fixture.status.long}`);
          console.log('   ---');
        });
      } else {
        console.log('❌ No Barcelona matches found for today');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Today Barcelona API Error:', { status: response.status, body: errorText });
    }
    
    // Test 2: Get this week's Barcelona matches
    console.log('\n🔍 Test 2: This week\'s Barcelona matches');
    url = `${BASE_URL}/fixtures?from=${today}&to=${nextWeek}&team=${barcelonaId}`;
    console.log('🌐 URL:', url.replace(API_KEY, 'HIDDEN'));
    
    response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Week Barcelona API Response:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🏆 Barcelona matches found this week:');
        data.response.forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`);
          console.log(`   League: ${match.league.name} (ID: ${match.league.id})`);
          console.log(`   Date: ${match.fixture.date}`);
          console.log(`   Status: ${match.fixture.status.short} - ${match.fixture.status.long}`);
          console.log(`   London Time: ${new Date(match.fixture.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
          console.log('   ---');
        });
        
        // Check for Champions League matches specifically
        const clMatches = data.response.filter((match: any) => 
          match.league.name.toLowerCase().includes('champions') ||
          match.league.id === 2
        );
        
        if (clMatches.length > 0) {
          console.log('🏆 Champions League matches found:');
          clMatches.forEach((match: any, index: number) => {
            console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} - ${match.league.name}`);
            console.log(`   Date: ${match.fixture.date}`);
            console.log(`   London Time: ${new Date(match.fixture.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
          });
        }
      } else {
        console.log('❌ No Barcelona matches found for this week');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Week Barcelona API Error:', { status: response.status, body: errorText });
    }
    
    // Test 3: Get Barcelona matches without date filter (next 30 days)
    console.log('\n🔍 Test 3: Barcelona matches (next 30 days)');
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    url = `${BASE_URL}/fixtures?from=${today}&to=${futureDate}&team=${barcelonaId}`;
    console.log('🌐 URL:', url.replace(API_KEY, 'HIDDEN'));
    
    response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 30-day Barcelona API Response:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🏆 Barcelona matches found (next 30 days):');
        data.response.slice(0, 5).forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`);
          console.log(`   League: ${match.league.name}`);
          console.log(`   Date: ${match.fixture.date}`);
          console.log(`   London Time: ${new Date(match.fixture.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
          console.log(`   Status: ${match.fixture.status.short} - ${match.fixture.status.long}`);
          console.log('   ---');
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Barcelona Debug Error:', error);
  }
  
  console.log('🔍 === BARCELONA DEBUG END ===');
}

// Simple test function to make ONE API call and show raw data
export async function testSingleAPICall(): Promise<void> {
  console.log('🔍 === SINGLE API CALL TEST ===');
  
  try {
    // Clear rate limit first
    await clearRateLimit();
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    
    // Make ONE simple API call for upcoming matches
    const url = `${BASE_URL}/fixtures?from=${today}&to=${nextWeek}&league=39,140,78,135,61,2,3,15,16,17,18,19,20`;
    console.log('🌐 Making single API call:', url.replace(API_KEY, 'HIDDEN'));
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Rate limit info:', {
      remaining: response.headers.get('x-ratelimit-remaining'),
      limit: response.headers.get('x-ratelimit-limit'),
      reset: response.headers.get('x-ratelimit-reset')
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ RAW API RESPONSE:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🏆 FIRST 5 RAW MATCHES:');
        data.response.slice(0, 5).forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`);
          console.log(`   League: ${match.league.name} (ID: ${match.league.id})`);
          console.log(`   Date: ${match.fixture.date}`);
          console.log(`   Status: ${match.fixture.status.short} - ${match.fixture.status.long}`);
          console.log('   ---');
        });
        
        // Look specifically for UEFA/World Cup matches
        const uefaMatches = data.response.filter((match: any) => 
          match.league.name.toLowerCase().includes('qualif') || 
          match.league.name.toLowerCase().includes('world cup') ||
          match.league.name.toLowerCase().includes('nations league')
        );
        
        console.log(`🌍 UEFA/QUALIFIER MATCHES FOUND: ${uefaMatches.length}`);
        if (uefaMatches.length > 0) {
          uefaMatches.slice(0, 3).forEach((match: any, index: number) => {
            console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} - ${match.league.name}`);
          });
        }
      } else {
        console.log('❌ NO MATCHES IN RESPONSE');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API ERROR:', { status: response.status, body: errorText });
    }
  } catch (error) {
    console.error('💥 TEST ERROR:', error);
  }
  
  console.log('🔍 === SINGLE API CALL TEST END ===');
}

// Comprehensive debug function to test all API issues
export async function debugAllAPIs(): Promise<void> {
  console.log('🔍 === COMPREHENSIVE API DEBUG START ===');
  
  // Test basic connectivity
  console.log('🌐 Testing basic connectivity...');
  try {
    const testResponse = await fetch('https://httpbin.org/get', { method: 'GET' });
    console.log('✅ Basic internet connectivity:', testResponse.ok);
  } catch (error) {
    console.error('❌ Basic connectivity failed:', error);
    return;
  }
  
  // Test API-Football connectivity
  console.log('🏈 Testing API-Football connectivity...');
  try {
    const testUrl = `${BASE_URL}/status`;
    console.log('Testing URL:', testUrl.replace(API_KEY, 'HIDDEN'));
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers
    });
    
    console.log('API-Football status endpoint response:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API-Football status data:', data);
    } else {
      const errorText = await response.text();
      console.error('❌ API-Football status error:', { status: response.status, body: errorText });
    }
  } catch (error) {
    console.error('❌ API-Football connectivity test failed:', error);
  }
  
  // Test simple fixtures endpoint
  console.log('🏈 Testing API-Football fixtures endpoint...');
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const testUrl = `${BASE_URL}/fixtures?date=${today}&league=39`; // Premier League only
    console.log('Testing fixtures URL:', testUrl.replace(API_KEY, 'HIDDEN'));
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers
    });
    
    console.log('API-Football fixtures response status:', response.status);
    console.log('API-Football fixtures response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API-Football fixtures data:', {
        results: data.results,
        errors: data.errors,
        responseLength: data.response?.length || 0,
        rateLimit: {
          remaining: response.headers.get('x-ratelimit-remaining'),
          limit: response.headers.get('x-ratelimit-limit'),
          reset: response.headers.get('x-ratelimit-reset')
        }
      });
      
      if (data.response && data.response.length > 0) {
        console.log('Sample fixture:', data.response[0]);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API-Football fixtures error:', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
    }
  } catch (error) {
    console.error('❌ API-Football fixtures test failed:', error);
  }
  
  // Test rate limiting status
  console.log('⏱️ Testing rate limiting status...');
  const apiStatus = await getApiStatus();
  console.log('Rate limit status:', apiStatus);
  
  console.log('🔍 === COMPREHENSIVE API DEBUG END ===');
}

// Debug function to test UEFA qualifiers specifically
export async function debugUEFAQualifiers(): Promise<void> {
  console.log('🔍 DEBUG: Testing UEFA Qualifiers API...');
  
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    console.log('📅 Date range:', { today, nextWeek });
    
    // Test with comprehensive UEFA league IDs including World Cup Qualifiers
    const uefaLeagues = [
      // Nations League
      5, 960, 961, 962, 963, 964, 965,
      // World Cup Qualifiers by confederation
      15, 16, 17, 18, 19, 20, // UEFA, CONMEBOL, CONCACAF, AFC, CAF, OFC
      // Euro Qualifiers
      960,
      // Additional potential UEFA qualifier IDs
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      // Try some higher IDs that might be used for qualifiers
      480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490
    ];
    
    // Test today first
    let url = `${BASE_URL}/fixtures?date=${today}&league=${uefaLeagues.join(',')}`;
    console.log('🌐 Testing today URL:', url.replace(API_KEY, 'HIDDEN'));
    
    let response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    console.log('📊 Today response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ UEFA Today API Response:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🏆 UEFA Matches found today:');
        data.response.forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} - ${match.league.name} (ID: ${match.league.id})`);
        });
      } else {
        console.log('❌ No UEFA matches found for today');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ UEFA Today API Error:', { status: response.status, body: errorText });
    }
    
    // Test next 7 days
    url = `${BASE_URL}/fixtures?from=${today}&to=${nextWeek}&league=${uefaLeagues.join(',')}`;
    console.log('🌐 Testing week URL:', url.replace(API_KEY, 'HIDDEN'));
    
    response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    console.log('📊 Week response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ UEFA Week API Response:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🏆 UEFA Matches found this week:');
        const qualifierMatches = data.response.filter((match: any) => 
          match.league.name.toLowerCase().includes('qualif') || 
          match.league.name.toLowerCase().includes('world cup')
        );
        
        console.log(`📊 Total UEFA matches: ${data.response.length}`);
        console.log(`🌍 World Cup Qualifier matches: ${qualifierMatches.length}`);
        
        data.response.slice(0, 10).forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} - ${match.league.name} (ID: ${match.league.id}) - ${match.fixture.date}`);
        });
        
        if (qualifierMatches.length > 0) {
          console.log('🌍 World Cup Qualifier matches specifically:');
          qualifierMatches.forEach((match: any, index: number) => {
            console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} - ${match.league.name} (ID: ${match.league.id}) - ${match.fixture.date}`);
          });
        }
      } else {
        console.log('❌ No UEFA matches found for this week');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ UEFA Week API Error:', { status: response.status, body: errorText });
    }
    
    // Test specific search for World Cup qualifiers
    console.log('🔍 Testing specific World Cup qualifier search...');
    url = `${BASE_URL}/fixtures?from=${today}&to=${nextWeek}&search=world cup qualif`;
    console.log('🌐 Testing search URL:', url.replace(API_KEY, 'HIDDEN'));
    
    response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ World Cup Search Response:', {
        results: data.results,
        errors: data.errors,
        matchCount: data.response?.length || 0
      });
      
      if (data.response && data.response.length > 0) {
        console.log('🌍 World Cup matches from search:');
        data.response.slice(0, 5).forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} - ${match.league.name} (ID: ${match.league.id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 UEFA Debug Error:', error);
  }
}