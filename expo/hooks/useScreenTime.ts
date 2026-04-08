import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { useAuth } from '@/hooks/useAuth';
import { TimeBlock, NewTimeBlockFormData, ScreenTimeStats } from '@/types/screenTime';

const getUserStorageKey = (baseKey: string, userId?: string) => {
  const userIdentifier = userId || 'default';
  return `${baseKey}_${userIdentifier}`;
};

const getTodayFormatted = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateStreak = (completions: Record<string, boolean>): number => {
  const today = new Date();
  let streak = 0;
  const d = new Date(today);

  if (completions[getTodayFormatted()]) {
    streak = 1;
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

const shouldShowBlockToday = (block: TimeBlock): boolean => {
  const today = new Date().getDay();
  if (block.frequency.type === 'daily') return true;
  return block.frequency.days.includes(today);
};

const getBlockDurationMinutes = (block: TimeBlock): number => {
  const [startH, startM] = block.startTime.split(':').map(Number);
  const [endH, endM] = block.endTime.split(':').map(Number);
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

export const [ScreenTimeProvider, useScreenTime] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const STORAGE_KEY = useMemo(() => getUserStorageKey('screen_time_blocks', userId), [userId]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const blocksQuery = useQuery({
    queryKey: ['screen_time_blocks', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const stored = await unifiedStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            return JSON.parse(stored) as TimeBlock[];
          } catch {
            console.error('Error parsing screen time blocks');
            return [];
          }
        }
        return [];
      } catch (error) {
        console.error('Error fetching screen time blocks:', error);
        return [];
      }
    },
  });

  const saveBlocksMutation = useMutation({
    mutationFn: async (blocks: TimeBlock[]) => {
      await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
      return blocks;
    },
    onSuccess: (blocks) => {
      queryClient.setQueryData(['screen_time_blocks', userId], blocks);
    },
  });

  const blocks = useMemo(() => blocksQuery.data || [], [blocksQuery.data]);

  const addBlock = useCallback((data: NewTimeBlockFormData) => {
    const newBlock: TimeBlock = {
      id: Date.now().toString(),
      ...data,
      completions: {},
      createdAt: new Date().toISOString(),
      stats: {
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalMinutesSaved: 0,
      },
    };
    const updated = [...blocks, newBlock];
    saveBlocksMutation.mutate(updated);
    console.log('📱 [ScreenTime] Added new block:', newBlock.name);
  }, [blocks, saveBlocksMutation]);

  const deleteBlock = useCallback((blockId: string) => {
    const updated = blocks.filter(b => b.id !== blockId);
    saveBlocksMutation.mutate(updated);
    console.log('🗑️ [ScreenTime] Deleted block:', blockId);
  }, [blocks, saveBlocksMutation]);

  const startSession = useCallback((blockId: string) => {
    const updated = blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          activeSession: {
            startedAt: new Date().toISOString(),
            totalPausedSeconds: 0,
          },
        };
      }
      return b;
    });
    saveBlocksMutation.mutate(updated);
    console.log('▶️ [ScreenTime] Started session for:', blockId);
  }, [blocks, saveBlocksMutation]);

  const completeSession = useCallback((blockId: string) => {
    const today = getTodayFormatted();
    const updated = blocks.map(b => {
      if (b.id === blockId) {
        const updatedCompletions = { ...b.completions, [today]: true };
        const streak = calculateStreak(updatedCompletions);
        const duration = getBlockDurationMinutes(b);
        return {
          ...b,
          completions: updatedCompletions,
          activeSession: undefined,
          stats: {
            totalCompleted: b.stats.totalCompleted + 1,
            currentStreak: streak,
            longestStreak: Math.max(b.stats.longestStreak, streak),
            totalMinutesSaved: b.stats.totalMinutesSaved + duration,
          },
        };
      }
      return b;
    });
    saveBlocksMutation.mutate(updated);
    console.log('✅ [ScreenTime] Completed session for:', blockId);
  }, [blocks, saveBlocksMutation]);

  const cancelSession = useCallback((blockId: string) => {
    const updated = blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, activeSession: undefined };
      }
      return b;
    });
    saveBlocksMutation.mutate(updated);
    console.log('❌ [ScreenTime] Cancelled session for:', blockId);
  }, [blocks, saveBlocksMutation]);

  const todayBlocks = useMemo(() => {
    return blocks.filter(shouldShowBlockToday);
  }, [blocks]);

  const todayCompletedCount = useMemo(() => {
    const today = getTodayFormatted();
    return todayBlocks.filter(b => b.completions[today]).length;
  }, [todayBlocks]);

  const activeSession = useMemo(() => {
    return blocks.find(b => b.activeSession != null);
  }, [blocks]);

  const getElapsedSeconds = useCallback((block: TimeBlock): number => {
    if (!block.activeSession) return 0;
    const started = new Date(block.activeSession.startedAt).getTime();
    const elapsed = Math.floor((now - started) / 1000) - (block.activeSession.totalPausedSeconds || 0);
    return Math.max(0, elapsed);
  }, [now]);

  const getTargetSeconds = useCallback((block: TimeBlock): number => {
    return getBlockDurationMinutes(block) * 60;
  }, []);

  const screenTimeStats: ScreenTimeStats = useMemo(() => {
    const today = getTodayFormatted();
    const totalMinutesSaved = blocks.reduce((sum, b) => sum + b.stats.totalMinutesSaved, 0);
    const allStreaks = blocks.map(b => b.stats.currentStreak);
    const currentStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : 0;
    const longestStreak = blocks.reduce((max, b) => Math.max(max, b.stats.longestStreak), 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    let weekTotal = 0;
    let weekCompleted = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      blocks.forEach(b => {
        if (shouldShowBlockToday(b)) {
          weekTotal++;
          if (b.completions[key]) weekCompleted++;
        }
      });
    }

    return {
      todayBlocks: todayBlocks.length,
      todayCompleted: todayCompletedCount,
      totalMinutesSaved,
      currentStreak,
      longestStreak,
      weeklyCompletionRate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
    };
  }, [blocks, todayBlocks, todayCompletedCount]);

  return {
    blocks,
    todayBlocks,
    todayCompletedCount,
    activeSession,
    screenTimeStats,
    addBlock,
    deleteBlock,
    startSession,
    completeSession,
    cancelSession,
    getElapsedSeconds,
    getTargetSeconds,
    isLoading: blocksQuery.isLoading,
  };
});
