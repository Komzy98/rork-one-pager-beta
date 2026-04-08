import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { useAuth } from './useAuth';

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY_BASE = 'recently_viewed_habits';

const getStorageKey = (userId?: string) => {
  return `${STORAGE_KEY_BASE}_${userId || 'default'}`;
};

export interface RecentlyViewedItem {
  habitId: string;
  viewedAt: string;
}

export const useRecentlyViewed = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const STORAGE_KEY = getStorageKey(userId);

  const recentQuery = useQuery({
    queryKey: ['recentlyViewedHabits', userId],
    queryFn: async (): Promise<RecentlyViewedItem[]> => {
      try {
        const stored = await unifiedStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error fetching recently viewed habits:', error);
        return [];
      }
    },
  });

  const { mutate: saveRecent } = useMutation({
    mutationFn: async (items: RecentlyViewedItem[]) => {
      await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return items;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['recentlyViewedHabits', userId], data);
    },
  });

  const addRecentlyViewed = useCallback((habitId: string) => {
    const current = recentQuery.data || [];
    const filtered = current.filter(item => item.habitId !== habitId);
    const newItem: RecentlyViewedItem = {
      habitId,
      viewedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    saveRecent(updated);
  }, [recentQuery.data, saveRecent]);

  const clearRecentlyViewed = useCallback(() => {
    saveRecent([]);
  }, [saveRecent]);

  const recentlyViewedIds = (recentQuery.data || []).map(item => item.habitId);

  return {
    recentlyViewed: recentQuery.data || [],
    recentlyViewedIds,
    addRecentlyViewed,
    clearRecentlyViewed,
    isLoading: recentQuery.isLoading,
  };
};
