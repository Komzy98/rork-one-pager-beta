import { ALL_NATIONS } from '@/constants/nations';
import type { UserNationality, UserTeam } from '@/types/habit';

export type FeedPreviewKind = 'national-wc' | 'national-qualifier' | 'club' | 'discovery';

export type FeedTuningPreviewMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeEmoji?: string;
  awayEmoji?: string;
  competition: string;
  kind: FeedPreviewKind;
  /** User follows a team/country in this row */
  isFollowed: boolean;
};

export type FeedTuningPreviewInput = {
  nationalities: readonly UserNationality[];
  favoriteTeams: readonly UserTeam[];
  prioritizeNationalTeams: boolean;
  strictFollowing: boolean;
  bigMatchesDiscovery: boolean;
};

const WORLD_CUP_OPPONENTS: Record<string, string> = {
  england: 'Senegal',
  nigeria: 'Ghana',
  france: 'Morocco',
  germany: 'Japan',
  spain: 'Argentina',
  brazil: 'France',
  usa: 'Wales',
  mexico: 'Poland',
};

const QUALIFIER_OPPONENTS: Record<string, string> = {
  england: 'Serbia',
  nigeria: 'Benin',
  ghana: 'Sudan',
  senegal: 'Mauritania',
  france: 'Ireland',
  usa: 'Trinidad and Tobago',
};

const CLUB_OPPONENTS: Record<string, string> = {
  arsenal: 'Chelsea',
  chelsea: 'Arsenal',
  'manchester-united': 'Liverpool',
  'manchester-city': 'Tottenham',
  liverpool: 'Manchester United',
  barcelona: 'Real Madrid',
  'real-madrid': 'Barcelona',
};

function nationFlag(name: string): string | undefined {
  return ALL_NATIONS.find((n) => n.name.toLowerCase() === name.toLowerCase())?.flag;
}

function wcOpponent(nationId: string): string {
  return WORLD_CUP_OPPONENTS[nationId] ?? 'Senegal';
}

function qualifierOpponent(nationId: string): string {
  return QUALIFIER_OPPONENTS[nationId] ?? 'Cameroon';
}

function clubOpponent(team: UserTeam): string {
  return CLUB_OPPONENTS[team.id] ?? 'Chelsea';
}

function kindSortWeight(kind: FeedPreviewKind, prioritizeNationalTeams: boolean): number {
  if (prioritizeNationalTeams) {
    if (kind === 'national-wc') return 0;
    if (kind === 'national-qualifier') return 1;
    if (kind === 'club') return 2;
    return 3;
  }
  if (kind === 'club') return 0;
  if (kind === 'discovery') return 1;
  if (kind === 'national-wc') return 2;
  return 3;
}

function buildNationalRows(nationalities: readonly UserNationality[]): FeedTuningPreviewMatch[] {
  const rows: FeedTuningPreviewMatch[] = [];

  if (nationalities.length > 0) {
    const primary = nationalities[0]!;
    const wcAway = wcOpponent(primary.id);
    rows.push({
      id: `wc-${primary.id}`,
      homeTeam: primary.name,
      awayTeam: wcAway,
      homeEmoji: primary.flag,
      awayEmoji: nationFlag(wcAway),
      competition: 'World Cup',
      kind: 'national-wc',
      isFollowed: true,
    });
  }

  const qualifierNation = nationalities[1] ?? nationalities[0];
  if (qualifierNation) {
    const qualAway = qualifierOpponent(qualifierNation.id);
    rows.push({
      id: `qual-${qualifierNation.id}`,
      homeTeam: qualifierNation.name,
      awayTeam: qualAway,
      homeEmoji: qualifierNation.flag,
      awayEmoji: nationFlag(qualAway),
      competition: 'WC Qualifier',
      kind: 'national-qualifier',
      isFollowed: true,
    });
  }

  return rows;
}

function buildClubRow(favoriteTeams: readonly UserTeam[]): FeedTuningPreviewMatch | null {
  const team = favoriteTeams[0];
  if (!team) return null;
  const away = clubOpponent(team);
  return {
    id: `club-${team.id}`,
    homeTeam: team.name,
    awayTeam: away,
    competition: team.league || 'Premier League',
    kind: 'club',
    isFollowed: true,
  };
}

function buildDiscoveryRow(): FeedTuningPreviewMatch {
  return {
    id: 'discovery-el-clasico',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    competition: 'La Liga',
    kind: 'discovery',
    isFollowed: false,
  };
}

function buildWorldCupFallbackRow(): FeedTuningPreviewMatch {
  return {
    id: 'wc-fallback',
    homeTeam: 'England',
    awayTeam: 'Senegal',
    homeEmoji: nationFlag('England'),
    awayEmoji: nationFlag('Senegal'),
    competition: 'World Cup',
    kind: 'national-wc',
    isFollowed: false,
  };
}

/** Build ordered preview rows for the feed-tuning screen. */
export function buildFeedTuningPreview(input: FeedTuningPreviewInput): FeedTuningPreviewMatch[] {
  const {
    nationalities,
    favoriteTeams,
    prioritizeNationalTeams,
    strictFollowing,
    bigMatchesDiscovery,
  } = input;

  const candidates: FeedTuningPreviewMatch[] = [];

  if (nationalities.length > 0) {
    candidates.push(...buildNationalRows(nationalities));
  } else {
    candidates.push(buildWorldCupFallbackRow());
  }

  const clubRow = buildClubRow(favoriteTeams);
  if (clubRow) candidates.push(clubRow);

  if (bigMatchesDiscovery) {
    candidates.push(buildDiscoveryRow());
  }

  const filtered = candidates.filter((row) => {
    if (strictFollowing && !row.isFollowed) return false;
    if (!bigMatchesDiscovery && row.kind === 'discovery') return false;
    return true;
  });

  return filtered
    .sort(
      (a, b) =>
        kindSortWeight(a.kind, prioritizeNationalTeams) -
        kindSortWeight(b.kind, prioritizeNationalTeams),
    )
    .slice(0, 4);
}
