import { EVENT_CATEGORY_META } from '@/utils/eventCategoryMeta';
import { BENTO_CATEGORY_IDS, type BentoCategoryId } from '@/utils/eventCategories';

const CATEGORY_HINTS: Record<BentoCategoryId, string> = {
  music: 'Gigs & festivals',
  sports: 'Matches & run clubs',
  comedy: 'Stand-up & improv',
  theatre: 'Plays & musicals',
  food: 'Supper clubs & tastings',
  arts: 'Galleries & exhibitions',
  networking: 'Meetups & conferences',
  nightlife: 'Clubs & late nights',
  other: 'Markets, fairs & more',
};

export const ONBOARDING_EVENT_CATEGORIES = BENTO_CATEGORY_IDS.map((id) => {
  const meta = EVENT_CATEGORY_META.find((item) => item.id === id)!;
  return {
    id,
    label: meta.label,
    hint: CATEGORY_HINTS[id],
    icon: meta.icon,
    color: meta.color,
  };
});

export function normalizeOnboardingEventCategories(ids: readonly string[]): BentoCategoryId[] {
  const allowed = new Set<string>(BENTO_CATEGORY_IDS);
  return ids
    .map((id) => (id === 'tech' ? 'networking' : id))
    .filter((id): id is BentoCategoryId => allowed.has(id));
}
