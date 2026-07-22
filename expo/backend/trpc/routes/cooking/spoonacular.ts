import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getSpoonacularApiKeyFromEnv } from '@/backend/utils/spoonacularApiKey';
import type { KitchenRecipeDto, KitchenRecipeSearchResult } from '@/types/kitchenRecipe';

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

function mapSearchItemToDto(item: SpoonacularSearchItem, categoryHint: string): KitchenRecipeDto {
  const ready = item.readyInMinutes ?? 30;
  const prep = item.preparationMinutes ?? Math.max(5, Math.round(ready * 0.35));
  const tags = new Set<string>(['spoonacular']);
  for (const d of item.diets ?? []) tags.add(d.toLowerCase());
  for (const c of item.cuisines ?? []) tags.add(c.toLowerCase());
  if (item.vegetarian) tags.add('vegetarian');
  if (item.vegan) tags.add('vegan');
  if (ready <= 20) tags.add('quick');

  const rating = Math.min(
    5,
    Math.max(3.8, ((item.spoonacularScore ?? item.healthScore ?? 75) / 100) * 5),
  );

  return {
    id: `sp-${item.id}`,
    title: item.title?.trim() || 'Recipe',
    subtitle: stripHtml(item.summary ?? '').slice(0, 100) || 'Chef-tested from Spoonacular',
    cookTime: `${Math.max(1, ready - prep)} min`,
    prepTime: `${prep} min`,
    servings: item.servings ?? 4,
    difficulty: difficultyFromMinutes(ready),
    calories: caloriesFromItem(item),
    category: mapCategoryFromDishTypes(item.dishTypes, categoryHint),
    tags: [...tags],
    image: item.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525fc17?w=700&q=80',
    rating: Math.round(rating * 10) / 10,
    ingredients: [],
    steps: [],
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
    ingredients: ingredients?.length ? ingredients : base?.ingredients ?? [],
    steps,
  };
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
  english: { cuisine: 'british' },
};

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
    const recipes = (data.results ?? []).map((item) => mapSearchItemToDto(item, categoryHint));
    const result = { recipes, totalResults: data.totalResults ?? recipes.length };
    cacheSet(cacheKey, result);
    return result;
  });

export const getKitchenRecipeRoute = publicProcedure
  .input(z.object({ spoonacularId: z.number().int().positive() }))
  .query(async ({ input }): Promise<KitchenRecipeDto> => {
    const cacheKey = `recipe:${input.spoonacularId}`;
    const cached = cacheGet<KitchenRecipeDto>(cacheKey);
    if (cached?.steps?.length) return cached;

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
