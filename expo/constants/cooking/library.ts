import type { CookingRecipe } from './recipeTypes';
import { AFRO_CARIBBEAN_EXTRA } from './afroCaribbeanExtra';
import { applyRecipeHeroImages } from './heroImages';
import { LEGACY_PART_A } from './legacyPartA';
import { LEGACY_PART_B } from './legacyPartB';
import { LEGACY_PART_C } from './legacyPartC';
import { MEXICAN_RECIPES } from './mexicanRecipes';
import { BRITISH_ENGLISH_RECIPES } from './britishEnglishRecipes';
import { TAB_RECIPES } from './tabRecipes';

/**
 * Full library: legacy set + regional extras + Mexican classics + curated tab picks.
 * Hero URLs are normalized to dish-relevant Unsplash assets in `heroImages.ts`.
 */
export const COOKING_RECIPES: CookingRecipe[] = applyRecipeHeroImages([
  ...LEGACY_PART_A,
  ...LEGACY_PART_B,
  ...LEGACY_PART_C,
  ...AFRO_CARIBBEAN_EXTRA,
  ...MEXICAN_RECIPES,
  ...BRITISH_ENGLISH_RECIPES,
  ...TAB_RECIPES,
]);

export type QuickPickId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

export const QUICK_PICKS_META: { id: QuickPickId; label: string; filter: (r: CookingRecipe) => boolean }[] = [
  { id: 'q1', label: 'Under 20 mins', filter: (r) => r.minutes <= 20 },
  { id: 'q2', label: 'Keto-friendly', filter: (r) => r.tags.some((t) => /keto|low-carb/i.test(t)) },
  { id: 'q3', label: 'High Protein', filter: (r) => r.tags.includes('high-protein') },
  { id: 'q4', label: 'Batch Prep', filter: (r) => r.tags.some((t) => /batch|meal-prep/i.test(t)) },
  { id: 'q5', label: 'Comfort Meals', filter: (r) => r.tags.includes('comfort') },
];
