import type { CookingRecipe } from '@/constants/cooking/recipeTypes';
import { COOKING_RECIPES } from '@/constants/cooking/library';
import { BRITISH_ENGLISH_RECIPES } from '@/constants/cooking/britishEnglishRecipes';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';

const AFRICAN_TAG = /^(african|nigerian|west-african|jollof|ethiopian|moroccan|caribbean|jamaican|barbadian|south-african)$/i;
const BRITISH_TAG = /^(english|british)$/i;

export function cookingRecipeToKitchenDto(recipe: CookingRecipe): KitchenRecipeDto {
  const cookMins = Math.max(1, recipe.minutes - (recipe.prepMinutes ?? 0));
  return {
    id: `curated-${recipe.id}`,
    spoonacularId: 0,
    title: recipe.title,
    subtitle: recipe.description,
    summary: recipe.description,
    cookTime: `${cookMins} min`,
    prepTime: `${recipe.prepMinutes ?? 10} min`,
    readyInMinutes: recipe.minutes,
    servings: recipe.servings ?? 4,
    difficulty: recipe.difficulty,
    calories: recipe.nutrition.calories,
    category: recipe.category ?? 'dinner',
    tags: [...recipe.tags, 'curated'],
    diets: [],
    cuisines: recipe.tags.filter((t) => AFRICAN_TAG.test(t) || BRITISH_TAG.test(t)),
    dishTypes: [],
    vegetarian: recipe.tags.some((t) => /vegetarian|vegan|plant-based/i.test(t)),
    vegan: recipe.tags.includes('vegan') || recipe.tags.includes('plant-based'),
    glutenFree: recipe.tags.some((t) => /gluten-free/i.test(t)),
    dairyFree: false,
    image: recipe.image,
    rating: recipe.rating ?? 4.7,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    nutrition: recipe.nutrition,
    source: 'curated',
  };
}

function matchesAfrican(recipe: CookingRecipe): boolean {
  return recipe.tags.some((t) => AFRICAN_TAG.test(t) || t.includes('jollof'));
}

function matchesBritish(recipe: CookingRecipe): boolean {
  return recipe.tags.some((t) => BRITISH_TAG.test(t));
}

export function searchCuratedKitchenRecipes(options: {
  query?: string;
  category?: string;
  limit?: number;
}): KitchenRecipeDto[] {
  const limit = options.limit ?? 20;
  let list = COOKING_RECIPES;

  const category = options.category?.toLowerCase();
  if (category === 'nigerian' || category === 'african') {
    list = list.filter(matchesAfrican);
  } else if (category === 'english' || category === 'british') {
    list = list.filter(matchesBritish);
  } else if (category === 'vegetarian') {
    list = list.filter((r) => r.tags.some((t) => /vegetarian|vegan|plant-based/i.test(t)));
  } else if (category === 'quick') {
    list = list.filter((r) => r.minutes <= 25);
  } else if (category === 'healthy') {
    list = list.filter((r) => r.tags.includes('healthy') || r.nutrition.calories < 450);
  } else if (category === 'breakfast') {
    list = list.filter((r) => r.category === 'breakfast' || r.tags.includes('breakfast'));
  } else if (category === 'dinner') {
    list = list.filter((r) => r.category === 'dinner' || r.tags.includes('comfort'));
  }

  const q = options.query?.trim().toLowerCase();
  if (q && q.length >= 2) {
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q) || q.includes(t.toLowerCase())) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q)),
    );
  }

  return list.slice(0, limit).map(cookingRecipeToKitchenDto);
}

/** All African & Caribbean editorial recipes in the library. */
export function curatedAfricanCollection(limit = 24): KitchenRecipeDto[] {
  return COOKING_RECIPES.filter(matchesAfrican)
    .slice(0, limit)
    .map(cookingRecipeToKitchenDto);
}

/** All English & British editorial recipes (legacy Kitchen set). */
export function curatedBritishCollection(limit = 24): KitchenRecipeDto[] {
  const ids = new Set<string>();
  const merged: CookingRecipe[] = [];
  for (const r of [...BRITISH_ENGLISH_RECIPES, ...COOKING_RECIPES.filter(matchesBritish)]) {
    if (ids.has(r.id)) continue;
    ids.add(r.id);
    merged.push(r);
  }
  return merged.slice(0, limit).map(cookingRecipeToKitchenDto);
}

/** @deprecated use curatedAfricanCollection */
export function curatedAfricanSpotlight(): KitchenRecipeDto[] {
  return curatedAfricanCollection(8);
}

export function isCuratedKitchenId(recipeId: string): boolean {
  return recipeId.startsWith('curated-');
}
