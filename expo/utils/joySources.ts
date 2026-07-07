import type { JoySources, Show, UserProfile } from '@/types/habit';
import type { Task } from '@/types/task';

export type JoySourceKey = keyof JoySources;

export type JoySourceFieldConfig = {
  key: JoySourceKey;
  label: string;
  emoji: string;
  placeholder: string;
  hint: string;
};

export const JOY_SOURCE_FIELDS: JoySourceFieldConfig[] = [
  {
    key: 'tvShows',
    label: 'TV & streaming',
    emoji: '📺',
    placeholder: 'The Boys, Succession…',
    hint: 'Shows that lift your mood',
  },
  {
    key: 'youtubers',
    label: 'YouTube & creators',
    emoji: '▶️',
    placeholder: 'MKBHD, Kurzgesagt…',
    hint: 'Channels you check when you need a break',
  },
  {
    key: 'games',
    label: 'Games',
    emoji: '🎮',
    placeholder: 'FC 26, Elden Ring…',
    hint: 'Games you play to unwind',
  },
  {
    key: 'music',
    label: 'Music & artists',
    emoji: '🎵',
    placeholder: 'Burna Boy, Fred again..…',
    hint: 'Artists or albums that reset your head',
  },
  {
    key: 'podcasts',
    label: 'Podcasts',
    emoji: '🎙️',
    placeholder: 'The Rest Is Football…',
    hint: 'Shows you listen to on walks or commutes',
  },
  {
    key: 'restaurants',
    label: 'Food & places',
    emoji: '🍽️',
    placeholder: 'Dishoom, local café…',
    hint: 'Spots that feel like a treat',
  },
  {
    key: 'exerciseTypes',
    label: 'Movement you enjoy',
    emoji: '🏃',
    placeholder: 'Walks, gym, padel…',
    hint: 'Exercise that helps without feeling like punishment',
  },
];

const EXERCISE_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bgym\b|\blift|\bweights\b/i, label: 'the gym' },
  { pattern: /\brun|\bjog|\b5k\b/i, label: 'a run' },
  { pattern: /\bwalk/i, label: 'a walk' },
  { pattern: /\byoga\b/i, label: 'yoga' },
  { pattern: /\bswim/i, label: 'swimming' },
  { pattern: /\bcycle|\bbike|\bspin\b/i, label: 'cycling' },
  { pattern: /\bpadel|\btennis|\bfootball|\bbasketball/i, label: 'sport' },
];

const INTEREST_JOY_HINTS: Record<string, Partial<JoySources>> = {
  ufc: { games: ['UFC fight nights'] },
  f1: { games: ['Formula 1 race weekends'] },
  football: { podcasts: ['Match day'] },
  nba: { games: ['NBA nights'] },
  movies: { tvShows: ['Movie night'] },
};

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function parseJoySourceInput(text: string): string[] {
  return dedupeStrings(
    text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function joySourcesToDisplayText(values: string[] | undefined): string {
  return (values ?? []).join(', ');
}

export function countJoySources(joy?: JoySources | null): number {
  if (!joy) return 0;
  return JOY_SOURCE_FIELDS.reduce((sum, f) => sum + (joy[f.key]?.length ?? 0), 0);
}

export function isJoySourcesEmpty(joy?: JoySources | null): boolean {
  return countJoySources(joy) === 0;
}

/** Merge manual profile entries with auto-inferred sources (union, manual order first). */
export function mergeJoySources(manual?: JoySources | null, inferred?: JoySources | null): JoySources {
  const out: JoySources = {};
  for (const field of JOY_SOURCE_FIELDS) {
    const merged = dedupeStrings([...(manual?.[field.key] ?? []), ...(inferred?.[field.key] ?? [])]);
    if (merged.length > 0) out[field.key] = merged;
  }
  return out;
}

export function inferJoySources(params: {
  profile?: UserProfile | null;
  shows?: Show[];
  habitTasks?: Task[];
}): JoySources {
  const { profile, shows = [], habitTasks = [] } = params;
  const out: JoySources = {};

  const watchingShows = dedupeStrings(
    shows.filter((s) => s.status === 'Watching' && s.title?.trim()).map((s) => s.title.trim())
  );
  if (watchingShows.length) out.tvShows = watchingShows;

  const exerciseLabels: string[] = [];
  for (const task of habitTasks) {
    const blob = `${task.title} ${task.description ?? ''}`;
    for (const { pattern, label } of EXERCISE_KEYWORDS) {
      if (pattern.test(blob) && !exerciseLabels.includes(label)) {
        exerciseLabels.push(label);
      }
    }
  }
  if (exerciseLabels.length) out.exerciseTypes = exerciseLabels;

  for (const interest of profile?.interests ?? []) {
    const hints = INTEREST_JOY_HINTS[interest];
    if (!hints) continue;
    for (const field of JOY_SOURCE_FIELDS) {
      const extra = hints[field.key];
      if (!extra?.length) continue;
      out[field.key] = dedupeStrings([...(out[field.key] ?? []), ...extra]);
    }
  }

  const teamNames = (profile?.favoriteTeams ?? []).map((t) => t.name).filter(Boolean);
  if (teamNames.length && (profile?.interests ?? []).includes('football')) {
    out.podcasts = dedupeStrings([
      ...(out.podcasts ?? []),
      ...teamNames.slice(0, 2).map((name) => `${name} match day`),
    ]);
  }

  return out;
}

export function resolveEffectiveJoySources(params: {
  profile?: UserProfile | null;
  shows?: Show[];
  habitTasks?: Task[];
}): JoySources {
  const inferred = inferJoySources(params);
  return mergeJoySources(params.profile?.joySources, inferred);
}

export function patchJoySourceField(
  current: JoySources | undefined,
  key: JoySourceKey,
  values: string[]
): JoySources {
  const next = { ...(current ?? {}) };
  const cleaned = dedupeStrings(values);
  if (cleaned.length === 0) {
    delete next[key];
  } else {
    next[key] = cleaned;
  }
  return next;
}

export function mergeJoySourcesForSync(a?: JoySources, b?: JoySources): JoySources | undefined {
  const merged = mergeJoySources(a, b);
  return countJoySources(merged) > 0 ? merged : undefined;
}
