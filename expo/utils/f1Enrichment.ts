import {
  F1_DRIVERS_2026,
  F1_TEAMS_2026,
  F1Race,
  F1Driver,
  getDriverPhoto,
  getTeamLogo,
} from '@/constants/f1Data';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/backend/trpc/app-router';

type SeasonBundle = inferRouterOutputs<AppRouter>['f1']['getSeasonBundle'];
type LiveWeekend = inferRouterOutputs<AppRouter>['f1']['getLiveWeekend'];

const COUNTRY_FLAGS: Record<string, string> = {
  Australia: '🇦🇺',
  China: '🇨🇳',
  Japan: '🇯🇵',
  Bahrain: '🇧🇭',
  'Saudi Arabia': '🇸🇦',
  USA: '🇺🇸',
  Italy: '🇮🇹',
  Monaco: '🇲🇨',
  Spain: '🇪🇸',
  Canada: '🇨🇦',
  Austria: '🇦🇹',
  UK: '🇬🇧',
  'United Kingdom': '🇬🇧',
  Belgium: '🇧🇪',
  Hungary: '🇭🇺',
  Netherlands: '🇳🇱',
  Azerbaijan: '🇦🇿',
  Singapore: '🇸🇬',
  Mexico: '🇲🇽',
  Brazil: '🇧🇷',
  Qatar: '🇶🇦',
  UAE: '🇦🇪',
  'United Arab Emirates': '🇦🇪',
};

export function countryFlag(country: string): string {
  return COUNTRY_FLAGS[country] ?? '🏁';
}

function findStaticDriver(name: string): F1Driver | undefined {
  const norm = name.toLowerCase();
  return F1_DRIVERS_2026.find(
    (d) => d.name.toLowerCase() === norm || d.name.toLowerCase().endsWith(norm.split(' ').pop() ?? ''),
  );
}

function findStaticTeam(name: string) {
  const norm = name.toLowerCase();
  return F1_TEAMS_2026.find((t) => t.name.toLowerCase() === norm || norm.includes(t.name.toLowerCase().split(' ')[0] ?? ''));
}

export function mapApiRaceToF1Race(r: SeasonBundle['races'][number]): F1Race {
  return {
    id: r.id,
    round: r.round,
    name: r.name,
    circuit: r.circuit,
    country: r.country,
    city: r.city,
    date: r.date,
    time: r.time,
    flag: countryFlag(r.country),
    status: r.status,
    laps: r.laps ?? 0,
    circuitLength: r.circuitLength ?? '—',
    winner: r.winner,
    winnerTeam: r.winnerTeam,
    podium: r.podium,
    circuitImage: r.circuitImage,
    apiRaceId: r.apiRaceId,
    apiCircuitId: r.apiCircuitId,
  };
}

export function mapApiDriverStanding(d: SeasonBundle['driverStandings'][number]): F1Driver {
  const staticD = findStaticDriver(d.name);
  const staticTeam = findStaticTeam(d.team);
  return {
    id: d.id,
    name: d.name,
    number: d.number || staticD?.number || 0,
    team: d.team,
    teamColor: staticTeam?.color ?? staticD?.teamColor ?? '#888',
    nationality: d.nationality,
    nationalityFlag: staticD?.nationalityFlag ?? '🏁',
    points: d.points,
    wins: d.wins,
    podiums: staticD?.podiums ?? 0,
    photo: d.image ?? staticD?.photo ?? getDriverPhoto(d.name),
    apiDriverId: d.apiDriverId,
  };
}

export function mapApiConstructorStanding(c: SeasonBundle['constructorStandings'][number]) {
  const staticTeam = findStaticTeam(c.name);
  return {
    name: c.name,
    color: staticTeam?.color ?? '#888',
    points: c.points,
    drivers: staticTeam?.drivers ?? [],
    logo: c.logo ?? staticTeam?.logo ?? getTeamLogo(c.name),
    apiTeamId: c.apiTeamId,
  };
}

export function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

export function formatSessionDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export type { LiveWeekend, SeasonBundle };
export type F1LiveWeekend = LiveWeekend;
