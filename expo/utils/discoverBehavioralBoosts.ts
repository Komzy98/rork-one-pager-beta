import type { UserProfile } from '@/types/habit';
import type { Task } from '@/types/task';
import type {
  DiscoverEngineResult,
  DiscoverFeedbackState,
  DiscoverLifeContext,
  DiscoverOpportunity,
  DiscoverOpportunityKind,
} from '@/utils/discoverLifeEngine';

export interface DiscoverBehaviorProfile {
  kindAffinity: Partial<Record<DiscoverOpportunityKind, number>>;
  preferredProductiveHour: number | null;
  recentAverageEffort: number | null;
  recentDifficultRate: number;
  recentCompletionCount: number;
}

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tabAffinity(profile?: UserProfile | null): Partial<Record<DiscoverOpportunityKind, number>> {
  const visits = profile?.tabVisitCounts ?? {};
  const rows = Object.entries(visits).filter(([, count]) => Number(count) > 0);
  const max = Math.max(1, ...rows.map(([, count]) => Number(count) || 0));
  const score = (names: string[]) => {
    const raw = names.reduce((sum, name) => sum + (Number(visits[name]) || 0), 0);
    return clamp((raw / max) * 8, 0, 10);
  };
  return {
    event: score(['events']),
    watch: score(['shows']),
    media: score(['shows']),
    sport: score(['sports']),
    recipe: score(['cooking']),
    habit: score(['tasks', 'discover']),
    task: score(['tasks', 'activities']),
  };
}

export function buildDiscoverBehaviorProfile(
  profile: UserProfile | null | undefined,
  tasks: readonly Task[],
  now = new Date(),
): DiscoverBehaviorProfile {
  const since = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const logs = tasks
    .flatMap((task) => task.completionLogs ?? [])
    .filter((log) => {
      const at = new Date(log.completedAt).getTime();
      return Number.isFinite(at) && at >= since && at <= now.getTime();
    });

  const hourCounts = new Map<number, number>();
  let effortTotal = 0;
  let effortCount = 0;
  let difficult = 0;

  for (const log of logs) {
    const hour = new Date(log.completedAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    if (typeof log.effort === 'number') {
      effortTotal += log.effort;
      effortCount += 1;
    }
    if (log.mood === 'difficult') difficult += 1;
  }

  const preferredProductiveHour = [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    kindAffinity: tabAffinity(profile),
    preferredProductiveHour,
    recentAverageEffort: effortCount ? effortTotal / effortCount : null,
    recentDifficultRate: logs.length ? difficult / logs.length : 0,
    recentCompletionCount: logs.length,
  };
}

function feedbackPenalty(item: DiscoverOpportunity, feedback?: DiscoverFeedbackState | null): number {
  const entry = feedback?.entries[item.key];
  if (!entry?.lastNegativeAt || entry.negative <= entry.positive) return 0;
  const ageHours = Math.max(0, (Date.now() - new Date(entry.lastNegativeAt).getTime()) / 3_600_000);
  const recency = ageHours < 24 ? 1 : ageHours < 72 ? 0.8 : ageHours < 168 ? 0.55 : ageHours < 720 ? 0.25 : 0.1;
  const reasons = entry.reasons ?? {};
  let penalty = 0;
  if ((reasons.not_for_me ?? 0) > 0) penalty += 72;
  if ((reasons.seen_already ?? 0) > 0) penalty += 65;
  if ((reasons.bad_timing ?? 0) > 0) penalty += 22;
  if (item.kind === 'event' && (reasons.too_far ?? 0) > 0) penalty += 34;
  if (item.kind === 'event' && (reasons.too_expensive ?? 0) > 0) penalty += 30;
  if (penalty === 0) penalty = 30;
  return penalty * recency;
}

function identityBoost(item: DiscoverOpportunity, profile?: UserProfile | null) {
  const text = normalize(`${item.title} ${item.subtitle} ${item.reasons.join(' ')}`);
  let boost = 0;
  for (const goal of profile?.identityGoals ?? []) {
    const normalized = normalize(goal);
    if (!normalized) continue;
    if (normalized.length >= 5 && text.includes(normalized)) {
      boost = Math.max(boost, 14);
      continue;
    }
    const words = normalized.split(' ').filter((word) => word.length >= 5);
    if (words.some((word) => text.includes(word))) boost = Math.max(boost, 9);
  }
  return boost;
}

function joyBoost(item: DiscoverOpportunity, profile?: UserProfile | null) {
  const joy = profile?.joySources;
  if (!joy) return 0;
  const terms = [
    ...(joy.tvShows ?? []),
    ...(joy.youtubers ?? []),
    ...(joy.games ?? []),
    ...(joy.music ?? []),
    ...(joy.podcasts ?? []),
    ...(joy.restaurants ?? []),
    ...(joy.exerciseTypes ?? []),
  ].map(normalize).filter((term) => term.length >= 3);
  const text = normalize(`${item.title} ${item.subtitle} ${item.reasons.join(' ')}`);
  return terms.some((term) => text.includes(term)) ? 7 : 0;
}

function behaviorBoost(
  item: DiscoverOpportunity,
  behavior: DiscoverBehaviorProfile,
  context: DiscoverLifeContext,
) {
  let boost = behavior.kindAffinity[item.kind] ?? 0;
  const hour = context.now.getHours();
  if (
    behavior.preferredProductiveHour != null &&
    Math.abs(hour - behavior.preferredProductiveHour) <= 1 &&
    (item.kind === 'task' || item.kind === 'habit')
  ) {
    boost += 7;
  }
  if (
    (context.energy.mode === 'low_energy' || context.energy.mode === 'recovery') &&
    behavior.recentAverageEffort != null &&
    behavior.recentAverageEffort >= 3.7
  ) {
    if ((item.durationMinutes ?? 45) <= 30) boost += 5;
    if ((item.durationMinutes ?? 45) >= 90) boost -= 7;
  }
  if (behavior.recentDifficultRate >= 0.35 && (item.kind === 'watch' || item.kind === 'recipe')) boost += 4;
  return boost;
}

function diversityPick(rows: DiscoverOpportunity[], limit: number) {
  const selected: DiscoverOpportunity[] = [];
  const counts = new Map<DiscoverOpportunityKind, number>();
  for (const row of rows) {
    const max = row.kind === 'event' ? 2 : 1;
    const count = counts.get(row.kind) ?? 0;
    if (count >= max) continue;
    selected.push(row);
    counts.set(row.kind, count + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function rerankDiscoverEngine(params: {
  engine: DiscoverEngineResult;
  context: DiscoverLifeContext;
  profile?: UserProfile | null;
  tasks: readonly Task[];
  feedback?: DiscoverFeedbackState | null;
}): DiscoverEngineResult & { behavior: DiscoverBehaviorProfile } {
  const behavior = buildDiscoverBehaviorProfile(params.profile, params.tasks, params.context.now);
  const ranked = params.engine.ranked
    .map((item) => ({
      ...item,
      score:
        item.score +
        behaviorBoost(item, behavior, params.context) +
        identityBoost(item, params.profile) +
        joyBoost(item, params.profile) -
        feedbackPenalty(item, params.feedback),
    }))
    .sort((a, b) => b.score - a.score);

  const hero = ranked[0] ?? null;
  const remaining = ranked.filter((item) => item.key !== hero?.key);
  const alternatives = diversityPick(remaining, 4);
  const used = new Set([hero?.key, ...alternatives.map((item) => item.key)].filter(Boolean));
  const later = diversityPick(remaining.filter((item) => !used.has(item.key)), 8);
  const eventPicks = ranked.filter((item) => item.kind === 'event').slice(0, 10);
  const serendipity = ranked.find((item) => {
    if (used.has(item.key)) return false;
    if (item.kind === 'media') return true;
    const reasons = normalize(item.reasons.join(' '));
    return item.kind === 'event' && !/because you|you follow|fits your|you saved|your goal/.test(reasons);
  }) ?? null;

  return { ranked, hero, alternatives, later, eventPicks, serendipity, behavior };
}
