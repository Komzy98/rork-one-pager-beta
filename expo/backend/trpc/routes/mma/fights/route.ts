import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getMmaApiKeyFromEnv } from '@/backend/utils/footballApiKey';
import {
  isMmaCompletedFightPayload,
  isMmaLiveStatusShort,
  normalizeMmaStatusShort,
} from '@/utils/mmaFightStatus';

const MMA_BASE_URL = 'https://v1.mma.api-sports.io';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const mmaCache = new Map<string, CacheEntry>();

const MMA_CACHE_TTL: Record<string, number> = {
  fights: 5 * 60 * 1000,
  upcoming: 10 * 60 * 1000,
  /** Shorter than upcoming — results feed should pick up last card nights after weekends. */
  results: 8 * 60 * 1000,
  season: 20 * 60 * 1000,
  date: 10 * 60 * 1000,
  status: 10 * 60 * 1000,
  statusFail: 3 * 60 * 1000,
};

function getMmaCacheKey(type: string, params: Record<string, any>): string {
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    const val = params[key];
    if (val !== undefined && val !== null) acc[key] = val;
    return acc;
  }, {} as Record<string, any>);
  /** Bump when fetch logic changes so stale caches are not reused forever. */
  const upcomingRev = type === 'upcoming' ? ':season-first-v8' : '';
  const resultsRev = type === 'results' ? ':recent-cal-v3' : '';
  return `mma:${type}${upcomingRev}${resultsRev}:${JSON.stringify(sorted)}`;
}

function getFromMmaCache(key: string, ttl: number): any {
  const entry = mmaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    mmaCache.delete(key);
    return null;
  }
  console.log(`⚡ MMA Cache HIT for ${key.substring(0, 80)}`);
  return entry.data;
}

function setMmaCache(key: string, data: any): void {
  mmaCache.set(key, { data, timestamp: Date.now() });
  if (mmaCache.size > 50) {
    const oldest = [...mmaCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) mmaCache.delete(oldest[i][0]);
  }
}

function getStaleFromMmaCache(key: string): any {
  const entry = mmaCache.get(key);
  if (!entry) return null;
  console.log(`🕐 MMA Stale cache fallback for ${key.substring(0, 80)}`);
  return entry.data;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function mmaFetch(url: string, headers: Record<string, string>, cacheKey: string, ttl: number): Promise<any> {
  const cached = getFromMmaCache(cacheKey, ttl);
  if (cached) return cached;

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      console.log(`🥊 MMA API Fetch (attempt ${attempt + 1}): ${url}`);
      const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
      clearTimeout(timeoutId);

      console.log(`🥊 MMA API HTTP Status: ${response.status} for ${url.substring(0, 100)}`);

      if (response.status === 429) {
        console.warn(`⚠️ MMA Rate limited, attempt ${attempt + 1}`);
        const stale = getStaleFromMmaCache(cacheKey);
        if (stale) return stale;
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
          continue;
        }
        return {
          response: [],
          results: 0,
          errors: {
            rateLimit:
              'MMA API rate limit (429). Too many requests — wait a few minutes, restart the server after cooldown, or upgrade api-sports.io plan.',
          },
          _rateLimited: true,
        };
      }

      if (response.status === 403 || response.status === 401) {
        const errorBody = await response.text().catch(() => '');
        console.error(`❌ MMA API Auth Error ${response.status}: ${errorBody.substring(0, 300)}`);
        return { response: [], _authError: true, _status: response.status };
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read body');
        console.error(`❌ MMA API Error ${response.status}: ${errorBody.substring(0, 300)}`);
        const stale = getStaleFromMmaCache(cacheKey);
        if (stale) return stale;
        return { response: [], _httpError: response.status };
      }

      const data = await response.json();
      const count = (data.response || []).length;
      const errors = data.errors;
      const hasErrors = errors && typeof errors === 'object' && Object.keys(errors).length > 0;

      if (hasErrors) {
        console.warn(`⚠️ MMA API errors in response: ${JSON.stringify(errors)}`);
      }

      console.log(`✅ MMA API: ${count} results | results field: ${data.results} | errors: ${hasErrors ? JSON.stringify(errors) : 'none'}`);

      if (count > 0 || !hasErrors) {
        setMmaCache(cacheKey, data);
      }
      return data;
    } catch (error: any) {
      lastError = error;
      console.error(`💥 MMA Fetch error (attempt ${attempt + 1}):`, error.message);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  const stale = getStaleFromMmaCache(cacheKey);
  if (stale) return stale;

  console.error(`❌ MMA All retries exhausted:`, lastError?.message);
  return { response: [] };
}

async function checkMmaApiStatus(headers: Record<string, string>): Promise<{ available: boolean; message: string }> {
  const cacheKey = 'mma:api-status';
  const cached = getFromMmaCache(cacheKey, MMA_CACHE_TTL.status);
  if (cached) return cached;

  try {
    const url = `${MMA_BASE_URL}/status`;
    console.log(`🥊 Checking MMA API status: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ MMA API status check failed: ${response.status}`);
      if (response.status === 403 || response.status === 401) {
        const result = { available: false, message: `MMA API auth failed (${response.status}). The MMA API requires a separate subscription on api-sports.io.` };
        setMmaCache(cacheKey, result);
        return result;
      }
      const result = { available: true, message: `MMA API status returned ${response.status}, attempting data fetch anyway` };
      return result;
    }

    const data = await response.json();
    console.log(`🥊 MMA API Status response: ${JSON.stringify(data).substring(0, 500)}`);

    const subscription = data.response?.subscription;
    const requests = data.response?.requests;

    if (subscription && subscription.active === false) {
      const result = { available: false, message: 'MMA API subscription is not active. You need to subscribe to the MMA API at api-sports.io (free plan available).' };
      setMmaCache(cacheKey, result);
      return result;
    }

    if (requests) {
      console.log(`🥊 MMA API Requests: current=${requests.current}, limit_day=${requests.limit_day}`);
    }

    const result = { available: true, message: `MMA API active. Plan: ${subscription?.plan || 'unknown'}` };
    setMmaCache(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error(`💥 MMA API status check error:`, error.message);
    const result = { available: true, message: `MMA API status check failed (${error.message}), attempting data fetch anyway` };
    return result;
  }
}

async function fetchSeasonFights(
  season: string,
  headers: Record<string, string>,
  errOut?: { rateLimit?: string },
): Promise<any[]> {
  const cacheKey = `mma:season:${season}`;
  const cached = getFromMmaCache(cacheKey, MMA_CACHE_TTL.season);
  if (cached) return cached;

  const allFights: any[] = [];
  let page = 1;
  const maxPages = 60;

  while (page <= maxPages) {
    const url =
      page === 1
        ? `${MMA_BASE_URL}/fights?season=${season}`
        : `${MMA_BASE_URL}/fights?season=${season}&page=${page}`;
    const data = await mmaFetch(url, headers, `mma:season-raw:${season}:p${page}`, MMA_CACHE_TTL.season);

    if (data._rateLimited || data.errors?.rateLimit) {
      console.warn(`🥊 Season ${season} stopped early (rate limit)`);
      if (errOut && !errOut.rateLimit) {
        const msg = data.errors?.rateLimit;
        errOut.rateLimit = typeof msg === 'string' ? msg : 'MMA API rate limit exceeded.';
      }
      break;
    }

    const chunk = data.response || [];
    allFights.push(...chunk);

    const paging = data.paging as { current?: number; total?: number } | undefined;
    if (paging && typeof paging.current === 'number' && typeof paging.total === 'number') {
      if (paging.current >= paging.total || chunk.length === 0) break;
      page += 1;
      continue;
    }

    /** No `paging`: assume single page unless we might have more (common API-Sports page size 100). */
    if (chunk.length >= 100) {
      page += 1;
      continue;
    }
    break;
  }

  console.log(`🥊 Season ${season}: ${allFights.length} fights (${page} page(s) examined)`);
  if (allFights.length > 0) {
    setMmaCache(cacheKey, allFights);
  }
  return allFights;
}

async function fetchFightsByDate(dateStr: string, headers: Record<string, string>): Promise<any[]> {
  const cacheKey = `mma:date:${dateStr}`;
  const cached = getFromMmaCache(cacheKey, MMA_CACHE_TTL.date);
  if (cached) return cached;

  const url = `${MMA_BASE_URL}/fights?date=${dateStr}`;
  const data = await mmaFetch(url, headers, cacheKey, MMA_CACHE_TTL.date);
  const fights = data.response || [];
  if (fights.length > 0) {
    setMmaCache(cacheKey, fights);
  }
  return fights;
}

/** Normalize status short from api-sports MMA payloads (shape varies by endpoint). */
function statusShortOf(f: any): string | undefined {
  return normalizeMmaStatusShort(f);
}

/** Parse fight instant for filtering/sorting (`date` string, `datetime`, or unix `timestamp`). */
function rawFightDateMs(f: any): number {
  if (f?.timestamp != null && typeof f.timestamp === 'number') {
    const ts = f.timestamp as number;
    return ts < 1e12 ? ts * 1000 : ts;
  }
  const s = f?.date ?? f?.datetime;
  if (s == null || s === '') return Number.NaN;
  const t = new Date(s).getTime();
  return t;
}

/** Scheduled/upcoming: api-sports uses several shorts (NS, PF, TBD, SCH, …) — exclude only terminal/live states. */
function isLikelyUpcomingFight(f: any): boolean {
  if (isMmaCompletedFightPayload(f)) return false;
  const status = statusShortOf(f) as string | undefined;
  if (!status) return true;
  if (isMmaLiveStatusShort(status)) return false;
  const u = status.toUpperCase();
  if (
    u === 'CANC' ||
    u === 'POST' ||
    u === 'PST' ||
    u === 'ABD' ||
    u === 'ABN' ||
    u === 'CANCELLED' ||
    u === 'POSTPONED'
  ) {
    return false;
  }
  return true;
}

/** Align with app `getMmaFighterPair` so dedupe keys stay unique when API uses home/away, etc. */
function mmaFighterNamesForDedupe(fight: any): { n1: string; n2: string } {
  const F = fight?.fighters;
  if (F && typeof F === 'object' && !Array.isArray(F)) {
    return {
      n1: String(F.first?.name ?? ''),
      n2: String(F.second?.name ?? ''),
    };
  }
  if (Array.isArray(F) && F.length >= 2) {
    return { n1: String(F[0]?.name ?? ''), n2: String(F[1]?.name ?? '') };
  }
  if (fight?.fighter1 != null || fight?.fighter2 != null) {
    return { n1: String(fight.fighter1?.name ?? ''), n2: String(fight.fighter2?.name ?? '') };
  }
  if (fight?.home != null || fight?.away != null) {
    return { n1: String(fight.home?.name ?? ''), n2: String(fight.away?.name ?? '') };
  }
  if (fight?.first != null || fight?.second != null) {
    return { n1: String(fight.first?.name ?? ''), n2: String(fight.second?.name ?? '') };
  }
  return { n1: '', n2: '' };
}

function fightDedupeKey(fight: any): string {
  if (typeof fight?.id === 'number' && fight.id > 0) return `id:${fight.id}`;
  const d = fight?.date || '';
  const { n1, n2 } = mmaFighterNamesForDedupe(fight);
  return `k:${d}:${n1}:${n2}`;
}

function seasonResponseBlockedByPlan(data: any): boolean {
  const err = data?.errors;
  if (!err || typeof err !== 'object') return false;
  const msg = JSON.stringify(err).toLowerCase();
  return msg.includes('free plan') || msg.includes('do not have access to this season');
}

/** Forward calendar scan — works on free tier for current-year dates (season=YYYY often blocked). */
async function fetchUpcomingByDateScan(
  headers: Record<string, string>,
  now: Date,
  filterFn: (f: any) => boolean,
  addFights: (fights: any[]) => number,
  maxDays = 28,
): Promise<void> {
  console.log(`🥊 Upcoming: forward date scan (${maxDays + 1} days)...`);
  for (let i = 0; i <= maxDays; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 180));
    }
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    const fights = await fetchFightsByDate(dateStr, headers);
    const filtered = fights.filter(filterFn);
    const added = addFights(filtered);
    if (added > 0) {
      console.log(`🥊   ${dateStr}: +${added} upcoming (${filtered.length} on card)`);
    }
  }
}

async function fetchFightsMultipleStrategies(
  type: 'upcoming' | 'results',
  headers: Record<string, string>,
  currentYear: number,
  now: Date,
  errOut?: { rateLimit?: string },
): Promise<any[]> {
  const allFights: any[] = [];
  const seenIds = new Set<string>();

  const addFights = (fights: any[]) => {
    let added = 0;
    for (const fight of fights) {
      const key = fightDedupeKey(fight);
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allFights.push(fight);
        added++;
      }
    }
    return added;
  };

  const filterFn = type === 'upcoming'
    ? (f: any) => {
        if (!isLikelyUpcomingFight(f)) return false;
        const t = rawFightDateMs(f);
        if (Number.isNaN(t)) return true;
        return t >= now.getTime() - 24 * 60 * 60 * 1000;
      }
    : (f: any) => isMmaCompletedFightPayload(f);

  if (type === 'upcoming') {
    /**
     * Pro / paid: full `season=YYYY` dump (hundreds of bouts). Free tier: season blocked → calendar scan.
     */
    const seasonUrl = `${MMA_BASE_URL}/fights?season=${currentYear}`;
    const seasonProbe = await mmaFetch(
      seasonUrl,
      headers,
      `mma:season-probe:${currentYear}`,
      MMA_CACHE_TTL.season,
    );
    const seasonBlocked = seasonResponseBlockedByPlan(seasonProbe);

    if (!seasonBlocked) {
      console.log(`🥊 Upcoming strategy: season ${currentYear} (Pro/paid)...`);
      const seasonFights = await fetchSeasonFights(String(currentYear), headers, errOut);
      const seasonFiltered = seasonFights.filter(filterFn);
      addFights(seasonFiltered);
      console.log(`🥊 Season ${currentYear} upcoming: ${seasonFiltered.length}/${seasonFights.length}`);

      const nextYear = currentYear + 1;
      console.log(`🥊 Upcoming: also season ${nextYear}...`);
      const nextFights = await fetchSeasonFights(String(nextYear), headers, errOut);
      addFights(nextFights.filter(filterFn));
      console.log(`🥊 After ${nextYear} season: ${allFights.length} total upcoming`);
    } else {
      console.log(`🥊 Season ${currentYear} blocked by plan — using calendar date scan`);
    }

    if (seasonBlocked || allFights.length < 12) {
      await fetchUpcomingByDateScan(headers, now, filterFn, addFights, seasonBlocked ? 35 : 14);
      console.log(`🥊 Upcoming after date supplement: ${allFights.length} fights`);
    }
  } else {
    console.log(`🥊 Strategy 1: Season ${currentYear} query...`);
    const seasonFights = await fetchSeasonFights(String(currentYear), headers, errOut);
    const seasonFiltered = seasonFights.filter(filterFn);
    addFights(seasonFiltered);
    console.log(`🥊 Season ${currentYear} ${type}: ${seasonFiltered.length}/${seasonFights.length}`);

    const altYear = currentYear - 1;
    if (allFights.length < 10) {
      console.log(`🥊 Strategy 1b: Alt year ${altYear} season query...`);
      const altFights = await fetchSeasonFights(String(altYear), headers, errOut);
      const altFiltered = altFights.filter(filterFn);
      const altAdded = addFights(altFiltered);
      console.log(`🥊 Alt year ${altYear}: ${altAdded} added (${altFiltered.length} filtered/${altFights.length} total)`);
    }

    const RECENT_RESULTS_DAYS = 45;
    console.log(
      `🥊 Strategy 2 (results): merging last ${RECENT_RESULTS_DAYS} calendar days (recent fight nights / weekends)...`,
    );
    for (let i = 0; i <= RECENT_RESULTS_DAYS; i++) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 130));
      }
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const fights = await fetchFightsByDate(dateStr, headers);
      const filtered = fights.filter(filterFn);
      addFights(filtered);
    }
    console.log(`🥊 Results after recent calendar merge: ${allFights.length} fights`);
  }

  if (type === 'results' && allFights.length < 5) {
    const moreYear = currentYear - 2;
    console.log(`🥊 Strategy 3: Even older year ${moreYear}...`);
    const moreFights = await fetchSeasonFights(String(moreYear), headers, errOut);
    const moreFiltered = moreFights.filter(filterFn);
    addFights(moreFiltered);
    console.log(`🥊 Year ${moreYear}: added to total ${allFights.length}`);
  }

  return allFights;
}

export const getMmaFightsRoute = publicProcedure
  .input(z.object({
    type: z.enum(['upcoming', 'results', 'live']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').max(10).optional(),
    season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year').max(4).optional(),
  }))
  .query(async ({ input }) => {
    const { type, date } = input;

    const topLevelCacheKey = getMmaCacheKey(type, { date });
    const topLevelTtl = MMA_CACHE_TTL[type] || MMA_CACHE_TTL.fights;
    const cachedResult = getFromMmaCache(topLevelCacheKey, topLevelTtl);
    if (cachedResult) {
      console.log(`⚡ MMA Full response cache HIT for ${type}`);
      return cachedResult;
    }

    const apiKey = getMmaApiKeyFromEnv();

    console.log(`🥊 MMA API Request - Type: ${type}, API Key present: ${!!apiKey}, Key length: ${apiKey?.length || 0}`);

    if (!apiKey) {
      console.error(
        '❌ No API-Sports key for MMA: set MMA_API_KEY or FOOTBALL_API_KEY / EXPO_PUBLIC_FOOTBALL_API_KEY on the server'
      );
      return { response: [], results: 0, errors: { config: 'API key not configured' } };
    }

    const headers: Record<string, string> = { 'x-apisports-key': apiKey };

    const apiStatus = await checkMmaApiStatus(headers);
    console.log(`🥊 MMA API Status: available=${apiStatus.available}, message=${apiStatus.message}`);

    if (!apiStatus.available) {
      console.warn(
        `⚠️ MMA /status reports unavailable (${apiStatus.message}) — still fetching fights (status can be a false negative). Enable MMA at https://dashboard.api-sports.io if results stay empty.`
      );
    }

    const now = new Date();
    const today = formatDate(now);
    const currentYear = now.getFullYear();

    if (type === 'live') {
      const targetDate = date || today;
      const url = `${MMA_BASE_URL}/fights?date=${targetDate}`;
      const ck = `mma:fights:live:${targetDate}`;
      const data = await mmaFetch(url, headers, ck, 30 * 1000);
      const fights = data.response || [];
      console.log(`🥊 Live query for ${targetDate}: ${fights.length} total`);
      const live = fights.filter((f: any) => isMmaLiveStatusShort(statusShortOf(f)));
      console.log(`🥊 Live fights after filter: ${live.length}`);

      const result = {
        response: live,
        results: live.length,
        errors: {},
      };
      setMmaCache(topLevelCacheKey, result);
      return result;
    }

    const errOut: { rateLimit?: string } = {};
    const allFights = await fetchFightsMultipleStrategies(type, headers, currentYear, now, errOut);

    const sortKey = (f: any, upcoming: boolean) => {
      const t = rawFightDateMs(f);
      if (Number.isNaN(t)) return upcoming ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      return t;
    };

    if (type === 'upcoming') {
      allFights.sort((a, b) => sortKey(a, true) - sortKey(b, true));
    } else {
      allFights.sort((a, b) => sortKey(b, false) - sortKey(a, false));
      if (allFights.length > 100) {
        allFights.length = 100;
      }
    }

    console.log(`✅ MMA Total ${type} fights: ${allFights.length}`);

    if (allFights.length > 0) {
      const s = allFights[0];
      console.log(`🥊 Sample: id=${s.id}, status=${s.status?.short}, date=${s.date}, league=${s.league?.name}, fighters=${s.fighters?.first?.name} vs ${s.fighters?.second?.name}`);
    }

    const result = {
      response: allFights,
      results: allFights.length,
      errors: errOut.rateLimit ? { rateLimit: errOut.rateLimit } : {},
    };

    setMmaCache(topLevelCacheKey, result);
    return result;
  });
