import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';

export type KitchenTabRecipe = KitchenRecipeDto;

export function parseSpoonacularId(recipeId: string): number | null {
  if (!recipeId.startsWith('sp-')) return null;
  const n = Number(recipeId.slice(3));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function useSpoonacularKitchen(options: {
  searchQuery: string;
  selectedCategory: string;
  enabled: boolean;
}) {
  const { searchQuery, selectedCategory, enabled } = options;
  const trimmed = searchQuery.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);
  const utils = trpc.useUtils();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(trimmed), 350);
    return () => clearTimeout(t);
  }, [trimmed]);

  const shouldFetchSpoonacular =
    enabled &&
    configQuery.data?.configured === true &&
    (debouncedQuery.length >= 2 ||
      selectedCategory !== 'all' ||
      (selectedCategory === 'all' && debouncedQuery.length < 2));

  const searchQueryInput = useMemo(
    () => ({
      query: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      number:
        selectedCategory === 'all' && debouncedQuery.length < 2 ? 12 : 16,
      offset: 0,
    }),
    [debouncedQuery, selectedCategory],
  );

  const searchResults = trpc.cooking.searchRecipes.useQuery(searchQueryInput, {
    enabled: shouldFetchSpoonacular,
    staleTime: 5 * 60 * 1000,
  });

  const configQuery = trpc.cooking.isConfigured.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });

  const heroQuery = trpc.cooking.randomRecipes.useQuery(
    { number: 1, tags: 'main course' },
    {
      enabled: enabled && configQuery.data?.configured === true,
      staleTime: 12 * 60 * 60 * 1000,
    },
  );

  const [detailCache, setDetailCache] = useState<Record<string, KitchenTabRecipe>>({});

  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const loadRecipeDetail = async (recipeId: string): Promise<KitchenTabRecipe | null> => {
    const spId = parseSpoonacularId(recipeId);
    if (!spId) return null;
    if (detailCache[recipeId]?.steps?.length) return detailCache[recipeId];
    setLoadingDetailId(recipeId);
    try {
      const full = await utils.cooking.getRecipe.fetch({ spoonacularId: spId });
      setDetailCache((prev) => ({ ...prev, [recipeId]: full }));
      return full;
    } catch {
      return null;
    } finally {
      setLoadingDetailId((current) => (current === recipeId ? null : current));
    }
  };

  return {
    configured: configQuery.data?.configured === true,
    isSearching: searchResults.isFetching,
    searchError: searchResults.error,
    spoonacularRecipes: searchResults.data?.recipes ?? [],
    totalSpoonacularResults: searchResults.data?.totalResults ?? 0,
    heroSpoonacular: heroQuery.data?.[0] ?? null,
    heroLoading: heroQuery.isLoading,
    refetchHero: heroQuery.refetch,
    refetchSearch: searchResults.refetch,
    detailCache,
    loadRecipeDetail,
    loadingDetailId,
  };
}

export function useKitchenRecipeDetailLoader() {
  const utils = trpc.useUtils();
  return async (recipeId: string): Promise<KitchenTabRecipe | null> => {
    const spId = parseSpoonacularId(recipeId);
    if (!spId) return null;
    try {
      return await utils.cooking.getRecipe.fetch({ spoonacularId: spId });
    } catch {
      return null;
    }
  };
}
