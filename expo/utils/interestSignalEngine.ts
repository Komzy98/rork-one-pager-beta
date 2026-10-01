import type { LiveFootballMatch } from '@/types/habit';

export type PersonalSignalKind =
  | 'football_live'
  | 'football_upcoming'
  | 'football_recent_result';

export interface PersonalSignal {
  id: string;
  kind: PersonalSignalKind;
  priority: number;
  title: string;
  subtitle: string;
  reason: string;
  occurredAt: string;
  match: LiveFootballMatch;
}

const HOUR_MS = 60 * 60 * 1000;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function matchFollowedName(match: LiveFootballMatch, followedNames: readonly string[]): string | null {
  const home = normalize(match.homeTeam);
  const away = normalize(match.awayTeam);

  for (const rawName of followedNames) {
    const candidate = normalize(rawName);
    if (!candidate) continue;
    if (
      home === candidate ||
      away === candidate ||
      home.includes(candidate) ||
      away.includes(candidate) ||
      candidate.includes(home) ||
      candidate.includes(away)
    ) {
      return rawName;
    }
  }

  return null;
}

function formatOpponent(match: LiveFootballMatch, followedName: string | null): string {
  if (!followedName) return `${match.homeTeam} vs ${match.awayTeam}`;
  const followed = normalize(followedName);
  const home = normalize(match.homeTeam);
  return home.includes(followed) || followed.includes(home) ? match.awayTeam : match.homeTeam;
}

function formatRelativeKickoff(kickoff: Date, now: Date): string {
  const delta = kickoff.getTime() - now.getTime();
  const hours = Math.round(delta / HOUR_MS);

  if (delta >= 0 && delta < 90 * 60 * 1000) return 'Starting soon';
  if (delta >= 0 && delta < 6 * HOUR_MS) return `In about ${Math.max(1, hours)}h`;

  const today = now.toDateString();
  const tomorrow = new Date(now.getTime() + 24 * HOUR_MS).toDateString();
  const time = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (kickoff.toDateString() === today) return `Today · ${time}`;
  if (kickoff.toDateString() === tomorrow) return `Tomorrow · ${time}`;

  return kickoff.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ` · ${time}`;
}

function scoreUpcoming(hoursUntilKickoff: number): number {
  if (hoursUntilKickoff <= 3) return 96;
  if (hoursUntilKickoff <= 12) return 92;
  if (hoursUntilKickoff <= 36) return 88;
  if (hoursUntilKickoff <= 72) return 78;
  return 65;
}

/**
 * Converts already-personalised football data into a small ranked set of
 * "worth knowing" signals for Today.
 *
 * This deliberately keeps ranking deterministic and evidence-based. The LLM
 * layer can explain signals later, but it should not decide whether a fixture
 * exists or whether it is timely.
 */
export function buildFootballInterestSignals(params: {
  liveMatches: readonly LiveFootballMatch[];
  upcomingMatches: readonly LiveFootballMatch[];
  completedMatches: readonly LiveFootballMatch[];
  followedNames: readonly string[];
  now?: Date;
  limit?: number;
}): PersonalSignal[] {
  const {
    liveMatches,
    upcomingMatches,
    completedMatches,
    followedNames,
    now = new Date(),
    limit = 3,
  } = params;

  const signals: PersonalSignal[] = [];
  const seen = new Set<string>();

  for (const match of liveMatches) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    const followed = matchFollowedName(match, followedNames);
    const score = match.homeScore ?? 0;
    const opponentScore = match.awayScore ?? 0;
    signals.push({
      id: `football-live:${match.id}`,
      kind: 'football_live',
      priority: 110,
      title: followed ? `${followed} are playing now` : `${match.homeTeam} vs ${match.awayTeam} is live`,
      subtitle: `${match.homeTeam} ${score}–${opponentScore} ${match.awayTeam}`,
      reason: followed ? `Because you follow ${followed}` : 'Because this match matches your football interests',
      occurredAt: match.date,
      match,
    });
  }

  for (const match of upcomingMatches) {
    if (seen.has(match.id)) continue;
    const kickoff = new Date(match.date);
    const kickoffMs = kickoff.getTime();
    if (!Number.isFinite(kickoffMs)) continue;

    const hoursUntil = (kickoffMs - now.getTime()) / HOUR_MS;
    if (hoursUntil < -0.5 || hoursUntil > 7 * 24) continue;

    seen.add(match.id);
    const followed = matchFollowedName(match, followedNames);
    const opponent = formatOpponent(match, followed);

    signals.push({
      id: `football-upcoming:${match.id}`,
      kind: 'football_upcoming',
      priority: scoreUpcoming(hoursUntil),
      title: followed ? `${followed} play ${opponent}` : `${match.homeTeam} vs ${match.awayTeam}`,
      subtitle: `${formatRelativeKickoff(kickoff, now)} · ${match.league}`,
      reason: followed ? `Because you follow ${followed}` : 'Because this fixture matches your football interests',
      occurredAt: match.date,
      match,
    });
  }

  for (const match of completedMatches) {
    if (seen.has(match.id)) continue;
    const kickoff = new Date(match.date);
    const kickoffMs = kickoff.getTime();
    if (!Number.isFinite(kickoffMs)) continue;

    const hoursAgo = (now.getTime() - kickoffMs) / HOUR_MS;
    if (hoursAgo < 0 || hoursAgo > 36) continue;

    seen.add(match.id);
    const followed = matchFollowedName(match, followedNames);
    const result = `${match.homeTeam} ${match.homeScore ?? '–'}–${match.awayScore ?? '–'} ${match.awayTeam}`;

    signals.push({
      id: `football-result:${match.id}`,
      kind: 'football_recent_result',
      priority: hoursAgo <= 18 ? 82 : 72,
      title: followed ? `${followed} played recently` : 'A match you follow finished',
      subtitle: result,
      reason: followed ? `Because you follow ${followed}` : 'Because this result matches your football interests',
      occurredAt: match.date,
      match,
    });
  }

  return signals
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    })
    .slice(0, Math.max(0, limit));
}
