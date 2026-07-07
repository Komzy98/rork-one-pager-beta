import { formatMatchRoundLabel, isKnockoutRoundLabel } from '@/utils/matchRoundLabel';

export type KnockoutFixtureLite = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'Live' | 'Upcoming' | 'Completed';
  round?: string | null;
  date: string;
  time?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  leagueId?: number;
};

const LIVE_SHORT = new Set(['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT', 'INT', 'SUSP']);
const COMPLETED_SHORT = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

/** True when API-Football `league.round` is a knockout stage (not group stage). */
export function isKnockoutRoundRaw(round?: string | null): boolean {
  if (!round?.trim()) return false;
  const lower = round.toLowerCase();
  if (/group stage/i.test(lower)) return false;
  if (/^group\s+[-–]?\s*[a-z0-9]/i.test(lower)) return false;
  const label = formatMatchRoundLabel(round);
  return isKnockoutRoundLabel(label);
}

export function isKnockoutFixture(fixture: { round?: string | null }): boolean {
  return isKnockoutRoundRaw(fixture.round);
}

/** Tournament has entered knockout phase when any fetched fixture is a knockout round. */
export function detectKnockoutPhase(fixtures: readonly { round?: string | null }[]): boolean {
  return fixtures.some(isKnockoutFixture);
}

const ROUND_ORDER: { pattern: RegExp; order: number }[] = [
  { pattern: /round of 32/i, order: 10 },
  { pattern: /round of 16/i, order: 20 },
  { pattern: /quarter/i, order: 30 },
  { pattern: /semi/i, order: 40 },
  { pattern: /3rd|third/i, order: 50 },
  { pattern: /^final$/i, order: 60 },
];

export function knockoutRoundSortOrder(roundRaw: string, roundLabel: string): number {
  for (const { pattern, order } of ROUND_ORDER) {
    if (pattern.test(roundRaw) || pattern.test(roundLabel)) return order;
  }
  return 35;
}

export type KnockoutRoundGroup = {
  roundLabel: string;
  sortOrder: number;
  fixtures: KnockoutFixtureLite[];
};

export function buildKnockoutRoundGroups(fixtures: readonly KnockoutFixtureLite[]): KnockoutRoundGroup[] {
  const byRound = new Map<string, { sortOrder: number; fixtures: KnockoutFixtureLite[] }>();

  for (const fixture of fixtures) {
    if (!isKnockoutFixture(fixture)) continue;
    const raw = fixture.round ?? 'Knockout';
    const roundLabel = formatMatchRoundLabel(raw) ?? raw.replace(/\s*-\s*/g, ' · ');
    const sortOrder = knockoutRoundSortOrder(raw, roundLabel);
    const existing = byRound.get(roundLabel);
    if (existing) {
      existing.fixtures.push(fixture);
    } else {
      byRound.set(roundLabel, { sortOrder, fixtures: [fixture] });
    }
  }

  return [...byRound.entries()]
    .map(([roundLabel, { sortOrder, fixtures: roundFixtures }]) => ({
      roundLabel,
      sortOrder,
      fixtures: [...roundFixtures].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapApiFixturesToKnockoutLite(fixtures: unknown[]): KnockoutFixtureLite[] {
  if (!Array.isArray(fixtures)) return [];

  return fixtures.map((fixture: any) => {
    const statusShort = String(fixture.fixture?.status?.short || '').toUpperCase();
    let status: KnockoutFixtureLite['status'] = 'Upcoming';
    if (LIVE_SHORT.has(statusShort)) status = 'Live';
    else if (COMPLETED_SHORT.has(statusShort)) status = 'Completed';

    const date = new Date(fixture.fixture?.date || Date.now());
    const timeString = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      id: String(fixture.fixture?.id ?? ''),
      homeTeam: fixture.teams?.home?.name || 'Home',
      awayTeam: fixture.teams?.away?.name || 'Away',
      homeTeamId: fixture.teams?.home?.id,
      awayTeamId: fixture.teams?.away?.id,
      homeScore: fixture.goals?.home ?? null,
      awayScore: fixture.goals?.away ?? null,
      status,
      round: fixture.league?.round,
      date: fixture.fixture?.date || new Date().toISOString(),
      time: timeString,
      homeTeamLogo: fixture.teams?.home?.logo,
      awayTeamLogo: fixture.teams?.away?.logo,
      leagueId: fixture.league?.id,
    };
  });
}

export function countFormWinsFromApiForm(
  form: readonly any[] | undefined,
  teamId: number | undefined,
  n: number,
): number {
  if (!form?.length || !teamId) return 0;
  let wins = 0;
  for (const m of form.slice(0, n)) {
    const hid = m?.teams?.home?.id;
    const aid = m?.teams?.away?.id;
    const hg = m?.goals?.home;
    const ag = m?.goals?.away;
    if (hg == null || ag == null) continue;
    if (hid === teamId && hg > ag) wins++;
    else if (aid === teamId && ag > hg) wins++;
  }
  return wins;
}

export function buildKnockoutInsightContextLine(input: {
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  round?: string | null;
  homeForm?: readonly any[];
  awayForm?: readonly any[];
}): string | null {
  const roundLabel = formatMatchRoundLabel(input.round);
  if (!roundLabel) return null;

  const homeWins = countFormWinsFromApiForm(input.homeForm, input.homeTeamId, 5);
  const awayWins = countFormWinsFromApiForm(input.awayForm, input.awayTeamId, 5);

  const homeShort = input.homeTeam.length > 16 ? `${input.homeTeam.slice(0, 15)}…` : input.homeTeam;
  const awayShort = input.awayTeam.length > 16 ? `${input.awayTeam.slice(0, 15)}…` : input.awayTeam;

  if (homeWins > 0 || awayWins > 0) {
    const parts: string[] = [];
    if (homeWins > 0) parts.push(`${homeShort} ${homeWins}W in last 5`);
    if (awayWins > 0) parts.push(`${awayShort} ${awayWins}W in last 5`);
    return `${roundLabel} — ${parts.join('; ')}.`;
  }

  return `${roundLabel} — knockout tie, group tables no longer apply.`;
}
