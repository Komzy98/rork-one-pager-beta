import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

const MMA_BASE_URL = 'https://v1.mma.api-sports.io';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const mmaCache = new Map<string, CacheEntry>();

const MMA_CACHE_TTL: Record<string, number> = {
  fights: 5 * 60 * 1000,
  upcoming: 10 * 60 * 1000,
  results: 15 * 60 * 1000,
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
  return `mma:${type}:${JSON.stringify(sorted)}`;
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
  return d.toISOString().split('T')[0];
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
        return { response: [], _rateLimited: true };
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

async function fetchSeasonFights(season: string, headers: Record<string, string>): Promise<any[]> {
  const cacheKey = `mma:season:${season}`;
  const cached = getFromMmaCache(cacheKey, MMA_CACHE_TTL.season);
  if (cached) return cached;

  const url = `${MMA_BASE_URL}/fights?season=${season}`;
  const data = await mmaFetch(url, headers, `mma:season-raw:${season}`, MMA_CACHE_TTL.season);
  const fights = data.response || [];

  console.log(`🥊 Season ${season}: ${fights.length} fights`);
  if (fights.length > 0) {
    setMmaCache(cacheKey, fights);
  }
  return fights;
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

function isUpcomingStatus(status: string | undefined): boolean {
  return status === 'NS' || status === 'PF' || status === 'TBD' || !status;
}

function isCompletedStatus(status: string | undefined): boolean {
  return status === 'FT' || status === 'EOR' || status === 'AW';
}

async function fetchFightsMultipleStrategies(
  type: 'upcoming' | 'results',
  headers: Record<string, string>,
  currentYear: number,
  now: Date
): Promise<any[]> {
  const allFights: any[] = [];
  const seenIds = new Set<number>();

  const addFights = (fights: any[]) => {
    let added = 0;
    for (const fight of fights) {
      const fightId = fight.id;
      if (fightId && !seenIds.has(fightId)) {
        seenIds.add(fightId);
        allFights.push(fight);
        added++;
      }
    }
    return added;
  };

  const filterFn = type === 'upcoming'
    ? (f: any) => {
        const status = f.status?.short;
        if (!isUpcomingStatus(status)) return false;
        const fightDate = new Date(f.date);
        return fightDate.getTime() >= now.getTime() - (24 * 60 * 60 * 1000);
      }
    : (f: any) => isCompletedStatus(f.status?.short);

  console.log(`🥊 Strategy 1: Season ${currentYear} query...`);
  const seasonFights = await fetchSeasonFights(String(currentYear), headers);
  const seasonFiltered = seasonFights.filter(filterFn);
  addFights(seasonFiltered);
  console.log(`🥊 Season ${currentYear} ${type}: ${seasonFiltered.length}/${seasonFights.length}`);

  const altYear = type === 'upcoming' ? currentYear + 1 : currentYear - 1;
  if (allFights.length < 10) {
    console.log(`🥊 Strategy 1b: Alt year ${altYear} season query...`);
    const altFights = await fetchSeasonFights(String(altYear), headers);
    const altFiltered = altFights.filter(filterFn);
    const altAdded = addFights(altFiltered);
    console.log(`🥊 Alt year ${altYear}: ${altAdded} added (${altFiltered.length} filtered/${altFights.length} total)`);
  }

  if (allFights.length < 5) {
    console.log(`🥊 Strategy 2: Date-based queries (found only ${allFights.length} so far)...`);
    const datesToCheck: string[] = [];

    if (type === 'upcoming') {
      for (let i = 0; i <= 90; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        datesToCheck.push(formatDate(d));
      }
    } else {
      for (let i = 0; i <= 60; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        datesToCheck.push(formatDate(d));
      }
    }

    const weekends = datesToCheck.filter(dateStr => {
      const d = new Date(dateStr + 'T12:00:00Z');
      const day = d.getUTCDay();
      return day === 5 || day === 6 || day === 0;
    });

    const sampled = [
      ...weekends.slice(0, 20),
      ...datesToCheck.filter(d => !weekends.includes(d)).slice(0, 10),
    ];
    const uniqueSampled = [...new Set(sampled)];
    console.log(`🥊 Checking ${uniqueSampled.length} dates (${weekends.length} weekends + extras)...`);

    for (const dateStr of uniqueSampled) {
      const fights = await fetchFightsByDate(dateStr, headers);
      const filtered = fights.filter(filterFn);
      addFights(filtered);

      if (allFights.length >= 30) {
        console.log(`🥊 Found ${allFights.length} fights, stopping date queries early`);
        break;
      }
    }
    console.log(`🥊 Date-based strategy total: ${allFights.length} fights`);
  }

  if (type === 'results' && allFights.length < 5) {
    const moreYear = currentYear - 2;
    console.log(`🥊 Strategy 3: Even older year ${moreYear}...`);
    const moreFights = await fetchSeasonFights(String(moreYear), headers);
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

    const apiKey = process.env.FOOTBALL_API_KEY;

    console.log(`🥊 MMA API Request - Type: ${type}, API Key present: ${!!apiKey}, Key length: ${apiKey?.length || 0}`);

    if (!apiKey) {
      console.error('❌ FOOTBALL_API_KEY (used for MMA) not found');
      return { response: [], results: 0, errors: { config: 'API key not configured' } };
    }

    const headers: Record<string, string> = { 'x-apisports-key': apiKey };

    const apiStatus = await checkMmaApiStatus(headers);
    console.log(`🥊 MMA API Status: available=${apiStatus.available}, message=${apiStatus.message}`);

    if (!apiStatus.available) {
      console.error(`❌ MMA API not available: ${apiStatus.message}`);
      return {
        response: [],
        results: 0,
        errors: { config: apiStatus.message },
      };
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
      const live = fights.filter((f: any) => {
        const status = f.status?.short;
        return status === 'LIVE' || status === 'IN' || status === 'EOR';
      });
      console.log(`🥊 Live fights after filter: ${live.length}`);

      const result = {
        response: live,
        results: live.length,
        errors: {},
      };
      setMmaCache(topLevelCacheKey, result);
      return result;
    }

    const allFights = await fetchFightsMultipleStrategies(type, headers, currentYear, now);

    if (type === 'upcoming') {
      allFights.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    } else {
      allFights.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
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
      errors: {},
    };

    setMmaCache(topLevelCacheKey, result);
    return result;
  });
