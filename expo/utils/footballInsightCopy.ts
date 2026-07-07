export type StandingRowLite = {
  rank: number;
  points: number;
  team: { id: number; name: string };
  description?: string | null;
};

export function ordinalRank(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function shortenInsightTeamLabel(name: string, maxLen = 18): string {
  const t = name.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

export function buildCompactInsightTableLine(
  homeLabel: string,
  awayLabel: string,
  home: StandingRowLite,
  away: StandingRowLite,
): string {
  const h = shortenInsightTeamLabel(homeLabel);
  const a = shortenInsightTeamLabel(awayLabel);
  const rankGap = Math.abs(home.rank - away.rank);
  const ptsGap = Math.abs(home.points - away.points);
  const tight = rankGap <= 2 || (rankGap <= 4 && ptsGap <= 6);

  if (tight) {
    return `${h} ${ordinalRank(home.rank)} (${home.points} pts) vs ${a} ${ordinalRank(away.rank)} (${away.points} pts)—big table swing.`;
  }
  if (home.rank < away.rank) {
    return `${h} ${ordinalRank(home.rank)} (${home.points} pts) above ${a} ${ordinalRank(away.rank)} (${away.points} pts).`;
  }
  return `${a} ${ordinalRank(away.rank)} (${away.points} pts) above ${h} ${ordinalRank(home.rank)} (${home.points} pts).`;
}

export function clampInsightCopy(text: string, maxLen = 132): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  const cut = normalized.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = (lastSpace > 48 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

export function findHomeAwayInStandings(
  response: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
): { home: StandingRowLite; away: StandingRowLite } | null {
  if (!homeTeamId || !awayTeamId) return null;
  const standings = (response as { league?: { standings?: unknown[] } }[])?.[0]?.league?.standings;
  if (!Array.isArray(standings)) return null;
  for (const group of standings) {
    if (!Array.isArray(group)) continue;
    const home = group.find((t: { team?: { id?: number } }) => t?.team?.id === homeTeamId);
    const away = group.find((t: { team?: { id?: number } }) => t?.team?.id === awayTeamId);
    if (home && away) {
      return {
        home: {
          rank: home.rank,
          points: home.points,
          team: home.team,
          description: home.description,
        },
        away: {
          rank: away.rank,
          points: away.points,
          team: away.team,
          description: away.description,
        },
      };
    }
  }
  return null;
}
