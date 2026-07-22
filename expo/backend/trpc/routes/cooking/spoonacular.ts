import { z } from 'zod';
import {
  searchCuratedKitchenRecipes,
  curatedAfricanCollection,
  curatedBritishCollection,
} from '@/utils/curatedKitchenSearch';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getSpoonacularApiKeyFromEnv } from '@/backend/utils/spoonacularApiKey';
import type {
  KitchenRecipeDto,
  KitchenRecipeSearchResult,
  KitchenBundleDto,
  KitchenCollectionDto,
} from '@/types/kitchenRecipe';

const BASE = 'https://api.spoonacular.com';
const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = { data: unknown; at: number };
const cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data as T;
}

function cacheSet(key: string, data: unknown): void {
  cache.set(key, { data, at: Date.now() });
  if (cache.size > 80) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
    if (oldest) cache.delete(oldest);
  }
}

async function spoonacularFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const apiKey = getSpoonacularApiKeyFromEnv();
  if (!apiKey) {
    throw new Error('Spoonacular API key is not configured on the server');
  }
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('apiKey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Spoonacular ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function difficultyFromMinutes(mins: number): KitchenRecipeDto['difficulty'] {
  if (mins <= 25) return 'Easy';
  if (mins <= 55) return 'Medium';
  return 'Hard';
}

function mapCategoryFromDishTypes(dishTypes: string[] | undefined, fallback: string): string {
  const types = (dishTypes ?? []).map((t) => t.toLowerCase());
  if (types.some((t) => t.includes('breakfast'))) return 'breakfast';
  if (types.some((t) => t.includes('dessert') || t.includes('snack'))) return 'dessert';
  if (types.some((t) => t.includes('lunch') || t.includes('salad') || t.includes('soup'))) return 'lunch';
  return fallback;
}

type SpoonacularSearchItem = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  preparationMinutes?: number;
  servings?: number;
  summary?: string;
  spoonacularScore?: number;
  healthScore?: number;
  dishTypes?: string[];
  diets?: string[];
  cuisines?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  nutrition?: { nutrients?: { name: string; amount: number }[] };
};

type SpoonacularSearchResponse = {
  results: SpoonacularSearchItem[];
  totalResults: number;
  offset: number;
  number: number;
};

type SpoonacularRecipeInfo = SpoonacularSearchItem & {
  extendedIngredients?: { original?: string }[];
  analyzedInstructions?: { steps?: { step?: string; number?: number }[] }[];
  instructions?: string;
};

function caloriesFromItem(item: SpoonacularSearchItem): number {
  const nutrients = item.nutrition?.nutrients;
  const cal = nutrients?.find((n) => n.name === 'Calories');
  if (cal && Number.isFinite(cal.amount)) return Math.round(cal.amount);
  return Math.max(180, Math.round((item.readyInMinutes ?? 30) * 8));
}

function nutritionFromItem(item: SpoonacularSearchItem) {
  const nutrients = item.nutrition?.nutrients;
  if (!nutrients?.length) return undefined;
  const pick = (name: string) => nutrients.find((n) => n.name === name)?.amount ?? 0;
  return {
    calories: Math.round(pick('Calories')) || caloriesFromItem(item),
    protein: Math.round(pick('Protein')),
    carbs: Math.round(pick('Carbohydrates')),
    fat: Math.round(pick('Fat')),
  };
}

function spoonacularRecipeImage(spoonacularId: number, image?: string | null, fallback?: string): string {
  const trimmed = image?.trim();
  if (trimmed && /^https:\/\//i.test(trimmed)) {
    if (trimmed.includes('img.spoonacular.com/recipes/')) return trimmed;
    // Legacy host often 404s in apps — use CDN sized asset from id
    if (trimmed.includes('spoonacular.com')) {
      return `https://img.spoonacular.com/recipes/${spoonacularId}-636x393.jpg`;
    }
    return trimmed;
  }
  if (fallback?.trim() && /^https:\/\//i.test(fallback.trim())) return fallback.trim();
  return `https://img.spoonacular.com/recipes/${spoonacularId}-636x393.jpg`;
}

function mapSearchItemToDto(item: SpoonacularSearchItem, categoryHint: string): KitchenRecipeDto {
  const ready = item.readyInMinutes ?? 30;
  const prep = item.preparationMinutes ?? Math.max(5, Math.round(ready * 0.35));
  const summaryText = stripHtml(item.summary ?? '');
  const tags = new Set<string>();
  for (const d of item.diets ?? []) tags.add(d.toLowerCase());
  for (const c of item.cuisines ?? []) tags.add(c.toLowerCase());
  if (item.vegetarian) tags.add('vegetarian');
  if (item.vegan) tags.add('vegan');
  if (ready <= 25) tags.add('quick');

  const rating = Math.min(
    5,
    Math.max(3.8, ((item.spoonacularScore ?? item.healthScore ?? 75) / 100) * 5),
  );
  const nutrition = nutritionFromItem(item);

  return {
    id: `sp-${item.id}`,
    spoonacularId: item.id,
    title: item.title?.trim() || 'Recipe',
    subtitle: summaryText.slice(0, 120) || 'Hand-picked for the Kitchen',
    summary: summaryText.slice(0, 480) || summaryText,
    cookTime: `${Math.max(1, ready - prep)} min`,
    prepTime: `${prep} min`,
    readyInMinutes: ready,
    servings: item.servings ?? 4,
    difficulty: difficultyFromMinutes(ready),
    calories: nutrition?.calories ?? caloriesFromItem(item),
    category: mapCategoryFromDishTypes(item.dishTypes, categoryHint),
    tags: [...tags],
    diets: [...(item.diets ?? [])],
    cuisines: [...(item.cuisines ?? [])],
    dishTypes: [...(item.dishTypes ?? [])],
    vegetarian: !!item.vegetarian,
    vegan: !!item.vegan,
    glutenFree: !!item.glutenFree,
    dairyFree: !!item.dairyFree,
    healthScore: item.healthScore,
    image: spoonacularRecipeImage(item.id, item.image),
    rating: Math.round(rating * 10) / 10,
    ingredients: [],
    steps: [],
    nutrition,
    source: 'spoonacular',
  };
}

function mapFullRecipeToDto(info: SpoonacularRecipeInfo, base?: KitchenRecipeDto): KitchenRecipeDto {
  const summary = mapSearchItemToDto(info, base?.category ?? 'dinner');
  const ingredients =
    info.extendedIngredients?.map((i) => i.original?.trim()).filter(Boolean) as string[] | undefined;
  const stepsFromAnalyzed =
    info.analyzedInstructions?.[0]?.steps
      ?.sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      .map((s) => s.step?.trim())
      .filter(Boolean) ?? [];
  const steps =
    stepsFromAnalyzed.length > 0
      ? (stepsFromAnalyzed as string[])
      : info.instructions
        ? [stripHtml(info.instructions)]
        : base?.steps ?? ['Open the full recipe in your browser for detailed steps.'];

  return {
    ...summary,
    subtitle: base?.subtitle ?? summary.subtitle,
    summary: summary.summary || base?.summary || summary.subtitle,
    image: spoonacularRecipeImage(info.id, info.image, base?.image),
    ingredients: ingredients?.length ? ingredients : base?.ingredients ?? [],
    steps,
    nutrition: nutritionFromItem(info) ?? summary.nutrition ?? base?.nutrition,
  };
}

async function fetchSearchRecipes(options: {
  number: number;
  categoryHint: string;
  query?: string;
  type?: string;
  diet?: string;
  cuisine?: string;
  maxReadyTime?: number;
  offset?: number;
}): Promise<KitchenRecipeDto[]> {
  const data = await spoonacularFetch<SpoonacularSearchResponse>('/recipes/complexSearch', {
    query: options.query,
    number: options.number,
    offset: options.offset ?? 0,
    addRecipeInformation: 'true',
    fillIngredients: 'false',
    type: options.type,
    diet: options.diet,
    cuisine: options.cuisine,
    maxReadyTime: options.maxReadyTime,
    sort: options.query ? 'popularity' : 'random',
  });
  return (data.results ?? []).map((item) => mapSearchItemToDto(item, options.categoryHint));
}

const APP_CATEGORY_TO_SPOONACULAR: Record<
  string,
  { type?: string; diet?: string; maxReadyTime?: number; cuisine?: string }
> = {
  breakfast: { type: 'breakfast' },
  lunch: { type: 'main course' },
  dinner: { type: 'main course' },
  dessert: { type: 'dessert' },
  healthy: { maxReadyTime: 45 },
  quick: { maxReadyTime: 25 },
  vegetarian: { diet: 'vegetarian' },
  nigerian: { cuisine: 'african' },
  african: { cuisine: 'african' },
  english: { cuisine: 'british' },
};

function mergeKitchenResults(api: KitchenRecipeDto[], curated: KitchenRecipeDto[]): KitchenRecipeDto[] {
  const seen = new Set<string>();
  const merged: KitchenRecipeDto[] = [];
  for (const r of [...curated, ...api]) {
    const key = r.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
  }
  return merged;
}

export const searchKitchenRecipesRoute = publicProcedure
  .input(
    z.object({
      query: z.string().trim().max(120).optional(),
      category: z.string().trim().max(40).optional(),
      number: z.number().min(1).max(24).default(12),
      offset: z.number().min(0).max(100).default(0),
    }),
  )
  .query(async ({ input }): Promise<KitchenRecipeSearchResult> => {
    const cacheKey = `search:${JSON.stringify(input)}`;
    const cached = cacheGet<KitchenRecipeSearchResult>(cacheKey);
    if (cached) return cached;

    const filters = input.category ? APP_CATEGORY_TO_SPOONACULAR[input.category] : undefined;
    const data = await spoonacularFetch<SpoonacularSearchResponse>('/recipes/complexSearch', {
      query: input.query || undefined,
      number: input.number,
      offset: input.offset,
      addRecipeInformation: 'true',
      fillIngredients: 'false',
      type: filters?.type,
      diet: filters?.diet,
      cuisine: filters?.cuisine,
      maxReadyTime: filters?.maxReadyTime,
      sort: input.query ? 'popularity' : 'random',
    });

    const categoryHint = input.category && input.category !== 'all' ? input.category : 'dinner';
    const apiRecipes = (data.results ?? []).map((item) => mapSearchItemToDto(item, categoryHint));
    const curated = searchCuratedKitchenRecipes({
      query: input.query,
      category: input.category,
      limit: 10,
    });
    const recipes = mergeKitchenResults(apiRecipes, curated);
    const result = {
      recipes,
      totalResults: Math.max(data.totalResults ?? 0, recipes.length),
    };
    cacheSet(cacheKey, result);
    return result;
  });

export const getKitchenRecipeRoute = publicProcedure
  .input(z.object({ spoonacularId: z.number().int().positive() }))
  .query(async ({ input }): Promise<KitchenRecipeDto> => {
    const cacheKey = `recipe:${input.spoonacularId}`;
    const cached = cacheGet<KitchenRecipeDto>(cacheKey);
    if (cached?.steps?.length && cached.ingredients.length) return cached;

    const info = await spoonacularFetch<SpoonacularRecipeInfo>(
      `/recipes/${input.spoonacularId}/information`,
      { includeNutrition: 'true' },
    );
    const dto = mapFullRecipeToDto(info, cached ?? undefined);
    cacheSet(cacheKey, dto);
    return dto;
  });

export const randomKitchenRecipesRoute = publicProcedure
  .input(
    z.object({
      number: z.number().min(1).max(6).default(1),
      tags: z.string().trim().max(80).optional(),
    }),
  )
  .query(async ({ input }): Promise<KitchenRecipeDto[]> => {
    const cacheKey = `random:${JSON.stringify(input)}`;
    const cached = cacheGet<KitchenRecipeDto[]>(cacheKey);
    if (cached) return cached;

    const data = await spoonacularFetch<{ recipes: SpoonacularRecipeInfo[] }>('/recipes/random', {
      number: input.number,
      tags: input.tags,
    });
    const list = (data.recipes ?? []).map((r) => mapFullRecipeToDto(r));
    cacheSet(cacheKey, list);
    return list;
  });

export const spoonacularConfiguredRoute = publicProcedure.query(() => ({
  configured: !!getSpoonacularApiKeyFromEnv(),
}));

export const getKitchenBundleRoute = publicProcedure.query(async (): Promise<KitchenBundleDto> => {
  const cacheKey = 'bundle:premium:v4';
  const cached = cacheGet<KitchenBundleDto>(cacheKey);
  if (cached) return cached;

  const africanCurated = curatedAfricanCollection(16);
  const britishCurated = curatedBritishCollection(16);

  const [heroRandom, quick, healthy, breakfast, dinner, veggie, africanApi, britishApi] = await Promise.all([
    spoonacularFetch<{ recipes: SpoonacularRecipeInfo[] }>('/recipes/random', {
      number: 1,
      tags: 'main course',
    }),
    fetchSearchRecipes({ number: 8, categoryHint: 'dinner', maxReadyTime: 25 }),
    fetchSearchRecipes({ number: 8, categoryHint: 'healthy', maxReadyTime: 45 }),
    fetchSearchRecipes({ number: 8, categoryHint: 'breakfast', type: 'breakfast' }),
    fetchSearchRecipes({ number: 8, categoryHint: 'dinner', type: 'main course' }),
    fetchSearchRecipes({ number: 8, categoryHint: 'dinner', diet: 'vegetarian' }),
    fetchSearchRecipes({ number: 6, categoryHint: 'dinner', cuisine: 'african' }),
    fetchSearchRecipes({ number: 6, categoryHint: 'dinner', cuisine: 'british' }),
  ]);

  const heroList = (heroRandom.recipes ?? []).map((r) => mapFullRecipeToDto(r));
  const hero = heroList[0] ?? (await fetchSearchRecipes({ number: 1, categoryHint: 'dinner' }))[0];
  if (!hero) {
    throw new Error('Unable to load kitchen hero recipe');
  }

  const collections: KitchenCollectionDto[] = [
    {
      id: 'african',
      title: 'African & Caribbean',
      subtitle: 'Jollof, stews & island classics from our library',
      recipes: mergeKitchenResults(africanApi, africanCurated),
    },
    {
      id: 'english',
      title: 'English & British',
      subtitle: 'Fry-ups, pies, roasts & pub favourites',
      recipes: mergeKitchenResults(britishApi, britishCurated),
    },
    {
      id: 'quick',
      title: 'Under 25 minutes',
      subtitle: 'Fast wins for busy nights',
      recipes: quick,
    },
    {
      id: 'healthy',
      title: 'Feel-good plates',
      subtitle: 'Lighter meals with real flavour',
      recipes: healthy,
    },
    {
      id: 'breakfast',
      title: 'Morning rituals',
      subtitle: 'Start strong',
      recipes: breakfast,
    },
    {
      id: 'dinner',
      title: 'Tonight’s mains',
      subtitle: 'Crowd-pleasers from the API',
      recipes: dinner,
    },
    {
      id: 'vegetarian',
      title: 'Plant-forward',
      subtitle: 'Vegetarian picks',
      recipes: veggie,
    },
  ];

  const bundle = { hero, collections };
  cacheSet(cacheKey, bundle);
  return bundle;
});
