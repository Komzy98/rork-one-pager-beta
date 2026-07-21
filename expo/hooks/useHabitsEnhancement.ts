import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { useAuth } from './useAuth';
import { useApp } from './useHabitsStore';
import { useTasks } from './useTasksStore';
import { SavedCommunityHabit, CommunityHabit, HabitSource } from '@/types/habit';
import { Task } from '@/types/task';
import { HABIT_COLORS } from '@/constants/colors';
import { COMMUNITY_HABITS } from '@/mocks/communityHabits';
import { getLastGuestUserId } from '@/utils/localToSupabaseMigration';
import {
  Badge,
  Achievement,
  UserStats,
  StreakData,
  Challenge,
  ChallengeParticipant,
  Friend,
  FriendRequest,
  Leaderboard,
  LeaderboardEntry,
  BADGE_DEFINITIONS,
  ACHIEVEMENT_DEFINITIONS,
  XP_PER_LEVEL,
  XP_REWARDS,
  getLevelTitle,
} from '@/types/gamification';

const SAVED_HABITS_BASE_KEY = 'saved_community_habits';
const GAMIFICATION_STORAGE_KEY = 'gamification_data';
const FRIENDS_STORAGE_KEY = 'friends_data';
const CHALLENGES_STORAGE_KEY = 'challenges_data';

const getStorageKey = (baseKey: string, userId?: string) => {
  const userIdentifier = userId || 'default';
  return `${baseKey}_${userIdentifier}`;
};

interface GamificationData {
  badges: Badge[];
  achievements: Achievement[];
  stats: UserStats;
  streaks: StreakData[];
  retention?: {
    lastWeeklyBonusWeekKey?: string;
    weeklyBonusesEarned?: number;
    pendingWeeklyRewardWeekKey?: string;
    pendingWeeklyRewardXp?: number;
    pendingWeeklyRewardCreatedAt?: string;
  };
  lastUpdated: string;
}

interface FriendsData {
  friends: Friend[];
  requests: FriendRequest[];
  sentRequests: FriendRequest[];
}

const initialStats: UserStats = {
  totalCompletions: 0,
  currentStreak: 0,
  longestStreak: 0,
  perfectWeeks: 0,
  perfectMonths: 0,
  totalPoints: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: XP_PER_LEVEL,
  habitsCreated: 0,
  challengesWon: 0,
  challengesJoined: 0,
  friendsCount: 0,
  title: 'Beginner',
};

const getMaxProgressForBadge = (badgeId: string): number => {
  const progressMap: Record<string, number> = {
    'streak_3': 3, 'streak_7': 7, 'streak_14': 14, 'streak_30': 30,
    'streak_60': 60, 'streak_100': 100, 'streak_365': 365,
    'complete_10': 10, 'complete_50': 50, 'complete_100': 100,
    'complete_500': 500, 'complete_1000': 1000,
    'perfect_week': 1, 'perfect_month': 1,
    'early_bird': 10, 'night_owl': 10,
    'first_friend': 1, 'friends_5': 5, 'friends_10': 10,
    'first_challenge': 1, 'challenge_win': 1, 'challenge_master': 10,
    'diverse_5': 5, 'diverse_10': 10,
  };
  return progressMap[badgeId] || 1;
};

const getWeekKey = (date = new Date()): string => {
  const target = new Date(date);
  const day = (target.getDay() + 6) % 7; // Monday-based week
  target.setDate(target.getDate() - day);
  const year = target.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const diff = Math.floor((target.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.floor((diff + ((firstDay.getDay() + 6) % 7)) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
};

const initializeAchievements = (): Achievement[] => {
  return ACHIEVEMENT_DEFINITIONS.map(def => ({
    ...def,
    progress: 0,
    isUnlocked: false,
  }));
};

const initializeBadges = (): Badge[] => {
  return BADGE_DEFINITIONS.map(def => ({
    ...def,
    progress: 0,
    maxProgress: getMaxProgressForBadge(def.id),
  }));
};

export const [HabitsEnhancementProvider, useHabitsEnhancement] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const tasksContext = useTasks();
  const { habits, habitsWithStats } = useApp();
  
  const addTask = useMemo(() => tasksContext?.addTask || (() => {}), [tasksContext?.addTask]);

  const SAVED_HABITS_KEY = useMemo(() => getStorageKey(SAVED_HABITS_BASE_KEY, userId), [userId]);
  const STORAGE_KEY = useMemo(() => getStorageKey(GAMIFICATION_STORAGE_KEY, userId), [userId]);
  const FRIENDS_KEY = useMemo(() => getStorageKey(FRIENDS_STORAGE_KEY, userId), [userId]);
  const CHALLENGES_KEY = useMemo(() => getStorageKey(CHALLENGES_STORAGE_KEY, userId), [userId]);

  // === SAVED HABITS QUERIES ===
  const savedHabitsQuery = useQuery({
    queryKey: ['savedCommunityHabits', userId],
    queryFn: async (): Promise<SavedCommunityHabit[]> => {
      try {
        const stored = await unifiedStorage.getItem(SAVED_HABITS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error fetching saved community habits:', error);
        return [];
      }
    },
  });

  const { mutate: saveSavedHabits } = useMutation({
    mutationFn: async (savedHabits: SavedCommunityHabit[]) => {
      await unifiedStorage.setItem(SAVED_HABITS_KEY, JSON.stringify(savedHabits));
      return savedHabits;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['savedCommunityHabits', userId], data);
    },
  });

  // === GAMIFICATION QUERIES ===
  const gamificationQuery = useQuery({
    queryKey: ['gamification', userId],
    queryFn: async (): Promise<GamificationData> => {
      try {
        const stored = await unifiedStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
        const initial: GamificationData = {
          badges: initializeBadges(),
          achievements: initializeAchievements(),
          stats: initialStats,
          streaks: [],
          lastUpdated: new Date().toISOString(),
        };
        await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      } catch (error) {
        console.error('Error loading gamification data:', error);
        return {
          badges: initializeBadges(),
          achievements: initializeAchievements(),
          stats: initialStats,
          streaks: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    },
  });

  const friendsQuery = useQuery({
    queryKey: ['friends', userId],
    queryFn: async (): Promise<FriendsData> => {
      try {
        const stored = await unifiedStorage.getItem(FRIENDS_KEY);
        return stored ? JSON.parse(stored) : { friends: [], requests: [], sentRequests: [] };
      } catch (error) {
        console.error('Error loading friends data:', error);
        return { friends: [], requests: [], sentRequests: [] };
      }
    },
  });

  const challengesQuery = useQuery({
    queryKey: ['challenges', userId],
    queryFn: async (): Promise<Challenge[]> => {
      try {
        const stored = await unifiedStorage.getItem(CHALLENGES_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error loading challenges:', error);
        return [];
      }
    },
  });

  const { mutate: saveGamification } = useMutation({
    mutationFn: async (data: GamificationData) => {
      await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['gamification', userId], data);
    },
  });

  const { mutate: saveFriends } = useMutation({
    mutationFn: async (data: FriendsData) => {
      await unifiedStorage.setItem(FRIENDS_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['friends', userId], data);
    },
  });

  const { mutate: saveChallenges } = useMutation({
    mutationFn: async (challenges: Challenge[]) => {
      await unifiedStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
      return challenges;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['challenges', userId], data);
    },
  });

  // === SAVED HABITS LOGIC ===
  const savedHabits = useMemo<SavedCommunityHabit[]>(() => savedHabitsQuery.data || [], [savedHabitsQuery.data]);

  // Self-heal: guest/default ledgers may not have been copied on sign-up. Only adopt
  // from the anonymous guest keys — never from other signed-in users on the same device.
  const reconciledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || savedHabitsQuery.isLoading) return;
    if (savedHabits.length > 0) return;
    if (reconciledForRef.current === userId) return;
    reconciledForRef.current = userId;

    (async () => {
      try {
        const guestId = await getLastGuestUserId();
        const candidateKeys = [
          getStorageKey(SAVED_HABITS_BASE_KEY, undefined),
          ...(guestId && guestId !== userId
            ? [getStorageKey(SAVED_HABITS_BASE_KEY, guestId)]
            : []),
        ].filter((key) => key !== SAVED_HABITS_KEY);

        let best: SavedCommunityHabit[] = [];
        for (const key of candidateKeys) {
          const raw = await unifiedStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > best.length) {
              best = parsed as SavedCommunityHabit[];
            }
          } catch {
            // ignore malformed entries
          }
        }
        if (best.length > 0) {
          console.log('🩹 Recovered guest saved-habits ledger:', best.length, 'entries');
          saveSavedHabits(best);
        }
      } catch (err) {
        console.warn('Saved-habits self-heal skipped:', err);
      }
    })();
  }, [userId, savedHabitsQuery.isLoading, savedHabits.length, SAVED_HABITS_KEY, saveSavedHabits]);

  const isHabitSaved = useCallback((communityHabitId: string): boolean => {
    return savedHabits.some((sh) => sh.communityHabitId === communityHabitId);
  }, [savedHabits]);

  const getHabitSource = useCallback((habitId: string): HabitSource => {
    const saved = savedHabits.find((sh) => sh.habitId === habitId);
    if (saved) {
      return {
        type: 'community',
        communityHabitId: saved.communityHabitId,
        originalCreator: saved.originalCreator,
      };
    }
    return { type: 'personal' };
  }, [savedHabits]);

  const addCommunityHabit = useCallback((communityHabit: CommunityHabit) => {
    const alreadySaved = savedHabits.some((sh) => sh.communityHabitId === communityHabit.id);
    if (alreadySaved) {
      console.log('Habit already saved:', communityHabit.name);
      return null;
    }

    const isProgramHabit = !!(communityHabit.weeks && communityHabit.weeks.length > 0);
    const programStartDate = isProgramHabit ? new Date().toISOString() : undefined;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

    const hasExplicitDays = Array.isArray(communityHabit.frequency.days) && communityHabit.frequency.days.length > 0;
    const frequencyType = hasExplicitDays
      ? 'specific_days'
      : (communityHabit.frequency.type || 'specific_days');
    const timesPerWeek = communityHabit.frequency.timesPerWeek;
    
    const newTaskHabit: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: communityHabit.name,
      description: communityHabit.description || '',
      priority: 'medium',
      status: 'todo',
      category: 'personal',
      tags: communityHabit.tags || [],
      subTasks: [],
      reminders: [],
      attachments: [],
      completionLogs: [],
      progress: 0,
      isRecurring: true,
      isHabit: true,
      habitFrequency: {
        type: frequencyType,
        days: communityHabit.frequency.days,
        timesPerWeek,
      },
      habitCompletions: {},
      habitStreak: 0,
      icon: communityHabit.icon || 'target',
      color: communityHabit.color || HABIT_COLORS[0],
      completedAt: undefined,
      projectId: undefined,
      assignedTo: undefined,
      dueDate: undefined,
      estimatedDuration: undefined,
      actualDuration: undefined,
      recurringPattern: {
        type: 'weekly',
        interval: 1,
        daysOfWeek: communityHabit.frequency.days
      },
      streakFreeze: {
        availableFreezes: 2,
        frozenDates: [],
        lastFreezeRefill: weekStartStr,
        freezesUsedThisWeek: 0,
      },
      gracePeriod: {
        enabled: true,
        graceHours: 24,
        recoveredDates: [],
      },
      comebackBonus: {
        bonusXpAwarded: 0,
        comebackCount: 0,
      },
      partialCredit: {
        monthlyRates: {},
        weeklyRates: {},
        allTimeRate: 0,
        totalScheduledDays: 0,
        totalCompletedDays: 0,
      },
      programStartDate,
      currentWeek: isProgramHabit ? 1 : undefined,
      totalWeeks: isProgramHabit && communityHabit.weeks ? communityHabit.weeks.length : undefined,
      programData: isProgramHabit ? {
        phases: communityHabit.phases,
        weeks: communityHabit.weeks,
        longDescription: communityHabit.longDescription,
        resources: communityHabit.resources
      } : undefined
    };
    const newTask = addTask(newTaskHabit);
    const newHabitId = newTask?.id || `community-${Date.now()}`;

    const savedEntry: SavedCommunityHabit = {
      id: `saved-${Date.now()}`,
      communityHabitId: communityHabit.id,
      habitId: newHabitId,
      savedAt: new Date().toISOString(),
      originalCreator: {
        id: communityHabit.user.id,
        name: communityHabit.user.name,
        avatar: communityHabit.user.avatar,
      },
    };

    saveSavedHabits([...savedHabits, savedEntry]);
    console.log('✅ Community habit added to tasks store:', communityHabit.name);
    return savedEntry;
  }, [savedHabits, addTask, saveSavedHabits]);

  const removeSavedHabit = useCallback((communityHabitId: string) => {
    const savedHabit = savedHabits.find((sh) => sh.communityHabitId === communityHabitId);
    if (!savedHabit) return;

    if (tasksContext?.deleteTask) {
      tasksContext.deleteTask(savedHabit.habitId);
    }

    saveSavedHabits(savedHabits.filter((sh) => sh.communityHabitId !== communityHabitId));
  }, [savedHabits, saveSavedHabits, tasksContext]);

  const removeSavedHabitByTaskId = useCallback((taskId: string) => {
    const savedHabit = savedHabits.find((sh) => sh.habitId === taskId);
    if (!savedHabit) return;
    saveSavedHabits(savedHabits.filter((sh) => sh.habitId !== taskId));
  }, [savedHabits, saveSavedHabits]);

  // Backfill program data
  useEffect(() => {
    if (!savedHabits.length || !tasksContext?.allTasks || !tasksContext?.updateTask) return;
    
    savedHabits.forEach((savedHabit) => {
      const task = tasksContext.allTasks.find((t: Task) => t.id === savedHabit.habitId);
      if (!task) return;
      
      const communityHabit = COMMUNITY_HABITS.find(ch => ch.id === savedHabit.communityHabitId);
      if (!communityHabit?.weeks || communityHabit.weeks.length === 0) return;
      if (task.programData?.weeks && task.programData.weeks.length > 0) return;
      
      const programStartDate = task.programStartDate || task.createdAt || new Date().toISOString();
      
      tasksContext.updateTask(task.id, {
        programStartDate,
        currentWeek: task.currentWeek || 1,
        totalWeeks: communityHabit.weeks.length,
        programData: {
          phases: communityHabit.phases,
          weeks: communityHabit.weeks,
          longDescription: communityHabit.longDescription,
          resources: communityHabit.resources
        }
      });
    });
  }, [savedHabits, tasksContext]);

  // === GAMIFICATION LOGIC ===
  const calculateStreaks = useCallback((): StreakData[] => {
    return habitsWithStats.map(habit => ({
      habitId: habit.id,
      habitName: habit.name,
      currentStreak: habit.streak,
      longestStreak: Math.max(habit.streak, habit.totalCompletions),
      lastCompletedAt: Object.keys(habit.completions).sort().pop(),
      isAtRisk: habit.streak > 0 && !habit.completedToday && new Date().getHours() >= 18,
      streakFreezeAvailable: false,
    }));
  }, [habitsWithStats]);

  const calculateStats = useCallback((): Partial<UserStats> => {
    const totalCompletions = habitsWithStats.reduce((sum, h) => sum + h.totalCompletions, 0);
    const currentStreak = Math.max(...habitsWithStats.map(h => h.streak), 0);
    const longestStreak = Math.max(...habitsWithStats.map(h => h.streak), 0);
    const habitsCreated = habits.length;

    return {
      totalCompletions,
      currentStreak,
      longestStreak,
      habitsCreated,
      perfectWeeks: 0,
      perfectMonths: 0,
      friendsCount: friendsQuery.data?.friends.length || 0,
      challengesJoined: challengesQuery.data?.length || 0,
    };
  }, [habitsWithStats, habits, friendsQuery.data, challengesQuery.data]);

  const checkBadgeProgress = useCallback((badges: Badge[], stats: UserStats): Badge[] => {
    return badges.map(badge => {
      let progress = 0;

      switch (badge.id) {
        case 'streak_3': case 'streak_7': case 'streak_14': case 'streak_30':
        case 'streak_60': case 'streak_100': case 'streak_365':
          progress = stats.currentStreak; break;
        case 'complete_10': case 'complete_50': case 'complete_100':
        case 'complete_500': case 'complete_1000':
          progress = stats.totalCompletions; break;
        case 'perfect_week': progress = stats.perfectWeeks > 0 ? 1 : 0; break;
        case 'perfect_month': progress = stats.perfectMonths > 0 ? 1 : 0; break;
        case 'first_friend': case 'friends_5': case 'friends_10':
          progress = stats.friendsCount; break;
        case 'first_challenge': progress = stats.challengesJoined > 0 ? 1 : 0; break;
        case 'challenge_win': case 'challenge_master':
          progress = stats.challengesWon; break;
        case 'diverse_5': case 'diverse_10':
          progress = stats.habitsCreated; break;
        default: progress = badge.progress || 0;
      }

      const maxProgress = badge.maxProgress || getMaxProgressForBadge(badge.id);
      const newlyUnlocked = !badge.unlockedAt && progress >= maxProgress;

      return {
        ...badge,
        progress,
        maxProgress,
        unlockedAt: newlyUnlocked ? new Date().toISOString() : badge.unlockedAt,
      };
    });
  }, []);

  const checkAchievementProgress = useCallback((achievements: Achievement[], stats: UserStats): Achievement[] => {
    return achievements.map(achievement => {
      let progress = 0;

      switch (achievement.requirement.type) {
        case 'streak': progress = stats.currentStreak; break;
        case 'total_completions': progress = stats.totalCompletions; break;
        case 'habit_count': progress = stats.habitsCreated; break;
        case 'friends_count': progress = stats.friendsCount; break;
        case 'challenge_wins': progress = stats.challengesWon; break;
        case 'perfect_week': progress = stats.perfectWeeks; break;
        case 'perfect_month': progress = stats.perfectMonths; break;
        default: progress = achievement.progress;
      }

      const isUnlocked = progress >= achievement.maxProgress;
      const newlyUnlocked = !achievement.isUnlocked && isUnlocked;

      return {
        ...achievement,
        progress: Math.min(progress, achievement.maxProgress),
        isUnlocked,
        unlockedAt: newlyUnlocked ? new Date().toISOString() : achievement.unlockedAt,
      };
    });
  }, []);

  const addXP = useCallback((amount: number) => {
    const data = gamificationQuery.data;
    if (!data) return;

    let newXP = data.stats.xp + amount;
    let newLevel = data.stats.level;
    let xpToNext = data.stats.xpToNextLevel;

    while (newXP >= xpToNext) {
      newXP -= xpToNext;
      newLevel++;
      xpToNext = XP_PER_LEVEL * newLevel;
    }

    const updatedStats: UserStats = {
      ...data.stats,
      xp: newXP,
      level: newLevel,
      xpToNextLevel: xpToNext,
      totalPoints: data.stats.totalPoints + amount,
      title: getLevelTitle(newLevel),
    };

    saveGamification({
      ...data,
      stats: updatedStats,
      lastUpdated: new Date().toISOString(),
    });
  }, [gamificationQuery.data, saveGamification]);

  const refreshGamification = useCallback(() => {
    const data = gamificationQuery.data;
    if (!data) return;

    const newStatsPartial = calculateStats();
    const updatedStats: UserStats = { ...data.stats, ...newStatsPartial };
    const updatedBadges = checkBadgeProgress(data.badges, updatedStats);
    const updatedAchievements = checkAchievementProgress(data.achievements, updatedStats);
    const updatedStreaks = calculateStreaks();

    const newlyUnlockedBadges = updatedBadges.filter((b, i) => b.unlockedAt && !data.badges[i].unlockedAt);
    const newlyUnlockedAchievements = updatedAchievements.filter((a, i) => a.isUnlocked && !data.achievements[i].isUnlocked);

    let bonusXP = newlyUnlockedBadges.length * XP_REWARDS.badgeUnlock + newlyUnlockedAchievements.length * XP_REWARDS.achievementUnlock;

    let finalXP = updatedStats.xp + bonusXP;
    let finalLevel = updatedStats.level;
    let xpToNext = updatedStats.xpToNextLevel;

    while (finalXP >= xpToNext) {
      finalXP -= xpToNext;
      finalLevel++;
      xpToNext = XP_PER_LEVEL * finalLevel;
    }

    const currentWeekKey = getWeekKey();
    const alreadyGrantedWeeklyBonus = data.retention?.lastWeeklyBonusWeekKey === currentWeekKey;
    const completionsThisWeek = habitsWithStats.reduce((sum, habit) => {
      const count = Object.entries(habit.completions || {}).filter(([date, completed]) => {
        if (!completed) return false;
        return getWeekKey(new Date(date)) === currentWeekKey;
      }).length;
      return sum + count;
    }, 0);
    const qualifiesForWeeklyBonus = completionsThisWeek >= Math.max(3, habitsWithStats.length);
    const weeklyBonusXP = !alreadyGrantedWeeklyBonus && qualifiesForWeeklyBonus ? 20 : 0;
    const existingPendingWeek = data.retention?.pendingWeeklyRewardWeekKey;
    const shouldSetPendingWeeklyReward = weeklyBonusXP > 0 && existingPendingWeek !== currentWeekKey;

    const finalStats: UserStats = {
      ...updatedStats,
      xp: finalXP,
      level: finalLevel,
      xpToNextLevel: xpToNext,
      totalPoints: updatedStats.totalPoints + bonusXP,
      title: getLevelTitle(finalLevel),
    };

    saveGamification({
      badges: updatedBadges,
      achievements: updatedAchievements,
      stats: finalStats,
      streaks: updatedStreaks,
      retention: {
        lastWeeklyBonusWeekKey: data.retention?.lastWeeklyBonusWeekKey,
        weeklyBonusesEarned: data.retention?.weeklyBonusesEarned || 0,
        pendingWeeklyRewardWeekKey: shouldSetPendingWeeklyReward ? currentWeekKey : data.retention?.pendingWeeklyRewardWeekKey,
        pendingWeeklyRewardXp: shouldSetPendingWeeklyReward ? weeklyBonusXP : data.retention?.pendingWeeklyRewardXp,
        pendingWeeklyRewardCreatedAt: shouldSetPendingWeeklyReward ? new Date().toISOString() : data.retention?.pendingWeeklyRewardCreatedAt,
      },
      lastUpdated: new Date().toISOString(),
    });

    return {
      newBadges: newlyUnlockedBadges,
      newAchievements: newlyUnlockedAchievements,
      levelUp: finalLevel > data.stats.level,
    };
  }, [gamificationQuery.data, calculateStats, checkBadgeProgress, checkAchievementProgress, calculateStreaks, saveGamification, habitsWithStats]);

  const claimWeeklyReward = useCallback(() => {
    const data = gamificationQuery.data;
    if (!data) return { claimed: false, xp: 0 };
    const pendingXp = data.retention?.pendingWeeklyRewardXp || 0;
    const pendingWeekKey = data.retention?.pendingWeeklyRewardWeekKey;
    if (!pendingXp || !pendingWeekKey) return { claimed: false, xp: 0 };

    let newXP = data.stats.xp + pendingXp;
    let newLevel = data.stats.level;
    let xpToNext = data.stats.xpToNextLevel;

    while (newXP >= xpToNext) {
      newXP -= xpToNext;
      newLevel++;
      xpToNext = XP_PER_LEVEL * newLevel;
    }

    saveGamification({
      ...data,
      stats: {
        ...data.stats,
        xp: newXP,
        level: newLevel,
        xpToNextLevel: xpToNext,
        totalPoints: data.stats.totalPoints + pendingXp,
        title: getLevelTitle(newLevel),
      },
      retention: {
        ...data.retention,
        lastWeeklyBonusWeekKey: pendingWeekKey,
        weeklyBonusesEarned: (data.retention?.weeklyBonusesEarned || 0) + 1,
        pendingWeeklyRewardWeekKey: undefined,
        pendingWeeklyRewardXp: 0,
        pendingWeeklyRewardCreatedAt: undefined,
      },
      lastUpdated: new Date().toISOString(),
    });

    return { claimed: true, xp: pendingXp };
  }, [gamificationQuery.data, saveGamification]);

  const onHabitComplete = useCallback(() => {
    addXP(XP_REWARDS.habitComplete);
    setTimeout(() => refreshGamification(), 100);
  }, [addXP, refreshGamification]);

  // Friends functions
  const addFriend = useCallback((friend: Friend) => {
    const data = friendsQuery.data;
    if (!data) return;
    saveFriends({ ...data, friends: [...data.friends, friend] });
    addXP(XP_REWARDS.friendAdd);
  }, [friendsQuery.data, saveFriends, addXP]);

  const removeFriend = useCallback((friendId: string) => {
    const data = friendsQuery.data;
    if (!data) return;
    saveFriends({ ...data, friends: data.friends.filter(f => f.id !== friendId) });
  }, [friendsQuery.data, saveFriends]);

  const sendFriendRequest = useCallback((request: FriendRequest) => {
    const data = friendsQuery.data;
    if (!data) return;
    saveFriends({ ...data, sentRequests: [...data.sentRequests, request] });
  }, [friendsQuery.data, saveFriends]);

  // Challenge functions
  const joinChallenge = useCallback((challenge: Challenge) => {
    const challenges = challengesQuery.data || [];
    const participant: ChallengeParticipant = {
      userId: userId || 'guest',
      userName: user?.name || 'Guest',
      avatar: user?.avatar,
      progress: 0,
      rank: challenge.participants.length + 1,
      joinedAt: new Date().toISOString(),
      isCreator: false,
    };

    const updatedChallenge: Challenge = {
      ...challenge,
      participants: [...challenge.participants, participant],
    };

    const existingIndex = challenges.findIndex((c) => c.id === challenge.id);
    if (existingIndex >= 0) {
      const next = [...challenges];
      next[existingIndex] = updatedChallenge;
      saveChallenges(next);
      return;
    }

    saveChallenges([...challenges, updatedChallenge]);
  }, [challengesQuery.data, userId, user, saveChallenges]);

  const createChallenge = useCallback((challenge: Omit<Challenge, 'id' | 'participants' | 'status'>) => {
    const challenges = challengesQuery.data || [];
    const newChallenge: Challenge = {
      ...challenge,
      id: `challenge_${Date.now()}`,
      status: new Date(challenge.startDate) > new Date() ? 'upcoming' : 'active',
      participants: [{
        userId: userId || 'guest',
        userName: user?.name || 'Guest',
        avatar: user?.avatar,
        progress: 0,
        rank: 1,
        joinedAt: new Date().toISOString(),
        isCreator: true,
      }],
    };
    saveChallenges([...challenges, newChallenge]);
    return newChallenge;
  }, [challengesQuery.data, userId, user, saveChallenges]);

  const leaveChallenge = useCallback((challengeId: string) => {
    const challenges = challengesQuery.data || [];
    const updated = challenges.map(c => {
      if (c.id === challengeId) {
        return { ...c, participants: c.participants.filter(p => p.userId !== userId) };
      }
      return c;
    }).filter(c => c.participants.length > 0);
    saveChallenges(updated);
  }, [challengesQuery.data, userId, saveChallenges]);

  const getLeaderboard = useCallback((type: 'global' | 'friends' | 'challenge', challengeId?: string): Leaderboard => {
    const friends = friendsQuery.data?.friends || [];
    const challenges = challengesQuery.data || [];
    const stats = gamificationQuery.data?.stats || initialStats;

    let entries: LeaderboardEntry[] = [];

    if (type === 'friends') {
      entries = friends.map((f, i) => ({
        rank: i + 1,
        userId: f.id,
        userName: f.name,
        avatar: f.avatar,
        score: f.totalCompletions,
        change: 0,
        isCurrentUser: false,
      }));
      
      entries.push({
        rank: entries.length + 1,
        userId: userId || 'guest',
        userName: user?.name || 'You',
        avatar: user?.avatar,
        score: stats.totalCompletions,
        change: 0,
        isCurrentUser: true,
      });

      entries.sort((a, b) => b.score - a.score);
      entries = entries.map((e, i) => ({ ...e, rank: i + 1 }));
    } else if (type === 'challenge' && challengeId) {
      const challenge = challenges.find(c => c.id === challengeId);
      if (challenge) {
        entries = challenge.participants.map(p => ({
          rank: p.rank,
          userId: p.userId,
          userName: p.userName,
          avatar: p.avatar,
          score: p.progress,
          change: 0,
          isCurrentUser: p.userId === userId,
        }));
      }
    }

    return {
      id: `${type}_${challengeId || 'main'}`,
      name: type === 'friends' ? 'Friends Leaderboard' : type === 'challenge' ? 'Challenge Leaderboard' : 'Global Leaderboard',
      type,
      period: 'all_time',
      entries,
      updatedAt: new Date().toISOString(),
    };
  }, [friendsQuery.data, challengesQuery.data, gamificationQuery.data, userId, user]);

  // Memoized computed values
  const getStreaksAtRisk = useMemo(() => (gamificationQuery.data?.streaks || []).filter(s => s.isAtRisk), [gamificationQuery.data?.streaks]);
  const getUnlockedBadges = useMemo(() => (gamificationQuery.data?.badges || []).filter(b => b.unlockedAt), [gamificationQuery.data?.badges]);
  const getUnlockedAchievements = useMemo(() => (gamificationQuery.data?.achievements || []).filter(a => a.isUnlocked), [gamificationQuery.data?.achievements]);
  const getActiveChallenges = useMemo(() => (challengesQuery.data || []).filter(c => c.status === 'active'), [challengesQuery.data]);

  useEffect(() => {
    if (gamificationQuery.data && habitsWithStats.length > 0) {
      refreshGamification();
    }
  }, [habitsWithStats.length]);

  return {
    // Saved Habits
    savedHabits,
    isHabitSaved,
    getHabitSource,
    addCommunityHabit,
    removeSavedHabit,
    removeSavedHabitByTaskId,
    communityHabitIds: useMemo(() => savedHabits.map((sh) => sh.communityHabitId), [savedHabits]),
    savedCount: savedHabits.length,

    // Gamification
    badges: gamificationQuery.data?.badges || [],
    achievements: gamificationQuery.data?.achievements || [],
    stats: gamificationQuery.data?.stats || initialStats,
    streaks: gamificationQuery.data?.streaks || [],
    friends: friendsQuery.data?.friends || [],
    friendRequests: friendsQuery.data?.requests || [],
    challenges: challengesQuery.data || [],
    
    unlockedBadges: getUnlockedBadges,
    unlockedAchievements: getUnlockedAchievements,
    streaksAtRisk: getStreaksAtRisk,
    activeChallenges: getActiveChallenges,
    pendingWeeklyRewardXp: gamificationQuery.data?.retention?.pendingWeeklyRewardXp || 0,
    claimWeeklyReward,
    
    onHabitComplete,
    addXP,
    refreshGamification,
    
    addFriend,
    removeFriend,
    sendFriendRequest,
    
    joinChallenge,
    createChallenge,
    leaveChallenge,
    getLeaderboard,
    
    isLoading: savedHabitsQuery.isLoading || gamificationQuery.isLoading || friendsQuery.isLoading || challengesQuery.isLoading,
  };
});

// Re-export hooks for backward compatibility
export const useSavedHabits = () => {
  const ctx = useHabitsEnhancement();
  return {
    savedHabits: ctx.savedHabits,
    isLoading: ctx.isLoading,
    isHabitSaved: ctx.isHabitSaved,
    getHabitSource: ctx.getHabitSource,
    addCommunityHabit: ctx.addCommunityHabit,
    removeSavedHabit: ctx.removeSavedHabit,
    removeSavedHabitByTaskId: ctx.removeSavedHabitByTaskId,
    communityHabitIds: ctx.communityHabitIds,
    savedCount: ctx.savedCount,
  };
};

export const useGamification = () => {
  const ctx = useHabitsEnhancement();
  return {
    badges: ctx.badges,
    achievements: ctx.achievements,
    stats: ctx.stats,
    streaks: ctx.streaks,
    friends: ctx.friends,
    friendRequests: ctx.friendRequests,
    challenges: ctx.challenges,
    unlockedBadges: ctx.unlockedBadges,
    unlockedAchievements: ctx.unlockedAchievements,
    streaksAtRisk: ctx.streaksAtRisk,
    activeChallenges: ctx.activeChallenges,
    pendingWeeklyRewardXp: ctx.pendingWeeklyRewardXp,
    claimWeeklyReward: ctx.claimWeeklyReward,
    onHabitComplete: ctx.onHabitComplete,
    addXP: ctx.addXP,
    refreshGamification: ctx.refreshGamification,
    addFriend: ctx.addFriend,
    removeFriend: ctx.removeFriend,
    sendFriendRequest: ctx.sendFriendRequest,
    joinChallenge: ctx.joinChallenge,
    createChallenge: ctx.createChallenge,
    leaveChallenge: ctx.leaveChallenge,
    getLeaderboard: ctx.getLeaderboard,
    isLoading: ctx.isLoading,
  };
};
