/**
 * API-Football reuses short league names across countries ("Premier League", "Liga 3", etc.).
 * Prefix with country when the name alone would be ambiguous.
 */
import type { ImageSourcePropType } from 'react-native';

const GENERIC_LEAGUE_NAMES = new Set([
  'premier league',
  'first division',
  'division 1',
  'division one',
  'division 2',
  'division two',
  'super league',
  'superliga',
  'pro league',
  'professional league',
  'liga 1',
  'liga i',
  'liga ii',
  'liga 2',
  'liga 3',
  'championship',
  'league one',
  'league two',
  'serie a',
  'serie b',
  'serie c',
  'bundesliga',
  'primera division',
  'segunda division',
]);

/** Well-known competitions — keep short labels (no country prefix). */
const CANONICAL_LEAGUE_LABELS: Record<number, string> = {
  1: 'World Cup',
  2: 'Champions League',
  3: 'Europa League',
  4: 'European Championship',
  5: 'UEFA Nations League',
  6: 'AFCON',
  7: 'Asian Cup',
  9: 'Copa América',
  10: 'International Friendly',
  39: 'Premier League',
  40: 'Championship',
  41: 'League One',
  42: 'League Two',
  61: 'Ligue 1',
  78: 'Bundesliga',
  88: 'Eredivisie',
  94: 'Primeira Liga',
  135: 'Serie A',
  140: 'La Liga',
  179: 'Premiership',
  848: 'Conference League',
};

const UEFA_CLUB_COMPETITION_IDS = new Set([2, 3, 848]);

function nameIncludesCountry(name: string, country: string): boolean {
  const n = name.toLowerCase();
  const c = country.toLowerCase().trim();
  if (!c || c === 'world') return false;
  if (n.includes(c)) return true;
  if (c.endsWith('a') && n.includes(`${c.slice(0, -1)}ian`)) return true;
  if (c.endsWith('y') && n.includes(`${c.slice(0, -1)}ian`)) return true;
  return false;
}

function isGenericLeagueName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (GENERIC_LEAGUE_NAMES.has(lower)) return true;
  return /^liga\s*\d+$/i.test(name) || /^division\s*\d+$/i.test(name);
}

function isQualifyingRound(round?: string | null): boolean {
  return /qualif|preliminary/i.test(round ?? '');
}

/** Infer UEFA club competition from API name when id/label can disagree. */
function resolveUefaClubCompetitionBase(name: string, leagueId?: number | null): string | null {
  const lower = name.toLowerCase();
  if (/europa conference|conference league/i.test(lower)) return 'Conference League';
  if (/europa league/i.test(lower) && !/conference/i.test(lower)) return 'Europa League';
  if (/champions league/i.test(lower) && !/caf|afc|concacaf/i.test(lower)) return 'Champions League';

  if (typeof leagueId === 'number' && UEFA_CLUB_COMPETITION_IDS.has(leagueId)) {
    return CANONICAL_LEAGUE_LABELS[leagueId] ?? null;
  }
  return null;
}

function withQualifyingSuffix(base: string, round?: string | null): string {
  if (!isQualifyingRound(round)) return base;
  if (base.endsWith('Qualifying')) return base;
  return `${base} Qualifying`;
}

export function formatFootballLeagueLabel(
  name: string,
  country?: string | null,
  leagueId?: number | null,
  round?: string | null,
): string {
  const trimmed = (name || '').trim() || 'League';
  const uefaBase = resolveUefaClubCompetitionBase(trimmed, leagueId);
  if (uefaBase) {
    return withQualifyingSuffix(uefaBase, round);
  }

  if (typeof leagueId === 'number' && CANONICAL_LEAGUE_LABELS[leagueId]) {
    return withQualifyingSuffix(CANONICAL_LEAGUE_LABELS[leagueId], round);
  }

  const countryTrimmed = (country || '').trim();
  if (!countryTrimmed || countryTrimmed.toLowerCase() === 'world') {
    return trimmed;
  }

  if (nameIncludesCountry(trimmed, countryTrimmed)) {
    return trimmed;
  }

  if (isGenericLeagueName(trimmed)) {
    return `${countryTrimmed} · ${trimmed}`;
  }

  return trimmed;
}

/** API-Football league/1.png is a generic shield — do not use for UI. */
export const FIFA_WORLD_CUP_LOGO_URL = 'https://media.api-sports.io/football/leagues/1.png';

function getWorldCupLogo(): ImageSourcePropType {
  // Lazy import keeps unit tests free of PNG asset loading.
  const { WORLD_CUP_LOGO } = require('@/constants/worldCupAssets') as {
    WORLD_CUP_LOGO: ImageSourcePropType;
  };
  return WORLD_CUP_LOGO;
}

export function isWorldCupLeague(
  leagueId?: number | null,
  leagueName?: string | null,
  round?: string | null,
): boolean {
  if (leagueId === 1) return true;
  const label = (leagueName ?? '').toLowerCase().trim();
  if (label === 'world cup' || (label.includes('world cup') && !label.includes('qualif'))) {
    return true;
  }
  const roundLower = (round ?? '').toLowerCase();
  if (roundLower.includes('group stage') || /^group\s+[a-z]/i.test(round ?? '')) {
    if (label.includes('world') || label === 'world cup') return true;
  }
  return false;
}

export function resolveMatchLeagueLogo(input: {
  leagueId?: number | null;
  league?: string | null;
  leagueLogo?: string | null;
  round?: string | null;
}): string | undefined {
  if (isWorldCupLeague(input.leagueId, input.league, input.round)) {
    return undefined;
  }
  const logo = input.leagueLogo?.trim();
  if (logo === FIFA_WORLD_CUP_LOGO_URL) return undefined;
  return logo || undefined;
}

/** Prefer for `<Image source={...} />` — World Cup uses bundled asset. */
export function resolveLeagueLogoSource(input: {
  leagueId?: number | null;
  league?: string | null;
  leagueLogo?: string | null;
  round?: string | null;
}): ImageSourcePropType | null {
  if (isWorldCupLeague(input.leagueId, input.league, input.round)) {
    return getWorldCupLogo();
  }
  const uri = input.leagueLogo?.trim();
  if (!uri || uri === FIFA_WORLD_CUP_LOGO_URL) return null;
  return { uri };
}
