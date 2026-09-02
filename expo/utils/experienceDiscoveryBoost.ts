import type { ExperienceFeedbackState } from '@/utils/experienceFeedback';
import type {
  DiscoverEngineResult,
  DiscoverOpportunity,
  DiscoverOpportunityKind,
} from '@/utils/discoverLifeEngine';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function experienceBoostForDiscoverKind(
  kind: DiscoverOpportunityKind,
  experience?: ExperienceFeedbackState | null,
) {
  if (!experience) return 0;
  const direct = experience.kindAffinity;
  const tags = experience.tagAffinity;
  const suggestion = tags[kind] ?? 0;

  switch (kind) {
    case 'event':
      return clamp((direct.event ?? 0) + suggestion * 0.6, -18, 18);
    case 'recipe':
      return clamp((direct.recipe ?? 0) + suggestion * 0.6, -18, 18);
    case 'watch':
    case 'media':
      return clamp((direct.show ?? 0) + suggestion * 0.6, -18, 18);
    case 'habit':
      return clamp((direct.routine ?? 0) + suggestion * 0.6, -18, 18);
    case 'sport':
    case 'task':
      return clamp(suggestion * 0.6, -12, 12);
    default:
      return 0;
  }
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

/**
 * Applies only the outcome-derived delta to an engine that has already been ranked by
 * Life Context. This avoids rerunning / double-counting the existing identity, joy and
 * negative-feedback boosts when the shared provider adds experiential learning.
 */
export function applyExperienceDiscoveryBoost<T extends DiscoverEngineResult>(
  engine: T,
  experience?: ExperienceFeedbackState | null,
): T {
  if (!experience || Object.keys(experience.entries).length === 0) return engine;

  const ranked = engine.ranked
    .map((item) => ({
      ...item,
      score: item.score + experienceBoostForDiscoverKind(item.kind, experience),
    }))
    .sort((a, b) => b.score - a.score);

  const hero = ranked[0] ?? null;
  const remaining = ranked.filter((item) => item.key !== hero?.key);
  const alternatives = diversityPick(remaining, 4);
  const used = new Set([hero?.key, ...alternatives.map((item) => item.key)].filter(Boolean));
  const later = diversityPick(remaining.filter((item) => !used.has(item.key)), 8);
  const eventPicks = ranked.filter((item) => item.kind === 'event').slice(0, 10);
  const originalSerendipityKey = engine.serendipity?.key;
  const serendipity = originalSerendipityKey
    ? ranked.find((item) => item.key === originalSerendipityKey) ?? null
    : null;

  return {
    ...engine,
    ranked,
    hero,
    alternatives,
    later,
    eventPicks,
    serendipity,
  };
}
