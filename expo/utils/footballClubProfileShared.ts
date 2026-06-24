/** Server-safe club profile helpers (no React Native / asset imports). */

export type TeamLeagueEntry = {
  id: number;
  name: string;
  logo?: string;
  type?: string;
};

export type SquadPlayerLite = {
  id: number;
  name: string;
  photo?: string;
  position?: string;
  number?: number | null;
};

export type CoachLite = {
  name: string;
  photo?: string;
};

export type ApiStandingRow = {
  rank?: number;
  points?: number;
  goalsDiff?: number;
  form?: string;
  all?: { played?: number; win?: number; draw?: number; lose?: number };
  team?: { id: number; name?: string; logo?: string };
};

/** Prefer domestic league table over cups for season stats. */
export function pickPrimaryLeagueForTeam(leagues: TeamLeagueEntry[]): TeamLeagueEntry | null {
  if (!leagues.length) return null;
  const byType = leagues.find((l) => l.type === 'League');
  if (byType) return byType;
  const majorIds = new Set([39, 140, 78, 135, 61, 88, 94, 253]);
  const major = leagues.find((l) => majorIds.has(l.id));
  return major ?? leagues[0];
}

/** Find one team's row in API-Football standings `response` array. */
export function findTeamStandingRow(standingsResponse: unknown, teamId: number): ApiStandingRow | null {
  const standings = (standingsResponse as { league?: { standings?: unknown[] } }[])?.[0]?.league?.standings;
  if (!Array.isArray(standings)) return null;
  for (const group of standings) {
    if (!Array.isArray(group)) continue;
    const row = group.find((t: { team?: { id?: number } }) => t?.team?.id === teamId);
    if (row) return row as ApiStandingRow;
  }
  return null;
}
