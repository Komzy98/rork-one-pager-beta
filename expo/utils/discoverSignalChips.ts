import type { UserProfile } from '@/types/habit';
import type {
  DiscoverEngineResult,
  DiscoverLifeContext,
  DiscoverOpportunity,
  DiscoverSportSignal,
} from '@/utils/discoverLifeEngine';

function normalize(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryLabel(category?: string | null): string | null {
  const key = normalize(category);
  if (!key) return null;
  if (/sport|football|soccer/.test(key)) return 'Football';
  if (/basketball|nba/.test(key)) return 'Basketball';
  if (/formula 1|formula one|f1/.test(key)) return 'Formula 1';
  if (/comedy/.test(key)) return 'Comedy';
  if (/music|concert|gig/.test(key)) return 'Music';
  if (/food|dining/.test(key)) return 'Food';
  if (/fitness|run|gym/.test(key)) return 'Fitness';
  if (/theatre|theater/.test(key)) return 'Theatre';
  if (/arts|exhibit|gallery/.test(key)) return 'Arts';
  if (/nightlife|club/.test(key)) return 'Nightlife';
  if (/tech/.test(key)) return 'Tech';
  return category
    ? category
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : null;
}

function opportunityText(item: DiscoverOpportunity): string {
  return normalize([
    item.title,
    item.subtitle,
    item.eyebrow,
    ...item.reasons,
    item.event?.title,
    item.event?.description,
    item.event?.venue,
    item.event?.category,
    ...(item.event?.tags ?? []),
  ].filter(Boolean).join(' '));
}

function explicitReasonSignal(reason: string): string | null {
  const trimmed = reason.trim();
  const match = trimmed.match(
    /^Because you (?:follow|like|love|chose)\s+(.+)$/i,
  ) ?? trimmed.match(/^Because you(?:'|’)re into\s+(.+)$/i);
  if (!match?.[1]) return null;

  const value = match[1]
    .replace(/[.!]+$/, '')
    .trim();
  if (!value || value.length > 34) return null;
  return value;
}

function matchingWindowLabel(
  item: DiscoverOpportunity,
  context: DiscoverLifeContext,
): string | null {
  if (!item.startsAt) {
    const openReason = item.reasons.find((reason) => /\bis open\b/i.test(reason));
    if (!openReason) return null;
    const beforeDetail = openReason.split('·')[0]?.trim() ?? '';
    return beforeDetail.replace(/\bis open\b/i, 'free').trim() || null;
  }

  const start = item.startsAt.getTime();
  const duration = (item.durationMinutes ?? 60) * 60_000;
  const end = start + duration;
  const window = context.openWindows.find(
    (candidate) =>
      start >= candidate.start.getTime() - 10 * 60_000 &&
      end <= candidate.end.getTime() + 10 * 60_000,
  );
  return window ? `${window.label} free` : null;
}

function kindLabel(item: DiscoverOpportunity, sportSignals: readonly DiscoverSportSignal[]): string | null {
  if (item.kind === 'event') return categoryLabel(item.event?.category);
  if (item.kind === 'watch' || item.kind === 'media') return 'Watch';
  if (item.kind === 'recipe') return 'Cooking';
  if (item.kind === 'habit') return 'Habits';
  if (item.kind === 'task') return 'Tasks';
  if (item.kind !== 'sport') return null;

  const sport = sportSignals.find((signal) => signal.id === item.id);
  const league = normalize(sport?.league ?? item.subtitle);
  if (/nba|basketball/.test(league) || item.id.startsWith('nba-')) return 'Basketball';
  if (/formula 1|formula one|f1/.test(league) || item.id.startsWith('f1-')) return 'Formula 1';
  return 'Football';
}

export function buildDiscoverSignalChips(params: {
  profile?: UserProfile | null;
  context: DiscoverLifeContext;
  engine: DiscoverEngineResult;
  sportSignals: readonly DiscoverSportSignal[];
  limit?: number;
}): string[] {
  const { profile, context, engine, sportSignals, limit = 6 } = params;
  const output: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string | null) => {
    const cleaned = value?.trim();
    const key = normalize(cleaned);
    if (!cleaned || !key || seen.has(key) || output.length >= limit) return;
    seen.add(key);
    output.push(cleaned);
  };

  const footballFavorites = profile?.favoriteTeams ?? [];
  const nbaFavorites = profile?.favoriteNBATeams ?? [];
  const allFavoriteNames = [...footballFavorites.map((team) => team.name), ...nbaFavorites.map((team) => team.name)];
  const favoriteKeys = new Set(allFavoriteNames.map(normalize).filter(Boolean));

  const visible = [engine.hero, ...engine.alternatives.slice(0, 3)].filter(
    (item): item is DiscoverOpportunity => Boolean(item),
  );

  visible.forEach((item, index) => {
    const text = opportunityText(item);

    // A team only earns a chip when it is actually connected to a visible recommendation.
    for (const teamName of allFavoriteNames) {
      const key = normalize(teamName);
      if (key && text.includes(key)) add(teamName);
    }

    if (item.kind === 'sport') {
      const signal = sportSignals.find((candidate) => candidate.id === item.id);
      add(signal?.favoriteTeamName);
    }

    for (const reason of item.reasons) add(explicitReasonSignal(reason));

    // The hero gets the strongest contextual explanation: what + when.
    if (index === 0) {
      add(kindLabel(item, sportSignals));
      add(matchingWindowLabel(item, context));
    }
  });

  // If no visible recommendation mentions a team, upcoming/live favourite-team sport can still
  // explain the broader ranking context — but dormant favourites no longer get permanent billing.
  if (!output.some((chip) => favoriteKeys.has(normalize(chip)))) {
    for (const signal of sportSignals) {
      if (!signal.favoriteTeamName) continue;
      add(signal.favoriteTeamName);
      if (output.length >= Math.min(limit, 2)) break;
    }
  }

  // Fill remaining space with non-team profile/life signals. This intentionally skips favourite
  // team chips from the old generic context so the first saved club cannot dominate the strip.
  for (const fallback of context.signalChips) {
    if (favoriteKeys.has(normalize(fallback))) continue;
    add(fallback);
  }

  return output.slice(0, limit);
}
