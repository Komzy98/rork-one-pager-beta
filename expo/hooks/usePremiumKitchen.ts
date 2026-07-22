import { useCallback, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import type { KitchenBundleDto, KitchenRecipeDto } from '@/types/kitchenRecipe';
import { buildLocalKitchenBundle, searchLocalKitchenRecipes } from '@/utils/localKitchenBundle';

export function usePremiumKitchen(options: { searchQuery: string; activeCollection: string | null }) {
  const { searchQuery, activeCollection } = options;
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery.trim());
  const utils = trpc.useUtils();
  const [detailCache, setDetailCache] = useState<Record<string, KitchenRecipeDto>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const localBundle = useMemo(() => buildLocalKitchenBundle(), []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 320);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const configQuery = trpc.cooking.isConfigured.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const liveCatalog = configQuery.data?.configured === true;

  const bundleQuery = trpc.cooking.getBundle.useQuery(undefined, {
    enabled: liveCatalog,
    staleTime: 12 * 60 * 1000,
  });

  const isSearching = debouncedQuery.length >= 2;
  const searchQueryInput = useMemo(
    () => ({
      query: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      category:
        debouncedQuery.length >= 2
          ? undefined
          : activeCollection && activeCollection !== 'discover'
            ? activeCollection
            : undefined,
      number: 20,
      offset: 0,
    }),
    [debouncedQuery, activeCollection],
  );

  const shouldFetchRemoteSearch =
    liveCatalog && (isSearching || (!!activeCollection && activeCollection !== 'discover'));

  const remoteSearch = trpc.cooking.searchRecipes.useQuery(searchQueryInput, {
    enabled: shouldFetchRemoteSearch,
    staleTime: 5 * 60 * 1000,
  });

  const localSearchResults = useMemo(() => {
    if (liveCatalog && shouldFetchRemoteSearch) return [];
    if (!isSearching && activeCollection === 'discover') return [];

    return searchLocalKitchenRecipes({
      query: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      category:
        activeCollection && activeCollection !== 'discover' ? activeCollection : undefined,
      limit: 24,
    });
  }, [liveCatalog, shouldFetchRemoteSearch, isSearching, activeCollection, debouncedQuery]);

  const bundle: KitchenBundleDto = bundleQuery.data ?? localBundle;
  const bundleLoading = liveCatalog && bundleQuery.isLoading && !bundleQuery.data;

  const searchResults =
    liveCatalog && shouldFetchRemoteSearch
      ? (remoteSearch.data?.recipes ?? [])
      : localSearchResults;
  const searchTotal =
    liveCatalog && shouldFetchRemoteSearch
      ? (remoteSearch.data?.totalResults ?? 0)
      : localSearchResults.length;
  const searchLoading = liveCatalog && shouldFetchRemoteSearch && remoteSearch.isFetching;

  const recipeIndex = useMemo(() => {
    const map = new Map<string, KitchenRecipeDto>();
    const add = (r: KitchenRecipeDto) => map.set(r.id, r);
    if (bundle.hero) add(bundle.hero);
    for (const col of bundle.collections ?? []) {
      for (const r of col.recipes) add(r);
    }
    for (const r of searchResults) add(r);
    for (const r of Object.values(detailCache)) add(r);
    return map;
  }, [bundle, searchResults, detailCache]);

  const loadRecipeDetail = useCallback(
    async (recipe: KitchenRecipeDto): Promise<KitchenRecipeDto> => {
      if (detailCache[recipe.id]?.steps?.length && detailCache[recipe.id].ingredients.length) {
        return detailCache[recipe.id];
      }
      if (recipe.steps.length && recipe.ingredients.length) {
        setDetailCache((prev) => ({ ...prev, [recipe.id]: recipe }));
        return recipe;
      }
      if (recipe.source === 'curated' || !recipe.spoonacularId) {
        setDetailCache((prev) => ({ ...prev, [recipe.id]: recipe }));
        return recipe;
      }
      if (!liveCatalog) return recipe;
      setLoadingDetailId(recipe.id);
      try {
        const full = await utils.cooking.getRecipe.fetch({ spoonacularId: recipe.spoonacularId });
        const merged = { ...full, image: full.image || recipe.image };
        setDetailCache((prev) => ({ ...prev, [recipe.id]: merged }));
        return merged;
      } catch {
        return recipe;
      } finally {
        setLoadingDetailId((cur) => (cur === recipe.id ? null : cur));
      }
    },
    [detailCache, liveCatalog, utils.cooking.getRecipe],
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([
      configQuery.refetch(),
      liveCatalog ? bundleQuery.refetch() : Promise.resolve(),
      liveCatalog && shouldFetchRemoteSearch ? remoteSearch.refetch() : Promise.resolve(),
    ]);
  }, [configQuery, liveCatalog, bundleQuery, remoteSearch, shouldFetchRemoteSearch]);

  return {
    liveCatalog,
    configLoading: configQuery.isLoading,
    bundle,
    bundleLoading,
    bundleError: liveCatalog ? bundleQuery.error : null,
    searchResults,
    searchTotal,
    searchLoading,
    searchError: liveCatalog ? remoteSearch.error : null,
    isSearching,
    recipeIndex,
    loadRecipeDetail,
    loadingDetailId,
    refetchAll,
  };
}
