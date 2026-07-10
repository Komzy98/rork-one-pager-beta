import type { LocalEvent } from '@/types/events';

/** API-backed bento tiles — the only categories fetched per bucket. */
export const BENTO_CATEGORY_IDS = [
  'music',
  'sports',
  'comedy',
  'theatre',
  'food',
  'arts',
  'networking',
  'nightlife',
  'other',
] as const;

export type BentoCategoryId = (typeof BENTO_CATEGORY_IDS)[number];

/** Merged into a parent bento tile; surfaced as sub-tags in UI and personalization. */
export type EventSubCategory = 'fitness' | 'tech' | 'family';

export interface SubCategoryMeta {
  parent: BentoCategoryId;
  label: string;
  shortLabel: string;
  tag: string;
}

export const SUB_CATEGORY_META: Record<EventSubCategory, SubCategoryMeta> = {
  fitness: {
    parent: 'sports',
    label: 'Fitness & wellness',
    shortLabel: 'Fitness',
    tag: 'fitness',
  },
  tech: {
    parent: 'networking',
    label: 'Tech & coding',
    shortLabel: 'Tech',
    tag: 'tech',
  },
  family: {
    parent: 'arts',
    label: 'Family & kids',
    shortLabel: 'Family',
    tag: 'family',
  },
};

/** Legacy / personalization-only ids → parent bento tile. */
export const LEGACY_CATEGORY_TO_BENTO: Record<string, BentoCategoryId> = {
  music: 'music',
  sports: 'sports',
  comedy: 'comedy',
  theatre: 'theatre',
  food: 'food',
  arts: 'arts',
  networking: 'networking',
  nightlife: 'nightlife',
  other: 'other',
  fitness: 'sports',
  tech: 'networking',
  family: 'arts',
};

const FITNESS_PATTERN =
  /\b(yoga|pilates|run club|parkrun|workout|wellness|hiit|crossfit|gym\b|5k\b|bootcamp|meditation|mindful)/i;
const TECH_PATTERN =
  /\b(ai\b|artificial intelligence|coding|code|developer|hackathon|startup|saas|software|engineer|tech talk)/i;
const FAMILY_PATTERN = /\b(kids|children|family|toddler|baby|parent|pantomime|cbeebies)/i;

export function isBentoCategoryId(value: string): value is BentoCategoryId {
  return (BENTO_CATEGORY_IDS as readonly string[]).includes(value);
}

export function getBentoCategoryId(
  event: Pick<LocalEvent, 'category' | 'subCategory'>,
): BentoCategoryId {
  if (event.subCategory && SUB_CATEGORY_META[event.subCategory]) {
    return SUB_CATEGORY_META[event.subCategory].parent;
  }
  const raw = String(event.category ?? 'other');
  if (isBentoCategoryId(raw)) return raw;
  return LEGACY_CATEGORY_TO_BENTO[raw] ?? 'other';
}

/** Bento tile + optional sub-tag ids used for personalization weights. */
export function getLogicalCategoryIds(
  event: Pick<LocalEvent, 'category' | 'subCategory'>,
): string[] {
  const bento = getBentoCategoryId(event);
  const logical = new Set<string>([bento]);
  if (event.subCategory) logical.add(event.subCategory);
  const raw = String(event.category ?? '');
  if (raw && raw !== bento && !logical.has(raw)) logical.add(raw);
  return [...logical];
}

export function eventMatchesBentoCategory(
  event: Pick<LocalEvent, 'category' | 'subCategory'>,
  bentoId: string,
): boolean {
  if (bentoId === 'all') return true;
  return getBentoCategoryId(event) === bentoId;
}

export function inferSubCategory(
  event: Pick<LocalEvent, 'title' | 'tags' | 'category' | 'description' | 'subCategory'>,
): EventSubCategory | undefined {
  if (event.subCategory) return event.subCategory;

  const rawCategory = String(event.category ?? '');
  const blob = `${event.title} ${event.description ?? ''} ${(event.tags ?? []).join(' ')}`;

  if (rawCategory === 'family' || event.tags?.includes('kids')) return 'family';
  if (rawCategory === 'fitness') return 'fitness';
  if (rawCategory === 'tech') return 'tech';

  if (FAMILY_PATTERN.test(blob) && (rawCategory === 'arts' || rawCategory === 'theatre' || rawCategory === 'family')) {
    return 'family';
  }
  if (FITNESS_PATTERN.test(blob) && (rawCategory === 'sports' || rawCategory === 'fitness')) {
    return 'fitness';
  }
  if (
    TECH_PATTERN.test(blob) &&
    (rawCategory === 'networking' || rawCategory === 'tech')
  ) {
    return 'tech';
  }

  return undefined;
}

export function normalizeEventCategories<T extends LocalEvent>(event: T): T {
  const subCategory = inferSubCategory(event);
  const bentoCategory = subCategory
    ? SUB_CATEGORY_META[subCategory].parent
    : getBentoCategoryId({ ...event, subCategory: undefined });

  const tags = new Set(event.tags ?? []);
  if (subCategory) tags.add(SUB_CATEGORY_META[subCategory].tag);

  return {
    ...event,
    category: bentoCategory,
    subCategory,
    tags: [...tags].slice(0, 8),
  };
}

export function countEventsByBentoCategory(events: LocalEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const bento = getBentoCategoryId(event);
    counts.set(bento, (counts.get(bento) ?? 0) + 1);
  }
  return counts;
}

export function countSubCategoriesForBento(
  events: LocalEvent[],
  bentoId: BentoCategoryId,
): Map<EventSubCategory, number> {
  const counts = new Map<EventSubCategory, number>();
  for (const event of events) {
    if (getBentoCategoryId(event) !== bentoId || !event.subCategory) continue;
    counts.set(event.subCategory, (counts.get(event.subCategory) ?? 0) + 1);
  }
  return counts;
}

export function formatBentoCountLabel(
  total: number,
  subCounts?: Map<EventSubCategory, number>,
): string {
  const base = total === 1 ? '1 event' : `${total} events`;
  if (!subCounts || subCounts.size === 0) return base;

  const highlights = (Object.keys(SUB_CATEGORY_META) as EventSubCategory[])
    .filter((key) => (subCounts.get(key) ?? 0) > 0)
    .map((key) => {
      const count = subCounts.get(key) ?? 0;
      const label = SUB_CATEGORY_META[key].shortLabel;
      return count === 1 ? `1 ${label}` : `${count} ${label}`;
    });

  if (highlights.length === 0) return base;
  return `${base} · ${highlights.join(', ')}`;
}

export function getSubCategoriesForBento(bentoId: BentoCategoryId): EventSubCategory[] {
  return (Object.entries(SUB_CATEGORY_META) as [EventSubCategory, SubCategoryMeta][])
    .filter(([, meta]) => meta.parent === bentoId)
    .map(([id]) => id);
}
