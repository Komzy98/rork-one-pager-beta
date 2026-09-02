import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useExperienceFeedback } from '@/hooks/useExperienceFeedback';
import { unifiedStorage } from '@/utils/unifiedStorage';

const keyBookmarks = (userId?: string) => `cooking_bookmarks_${userId || 'guest'}`;
const keyCounts = (userId?: string) => `cooking_cook_counts_${userId || 'guest'}`;

type CookCounts = Record<string, number>;
type RecipeExperienceMeta = { title?: string; tags?: string[] };

export function useCookingStorage() {
  const { user } = useAuth();
  const userId = user?.id;
  const experience = useExperienceFeedback();
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [cookCounts, setCookCounts] = useState<CookCounts>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [bRaw, cRaw] = await Promise.all([
          unifiedStorage.getItem(keyBookmarks(userId)),
          unifiedStorage.getItem(keyCounts(userId)),
        ]);
        if (cancelled) return;
        if (bRaw) {
          const parsed = JSON.parse(bRaw) as unknown;
          if (Array.isArray(parsed)) setBookmarks(parsed.map(String));
        } else setBookmarks([]);
        if (cRaw) {
          const parsed = JSON.parse(cRaw) as unknown;
          if (parsed && typeof parsed === 'object') setCookCounts(parsed as CookCounts);
        } else setCookCounts({});
      } catch {
        if (!cancelled) {
          setBookmarks([]);
          setCookCounts({});
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persistBookmarks = useCallback(
    async (next: string[]) => {
      setBookmarks(next);
      await unifiedStorage.setItem(keyBookmarks(userId), JSON.stringify(next));
    },
    [userId],
  );

  const persistCounts = useCallback(
    async (next: CookCounts) => {
      setCookCounts(next);
      await unifiedStorage.setItem(keyCounts(userId), JSON.stringify(next));
    },
    [userId],
  );

  const toggleBookmark = useCallback(
    async (recipeId: string, meta?: RecipeExperienceMeta) => {
      const has = bookmarks.includes(recipeId);
      const next = has ? bookmarks.filter((id) => id !== recipeId) : [...bookmarks, recipeId];
      await persistBookmarks(next);
      if (!has) {
        await experience.record({
          kind: 'recipe',
          subjectId: recipeId,
          title: meta?.title,
          tags: meta?.tags,
          action: 'chosen',
          source: 'recipe-save',
        });
      }
    },
    [bookmarks, persistBookmarks, experience.record],
  );

  const recordCooked = useCallback(
    async (recipeId: string, meta?: RecipeExperienceMeta) => {
      const next = { ...cookCounts, [recipeId]: (cookCounts[recipeId] ?? 0) + 1 };
      await persistCounts(next);
      await experience.record({
        kind: 'recipe',
        subjectId: recipeId,
        title: meta?.title,
        tags: meta?.tags,
        action: 'completed',
        source: 'recipe-cooked',
      });
    },
    [cookCounts, persistCounts, experience.record],
  );

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  return {
    hydrated,
    bookmarks,
    bookmarkSet,
    cookCounts,
    toggleBookmark,
    recordCooked,
    isBookmarked: (id: string) => bookmarkSet.has(id),
    cookCountLabel: (id: string) => {
      const n = cookCounts[id] ?? 0;
      if (n <= 0) return 'Not cooked yet';
      if (n === 1) return 'Cooked 1×';
      return `Cooked ${n}×`;
    },
  };
}
