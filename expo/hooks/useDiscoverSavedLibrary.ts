import { useMemo } from 'react';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import { usePremiumKitchen } from '@/hooks/usePremiumKitchen';
import { usePinnedMatches } from '@/hooks/usePinnedMatches';
import { useUserProfile } from '@/hooks/useUserProfile';

export function useDiscoverSavedLibrary() {
  const app = useAppSafe();
  const cooking = useCookingStorage();
  const kitchen = usePremiumKitchen({ searchQuery: '', activeCollection: 'discover' });
  const pinned = usePinnedMatches();
  const { profile } = useUserProfile();

  const shows = useMemo(
    () => app.shows.filter((show) => show.status === 'Plan to Watch' || show.status === 'On Hold'),
    [app.shows],
  );

  const recipes = useMemo(
    () => cooking.bookmarks
      .map((id) => kitchen.recipeIndex.get(id))
      .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe)),
    [cooking.bookmarks, kitchen.recipeIndex],
  );

  const matches = useMemo(
    () => pinned.records.map((record) => record.snapshot),
    [pinned.records],
  );

  const books = profile?.favoriteBooks ?? [];

  return {
    shows,
    recipes,
    matches,
    books,
    counts: {
      shows: shows.length,
      recipes: recipes.length,
      matches: matches.length,
      books: books.length,
    },
  };
}
