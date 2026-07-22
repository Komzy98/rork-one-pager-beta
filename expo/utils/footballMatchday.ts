import type { FootballPersonalizationMatch } from '@/utils/footballMatchPersonalization';

export type MatchdayEntry = {
  matchId: string;
  teamName: string;
  logoUri?: string;
  time: string;
  opponent: string;
};

function isSameLocalDay(dateIso: string, day: Date): boolean {
  let matchDate: Date;
  if (dateIso.includes('T')) {
    matchDate = new Date(dateIso);
  } else {
    const [year, month, d] = dateIso.split('-').map(Number);
    matchDate = new Date(year, month - 1, d);
  }
  return (
    matchDate.getFullYear() === day.getFullYear() &&
    matchDate.getMonth() === day.getMonth() &&
    matchDate.getDate() === day.getDate()
  );
}

export function buildTodayMatchdayEntries(input: {
  favoriteClubApiIds: ReadonlySet<number>;
  favoriteClubNamesByApiId: ReadonlyMap<number, { name: string; logoUri?: string }>;
  liveMatches: readonly FootballPersonalizationMatch[];
  upcomingMatches: readonly FootballPersonalizationMatch[];
  now?: Date;
}): MatchdayEntry[] {
  const today = input.now ?? new Date();
  const pools = [...input.liveMatches, ...input.upcomingMatches].filter(
    (m) => m.status === 'Live' || m.status === 'Upcoming',
  );

  const entries: MatchdayEntry[] = [];
  const seen = new Set<string>();

  for (const match of pools) {
    if (!isSameLocalDay(match.date, today)) continue;

    const sides: { id?: number; name: string; logo?: string; opponent: string }[] = [];
    if (typeof match.homeTeamId === 'number' && input.favoriteClubApiIds.has(match.homeTeamId)) {
      const club = input.favoriteClubNamesByApiId.get(match.homeTeamId);
      sides.push({
        id: match.homeTeamId,
        name: club?.name ?? match.homeTeam,
        logo: club?.logoUri ?? match.homeTeamLogo,
        opponent: match.awayTeam,
      });
    }
    if (typeof match.awayTeamId === 'number' && input.favoriteClubApiIds.has(match.awayTeamId)) {
      const club = input.favoriteClubNamesByApiId.get(match.awayTeamId);
      sides.push({
        id: match.awayTeamId,
        name: club?.name ?? match.awayTeam,
        logo: club?.logoUri ?? match.awayTeamLogo,
        opponent: match.homeTeam,
      });
    }

    for (const side of sides) {
      const key = `${match.id}:${side.id ?? side.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        matchId: match.id ?? '',
        teamName: side.name,
        logoUri: side.logo,
        time: match.status === 'Live' ? 'Live' : (match.time ?? ''),
        opponent: side.opponent,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.time === 'Live' && b.time !== 'Live') return -1;
    if (b.time === 'Live' && a.time !== 'Live') return 1;
    return a.time.localeCompare(b.time);
  });
}
