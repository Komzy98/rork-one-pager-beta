import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

const BASE_URL = 'https://v3.football.api-sports.io';

function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month < 7) return year - 1;
  return year;
}

function getAlternateSeason(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month < 7) return year;
  return year - 1;
}

const DOMESTIC_CUP_LEAGUES = [
  45, 48, 143, 81, 137, 66,
];

interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 500;
const CACHE_EVICT_COUNT = 50;

const CACHE_TTL: Record<string, number> = {
  live: 20 * 1000,
  upcoming: 30 * 60 * 1000,
  today: 5 * 60 * 1000,
  results: 2 * 60 * 60 * 1000,
  standings: 60 * 60 * 1000,
  matchDetails: 60 * 1000,
};

let apiCallCount = 0;
let apiCallWindowStart = Date.now();
const API_CALL_BUDGET_PER_MINUTE = 80;

function canMakeApiCall(): boolean {
  const now = Date.now();
  if (now - apiCallWindowStart > 60 * 1000) {
    apiCallCount = 0;
    apiCallWindowStart = now;
  }
  return apiCallCount < API_CALL_BUDGET_PER_MINUTE;
}

function trackApiCall(): void {
  apiCallCount++;
}

function getCacheKey(type: string, params: Record<string, any>): string {
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    const val = params[key];
    if (val !== undefined && val !== null) acc[key] = val;
    return acc;
  }, {} as Record<string, any>);
  return `${type}:${JSON.stringify(sorted)}`;
}

function getFromCache(key: string, ttl: number): any {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function getStaleFromCache(key: string): any {
  const entry = apiCache.get(key);
  if (!entry) return null;
  console.log(`🕐 Stale cache fallback for ${key.substring(0, 80)}`);
  return entry.data;
}

function setCache(key: string, data: any): void {
  apiCache.set(key, { data, timestamp: Date.now() });
  if (apiCache.size > MAX_CACHE_SIZE) {
    const oldest = [...apiCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < CACHE_EVICT_COUNT && i < oldest.length; i++) apiCache.delete(oldest[i][0]);
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function cachedFetch(url: string, headers: Record<string, string>, cacheKey: string, ttl: number): Promise<any> {
  const cached = getFromCache(cacheKey, ttl);
  if (cached) return cached;

  if (!canMakeApiCall()) {
    console.warn(`🚫 API budget exceeded (${apiCallCount}/${API_CALL_BUDGET_PER_MINUTE}/min), using stale cache for ${cacheKey.substring(0, 60)}`);
    const stale = getStaleFromCache(cacheKey);
    if (stale) return stale;
    await delay(2000);
    if (!canMakeApiCall()) {
      console.warn(`🚫 Still over budget after wait, returning empty for ${cacheKey.substring(0, 60)}`);
      return { response: [] };
    }
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      trackApiCall();
      const controller = new AbortController();
      const perRequestTimeout = attempt === 0 ? 8000 : 6000;
      const timeoutId = setTimeout(() => controller.abort(), perRequestTimeout);
      const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn(`⚠️ Rate limited for ${cacheKey.substring(0, 60)}, attempt ${attempt + 1}`);
        apiCallCount = API_CALL_BUDGET_PER_MINUTE;
        const stale = getStaleFromCache(cacheKey);
        if (stale) return stale;
        if (attempt < maxRetries - 1) {
          await delay(3000 * (attempt + 1));
          continue;
        }
        return { response: [] };
      }

      if (!response.ok) {
        console.error(`❌ API Error ${response.status} for ${cacheKey.substring(0, 60)}`);
        const stale = getStaleFromCache(cacheKey);
        if (stale) return stale;
        return { response: [] };
      }

      const data = await response.json();

      if (data.errors && Object.keys(data.errors).length > 0) {
        console.warn(`⚠️ API returned errors for ${cacheKey.substring(0, 60)}:`, JSON.stringify(data.errors));
        const stale = getStaleFromCache(cacheKey);
        if (stale) return stale;
      }

      setCache(cacheKey, data);
      return data;
    } catch (error: any) {
      lastError = error;
      console.error(`💥 Fetch error for ${cacheKey.substring(0, 60)} (attempt ${attempt + 1}):`, error.message);
      if (attempt < maxRetries - 1) {
        await delay(1000 * (attempt + 1));
        continue;
      }
    }
  }

  const stale = getStaleFromCache(cacheKey);
  if (stale) return stale;

  console.error(`❌ All retries exhausted for ${cacheKey.substring(0, 60)}:`, lastError?.message);
  return { response: [] };
}

const KEY_INTERNATIONAL_LEAGUES = [
  5, 10, 6, 15, 16, 17, 18, 19, 20, 4, 9, 7, 21,
];

const INTERNATIONAL_COMPETITIONS = KEY_INTERNATIONAL_LEAGUES;

export { INTERNATIONAL_COMPETITIONS };

const CORE_LEAGUES = [39, 140, 78, 135, 61, 2, 3];
const SECONDARY_LEAGUES = [848, 45, 48, 143, 81, 137, 66];

export const getMatchesRoute = publicProcedure
  .input(z.object({
    type: z.enum(['live', 'upcoming', 'today', 'results']),
    days: z.number().int().min(1).max(90).optional(),
    leagueIds: z.array(z.number().int().positive().max(99999)).max(100).optional(),
    teamIds: z.array(z.number().int().positive().max(99999)).max(30).optional(),
    nationalTeamIds: z.array(z.number().int().positive().max(99999)).max(30).optional(),
    includeAfcon: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    const { type, days = 14, leagueIds, teamIds, nationalTeamIds, includeAfcon } = input;

    const topLevelCacheKey = getCacheKey(type, { days, leagueIds, teamIds, nationalTeamIds, includeAfcon });
    const topLevelTtl = CACHE_TTL[type] || 60000;
    const cachedResult = getFromCache(topLevelCacheKey, topLevelTtl);
    if (cachedResult) {
      console.log(`⚡ Full response cache HIT for ${type}`);
      return cachedResult;
    }

    const staleTopLevel = getStaleFromCache(topLevelCacheKey);

    const apiKey = process.env.FOOTBALL_API_KEY;
    const season = getCurrentSeason();

    console.log(`🏈 API-Football Request - Type: ${type}, Season: ${season}, Teams: ${teamIds?.length || 0}, NationalTeams: ${nationalTeamIds?.length || 0}, Budget: ${API_CALL_BUDGET_PER_MINUTE - apiCallCount} remaining`);

    if (!apiKey) {
      console.error('❌ FOOTBALL_API_KEY not found in environment');
      if (staleTopLevel) return staleTopLevel;
      return { response: [], results: 0, errors: { config: 'API key not configured' }, paging: {}, parameters: { type, days } };
    }

    const headers: Record<string, string> = { 'x-apisports-key': apiKey };
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

    if (type === 'live') {
      const url = `${BASE_URL}/fixtures?live=all`;
      const cacheKey = `live:all`;
      const data = await cachedFetch(url, headers, cacheKey, CACHE_TTL.live);
      const matches = data.response || [];
      console.log(`✅ ${matches.length} live matches`);

      const result = { response: matches, results: matches.length, errors: data.errors || {}, paging: data.paging || {}, parameters: { type, days } };
      setCache(topLevelCacheKey, result);
      return result;
    }

    const hasUserSelectedLeagues = leagueIds && leagueIds.length > 0;
    const targetTeams = teamIds || [];
    const allMatches: any[] = [];
    const seenFixtureIds = new Set<number>();
    const hasTeams = targetTeams.length > 0;

    let fromDate = today;
    let toDate = today;

    if (type === 'upcoming') {
      fromDate = today;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      toDate = futureDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    } else if (type === 'results') {
      fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      toDate = today;
    }

    const addMatches = (matches: any[]) => {
      for (const match of matches) {
        const fixtureId = match.fixture?.id;
        if (fixtureId && !seenFixtureIds.has(fixtureId)) {
          seenFixtureIds.add(fixtureId);
          allMatches.push(match);
        }
      }
    };

    const fetchLeagueMatchesForSeason = async (leagueId: number, fetchSeason: number): Promise<any[]> => {
      let url = '';
      if (type === 'today') {
        url = `${BASE_URL}/fixtures?date=${today}&league=${leagueId}`;
      } else if (type === 'results') {
        url = `${BASE_URL}/fixtures?league=${leagueId}&season=${fetchSeason}&from=${fromDate}&to=${toDate}&status=FT-AET-PEN`;
      } else {
        url = `${BASE_URL}/fixtures?league=${leagueId}&season=${fetchSeason}&from=${fromDate}&to=${toDate}`;
      }
      const ck = `league:${leagueId}:${type}:${fromDate}:${toDate}:${fetchSeason}`;
      const data = await cachedFetch(url, headers, ck, topLevelTtl);
      return data.response || [];
    };

    const fetchLeagueMatches = async (leagueId: number): Promise<any[]> => {
      return fetchLeagueMatchesForSeason(leagueId, season);
    };

    const fetchTeamMatches = async (teamId: number): Promise<any[]> => {
      if (type === 'today') {
        const url = `${BASE_URL}/fixtures?date=${today}&team=${teamId}`;
        const ck = `team:${teamId}:today:${today}`;
        const data = await cachedFetch(url, headers, ck, topLevelTtl);
        const matches = data.response || [];
        console.log(`⚽ Team ${teamId} today: ${matches.length} matches`);
        return matches;
      }
      if (type === 'results') {
        const url = `${BASE_URL}/fixtures?team=${teamId}&last=20`;
        const ck = `team:${teamId}:results:last20`;
        const data = await cachedFetch(url, headers, ck, topLevelTtl);
        const matches = data.response || [];
        console.log(`⚽ Team ${teamId} results: ${matches.length} matches`);
        return matches;
      }
      // upcoming: API-Football requires `season` when using from/to with team.
      // Use `next=N` directly which doesn't require season and avoids wasted calls.
      const url = `${BASE_URL}/fixtures?team=${teamId}&next=15`;
      const ck = `team:${teamId}:upcoming:next15`;
      const data = await cachedFetch(url, headers, ck, topLevelTtl);
      const matches = data.response || [];
      console.log(`⚽ Team ${teamId} upcoming: ${matches.length} matches`);
      return matches;
    };

    const fetchNationalTeamMatches = async (teamId: number): Promise<any[]> => {
      let url = '';
      let ck = '';
      if (type === 'today') {
        url = `${BASE_URL}/fixtures?date=${today}&team=${teamId}`;
        ck = `national:${teamId}:today:${today}`;
      } else if (type === 'results') {
        url = `${BASE_URL}/fixtures?team=${teamId}&last=15`;
        ck = `national:${teamId}:results:last15`;
      } else {
        url = `${BASE_URL}/fixtures?team=${teamId}&next=10`;
        ck = `national:${teamId}:upcoming:next10`;
      }
      const data = await cachedFetch(url, headers, ck, topLevelTtl);
      return data.response || [];
    };

    const fetchIntlLeague = async (leagueId: number): Promise<any[]> => {
      let url = '';
      if (type === 'today') {
        url = `${BASE_URL}/fixtures?date=${today}&league=${leagueId}`;
      } else if (type === 'results') {
        url = `${BASE_URL}/fixtures?league=${leagueId}&from=${fromDate}&to=${toDate}&status=FT-AET-PEN`;
      } else {
        url = `${BASE_URL}/fixtures?league=${leagueId}&from=${fromDate}&to=${toDate}`;
      }
      const ck = `intl:${leagueId}:${type}:${fromDate}:${toDate}`;
      const data = await cachedFetch(url, headers, ck, topLevelTtl);
      return data.response || [];
    };

    try {
      const allPromises: Promise<any[]>[] = [];

      if (hasTeams) {
        const limitedTeams = targetTeams.slice(0, 5);
        console.log(`⚽ Fetching ${limitedTeams.length} team-specific queries (fast path)`);
        limitedTeams.forEach(id => allPromises.push(fetchTeamMatches(id)));
        if (hasUserSelectedLeagues) {
          const limitedLeagues = leagueIds!.slice(0, 3);
          limitedLeagues.forEach(id => allPromises.push(fetchLeagueMatches(id)));
        }
      } else if (hasUserSelectedLeagues) {
        const limitedLeagues = leagueIds!.slice(0, 6);
        console.log(`⚽ Fetching ${limitedLeagues.length} user-selected leagues`);
        limitedLeagues.forEach(id => allPromises.push(fetchLeagueMatches(id)));
      } else {
        CORE_LEAGUES.slice(0, 5).forEach(id => allPromises.push(fetchLeagueMatches(id)));
      }

      if (nationalTeamIds && nationalTeamIds.length > 0) {
        const limitedNationals = nationalTeamIds.slice(0, 2);
        limitedNationals.forEach(id => allPromises.push(fetchNationalTeamMatches(id)));
      }

      if (includeAfcon) {
        const keyIntl = [6, 5].slice(0, 1);
        keyIntl.forEach(id => allPromises.push(fetchIntlLeague(id)));
      }

      console.log(`🚀 Firing ${allPromises.length} API requests (budget: ${API_CALL_BUDGET_PER_MINUTE - apiCallCount} remaining)`);

      const globalTimeoutMs = 12000;
      const settlePromise = Promise.allSettled(allPromises);
      const timeoutPromise = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), globalTimeoutMs));
      const raceResult = await Promise.race([settlePromise, timeoutPromise]);

      if (raceResult === 'timeout') {
        console.warn(`⏱️ Global ${globalTimeoutMs}ms timeout hit for ${type}, returning partial results`);
        const partialResults = await Promise.all(
          allPromises.map(p => Promise.race([p, new Promise<any[]>(r => setTimeout(() => r([]), 100))]))
        );
        partialResults.forEach(addMatches);
      } else {
        raceResult.forEach(r => {
          if (r.status === 'fulfilled') addMatches(r.value);
        });
      }
    } catch (error: any) {
      console.error(`💥 Batch fetch failed: ${error.message}`);
      if (staleTopLevel) {
        console.log('🕐 Returning stale top-level cache after batch failure');
        return staleTopLevel;
      }
    }

    if (allMatches.length === 0 && staleTopLevel) {
      console.log('🕐 No fresh data, returning stale cache');
      return staleTopLevel;
    }

    let filteredMatches = allMatches;

    if (type === 'upcoming') {
      const excludedStatuses = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', '1H', '2H', 'HT', 'ET', 'BT', 'LIVE', 'P'];
      filteredMatches = allMatches.filter(match => !excludedStatuses.includes(match.fixture?.status?.short));
    } else if (type === 'results') {
      filteredMatches = allMatches.filter(match => ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(match.fixture?.status?.short));
    }

    filteredMatches.sort((a, b) => {
      const dateA = new Date(a.fixture?.date || 0).getTime();
      const dateB = new Date(b.fixture?.date || 0).getTime();
      return type === 'results' ? dateB - dateA : dateA - dateB;
    });

    console.log(`✅ Total ${type} matches: ${filteredMatches.length} (from ${allMatches.length} raw)`);

    const result = {
      response: filteredMatches,
      results: filteredMatches.length,
      errors: {},
      paging: {},
      parameters: { type, days },
    };

    setCache(topLevelCacheKey, result);
    return result;
  });

export const getTeamLogosRoute = publicProcedure
  .input(z.object({
    teamIds: z.array(z.number().int().positive().max(99999)).min(1).max(30),
  }))
  .query(async ({ input }) => {
    const { teamIds } = input;
    const apiKey = process.env.FOOTBALL_API_KEY;

    console.log(`🏆 Fetching team logos for ${teamIds.length} teams`);

    if (!apiKey) {
      console.error('❌ FOOTBALL_API_KEY not found in environment');
      return { logos: {} as Record<number, string> };
    }

    const headers: Record<string, string> = { 'x-apisports-key': apiKey };
    const logos: Record<number, string> = {};

    const batchSize = 3;
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = teamIds.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (teamId) => {
          const cacheKey = `teamlogo:${teamId}`;
          const data = await cachedFetch(
            `${BASE_URL}/teams?id=${teamId}`,
            headers,
            cacheKey,
            24 * 60 * 60 * 1000
          );
          const team = data.response?.[0];
          return { teamId, logo: team?.team?.logo || '' };
        })
      );

      results.forEach(({ teamId, logo }) => {
        if (logo) logos[teamId] = logo;
      });

      if (i + batchSize < teamIds.length) {
        await delay(500);
      }
    }

    console.log(`✅ Retrieved logos for ${Object.keys(logos).length} teams`);
    return { logos };
  });

export const getLeagueStandingsRoute = publicProcedure
  .input(z.object({
    leagueId: z.number().int().positive().max(99999),
    season: z.number().int().min(1900).max(2100).optional(),
  }))
  .query(async ({ input }) => {
    const { leagueId, season: inputSeason } = input;
    
    const apiKey = process.env.FOOTBALL_API_KEY;
    const season = inputSeason || getCurrentSeason();
    
    console.log(`🏆 API-Football Standings Request - League: ${leagueId}, Season: ${season}`);
    console.log(`🔑 API Key check: ${apiKey ? `configured (${apiKey.length} chars)` : 'NOT CONFIGURED'}`);
    
    if (!apiKey) {
      console.error('❌ FOOTBALL_API_KEY not found in environment');
      return {
        response: [],
        errors: { config: 'API key not configured' },
      };
    }
    
    const headers: Record<string, string> = {
      'x-apisports-key': apiKey,
    };
    
    try {
      const url = `${BASE_URL}/standings?league=${leagueId}&season=${season}`;
      const cacheKey = `standings:${leagueId}:${season}`;
      const data = await cachedFetch(url, headers, cacheKey, CACHE_TTL.standings);
      
      return {
        response: data.response || [],
        errors: data.errors || {},
      };
    } catch (error: any) {
      console.error(`💥 Fetch error:`, error.message);
      return {
        response: [],
        errors: { network: error.message },
      };
    }
  });

export const getMatchDetailsRoute = publicProcedure
  .input(z.object({
    fixtureId: z.number().int().positive().max(9999999),
  }))
  .query(async ({ input }) => {
    const { fixtureId } = input;
    
    const apiKey = process.env.FOOTBALL_API_KEY;
    
    console.log(`🏈 API-Football Match Details Request - Fixture: ${fixtureId}`);
    console.log(`🔑 API Key check: ${apiKey ? `configured (${apiKey.length} chars)` : 'NOT CONFIGURED'}`);
    
    if (!apiKey) {
      console.error('❌ FOOTBALL_API_KEY not found in environment');
      return {
        fixture: null,
        events: [],
        lineups: [],
        statistics: [],
        goals: [],
        headToHead: [],
        errors: { config: 'API key not configured' },
      };
    }
    
    const headers: Record<string, string> = {
      'x-apisports-key': apiKey,
    };
    
    try {
      const fixtureUrl = `${BASE_URL}/fixtures?id=${fixtureId}`;
      const eventsUrl = `${BASE_URL}/fixtures/events?fixture=${fixtureId}`;
      const lineupsUrl = `${BASE_URL}/fixtures/lineups?fixture=${fixtureId}`;
      const statisticsUrl = `${BASE_URL}/fixtures/statistics?fixture=${fixtureId}`;
      
      const detailTtl = CACHE_TTL.matchDetails;
      const [fixtureData, eventsData, lineupsData, statisticsData] = await Promise.all([
        cachedFetch(fixtureUrl, headers, `detail:fixture:${fixtureId}`, detailTtl),
        cachedFetch(eventsUrl, headers, `detail:events:${fixtureId}`, detailTtl),
        cachedFetch(lineupsUrl, headers, `detail:lineups:${fixtureId}`, detailTtl),
        cachedFetch(statisticsUrl, headers, `detail:stats:${fixtureId}`, detailTtl),
      ]);
      
      const fixture = fixtureData.response?.[0] || null;
      const events = eventsData.response || [];
      const lineups = lineupsData.response || [];
      const statistics = statisticsData.response || [];
      
      // Filter for goal events
      const goals = events.filter((event: any) => 
        event.type === 'Goal' && event.detail !== 'Missed Penalty'
      );
      
      console.log(`⚽ Goals found: ${goals.length}`);
      goals.forEach((goal: any, i: number) => {
        console.log(`  ${i+1}. ${goal.player?.name} (${goal.team?.name}) - ${goal.time?.elapsed}'`);
      });
      
      let headToHead: any[] = [];
      let homeForm: any[] = [];
      let awayForm: any[] = [];
      
      const homeTeamId = fixture?.teams?.home?.id;
      const awayTeamId = fixture?.teams?.away?.id;
      const leagueId = fixture?.league?.id;
      const leagueSeason = fixture?.league?.season;
      
      if (homeTeamId && awayTeamId) {
        const h2hUrl = `${BASE_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=10`;
        const h2hData = await cachedFetch(h2hUrl, headers, `h2h:${homeTeamId}-${awayTeamId}`, 10 * 60 * 1000);
        headToHead = h2hData.response || [];
      }
      
      if (homeTeamId && awayTeamId && leagueId) {
        const formSeason = leagueSeason || getCurrentSeason();
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
        const seasonStartDate = `${formSeason}-07-01`;
        
        const homeFormUrl = `${BASE_URL}/fixtures?team=${homeTeamId}&league=${leagueId}&season=${formSeason}&from=${seasonStartDate}&to=${todayStr}&status=FT-AET-PEN`;
        const awayFormUrl = `${BASE_URL}/fixtures?team=${awayTeamId}&league=${leagueId}&season=${formSeason}&from=${seasonStartDate}&to=${todayStr}&status=FT-AET-PEN`;
        
        const formTtl = 10 * 60 * 1000;
        const [homeFormData, awayFormData] = await Promise.all([
          cachedFetch(homeFormUrl, headers, `form:${homeTeamId}:${leagueId}:${formSeason}`, formTtl),
          cachedFetch(awayFormUrl, headers, `form:${awayTeamId}:${leagueId}:${formSeason}`, formTtl),
        ]);
        
        homeForm = (homeFormData.response || [])
          .filter((m: any) => ['FT', 'AET', 'PEN'].includes(m.fixture?.status?.short))
          .sort((a: any, b: any) => new Date(b.fixture?.date || 0).getTime() - new Date(a.fixture?.date || 0).getTime())
          .slice(0, 5);
        
        awayForm = (awayFormData.response || [])
          .filter((m: any) => ['FT', 'AET', 'PEN'].includes(m.fixture?.status?.short))
          .sort((a: any, b: any) => new Date(b.fixture?.date || 0).getTime() - new Date(a.fixture?.date || 0).getTime())
          .slice(0, 5);
      }
      
      return {
        fixture,
        events,
        goals,
        lineups,
        statistics,
        headToHead,
        homeForm,
        awayForm,
        errors: {},
      };
    } catch (error: any) {
      console.error(`💥 Fetch error:`, error.message);
      return {
        fixture: null,
        events: [],
        goals: [],
        lineups: [],
        statistics: [],
        headToHead: [],
        errors: { network: error.message },
      };
    }
  });
