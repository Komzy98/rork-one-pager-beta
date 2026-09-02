export type ExperienceKind = 'event' | 'recipe' | 'show' | 'routine' | 'suggestion';

export type ExperienceAction =
  | 'declared'
  | 'chosen'
  | 'completed'
  | 'skipped'
  | 'enjoyed'
  | 'useful'
  | 'irrelevant'
  | 'difficulty'
  | 'dismissed';

export interface ExperienceSignal {
  kind: ExperienceKind;
  subjectId: string;
  title?: string;
  action: ExperienceAction;
  /** Numeric value when useful: 1-5 enjoyment / difficulty, etc. */
  value?: number;
  /** Stable semantic tags, e.g. comedy, football, pasta, gym. */
  tags?: string[];
  occurredAt?: string;
  source?: string;
}

export interface ExperienceEntry {
  key: string;
  kind: ExperienceKind;
  subjectId: string;
  title?: string;
  tags: string[];
  declaredCount: number;
  chosenCount: number;
  completedCount: number;
  skippedCount: number;
  positiveCount: number;
  negativeCount: number;
  enjoymentTotal: number;
  enjoymentCount: number;
  difficultyTotal: number;
  difficultyCount: number;
  lastDeclaredAt?: string;
  lastChosenAt?: string;
  lastCompletedAt?: string;
  lastSkippedAt?: string;
  lastFeedbackAt?: string;
  lastPromptDismissedAt?: string;
  source?: string;
}

export interface ExperienceFeedbackState {
  version: 1;
  entries: Record<string, ExperienceEntry>;
  /** Behavioural preference by domain. Actual outcomes move this more than declarations. */
  kindAffinity: Partial<Record<ExperienceKind, number>>;
  /** Behavioural preference by semantic tag/category. */
  tagAffinity: Record<string, number>;
}

export const EMPTY_EXPERIENCE_FEEDBACK: ExperienceFeedbackState = {
  version: 1,
  entries: {},
  kindAffinity: {},
  tagAffinity: {},
};

export function experienceKey(kind: ExperienceKind, subjectId: string) {
  return `${kind}:${subjectId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeTag(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function dedupeTags(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeTag).filter((value) => value.length >= 2))].slice(0, 12);
}

function affinityDelta(signal: ExperienceSignal) {
  switch (signal.action) {
    case 'declared':
      return 0.2;
    case 'chosen':
      return 0.9;
    case 'completed':
      return 1.8;
    case 'skipped':
      // A missed plan is weak evidence. It may have been timing, not preference.
      return -0.2;
    case 'useful':
      return 1.8;
    case 'irrelevant':
      return -2.2;
    case 'enjoyed': {
      const rating = clamp(Number(signal.value ?? 3), 1, 5);
      return (rating - 3) * 1.35;
    }
    case 'difficulty':
    case 'dismissed':
      return 0;
    default:
      return 0;
  }
}

function emptyEntry(signal: ExperienceSignal): ExperienceEntry {
  return {
    key: experienceKey(signal.kind, signal.subjectId),
    kind: signal.kind,
    subjectId: signal.subjectId,
    title: signal.title,
    tags: dedupeTags(signal.tags),
    declaredCount: 0,
    chosenCount: 0,
    completedCount: 0,
    skippedCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    enjoymentTotal: 0,
    enjoymentCount: 0,
    difficultyTotal: 0,
    difficultyCount: 0,
    source: signal.source,
  };
}

export function applyExperienceSignal(
  current: ExperienceFeedbackState | null | undefined,
  signal: ExperienceSignal,
): ExperienceFeedbackState {
  const state = current ?? EMPTY_EXPERIENCE_FEEDBACK;
  const now = signal.occurredAt ?? new Date().toISOString();
  const key = experienceKey(signal.kind, signal.subjectId);
  const previous = state.entries[key] ?? emptyEntry(signal);
  const tags = dedupeTags([...(previous.tags ?? []), ...(signal.tags ?? [])]);
  const next: ExperienceEntry = {
    ...previous,
    title: signal.title ?? previous.title,
    tags,
    source: signal.source ?? previous.source,
  };

  switch (signal.action) {
    case 'declared':
      next.declaredCount += 1;
      next.lastDeclaredAt = now;
      break;
    case 'chosen':
      next.chosenCount += 1;
      next.lastChosenAt = now;
      break;
    case 'completed':
      next.completedCount += 1;
      next.lastCompletedAt = now;
      break;
    case 'skipped':
      next.skippedCount += 1;
      next.lastSkippedAt = now;
      break;
    case 'useful':
      next.positiveCount += 1;
      next.lastFeedbackAt = now;
      break;
    case 'irrelevant':
      next.negativeCount += 1;
      next.lastFeedbackAt = now;
      break;
    case 'enjoyed': {
      const rating = clamp(Number(signal.value ?? 3), 1, 5);
      next.enjoymentTotal += rating;
      next.enjoymentCount += 1;
      if (rating >= 4) next.positiveCount += 1;
      if (rating <= 2) next.negativeCount += 1;
      next.lastFeedbackAt = now;
      break;
    }
    case 'difficulty': {
      const rating = clamp(Number(signal.value ?? 3), 1, 5);
      next.difficultyTotal += rating;
      next.difficultyCount += 1;
      next.lastFeedbackAt = now;
      break;
    }
    case 'dismissed':
      next.lastPromptDismissedAt = now;
      break;
  }

  const delta = affinityDelta(signal);
  const kindAffinity = {
    ...state.kindAffinity,
    [signal.kind]: clamp((state.kindAffinity[signal.kind] ?? 0) + delta, -30, 30),
  };
  const tagAffinity = { ...state.tagAffinity };
  for (const tag of tags) {
    tagAffinity[tag] = clamp((tagAffinity[tag] ?? 0) + delta * 0.8, -30, 30);
  }

  return {
    version: 1,
    entries: { ...state.entries, [key]: next },
    kindAffinity,
    tagAffinity,
  };
}

export function averageEnjoyment(entry: ExperienceEntry | null | undefined) {
  return entry?.enjoymentCount ? entry.enjoymentTotal / entry.enjoymentCount : null;
}

export function averageDifficulty(entry: ExperienceEntry | null | undefined) {
  return entry?.difficultyCount ? entry.difficultyTotal / entry.difficultyCount : null;
}

/**
 * A simple evidence ladder used by UI/debugging. Completed and enjoyed experiences
 * deliberately outweigh onboarding declarations and passive saves.
 */
export function experienceEvidenceScore(entry: ExperienceEntry | null | undefined) {
  if (!entry) return 0;
  const enjoyment = averageEnjoyment(entry);
  const enjoymentSignal = enjoyment == null ? 0 : (enjoyment - 3) * 2;
  return (
    entry.declaredCount * 0.25 +
    entry.chosenCount * 1 +
    entry.completedCount * 2 +
    entry.positiveCount * 2.5 -
    entry.negativeCount * 2.5 -
    entry.skippedCount * 0.25 +
    enjoymentSignal
  );
}
