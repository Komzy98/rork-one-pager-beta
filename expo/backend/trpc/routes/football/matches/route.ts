import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getFootballApiKeyFromEnv } from '@/backend/utils/footballApiKey';

export const FOOTBALL_API_BASE_URL = 'https://v3.football.api-sports.io';
const BASE_URL = FOOTBALL_API_BASE_URL;

export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Align with client football season (Aug–May leagues use start-year as API season).
  if (month < 6) return year - 1;
  return year;
}

function getAlternateSeason(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month < 6) return year;
  return year - 1;
}

/**
 * API-Football indexes international tournaments by the tournament calendar year
 * (World Cup 2026 → season=2026). Date-only queries without `season` often return [].
 */
function getInternationalSeasonCandidates(): number[] {
  const calendarYear = new Date().getFullYear();
  const candidates = [
    calendarYear,
    calendarYear + 1,
    calendarYear - 1,
    getCurrentSeason(),
    getAlternateSeason(),
  ];
  return [...new Set(candidates.filter((y) => y >= 2000 && y <= 2100))];
}

/** Domestic cups / super cups — no season-long league table in API-Football. */
const CUP_LEAGUES_WITHOUT_TABLE = new Set([
  45, 48, 46, 143, 556, 81, 529, 137, 66, 65, 90, 96, 531,
]);

interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 500;
const CACHE_EVICT_COUNT = 50;

export const CACHE_TTL: Record<string, number> = {
  live: 20 * 1000,
  upcoming: 30 * 60 * 1000,
  today: 5 * 60 * 1000,
  results: 10 * 60 * 1000,
  standings: 60 * 60 * 1000,
  /** Standings while this league has a live fixture — aligns with live score refresh cadence. */
  standingsLive: 45 * 1000,
  matchDetails: 60 * 1000,
  topPlayers: 45 * 60 * 1000,
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

export async function cachedFetch(url: string, headers: Record<string, string>, cacheKey: string, ttl: number): Promise<any> {
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
        const quotaMsg =
          typeof data.errors.requests === 'string'
            ? data.errors.requests
            : typeof data.errors.rateLimit === 'string'
              ? data.errors.rateLimit
              : null;
        if (quotaMsg) {
          return { response: [], errors: { rateLimit: quotaMsg } };
        }
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

/** Uses the same `live:all` cache as match feeds so standings checks do not fan out extra upstream calls. */
async function leagueHasLiveFixture(leagueId: number, headers: Record<string, string>): Promise<boolean> {
  const url = `${BASE_URL}/fixtures?live=all`;
  const cacheKey = `live:all`;
  const data = await cachedFetch(url, headers, cacheKey, CACHE_TTL.live);
  const matches = data.response || [];
  return matches.some((m: any) => m?.league?.id === leagueId);
}

const KEY_INTERNATIONAL_LEAGUES = [
  1, 5, 10, 6, 15, 16, 17, 18, 19, 20, 4, 9, 7, 21,
];

const INTERNATIONAL_COMPETITIONS = KEY_INTERNATIONAL_LEAGUES;

export { INTERNATIONAL_COMPETITIONS };

/**
 * International tournaments where API-Football indexes fixtures by the tournament year
 * (e.g. World Cup 2026 → season 2026). `fetchIntlLeague` tries calendar-year seasons first.
 * Ids: 1 World Cup, 4 Euro, 5 Nations League, 6 AFCON, 7 Asian Cup, 9 Copa América,
 * 10 Friendlies, 15–20 World Cup Qualifiers (all confederations), 21 Confederations Cup.
 */
const INTERNATIONAL_TOURNAMENT_IDS = new Set<number>([
  1, 4, 5, 6, 7, 9, 10, 15, 16, 17, 18, 19, 20, 21,
]);

/** International tournaments that expose group/league tables in API-Football standings. */
const INTERNATIONAL_STANDINGS_LEAGUE_IDS = new Set<number>([
  1, 4, 5, 6, 7, 9, 15, 16, 17, 18, 19, 20, 21,
]);

/** International tournaments always probed in the default feed (cheap: empty outside their date window). */
const DEFAULT_INTERNATIONAL_IDS = [1];
const FIFA_WORLD_CUP_LEAGUE_ID = 1;

const CORE_LEAGUES = [39, 140, 78, 135, 61];
const CORE_COMPETITIONS = [2, 3, 848]; // UCL, UEL, UECL
const SECONDARY_LEAGUES = [848, 45, 48, 143, 81, 137, 66];

const getMatchesInputSchema = z.object({
  type: z.enum(['live', 'upcoming', 'today', 'results']),
  days: z.number().int().min(1).max(90).optional(),
  leagueIds: z.array(z.number().int().positive().max(99999)).max(100).optional(),
  teamIds: z.array(z.number().int().positive().max(99999)).max(30).optional(),
  nationalTeamIds: z.array(z.number().int().positive().max(99999)).max(30).optional(),
  includeAfcon: z.boolean().optional(),
});

type GetMatchesInput = z.infer<typeof getMatchesInputSchema>;

/** Shared implementation; per-type response cache inside keeps repeated calls cheap. */
async function fetchMatchesByType(input: GetMatchesInput) {
    const { type, days = 14, leagueIds, teamIds, nationalTeamIds, includeAfcon } = input;

    /** Bump when fetch/filter logic changes — avoids serving stale empty bundles from cache. */
    const topLevelCacheKey = getCacheKey(type, {
      days,
      leagueIds,
      teamIds,
      nationalTeamIds,
      includeAfcon,
      _filterRev: 'intl-season-v7-results-date-cutoff',
    });
    const topLevelTtl = CACHE_TTL[type] || 60000;
    const cachedResult = getFromCache(topLevelCacheKey, topLevelTtl);
    if (cachedResult) {
      console.log(`⚡ Full response cache HIT for ${type}`);
      return cachedResult;
    }

    const staleTopLevel = getStaleFromCache(topLevelCacheKey);

    const apiKey = getFootballApiKeyFromEnv();
    const season = getCurrentSeason();

    console.log(`🏈 API-Football Request - Type: ${type}, Season: ${season}, Teams: ${teamIds?.length || 0}, NationalTeams: ${nationalTeamIds?.length || 0}, Budget: ${API_CALL_BUDGET_PER_MINUTE - apiCallCount} remaining`);

    if (!apiKey) {
      console.error('❌ No football API key: set FOOTBALL_API_KEY or EXPO_PUBLIC_FOOTBALL_API_KEY for the API server');
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

      const result = {
        response: matches,
        results: matches.length,
        errors: data.errors || {},
        paging: data.paging || {},
        parameters: { type, days },
      };
      if (matches.length > 0 || !data.errors?.rateLimit) {
        setCache(topLevelCacheKey, result);
      }
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
      const lookbackDays = Math.min(Math.max(days, 7), 30);
      fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
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

    const bundleErrors: { rateLimit?: string } = {};
    const noteFetchErrors = (data: { errors?: { rateLimit?: string } }) => {
      const msg = data.errors?.rateLimit;
      if (msg && !bundleErrors.rateLimit) bundleErrors.rateLimit = msg;
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
      noteFetchErrors(data);
      return data.response || [];
    };

    const fetchLeagueMatches = async (leagueId: number): Promise<any[]> => {
      /** Tournaments (World Cup, qualifiers, continental cups) don't follow the club season year. */
      if (INTERNATIONAL_TOURNAMENT_IDS.has(leagueId)) {
        return fetchIntlLeague(leagueId);
      }
      return fetchLeagueMatchesForSeason(leagueId, season);
    };

    const fetchTeamMatches = async (teamId: number): Promise<any[]> => {
      if (type === 'today') {
        const url = `${BASE_URL}/fixtures?date=${today}&team=${teamId}`;
        const ck = `team:${teamId}:today:${today}`;
        const data = await cachedFetch(url, headers, ck, topLevelTtl);
        noteFetchErrors(data);
        const matches = data.response || [];
        console.log(`⚽ Team ${teamId} today: ${matches.length} matches`);
        return matches;
      }
      if (type === 'results') {
        const url = `${BASE_URL}/fixtures?team=${teamId}&season=${season}&from=${fromDate}&to=${toDate}&status=FT-AET-PEN`;
        const ck = `team:${teamId}:results:${fromDate}:${toDate}:${season}`;
        const data = await cachedFetch(url, headers, ck, topLevelTtl);
        noteFetchErrors(data);
        let matches = data.response || [];
        if (matches.length === 0) {
          const altSeason = getAlternateSeason();
          if (altSeason !== season) {
            const altUrl = `${BASE_URL}/fixtures?team=${teamId}&season=${altSeason}&from=${fromDate}&to=${toDate}&status=FT-AET-PEN`;
            const altCk = `team:${teamId}:results:${fromDate}:${toDate}:${altSeason}`;
            const altData = await cachedFetch(altUrl, headers, altCk, topLevelTtl);
            noteFetchErrors(altData);
            matches = altData.response || [];
          }
        }
        console.log(`⚽ Team ${teamId} results: ${matches.length} matches (${fromDate} → ${toDate})`);
        return matches;
      }
      // upcoming: API-Football requires `season` when using from/to with team.
      // Use `next=N` directly which doesn't require season and avoids wasted calls.
      const url = `${BASE_URL}/fixtures?team=${teamId}&next=15`;
      const ck = `team:${teamId}:upcoming:next15`;
      const data = await cachedFetch(url, headers, ck, topLevelTtl);
      noteFetchErrors(data);
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
        url = `${BASE_URL}/fixtures?team=${teamId}&season=${season}&from=${fromDate}&to=${toDate}&status=FT-AET-PEN`;
        ck = `national:${teamId}:results:${fromDate}:${toDate}:${season}`;
      } else {
        url = `${BASE_URL}/fixtures?team=${teamId}&next=10`;
        ck = `national:${teamId}:upcoming:next10`;
      }
      const data = await cachedFetch(url, headers, ck, topLevelTtl);
      noteFetchErrors(data);
      return data.response || [];
    };

    const fetchIntlLeague = async (leagueId: number): Promise<any[]> => {
      const seasons = getInternationalSeasonCandidates();
      const merged: any[] = [];
      const seenFixtureIds = new Set<number>();

      for (const fetchSeason of seasons) {
        let url = '';
        if (type === 'today') {
          url = `${BASE_URL}/fixtures?date=${today}&league=${leagueId}&season=${fetchSeason}`;
        } else if (type === 'results') {
          url = `${BASE_URL}/fixtures?league=${leagueId}&season=${fetchSeason}&from=${fromDate}&to=${toDate}&status=FT-AET-PEN`;
        } else {
          url = `${BASE_URL}/fixtures?league=${leagueId}&season=${fetchSeason}&from=${fromDate}&to=${toDate}`;
        }
        const ck = `intl:${leagueId}:${type}:${fromDate}:${toDate}:${fetchSeason}`;
        const data = await cachedFetch(url, headers, ck, topLevelTtl);
        noteFetchErrors(data);
        const batch = data.response || [];
        for (const match of batch) {
          const fixtureId = match.fixture?.id;
          if (fixtureId && !seenFixtureIds.has(fixtureId)) {
            seenFixtureIds.add(fixtureId);
            merged.push(match);
          }
        }
        if (batch.length > 0) {
          console.log(`🌍 Intl league ${leagueId} season ${fetchSeason}: ${batch.length} fixtures`);
          break;
        }
      }

      return merged;
    };

    try {
      const allPromises: Promise<any[]>[] = [];

      /** World Cup first — parallel batch timeouts / rate limits must not drop tomorrow's fixtures. */
      if (type !== 'today') {
        try {
          const wcFixtures = await fetchIntlLeague(FIFA_WORLD_CUP_LEAGUE_ID);
          addMatches(wcFixtures);
          if (wcFixtures.length > 0) {
            console.log(`🏆 World Cup (${type}): ${wcFixtures.length} fixtures (priority fetch)`);
          }
        } catch (wcErr: any) {
          console.warn(`⚠️ Priority World Cup fetch failed: ${wcErr?.message ?? wcErr}`);
        }
      }

      if (hasTeams) {
        /** Each favorite gets `fixtures?team=&last=20` so Overview form has enough results; cap limits API fan-out. */
        const limitedTeams = targetTeams.slice(0, 12);
        console.log(`⚽ Fetching ${limitedTeams.length} team-specific queries (fast path)`);
        limitedTeams.forEach(id => allPromises.push(fetchTeamMatches(id)));
        if (hasUserSelectedLeagues) {
          const limitedLeagues = leagueIds!.slice(0, 3);
          limitedLeagues.forEach(id => allPromises.push(fetchLeagueMatches(id)));
        }
      } else if (hasUserSelectedLeagues) {
        const limitedLeagues = leagueIds!.slice(0, 8);
        console.log(`⚽ Fetching ${limitedLeagues.length} user-selected leagues`);
        limitedLeagues.forEach(id => allPromises.push(fetchLeagueMatches(id)));
      } else {
        // Default feed: top 5 domestic leagues + major UEFA competitions.
        [...CORE_LEAGUES, ...CORE_COMPETITIONS].forEach(id => allPromises.push(fetchLeagueMatches(id)));
      }

      // Always include in-window global tournaments (e.g. FIFA World Cup) regardless of
      // whether the user has favorite teams or specific league selections — otherwise users
      // with favorite clubs never see World Cup fixtures. Season-agnostic; empty outside the
      // tournament window, and deduped/cached so the extra call is cheap.
      DEFAULT_INTERNATIONAL_IDS.forEach(id => allPromises.push(fetchIntlLeague(id)));

      if (nationalTeamIds && nationalTeamIds.length > 0) {
        const limitedNationals = nationalTeamIds.slice(0, 8);
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

      /**
       * User picked specific competitions (Worldwide + league chips) but those leagues may have
       * zero fixtures in the date window (breaks, wrong season, etc.). Merge the default core
       * bundle so the tab isn't blank; client visibility rules relax when the narrow set is empty.
       */
      if (
        allMatches.length === 0 &&
        hasUserSelectedLeagues &&
        !hasTeams &&
        type !== 'today'
      ) {
        console.warn(
          `⚠️ Selected leagues returned no ${type} fixtures — merging core league bundle (top 5 + UEFA cups)`,
        );
        const fallbackPromises = [...CORE_LEAGUES, ...CORE_COMPETITIONS].map((id) => fetchLeagueMatches(id));
        const fallbackSettled = await Promise.allSettled(fallbackPromises);
        fallbackSettled.forEach((r) => {
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

    const statusShort = (m: any): string =>
      String(m?.fixture?.status?.short ?? m?.status?.short ?? '')
        .trim()
        .toUpperCase();

    if (type === 'upcoming') {
      /** api-sports often returns lowercase shorts; strict uppercase compare was wiping feeds. */
      const excludedStatuses = new Set([
        'FT',
        'AET',
        'PEN',
        'CANC',
        'ABD',
        'AWD',
        'WO',
        '1H',
        '2H',
        'HT',
        'ET',
        'BT',
        'LIVE',
        'P',
      ]);
      filteredMatches = allMatches.filter((match) => !excludedStatuses.has(statusShort(match)));
    } else if (type === 'results') {
      const finishedStatuses = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);
      filteredMatches = allMatches.filter((match) => finishedStatuses.has(statusShort(match)));
      const lookbackDays = Math.min(Math.max(days, 7), 30);
      const cutoffMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
      filteredMatches = filteredMatches.filter(
        (match) => new Date(match.fixture?.date || 0).getTime() >= cutoffMs,
      );
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
      errors: bundleErrors.rateLimit ? { rateLimit: bundleErrors.rateLimit } : {},
      paging: {},
      parameters: { type, days },
    };

    if (filteredMatches.length > 0 || !bundleErrors.rateLimit) {
      setCache(topLevelCacheKey, result);
    }
    return result;
}

export const getMatchesRoute = publicProcedure
  .input(getMatchesInputSchema)
  .query(async ({ input }) => fetchMatchesByType(input));

const getMatchesBundleInputSchema = z.object({
  days: z.number().int().min(1).max(90).optional(),
  leagueIds: z.array(z.number().int().positive().max(99999)).max(100).optional(),
  teamIds: z.array(z.number().int().positive().max(99999)).max(30).optional(),
  nationalTeamIds: z.array(z.number().int().positive().max(99999)).max(30).optional(),
  includeAfcon: z.boolean().optional(),
  /** When false, only live + upcoming are fetched (one client round-trip, fewer upstream calls). */
  includeResults: z.boolean(),
});

export const getMatchesBundleRoute = publicProcedure
  .input(getMatchesBundleInputSchema)
  .query(async ({ input }) => {
    const { includeResults, days, leagueIds, teamIds, nationalTeamIds, includeAfcon } = input;
    const shared: Omit<GetMatchesInput, 'type'> = {
      days,
      leagueIds,
      teamIds,
      nationalTeamIds,
      includeAfcon,
    };
    const [live, upcoming, results] = await Promise.all([
      fetchMatchesByType({ ...shared, type: 'live' }),
      fetchMatchesByType({ ...shared, type: 'upcoming' }),
      includeResults ? fetchMatchesByType({ ...shared, type: 'results' }) : Promise.resolve(null),
    ]);
    return { live, upcoming, results };
  });

/** Mirrors TestFlight For You: World Cup league, no club teamIds (see sports.tsx footballBundleInput). */
export const FOOTBALL_FOR_YOU_SMOKE_BUNDLE_INPUT = {
  days: 14,
  teamIds: [] as number[],
  leagueIds: [FIFA_WORLD_CUP_LEAGUE_ID] as number[],
  includeResults: false,
};

export type FootballSmokeCheckResult = {
  ok: boolean;
  upcomingCount: number;
  liveCount: number;
  minRequired: number;
  errors: { config?: string; rateLimit?: string };
};

/** Used by /health/football and CI — catches stale deploys that return empty WC feeds. */
export async function runFootballForYouSmokeCheck(options?: {
  minTotalFixtures?: number;
}): Promise<FootballSmokeCheckResult> {
  const minRequired = options?.minTotalFixtures ?? Number(process.env.FOOTBALL_SMOKE_MIN_TOTAL ?? 1);
  const { includeResults, ...shared } = FOOTBALL_FOR_YOU_SMOKE_BUNDLE_INPUT;

  const [live, upcoming] = await Promise.all([
    fetchMatchesByType({ ...shared, type: 'live' }),
    fetchMatchesByType({ ...shared, type: 'upcoming' }),
  ]);

  const configError =
    (live.errors?.config as string | undefined) || (upcoming.errors?.config as string | undefined);
  const rateLimit =
    (live.errors?.rateLimit as string | undefined) ||
    (upcoming.errors?.rateLimit as string | undefined);

  const upcomingCount = upcoming.results ?? upcoming.response?.length ?? 0;
  const liveCount = live.results ?? live.response?.length ?? 0;
  const total = upcomingCount + liveCount;

  const ok = !configError && !rateLimit && total >= minRequired;

  return {
    ok,
    upcomingCount,
    liveCount,
    minRequired,
    errors: { config: configError, rateLimit },
  };
}

export const getTeamLogosRoute = publicProcedure
  .input(z.object({
    teamIds: z.array(z.number().int().positive().max(99999)).min(1).max(30),
  }))
  .query(async ({ input }) => {
    const { teamIds } = input;
    const apiKey = getFootballApiKeyFromEnv();

    console.log(`🏆 Fetching team logos for ${teamIds.length} teams`);

    if (!apiKey) {
      console.error('❌ No football API key: set FOOTBALL_API_KEY or EXPO_PUBLIC_FOOTBALL_API_KEY for the API server');
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

function hasStandingsPayload(data: { response?: unknown } | null | undefined): boolean {
  const standings = (data?.response as { league?: { standings?: unknown[] } }[])?.[0]?.league?.standings;
  if (!Array.isArray(standings) || standings.length === 0) return false;
  return standings.some((group) => Array.isArray(group) && group.length > 0);
}

function buildStandingsSeasonCandidates(inputSeason?: number, leagueId?: number): number[] {
  if (leagueId != null && INTERNATIONAL_TOURNAMENT_IDS.has(leagueId)) {
    const intl = getInternationalSeasonCandidates();
    const candidates =
      inputSeason != null && Number.isFinite(inputSeason) ? [inputSeason, ...intl] : intl;
    return [...new Set(candidates.filter((s) => s >= 1900 && s <= 2100))];
  }
  const current = getCurrentSeason();
  const alternate = getAlternateSeason();
  const calendarYear = new Date().getFullYear();
  const candidates = [inputSeason, current, alternate, current - 1, calendarYear].filter(
    (s): s is number => typeof s === 'number' && Number.isFinite(s) && s >= 1900 && s <= 2100,
  );
  return [...new Set(candidates)];
}

export const getLeagueStandingsRoute = publicProcedure
  .input(z.object({
    leagueId: z.coerce.number().int().positive().max(99999),
    season: z.coerce.number().int().min(1900).max(2100).optional(),
  }))
  .query(async ({ input }) => {
    const { leagueId, season: inputSeason } = input;
    
    const apiKey = getFootballApiKeyFromEnv();
    const seasonsToTry = buildStandingsSeasonCandidates(inputSeason, leagueId);
    
    console.log(
      `🏆 API-Football Standings Request - League: ${leagueId}, seasons: ${seasonsToTry.join(', ')}`,
    );
    console.log(`🔑 API Key check: ${apiKey ? `configured (${apiKey.length} chars)` : 'NOT CONFIGURED'}`);
    
    if (!apiKey) {
      console.error('❌ No football API key: set FOOTBALL_API_KEY or EXPO_PUBLIC_FOOTBALL_API_KEY for the API server');
      return {
        response: [],
        seasonUsed: null,
        noTableReason: 'unavailable' as const,
        errors: { config: 'API key not configured' },
      };
    }
    
    const headers: Record<string, string> = {
      'x-apisports-key': apiKey,
    };
    
    try {
      const hasLiveInLeague = await leagueHasLiveFixture(leagueId, headers);
      const standingsTtl = hasLiveInLeague ? CACHE_TTL.standingsLive : CACHE_TTL.standings;

      for (const season of seasonsToTry) {
        const url = `${BASE_URL}/standings?league=${leagueId}&season=${season}`;
        const cacheKey = `standings:${leagueId}:${season}`;
        const data = await cachedFetch(url, headers, cacheKey, standingsTtl);
        if (hasStandingsPayload(data)) {
          return {
            response: data.response || [],
            seasonUsed: season,
            noTableReason: null,
            errors: data.errors || {},
          };
        }
      }

      const noTableReason = CUP_LEAGUES_WITHOUT_TABLE.has(leagueId) ? ('cup' as const) : ('unavailable' as const);
      console.warn(`⚠️ No standings for league ${leagueId} after seasons: ${seasonsToTry.join(', ')}`);

      return {
        response: [],
        seasonUsed: seasonsToTry[0] ?? null,
        noTableReason,
        errors: {},
      };
    } catch (error: any) {
      console.error(`💥 Fetch error:`, error.message);
      return {
        response: [],
        seasonUsed: null,
        noTableReason: 'unavailable' as const,
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
    
    const apiKey = getFootballApiKeyFromEnv();
    
    console.log(`🏈 API-Football Match Details Request - Fixture: ${fixtureId}`);
    console.log(`🔑 API Key check: ${apiKey ? `configured (${apiKey.length} chars)` : 'NOT CONFIGURED'}`);
    
    if (!apiKey) {
      console.error('❌ No football API key: set FOOTBALL_API_KEY or EXPO_PUBLIC_FOOTBALL_API_KEY for the API server');
      return {
        fixture: null,
        events: [],
        lineups: [],
        statistics: [],
        goals: [],
        headToHead: [],
        homeForm: [],
        awayForm: [],
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
        homeForm: [],
        awayForm: [],
        errors: { network: error.message },
      };
    }
  });

/** Public CDN portrait (same host as team logos). Works when list endpoints omit `player.photo`. */
function apiSportsPlayerPhotoUrl(playerId: number): string {
  return `https://media.api-sports.io/football/players/${playerId}.png`;
}

/** API-Football can expose portraits on `player.photo`, rarely `image`, or omit until `/players?id=` is called. */
function normalizePlayerPhotoFromTopRow(row: any): string | null {
  const p = row?.player;
  const candidates = [p?.photo, p?.image, row?.photo, row?.image];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t.length > 4 && (t.startsWith('http://') || t.startsWith('https://'))) {
        return t;
      }
      if (t.startsWith('//') && t.includes('.')) {
        return `https:${t}`;
      }
      if (t.startsWith('/') && /\/football\/players\//i.test(t)) {
        return `https://media.api-sports.io${t}`;
      }
      // Bare host or path-only CDN URLs from some API payloads
      if (/^media\.api-sports\.io\//i.test(t)) {
        return `https://${t}`;
      }
      if (/^football\/players\/\d+/i.test(t)) {
        return `https://media.api-sports.io/${t}`;
      }
    }
  }
  return null;
}

/** Prefer a statistics row that includes `team` (topscorers can return multiple seasons/tournaments). */
function pickPrimaryStatistic(row: any): any {
  const list = row?.statistics;
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const withTeam = list.find((s: any) => s?.team?.id != null);
  return withTeam ?? list[0];
}

function readPlayerId(row: any): number | null {
  const raw = row?.player?.id ?? row?.playerId ?? row?.id ?? row?.statistics?.[0]?.player?.id;
  if (raw == null) return null;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

type TopPlayerBase = {
  playerId: number | null;
  playerName: string;
  photo: string | null;
  teamId: number | null;
  teamName: string | null;
  teamLogo: string | null;
  goals?: number;
  assists?: number;
};

const topScorerRow = (row: any): TopPlayerBase & { goals: number } => {
  const stats = pickPrimaryStatistic(row);
  return {
    playerId: readPlayerId(row),
    playerName: String(row?.player?.name || 'Player'),
    photo: normalizePlayerPhotoFromTopRow(row),
    teamId: (stats?.team?.id as number | null) ?? null,
    teamName: (stats?.team?.name as string | null) ?? null,
    teamLogo: (stats?.team?.logo as string | null) ?? null,
    goals: Number(stats?.goals?.total ?? 0) || 0,
  };
};

const topAssistRow = (row: any): TopPlayerBase & { assists: number } => {
  const stats = pickPrimaryStatistic(row);
  return {
    playerId: readPlayerId(row),
    playerName: String(row?.player?.name || 'Player'),
    photo: normalizePlayerPhotoFromTopRow(row),
    teamId: (stats?.team?.id as number | null) ?? null,
    teamName: (stats?.team?.name as string | null) ?? null,
    teamLogo: (stats?.team?.logo as string | null) ?? null,
    assists: Number(stats?.goals?.assists ?? 0) || 0,
  };
};

function statsForLeagueSeason(row: any, leagueId: number, season: number): any | null {
  const list = row?.statistics;
  if (!Array.isArray(list)) return null;
  return (
    list.find(
      (s: any) =>
        s?.league?.id === leagueId &&
        Number(s?.league?.season) === season,
    ) ??
    list.find((s: any) => s?.league?.id === leagueId) ??
    null
  );
}

async function fetchTeamLeadersInLeague(
  teamId: number,
  leagueId: number,
  season: number,
  headers: Record<string, string>,
  ttl: number,
): Promise<{
  scorers: (TopPlayerBase & { goals: number })[];
  assists: (TopPlayerBase & { assists: number })[];
}> {
  const url = `${BASE_URL}/players?team=${teamId}&season=${season}`;
  const cacheKey = `players:team:${teamId}:league:${leagueId}:season:${season}`;
  try {
    const data = await cachedFetch(url, headers, cacheKey, ttl);
    const scorers: (TopPlayerBase & { goals: number })[] = [];
    const assists: (TopPlayerBase & { assists: number })[] = [];
    for (const entry of data.response ?? []) {
      const stats = statsForLeagueSeason(entry, leagueId, season);
      if (!stats) continue;
      const goals = Number(stats?.goals?.total ?? 0) || 0;
      const assistCount = Number(stats?.goals?.assists ?? 0) || 0;
      const base: TopPlayerBase = {
        playerId: readPlayerId(entry),
        playerName: String(entry?.player?.name || 'Player'),
        photo: normalizePlayerPhotoFromTopRow(entry),
        teamId: (stats?.team?.id as number | null) ?? teamId,
        teamName: (stats?.team?.name as string | null) ?? null,
        teamLogo: (stats?.team?.logo as string | null) ?? null,
      };
      if (goals > 0) scorers.push({ ...base, goals });
      if (assistCount > 0) assists.push({ ...base, assists: assistCount });
    }
    scorers.sort((a, b) => b.goals - a.goals);
    assists.sort((a, b) => b.assists - a.assists);
    return { scorers, assists };
  } catch (e) {
    console.warn(`⚠️ Team leaders fetch failed team=${teamId} league=${leagueId}`, e);
    return { scorers: [], assists: [] };
  }
}

function mergeUniqueScorers(
  primary: (TopPlayerBase & { goals: number })[],
  extra: (TopPlayerBase & { goals: number })[],
): (TopPlayerBase & { goals: number })[] {
  const seen = new Set(primary.map((r) => r.playerId ?? r.playerName));
  const out = [...primary];
  for (const row of extra) {
    const key = row.playerId ?? row.playerName;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => b.goals - a.goals);
}

function mergeUniqueAssists(
  primary: (TopPlayerBase & { assists: number })[],
  extra: (TopPlayerBase & { assists: number })[],
): (TopPlayerBase & { assists: number })[] {
  const seen = new Set(primary.map((r) => r.playerId ?? r.playerName));
  const out = [...primary];
  for (const row of extra) {
    const key = row.playerId ?? row.playerName;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => b.assists - a.assists);
}

/** Ensure portrait URL when API omitted it (enrich may still replace with signed URLs). */
function withDefaultPlayerPhoto<T extends TopPlayerBase>(row: T): T {
  if (row.photo && String(row.photo).trim().length > 8) return row;
  if (row.playerId != null && row.playerId > 0) {
    return { ...row, photo: apiSportsPlayerPhotoUrl(row.playerId) };
  }
  return row;
}

/** Fill missing portraits using GET /players?id= (cached per player). */
async function enrichMissingPlayerPhotos<T extends TopPlayerBase>(
  rows: T[],
  headers: Record<string, string>,
  ttl: number,
): Promise<T[]> {
  const missing = rows.filter((r) => {
    const ph = typeof r.photo === 'string' ? r.photo.trim() : '';
    return !ph && r.playerId != null && r.playerId > 0;
  });
  if (missing.length === 0) return rows;

  const ids = [...new Set(missing.map((r) => r.playerId!))].slice(0, 16);
  const photoById = new Map<number, string>();

  await Promise.all(
    ids.map(async (id) => {
      const cacheKey = `player:profile:${id}`;
      const url = `${BASE_URL}/players?id=${id}`;
      try {
        const data = await cachedFetch(url, headers, cacheKey, ttl);
        const p = data.response?.[0]?.player;
        const u = p?.photo || p?.image;
        if (typeof u === 'string' && u.trim().length > 4) {
          const normalized = normalizePlayerPhotoFromTopRow({ player: { photo: u } });
          if (normalized) {
            photoById.set(id, normalized);
          }
        }
      } catch (e) {
        console.warn(`⚠️ Player photo enrich failed for id=${id}`, e);
      }
    }),
  );

  return rows.map((r) => {
    if (r.photo || !r.playerId) return r;
    const shot = photoById.get(r.playerId);
    return shot ? { ...r, photo: shot } : r;
  });
}

export const getLeagueTopPlayersRoute = publicProcedure
  .input(
    z.object({
      leagueId: z.coerce.number().int().positive().max(99999),
      season: z.coerce.number().int().min(1900).max(2100).optional(),
      /** For international fixtures — enrich with per-team leaders when competition list omits them. */
      focusTeamIds: z.array(z.coerce.number().int().positive().max(99999)).max(2).optional(),
    }),
  )
  .query(async ({ input }) => {
    const season =
      input.season != null && Number.isFinite(input.season) ? input.season : getCurrentSeason();
    const apiKey = getFootballApiKeyFromEnv();

    if (!apiKey) {
      console.error('❌ No football API key: set FOOTBALL_API_KEY or EXPO_PUBLIC_FOOTBALL_API_KEY for the API server');
      return {
        topScorers: [] as ReturnType<typeof topScorerRow>[],
        topAssists: [] as ReturnType<typeof topAssistRow>[],
        errors: { config: 'API key not configured' as const },
      };
    }

    const headers: Record<string, string> = {
      'x-apisports-key': apiKey,
    };

    const ttl = CACHE_TTL.topPlayers;

    const fetchTopRowsForSeason = async (targetSeason: number) => {
      const scorersUrl = `${BASE_URL}/players/topscorers?league=${input.leagueId}&season=${targetSeason}`;
      const assistsUrl = `${BASE_URL}/players/topassists?league=${input.leagueId}&season=${targetSeason}`;
      const [scorersData, assistsData] = await Promise.all([
        cachedFetch(scorersUrl, headers, `topscorers:${input.leagueId}:${targetSeason}`, ttl),
        cachedFetch(assistsUrl, headers, `topassists:${input.leagueId}:${targetSeason}`, ttl),
      ]);
      return {
        scorers: (scorersData.response || []).slice(0, 12).map(topScorerRow),
        assists: (assistsData.response || []).slice(0, 12).map(topAssistRow),
      };
    };

    try {
      let { scorers, assists } = await fetchTopRowsForSeason(season);

      // Some competitions return no leaders for early/new seasons; fall back one season for UI continuity.
      if (scorers.length === 0 && assists.length === 0 && season > 1900) {
        const previous = await fetchTopRowsForSeason(season - 1);
        scorers = previous.scorers;
        assists = previous.assists;
      }

      const focusIds = (input.focusTeamIds ?? []).filter((id) => id > 0);
      if (focusIds.length > 0 && INTERNATIONAL_TOURNAMENT_IDS.has(input.leagueId)) {
        const teamScorers: (TopPlayerBase & { goals: number })[] = [];
        const teamAssists: (TopPlayerBase & { assists: number })[] = [];
        for (const teamId of focusIds) {
          const leaders = await fetchTeamLeadersInLeague(teamId, input.leagueId, season, headers, ttl);
          teamScorers.push(...leaders.scorers);
          teamAssists.push(...leaders.assists);
        }
        scorers = mergeUniqueScorers(scorers, teamScorers);
        assists = mergeUniqueAssists(assists, teamAssists);
      }

      scorers = await enrichMissingPlayerPhotos(scorers, headers, ttl);
      assists = await enrichMissingPlayerPhotos(assists, headers, ttl);
      scorers = scorers.map(withDefaultPlayerPhoto);
      assists = assists.map(withDefaultPlayerPhoto);

      return {
        topScorers: scorers,
        topAssists: assists,
        errors: {} as Record<string, string>,
      };
    } catch (error: any) {
      console.error(`💥 Top players fetch error:`, error.message);
      return {
        topScorers: [] as ReturnType<typeof topScorerRow>[],
        topAssists: [] as ReturnType<typeof topAssistRow>[],
        errors: { network: error.message },
      };
    }
  });
