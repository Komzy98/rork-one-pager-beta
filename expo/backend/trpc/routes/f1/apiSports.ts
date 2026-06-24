import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getF1ApiKeyFromEnv } from '@/backend/utils/f1ApiKey';

export const F1_API_SPORTS_BASE = 'https://v1.formula-1.api-sports.io';

type ApiSportsEnvelope<T> = {
  errors?: Record<string, string> | string[];
  results: number;
  response: T;
};

const f1ApiCache = new Map<string, { data: unknown; ts: number }>();

const CACHE_TTL = {
  races: 6 * 60 * 60 * 1000,
  profile: 24 * 60 * 60 * 1000,
  raceDetail: 2 * 60 * 60 * 1000,
} as const;

function cacheGet<T>(key: string, ttl: number): T | null {
  const hit = f1ApiCache.get(key);
  if (!hit || Date.now() - hit.ts > ttl) return null;
  return hit.data as T;
}

function cacheSet(key: string, data: unknown): void {
  f1ApiCache.set(key, { data, ts: Date.now() });
  if (f1ApiCache.size > 200) {
    const oldest = [...f1ApiCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < 30; i++) f1ApiCache.delete(oldest[i][0]);
  }
}

async function fetchApiSports<T>(path: string, ttl: number): Promise<T | null> {
  const apiKey = getF1ApiKeyFromEnv();
  if (!apiKey) return null;

  const cacheKey = `f1api:${path}`;
  const cached = cacheGet<T>(cacheKey, ttl);
  if (cached) return cached;

  try {
    const url = `${F1_API_SPORTS_BASE}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'x-apisports-key': apiKey },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`F1 API-Sports ${res.status}: ${path}`);
      return null;
    }
    const json = (await res.json()) as ApiSportsEnvelope<T>;
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.warn(`F1 API-Sports errors on ${path}:`, json.errors);
    }
    cacheSet(cacheKey, json.response);
    return json.response;
  } catch (e) {
    console.warn(`F1 API-Sports fetch failed: ${path}`, (e as Error)?.message);
    return null;
  }
}

type ApiRace = {
  id: number;
  competition: { id: number; name: string; location: { country: string; city: string } };
  circuit: { id: number; name: string; image: string };
  season: number;
  type: string;
  laps: { current: number | null; total: number | null };
  fastest_lap?: { driver: { id: number }; time: string };
  distance: string;
  date: string;
  status: string;
};

type ApiDriverRanking = {
  position: number;
  driver: { id: number; name: string; abbr: string; number: number; image: string };
  team: { id: number; name: string; logo: string };
  points: number;
  wins: number;
  season: number;
};

type ApiTeamRanking = {
  position: number;
  team: { id: number; name: string; logo: string };
  points: number;
  wins: number;
  season: number;
};

type ApiGridRow = {
  position: number;
  time: string;
  driver: { id: number; name: string; abbr: string; number: number; image: string };
  team: { id: number; name: string; logo: string };
};

type ApiFastestLapRow = {
  position: number;
  lap: number;
  time: string;
  avg_speed: string;
  driver: { id: number; name: string; abbr: string; number: number; image: string };
  team: { id: number; name: string; logo: string };
};

type ApiPitStopRow = {
  stops: number;
  lap: number;
  time: string;
  total_time: string;
  driver: { id: number; name: string; abbr: string; number: number; image: string };
  team: { id: number; name: string; logo: string };
};

export type F1ApiDriverProfile = {
  id: number;
  name: string;
  abbr: string;
  image: string;
  nationality: string;
  country: { name: string; code: string };
  birthdate: string;
  birthplace: string;
  number: number;
  grandsPrixEntered: number;
  worldChampionships: number;
  podiums: number;
  highestRaceFinish: { position: number; number: number };
  highestGridPosition: number;
  careerPoints: string;
  teams: Array<{ season: number; team: { id: number; name: string; logo: string } }>;
};

export type F1ApiTeamProfile = {
  id: number;
  name: string;
  logo: string;
  base: string;
  firstTeamEntry: number;
  worldChampionships: number;
  highestRaceFinish: { position: number; number: number };
  polePositions: number;
  fastestLaps: number;
  president: string;
  director: string;
  technicalManager: string;
  chassis: string;
  engine: string;
  tyres: string;
};

export type F1ApiCircuit = {
  id: number;
  name: string;
  image: string;
  competition: { id: number; name: string; location: { country: string; city: string } };
  firstGrandPrix: number;
  laps: number;
  length: string;
  raceDistance: string;
  lapRecord: { time: string; driver: string; year: number };
  capacity: number;
  opened: number;
};

export type F1ApiRaceMeta = {
  apiRaceId: number;
  apiCircuitId: number;
  circuitImage: string;
  round: number;
};

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function lastName(value: string): string {
  const parts = value.trim().split(/\s+/);
  return parts[parts.length - 1] ?? value;
}

export function matchDriverByName(
  name: string,
  rankings: ApiDriverRanking[],
): ApiDriverRanking | undefined {
  const target = normalizeName(name);
  const targetLast = normalizeName(lastName(name));
  return (
    rankings.find((r) => normalizeName(r.driver.name) === target) ??
    rankings.find((r) => normalizeName(lastName(r.driver.name)) === targetLast)
  );
}

export function matchTeamByName(
  name: string,
  rankings: ApiTeamRanking[],
): ApiTeamRanking | undefined {
  const target = normalizeName(name);
  return rankings.find((r) => {
    const team = normalizeName(r.team.name);
    return team === target || team.includes(target) || target.includes(team);
  });
}

export async function fetchApiSportsRaces(year: number): Promise<ApiRace[]> {
  const data = await fetchApiSports<ApiRace[]>(`/races?season=${year}&type=Race`, CACHE_TTL.races);
  return data ?? [];
}

export async function fetchApiSportsDriverRankings(year: number): Promise<ApiDriverRanking[]> {
  const data = await fetchApiSports<ApiDriverRanking[]>(
    `/rankings/drivers?season=${year}`,
    CACHE_TTL.races,
  );
  return data ?? [];
}

export async function fetchApiSportsTeamRankings(year: number): Promise<ApiTeamRanking[]> {
  const data = await fetchApiSports<ApiTeamRanking[]>(
    `/rankings/teams?season=${year}`,
    CACHE_TTL.races,
  );
  return data ?? [];
}

export async function buildApiRaceIndex(year: number): Promise<F1ApiRaceMeta[]> {
  const races = await fetchApiSportsRaces(year);
  return races.map((race, index) => ({
    apiRaceId: race.id,
    apiCircuitId: race.circuit.id,
    circuitImage: race.circuit.image,
    round: index + 1,
  }));
}

function mapDriverProfile(raw: Record<string, unknown>): F1ApiDriverProfile {
  const highest = raw.highest_race_finish as { position: number; number: number } | undefined;
  const teams = (raw.teams as Array<{ season: number; team: { id: number; name: string; logo: string } }>) ?? [];
  return {
    id: raw.id as number,
    name: raw.name as string,
    abbr: raw.abbr as string,
    image: raw.image as string,
    nationality: raw.nationality as string,
    country: raw.country as { name: string; code: string },
    birthdate: raw.birthdate as string,
    birthplace: raw.birthplace as string,
    number: raw.number as number,
    grandsPrixEntered: raw.grands_prix_entered as number,
    worldChampionships: raw.world_championships as number,
    podiums: raw.podiums as number,
    highestRaceFinish: highest ?? { position: 0, number: 0 },
    highestGridPosition: raw.highest_grid_position as number,
    careerPoints: String(raw.career_points ?? '0'),
    teams,
  };
}

function mapTeamProfile(raw: Record<string, unknown>): F1ApiTeamProfile {
  const highest = raw.highest_race_finish as { position: number; number: number } | undefined;
  return {
    id: raw.id as number,
    name: raw.name as string,
    logo: raw.logo as string,
    base: raw.base as string,
    firstTeamEntry: raw.first_team_entry as number,
    worldChampionships: raw.world_championships as number,
    highestRaceFinish: highest ?? { position: 0, number: 0 },
    polePositions: raw.pole_positions as number,
    fastestLaps: raw.fastest_laps as number,
    president: raw.president as string,
    director: raw.director as string,
    technicalManager: raw.technical_manager as string,
    chassis: raw.chassis as string,
    engine: raw.engine as string,
    tyres: raw.tyres as string,
  };
}

function mapCircuit(raw: Record<string, unknown>): F1ApiCircuit {
  const lapRecord = raw.lap_record as { time: string; driver: string; year: number } | undefined;
  const competition = raw.competition as F1ApiCircuit['competition'];
  return {
    id: raw.id as number,
    name: raw.name as string,
    image: raw.image as string,
    competition,
    firstGrandPrix: raw.first_grand_prix as number,
    laps: raw.laps as number,
    length: raw.length as string,
    raceDistance: raw.race_distance as string,
    lapRecord: lapRecord ?? { time: '—', driver: '—', year: 0 },
    capacity: raw.capacity as number,
    opened: raw.opened as number,
  };
}

const raceIdInput = z.object({ raceId: z.number().int().positive() });
const driverIdInput = z.object({ driverId: z.number().int().positive() });
const teamIdInput = z.object({ teamId: z.number().int().positive() });
const circuitIdInput = z.object({ circuitId: z.number().int().positive() });

export const getRaceDetailRoute = publicProcedure.input(raceIdInput).query(async ({ input }) => {
  const apiKey = getF1ApiKeyFromEnv();
  if (!apiKey) {
    return {
      configured: false as const,
      startingGrid: [],
      fastestLaps: [],
      pitStops: [],
    };
  }

  const [gridRaw, fastestRaw, pitRaw] = await Promise.all([
    fetchApiSports<ApiGridRow[]>(
      `/rankings/startinggrid?race=${input.raceId}`,
      CACHE_TTL.raceDetail,
    ),
    fetchApiSports<ApiFastestLapRow[]>(
      `/rankings/fastestlaps?race=${input.raceId}`,
      CACHE_TTL.raceDetail,
    ),
    fetchApiSports<ApiPitStopRow[]>(`/pitstops?race=${input.raceId}`, CACHE_TTL.raceDetail),
  ]);

  const startingGrid = (gridRaw ?? []).map((row) => ({
    position: row.position,
    time: row.time,
    driverId: row.driver.id,
    driverName: row.driver.name,
    driverAbbr: row.driver.abbr,
    driverNumber: row.driver.number,
    driverImage: row.driver.image,
    teamName: row.team.name,
    teamLogo: row.team.logo,
    teamId: row.team.id,
  }));

  const fastestLaps = (fastestRaw ?? []).map((row) => ({
    position: row.position,
    lap: row.lap,
    time: row.time,
    avgSpeed: row.avg_speed,
    driverId: row.driver.id,
    driverName: row.driver.name,
    driverAbbr: row.driver.abbr,
    driverImage: row.driver.image,
    teamName: row.team.name,
    teamLogo: row.team.logo,
  }));

  const pitByDriver = new Map<
    number,
    {
      driverId: number;
      driverName: string;
      driverImage: string;
      teamName: string;
      teamLogo: string;
      teamId: number;
      stops: Array<{ stopNumber: number; lap: number; time: string }>;
    }
  >();

  for (const row of pitRaw ?? []) {
    const existing = pitByDriver.get(row.driver.id) ?? {
      driverId: row.driver.id,
      driverName: row.driver.name,
      driverImage: row.driver.image,
      teamName: row.team.name,
      teamLogo: row.team.logo,
      teamId: row.team.id,
      stops: [],
    };
    existing.stops.push({ stopNumber: row.stops, lap: row.lap, time: row.time });
    pitByDriver.set(row.driver.id, existing);
  }

  const pitStops = [...pitByDriver.values()]
    .map((entry) => ({
      ...entry,
      totalStops: entry.stops.length,
      totalTime: entry.stops.reduce((sum, s) => sum + parseFloat(s.time || '0'), 0).toFixed(3),
    }))
    .sort((a, b) => a.totalStops - b.totalStops || parseFloat(a.totalTime) - parseFloat(b.totalTime));

  return {
    configured: true as const,
    startingGrid,
    fastestLaps,
    pitStops,
  };
});

export const getDriverProfileRoute = publicProcedure.input(driverIdInput).query(async ({ input }) => {
  const apiKey = getF1ApiKeyFromEnv();
  if (!apiKey) return { configured: false as const, profile: null };

  const raw = await fetchApiSports<Record<string, unknown>[]>(
    `/drivers?id=${input.driverId}`,
    CACHE_TTL.profile,
  );
  const first = raw?.[0];
  if (!first) return { configured: true as const, profile: null };
  return { configured: true as const, profile: mapDriverProfile(first) };
});

export const getTeamProfileRoute = publicProcedure.input(teamIdInput).query(async ({ input }) => {
  const apiKey = getF1ApiKeyFromEnv();
  if (!apiKey) return { configured: false as const, profile: null };

  const raw = await fetchApiSports<Record<string, unknown>[]>(
    `/teams?id=${input.teamId}`,
    CACHE_TTL.profile,
  );
  const first = raw?.[0];
  if (!first) return { configured: true as const, profile: null };
  return { configured: true as const, profile: mapTeamProfile(first) };
});

export const getCircuitRoute = publicProcedure.input(circuitIdInput).query(async ({ input }) => {
  const apiKey = getF1ApiKeyFromEnv();
  if (!apiKey) return { configured: false as const, circuit: null };

  const raw = await fetchApiSports<Record<string, unknown>[]>(
    `/circuits?id=${input.circuitId}`,
    CACHE_TTL.profile,
  );
  const first = raw?.[0];
  if (!first) return { configured: true as const, circuit: null };
  return { configured: true as const, circuit: mapCircuit(first) };
});
