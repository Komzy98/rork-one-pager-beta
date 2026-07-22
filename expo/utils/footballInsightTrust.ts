import { isFriendlyMatch, isFollowedTeamInMatch } from '@/utils/footballFeedQuality';
import { isWorldCupMatch } from '@/utils/footballQueryContext';
import {
  matchInvolvesNationalInterest,
  type FootballPersonalizationMatch,
} from '@/utils/footballMatchPersonalization';
import { teamNameMatchesNationalInterest } from '@/utils/nationalTeamNameMatch';

export type InsightTrustContext = {
  favoriteClubApiIds: ReadonlySet<number>;
  /** Club display names keyed by api id. */
  favoriteClubNamesByApiId: ReadonlyMap<number, string>;
  nationalTeamApiIds: readonly number[];
  /** Profile nationality display names (e.g. "England"). */
  nationalityNames: readonly string[];
  countryInterestNamesLower: readonly string[];
  selectedProfileLeagueIds: ReadonlySet<number>;
  manualFilterLeagueIds: readonly number[];
};

function isFollowedClubMatch(
  match: FootballPersonalizationMatch,
  favoriteClubApiIds: ReadonlySet<number>,
): boolean {
  return (
    (typeof match.homeTeamId === 'number' && favoriteClubApiIds.has(match.homeTeamId)) ||
    (typeof match.awayTeamId === 'number' && favoriteClubApiIds.has(match.awayTeamId))
  );
}

function isFollowedNationalTeamMatch(
  match: FootballPersonalizationMatch,
  ctx: InsightTrustContext,
): boolean {
  return matchInvolvesNationalInterest(
    match,
    ctx.nationalTeamApiIds,
    ctx.countryInterestNamesLower,
  );
}

function isFollowedLeagueMatch(match: FootballPersonalizationMatch, ctx: InsightTrustContext): boolean {
  if (match.leagueId == null) return false;
  return (
    ctx.selectedProfileLeagueIds.has(match.leagueId) ||
    ctx.manualFilterLeagueIds.includes(match.leagueId)
  );
}

/**
 * Insight AI only when the top pick clearly ties to something the user follows:
 * club, national team, World Cup, or a followed league/tournament.
 */
export function isTrustworthyInsightMatch(
  match: FootballPersonalizationMatch | null | undefined,
  ctx: InsightTrustContext,
): boolean {
  if (!match) return false;
  if (isFriendlyMatch(match)) {
    if (isFollowedTeamInMatch(match, ctx.favoriteClubApiIds)) return true;
    if (isFollowedNationalTeamMatch(match, ctx)) return true;
    return false;
  }
  if (isFollowedClubMatch(match, ctx.favoriteClubApiIds)) return true;
  if (isFollowedNationalTeamMatch(match, ctx)) return true;
  if (isWorldCupMatch(match)) return true;
  if (isFollowedLeagueMatch(match, ctx)) return true;
  return false;
}

function matchedFollowedClubName(
  match: FootballPersonalizationMatch,
  ctx: InsightTrustContext,
): string | null {
  const ids = [
    typeof match.homeTeamId === 'number' ? match.homeTeamId : null,
    typeof match.awayTeamId === 'number' ? match.awayTeamId : null,
  ].filter((id): id is number => id != null);
  for (const id of ids) {
    if (ctx.favoriteClubApiIds.has(id)) {
      return ctx.favoriteClubNamesByApiId.get(id) ?? null;
    }
  }
  return null;
}

function matchedNationalityName(
  match: FootballPersonalizationMatch,
  ctx: InsightTrustContext,
): string | null {
  const home = match.homeTeam?.trim() ?? '';
  const away = match.awayTeam?.trim() ?? '';
  for (const name of ctx.nationalityNames) {
    const lower = name.toLowerCase();
    if (
      teamNameMatchesNationalInterest(home.toLowerCase(), lower) ||
      teamNameMatchesNationalInterest(away.toLowerCase(), lower)
    ) {
      return name;
    }
  }
  if (ctx.nationalTeamApiIds.length > 0) {
    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;
    if (typeof homeId === 'number' && ctx.nationalTeamApiIds.includes(homeId)) {
      return home || null;
    }
    if (typeof awayId === 'number' && ctx.nationalTeamApiIds.includes(awayId)) {
      return away || null;
    }
  }
  return null;
}

function insightStatusWord(match: FootballPersonalizationMatch): string {
  if (match.status === 'Live') return 'live';
  if (match.status === 'Upcoming') return 'upcoming';
  return 'recent';
}

function shortLeagueLabel(league: string): string {
  const t = league.trim();
  if (/world cup/i.test(t)) return 'World Cup';
  if (t.length <= 28) return t;
  return `${t.slice(0, 27).trimEnd()}…`;
}

/**
 * Plain-language reason shown to users, e.g. "World Cup · live", "Arsenal · upcoming".
 */
export function buildInsightWhyLabel(
  match: FootballPersonalizationMatch,
  ctx: InsightTrustContext,
): string | null {
  if (!isTrustworthyInsightMatch(match, ctx)) return null;

  const status = insightStatusWord(match);
  const club = matchedFollowedClubName(match, ctx);
  if (club) return `${club} · ${status}`;

  const nation = matchedNationalityName(match, ctx);
  if (nation) return `${nation} · ${status}`;

  if (isWorldCupMatch(match)) return `World Cup · ${status}`;

  if (isFollowedLeagueMatch(match, ctx)) {
    return `${shortLeagueLabel(match.league)} · ${status}`;
  }

  return null;
}

export function buildInsightSummaryPrefix(
  match: FootballPersonalizationMatch,
  whyLabel: string,
): string {
  if (match.status === 'Live') {
    return `Best live pick for you — ${whyLabel}.`;
  }
  if (match.status === 'Upcoming') {
    return `Top upcoming pick for you — ${whyLabel}.`;
  }
  return `Highlighted for you — ${whyLabel}.`;
}

export type FootballAiInsightCard = {
  whyLabel: string;
  summary: string;
  confidence: number;
  confidenceLabel: string;
};

export function buildFootballAiInsightCard(input: {
  match: FootballPersonalizationMatch;
  ctx: InsightTrustContext;
  standingsLine?: string | null;
  /** Knockout ties use one sentence (round + form) without redundant prefix. */
  knockoutSummary?: boolean;
}): FootballAiInsightCard | null {
  const { match, ctx, standingsLine, knockoutSummary } = input;
  const whyLabel = buildInsightWhyLabel(match, ctx);
  if (!whyLabel) return null;

  const isClub = Boolean(matchedFollowedClubName(match, ctx));
  const isNation = Boolean(matchedNationalityName(match, ctx));
  const isWc = isWorldCupMatch(match);
  const isLeague = isFollowedLeagueMatch(match, ctx);
  const isLive = match.status === 'Live';
  const hasScores = match.homeScore != null && match.awayScore != null;

  let score = 58;
  if (isLive) score += 12;
  if (isClub) score += 14;
  if (isNation) score += 10;
  if (isWc) score += 8;
  if (isLeague) score += 8;
  if (hasScores) score += 4;
  if (standingsLine) score += 6;

  const confidence = Math.max(62, Math.min(95, score));
  const confidenceLabel =
    confidence >= 82 ? 'High confidence' : confidence >= 70 ? 'Medium confidence' : 'Early signal';

  let summary: string;
  if (knockoutSummary && standingsLine) {
    summary = standingsLine;
  } else {
    summary = buildInsightSummaryPrefix(match, whyLabel);
    if (standingsLine) {
      summary = `${summary} ${standingsLine}`.replace(/\s+/g, ' ').trim();
    }
  }

  return {
    whyLabel: knockoutSummary ? '' : whyLabel,
    summary,
    confidence,
    confidenceLabel,
  };
}
