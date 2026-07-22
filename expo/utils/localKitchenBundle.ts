import type { KitchenBundleDto } from '@/types/kitchenRecipe';
import {
  curatedAfricanCollection,
  curatedBritishCollection,
  searchCuratedKitchenRecipes,
} from '@/utils/curatedKitchenSearch';

/** Offline / no-API fallback — African, British & quick picks from the app library. */
export function buildLocalKitchenBundle(): KitchenBundleDto {
  const african = curatedAfricanCollection(12);
  const british = curatedBritishCollection(14);
  const quick = searchCuratedKitchenRecipes({ category: 'quick', limit: 8 });
  const hero =
    african.find((r) => r.title.toLowerCase().includes('jollof')) ?? african[0] ?? british[0];

  return {
    hero,
    collections: [
      {
        id: 'african',
        title: 'African & Caribbean',
        subtitle: 'Jollof, stews & island classics',
        recipes: african,
      },
      {
        id: 'english',
        title: 'English & British',
        subtitle: 'Fry-ups, pies, roasts & pub favourites',
        recipes: british,
      },
      {
        id: 'quick',
        title: 'Quick classics',
        subtitle: 'Ready in 25 minutes or less',
        recipes: quick,
      },
    ],
  };
}

export function searchLocalKitchenRecipes(options: {
  query?: string;
  category?: string;
  limit?: number;
}) {
  return searchCuratedKitchenRecipes(options);
}
