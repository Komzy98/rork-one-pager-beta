import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import {
  buildApiRaceIndex,
  fetchApiSportsDriverRankings,
  fetchApiSportsTeamRankings,
  matchDriverByName,
  matchTeamByName,
} from '@/backend/trpc/routes/f1/apiSports';

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const OPENF1_BASE = 'https://api.openf1.org/v1';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const f1Cache = new Map<string, CacheEntry>();

const F1_CACHE_TTL = {
  schedule: 6 * 60 * 60 * 1000,
  standings: 60 * 60 * 1000,
  raceResult: 2 * 60 * 60 * 1000,
  liveWeekend: 20 * 1000,
  liveWeekendIdle: 5 * 60 * 1000,
  openF1Drivers: 30 * 60 * 1000,
} as const;

function cacheKey(prefix: string, params: Record<string, unknown>): string {
  return `f1:${prefix}:${JSON.stringify(params)}`;
}

function getCached<T>(key: string, ttl: number): T | null {
  const entry = f1Cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    f1Cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  f1Cache.set(key, { data, timestamp: Date.now() });
  if (f1Cache.size > 120) {
    const oldest = [...f1Cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 20; i++) f1Cache.delete(oldest[i][0]);
  }
}

async function fetchJson<T>(url: string, cacheTtl: number, cachePrefix: string): Promise<T | null> {
  const key = cacheKey(cachePrefix, { url });
  const hit = getCached<T>(key, cacheTtl);
  if (hit) return hit;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`F1 fetch ${res.status}: ${url}`);
      return null;
    }
    const data = (await res.json()) as T;
    setCached(key, data);
    return data;
  } catch (e) {
    console.warn(`F1 fetch error: ${url}`, (e as Error)?.message);
    return null;
  }
}

function currentSeasonYear(): number {
  return new Date().getFullYear();
}

export type F1RaceDto = {
  id: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  city: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'live' | 'cancelled';
  laps?: number;
  circuitLength?: string;
  winner?: string;
  winnerTeam?: string;
  podium?: [string, string, string];
  apiRaceId?: number;
  apiCircuitId?: number;
  circuitImage?: string;
};

export type F1DriverStandingDto = {
  id: string;
  name: string;
  number: number;
  team: string;
  nationality: string;
  points: number;
  wins: number;
  position: number;
  apiDriverId?: number;
  image?: string;
};

export type F1ConstructorStandingDto = {
  id: string;
  name: string;
  points: number;
  wins: number;
  position: number;
  apiTeamId?: number;
  logo?: string;
};

export type F1SessionDto = {
  sessionKey: number;
  sessionType: string;
  sessionName: string;
  dateStart: string;
  dateEnd: string;
  circuitShortName: string;
  countryName: string;
  meetingKey: number;
  isLive: boolean;
  isPast: boolean;
};

export type F1LiveLeaderDto = {
  position: number;
  driverNumber: number;
  driverName: string;
  teamName: string;
  teamColor: string;
};

type ErgastRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitName: string;
    Location: { locality: string; country: string };
  };
  Results?: Array<{
    position: string;
    Driver: { givenName: string; familyName: string };
    Constructor: { name: string };
  }>;
};

function parseRaceDateTime(date: string, time?: string): number {
  const t = time?.replace('Z', '') ?? '12:00:00';
  return new Date(`${date}T${t}Z`).getTime();
}

function raceStatus(date: string, time: string | undefined, hasResults: boolean, isLiveWindow: boolean): F1RaceDto['status'] {
  if (hasResults) return 'completed';
  if (isLiveWindow) return 'live';
  const start = parseRaceDateTime(date, time);
  if (start > Date.now()) return 'upcoming';
  return 'completed';
}

function driverFullName(given: string, family: string): string {
  return `${given} ${family}`.trim();
}

async function fetchRaceResults(year: number, round: string): Promise<ErgastRace | null> {
  const data = await fetchJson<{ MRData: { RaceTable: { Races: ErgastRace[] } } }>(
    `${JOLPICA_BASE}/${year}/${round}/results.json`,
    F1_CACHE_TTL.raceResult,
    `result-${year}-${round}`,
  );
  return data?.MRData?.RaceTable?.Races?.[0] ?? null;
}

async function buildSeasonRaces(year: number): Promise<F1RaceDto[]> {
  const data = await fetchJson<{ MRData: { RaceTable: { Races: ErgastRace[] } } }>(
    `${JOLPICA_BASE}/${year}.json`,
    F1_CACHE_TTL.schedule,
    `schedule-${year}`,
  );
  const raw = data?.MRData?.RaceTable?.Races ?? [];
  const now = Date.now();

  const completedRounds = raw.filter((r) => parseRaceDateTime(r.date, r.time) < now - 3 * 60 * 60 * 1000);
  const resultPromises = completedRounds.slice(-12).map((r) => fetchRaceResults(year, r.round));
  const results = await Promise.all(resultPromises);
  const resultsByRound = new Map<string, ErgastRace>();
  completedRounds.slice(-12).forEach((r, i) => {
    const res = results[i];
    if (res) resultsByRound.set(r.round, res);
  });

  return raw.map((r) => {
    const round = parseInt(r.round, 10);
    const resultRace = resultsByRound.get(r.round);
    const hasResults = Boolean(resultRace?.Results?.length);
    const raceStart = parseRaceDateTime(r.date, r.time);
    const isLiveWindow = !hasResults && raceStart <= now && now <= raceStart + 4 * 60 * 60 * 1000;

    let podium: [string, string, string] | undefined;
    let winner: string | undefined;
    let winnerTeam: string | undefined;
    if (resultRace?.Results?.length) {
      const top3 = resultRace.Results.slice(0, 3);
      podium = [
        driverFullName(top3[0].Driver.givenName, top3[0].Driver.familyName),
        driverFullName(top3[1].Driver.givenName, top3[1].Driver.familyName),
        driverFullName(top3[2].Driver.givenName, top3[2].Driver.familyName),
      ];
      winner = podium[0];
      winnerTeam = top3[0].Constructor.name;
    }

    return {
      id: round,
      round,
      name: r.raceName,
      circuit: r.Circuit.circuitName,
      country: r.Circuit.Location.country,
      city: r.Circuit.Location.locality,
      date: r.date,
      time: (r.time ?? '12:00:00Z').replace('Z', '').slice(0, 5),
      status: raceStatus(r.date, r.time, hasResults, isLiveWindow),
      winner,
      winnerTeam,
      podium,
    };
  });
}

async function fetchDriverStandings(year: number): Promise<F1DriverStandingDto[]> {
  const data = await fetchJson<{
    MRData: {
      StandingsTable: {
        StandingsLists: Array<{
          DriverStandings: Array<{
            position: string;
            points: string;
            wins: string;
            Driver: { driverId: string; givenName: string; familyName: string; nationality: string; permanentNumber?: string };
            Constructors: Array<{ name: string }>;
          }>;
        }>;
      };
    };
  }>(`${JOLPICA_BASE}/${year}/driverStandings.json`, F1_CACHE_TTL.standings, `drivers-${year}`);

  const rows = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  return rows.map((row) => ({
    id: row.Driver.driverId,
    name: driverFullName(row.Driver.givenName, row.Driver.familyName),
    number: parseInt(row.Driver.permanentNumber ?? '0', 10) || 0,
    team: row.Constructors[0]?.name ?? '',
    nationality: row.Driver.nationality,
    points: parseFloat(row.points) || 0,
    wins: parseInt(row.wins, 10) || 0,
    position: parseInt(row.position, 10) || 0,
  }));
}

async function fetchConstructorStandings(year: number): Promise<F1ConstructorStandingDto[]> {
  const data = await fetchJson<{
    MRData: {
      StandingsTable: {
        StandingsLists: Array<{
          ConstructorStandings: Array<{
            position: string;
            points: string;
            wins: string;
            Constructor: { constructorId: string; name: string };
          }>;
        }>;
      };
    };
  }>(`${JOLPICA_BASE}/${year}/constructorStandings.json`, F1_CACHE_TTL.standings, `constructors-${year}`);

  const rows = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
  return rows.map((row) => ({
    id: row.Constructor.constructorId,
    name: row.Constructor.name,
    points: parseFloat(row.points) || 0,
    wins: parseInt(row.wins, 10) || 0,
    position: parseInt(row.position, 10) || 0,
  }));
}

type OpenF1Session = {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  circuit_short_name: string;
  country_name: string;
  meeting_key: number;
  is_cancelled?: boolean;
};

type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour?: string;
};

type OpenF1Position = {
  date: string;
  driver_number: number;
  position: number;
  session_key: number;
};

type OpenF1RaceControl = {
  date: string;
  flag?: string;
  category?: string;
  lap_number?: number | null;
};

type OpenF1Lap = {
  lap_number: number;
  driver_number: number;
};

function normalizeTeamColor(raw?: string): string {
  if (!raw) return '#888888';
  const c = raw.trim();
  return c.startsWith('#') ? c : `#${c}`;
}

function titleCaseName(openF1Name: string): string {
  return openF1Name
    .split(' ')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

async function fetchOpenF1Sessions(year: number): Promise<OpenF1Session[]> {
  const data = await fetchJson<OpenF1Session[]>(
    `${OPENF1_BASE}/sessions?year=${year}`,
    F1_CACHE_TTL.schedule,
    `openf1-sessions-${year}`,
  );
  return (data ?? []).filter((s) => !s.is_cancelled);
}

function pickCurrentMeetingKey(sessions: OpenF1Session[], now: number): number | null {
  const byMeeting = new Map<number, OpenF1Session[]>();
  for (const s of sessions) {
    const list = byMeeting.get(s.meeting_key) ?? [];
    list.push(s);
    byMeeting.set(s.meeting_key, list);
  }

  let bestKey: number | null = null;
  let bestScore = Infinity;

  for (const [meetingKey, meetingSessions] of byMeeting) {
    const starts = meetingSessions.map((s) => new Date(s.date_start).getTime());
    const ends = meetingSessions.map((s) => new Date(s.date_end).getTime());
    const meetingStart = Math.min(...starts);
    const meetingEnd = Math.max(...ends);

    const isLive = now >= meetingStart - 30 * 60 * 1000 && now <= meetingEnd + 60 * 60 * 1000;
    const isUpcoming = meetingStart > now;
    const dist = isLive ? 0 : isUpcoming ? meetingStart - now : now - meetingEnd;

    if (dist < bestScore) {
      bestScore = dist;
      bestKey = meetingKey;
    }
  }

  return bestKey;
}

function mapSessions(sessions: OpenF1Session[], meetingKey: number, now: number): F1SessionDto[] {
  return sessions
    .filter((s) => s.meeting_key === meetingKey)
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
    .map((s) => {
      const start = new Date(s.date_start).getTime();
      const end = new Date(s.date_end).getTime();
      return {
        sessionKey: s.session_key,
        sessionType: s.session_type,
        sessionName: s.session_name,
        dateStart: s.date_start,
        dateEnd: s.date_end,
        circuitShortName: s.circuit_short_name,
        countryName: s.country_name,
        meetingKey: s.meeting_key,
        isLive: now >= start && now <= end + 5 * 60 * 1000,
        isPast: end < now,
      };
    });
}

async function fetchLatestPositions(sessionKey: number): Promise<Map<number, OpenF1Position>> {
  const data = await fetchJson<OpenF1Position[]>(
    `${OPENF1_BASE}/position?session_key=${sessionKey}`,
    F1_CACHE_TTL.liveWeekend,
    `positions-${sessionKey}`,
  );
  const latest = new Map<number, OpenF1Position>();
  for (const row of data ?? []) {
    const prev = latest.get(row.driver_number);
    if (!prev || new Date(row.date) > new Date(prev.date)) {
      latest.set(row.driver_number, row);
    }
  }
  return latest;
}

async function fetchLiveLeaderboard(sessionKey: number): Promise<F1LiveLeaderDto[]> {
  const [positions, drivers] = await Promise.all([
    fetchLatestPositions(sessionKey),
    fetchJson<OpenF1Driver[]>(
      `${OPENF1_BASE}/drivers?session_key=${sessionKey}`,
      F1_CACHE_TTL.openF1Drivers,
      `drivers-${sessionKey}`,
    ),
  ]);

  const driverMap = new Map<number, OpenF1Driver>();
  for (const d of drivers ?? []) {
    driverMap.set(d.driver_number, d);
  }

  return [...positions.values()]
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map((p) => {
      const d = driverMap.get(p.driver_number);
      return {
        position: p.position,
        driverNumber: p.driver_number,
        driverName: d ? titleCaseName(d.full_name) : `#${p.driver_number}`,
        teamName: d?.team_name ?? '',
        teamColor: normalizeTeamColor(d?.team_colour),
      };
    });
}

async function fetchLatestFlag(sessionKey: number): Promise<string | null> {
  const data = await fetchJson<OpenF1RaceControl[]>(
    `${OPENF1_BASE}/race_control?session_key=${sessionKey}`,
    F1_CACHE_TTL.liveWeekend,
    `race-control-${sessionKey}`,
  );
  if (!data?.length) return null;
  const flags = data.filter((r) => r.category === 'Flag' && r.flag && r.flag !== 'CLEAR');
  if (!flags.length) return null;
  flags.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return flags[flags.length - 1].flag ?? null;
}

async function fetchCurrentLap(sessionKey: number): Promise<number | null> {
  const data = await fetchJson<OpenF1Lap[]>(
    `${OPENF1_BASE}/laps?session_key=${sessionKey}`,
    F1_CACHE_TTL.liveWeekend,
    `laps-${sessionKey}`,
  );
  if (!data?.length) return null;
  return Math.max(...data.map((l) => l.lap_number));
}

const seasonInput = z.object({
  year: z.number().int().min(2020).max(2035).optional(),
});

export const getSeasonBundleRoute = publicProcedure.input(seasonInput).query(async ({ input }) => {
  const year = input.year ?? currentSeasonYear();
  const [races, driverStandings, constructorStandings, apiRaceIndex, apiDriverRankings, apiTeamRankings] =
    await Promise.all([
      buildSeasonRaces(year),
      fetchDriverStandings(year),
      fetchConstructorStandings(year),
      buildApiRaceIndex(year),
      fetchApiSportsDriverRankings(year),
      fetchApiSportsTeamRankings(year),
    ]);

  const apiRaceByRound = new Map(apiRaceIndex.map((r) => [r.round, r]));
  const enrichedRaces = races.map((race) => {
    const api = apiRaceByRound.get(race.round);
    if (!api) return race;
    return {
      ...race,
      apiRaceId: api.apiRaceId,
      apiCircuitId: api.apiCircuitId,
      circuitImage: api.circuitImage,
    };
  });

  const enrichedDrivers = driverStandings.map((row) => {
    const api = matchDriverByName(row.name, apiDriverRankings);
    if (!api) return row;
    return {
      ...row,
      apiDriverId: api.driver.id,
      image: api.driver.image,
      number: row.number || api.driver.number,
      team: row.team || api.team.name,
    };
  });

  const enrichedConstructors = constructorStandings.map((row) => {
    const api = matchTeamByName(row.name, apiTeamRankings);
    if (!api) return row;
    return {
      ...row,
      apiTeamId: api.team.id,
      logo: api.team.logo,
    };
  });

  const completed = enrichedRaces.filter((r) => r.status === 'completed');
  const lastRace = completed.length > 0 ? completed[completed.length - 1] : null;

  return {
    year,
    races: enrichedRaces,
    driverStandings: enrichedDrivers,
    constructorStandings: enrichedConstructors,
    lastRace,
    fetchedAt: new Date().toISOString(),
  };
});

export const getLiveWeekendRoute = publicProcedure.input(seasonInput).query(async ({ input }) => {
  const year = input.year ?? currentSeasonYear();
  const now = Date.now();
  const sessions = await fetchOpenF1Sessions(year);
  const meetingKey = pickCurrentMeetingKey(sessions, now);

  if (!meetingKey) {
    return {
      year,
      meetingKey: null,
      meetingLabel: null,
      circuitShortName: null,
      countryName: null,
      sessions: [] as F1SessionDto[],
      activeSession: null as F1SessionDto | null,
      nextSession: null as F1SessionDto | null,
      sessionForTiming: null as F1SessionDto | null,
      isSessionLive: false,
      leaderboard: [] as F1LiveLeaderDto[],
      latestFlag: null as string | null,
      currentLap: null as number | null,
      fetchedAt: new Date().toISOString(),
    };
  }

  const meetingSessions = mapSessions(sessions, meetingKey, now);
  const activeSession = meetingSessions.find((s) => s.isLive) ?? null;
  const nextSession =
    meetingSessions.find((s) => !s.isPast && new Date(s.dateStart).getTime() > now) ?? null;

  const sample = sessions.find((s) => s.meeting_key === meetingKey);
  const sessionForTiming = activeSession ?? nextSession;

  let leaderboard: F1LiveLeaderDto[] = [];
  let latestFlag: string | null = null;
  let currentLap: number | null = null;

  if (activeSession) {
    [leaderboard, latestFlag, currentLap] = await Promise.all([
      fetchLiveLeaderboard(activeSession.sessionKey),
      fetchLatestFlag(activeSession.sessionKey),
      fetchCurrentLap(activeSession.sessionKey),
    ]);
  } else if (nextSession && new Date(nextSession.dateStart).getTime() - now < 24 * 60 * 60 * 1000) {
    /** Pre-session: show previous session leaderboard if quali/race finished recently */
    const prev = [...meetingSessions].reverse().find((s) => s.isPast);
    if (prev) {
      leaderboard = await fetchLiveLeaderboard(prev.sessionKey);
    }
  }

  return {
    year,
    meetingKey,
    meetingLabel: sample ? `${sample.country_name} GP` : null,
    circuitShortName: sample?.circuit_short_name ?? null,
    countryName: sample?.country_name ?? null,
    sessions: meetingSessions,
    activeSession,
    nextSession,
    isSessionLive: Boolean(activeSession),
    leaderboard,
    latestFlag,
    currentLap,
    sessionForTiming,
    fetchedAt: new Date().toISOString(),
  };
});
