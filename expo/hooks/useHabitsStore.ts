import { unifiedStorage } from '@/utils/unifiedStorage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import React, { useEffect } from 'react';
import { 
  Habit, 
  HabitWithStats, 
  NewHabitFormData, 
  GoalCompletion,
  GoalCompletionFormData,
  Activity, 
  NewActivityFormData, 
  ActivitySession,
  Show, 
  NewShowFormData, 
  SportMatch,
  DashboardSummary,
  Milestone
} from '@/types/habit';
import { calculateStreak, getTodayFormatted, shouldDoHabitToday, formatDate, calculatePartialCredit, detectComebackOpportunity, getComebackBonusXP } from '@/utils/dateUtils';
import { StreakFreeze } from '@/types/habit';
import { generateDailyTasks, generateMilestones, shouldLevelUp } from '@/utils/goalBreakdown';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSync } from '@/utils/supabaseUserSync';
import { useSocialActivity } from '@/hooks/useSocialActivity';
import { devLogSocial } from '@/utils/socialAnalytics';
import {
  resolveHabitsAfterCloudSync,
  resolveGenericRecordsAfterCloudSync,
  type CloudMergeStats,
  type CloudPullPayload,
} from '@/utils/syncMerge';

// Helper function to get user-specific storage keys
const getUserStorageKey = (baseKey: string, userId?: string) => {
  // If no userId, use a default key for guest/anonymous users
  const userIdentifier = userId || 'default';
  return `${baseKey}_${userIdentifier}`;
};

// Initial data for first-time users - empty arrays so users start fresh
const initialHabits: Habit[] = [];

const initialActivities: Activity[] = [];

// Start with empty shows - users will add their own
const initialShows: Show[] = [];

const initialSportMatches: SportMatch[] = [];

const defaultAppContext = {
  habits: [],
  habitsWithStats: [],
  todayHabits: [],
  activities: [],
  shows: [],
  sports: [],
  dashboardSummary: {
    habits: { completed: 0, total: 0, currentStreak: 0 },
    activities: { inProgress: 0, totalTimeToday: 0, recentActivity: undefined },
    shows: { watching: 0, nextToWatch: undefined },
    sports: { upcomingMatches: [], todayMatches: [] },
    calendar: { upcomingEvents: [], todayEvents: [] },
  },
  isLoading: true,
  addHabit: () => {},
  updateHabit: () => {},
  deleteHabit: () => {},
  toggleHabitCompletion: () => {},
  logHabitCompletion: () => {},
  checkComebackBonus: () => ({ isComeback: false, missedDays: 0, bonusXP: 0 }),
  getPartialCreditStats: () => ({ monthlyRates: {}, weeklyRates: {}, allTimeRate: 0, totalScheduledDays: 0, totalCompletedDays: 0 }),
  getHabitCompletionLogs: () => [],
  getHabitStats: () => ({ totalCompletions: 0, averageMood: 0, averageEffort: 0, longestStreak: 0 }),
  toggleDailyTask: () => {},
  generateTodayTasks: () => {},
  updateMilestone: () => {},
  useStreakFreeze: () => false,
  getStreakFreezeInfo: () => ({ availableFreezes: 0, frozenDates: [], freezesUsedThisWeek: 0, canFreeze: false }),
  addActivity: () => {},
  updateActivity: () => {},
  addActivitySession: () => {},
  addShow: () => {},
  updateShow: () => {},
  markEpisodeWatched: () => {},
  deleteShow: () => {},
  mergeFromCloud: async () => ({} as CloudMergeStats),
};

// Migration function to move data from old keys to user-specific keys
const migrateDataToUserKeys = async (userId: string) => {
  try {
    // Check if migration is needed
    const migrationKey = `migration_completed_${userId}`;
    const migrationCompleted = await unifiedStorage.getItem(migrationKey);
    
    if (migrationCompleted === 'true') {
      return; // Migration already done for this user
    }
    
    console.log('Starting data migration for user:', userId);
    
    // Migrate habits
    const oldHabits = await unifiedStorage.getItem('habits');
    if (oldHabits) {
      const newKey = getUserStorageKey('habits', userId);
      const existingUserHabits = await unifiedStorage.getItem(newKey);
      
      // Only migrate if user doesn't have data yet
      if (!existingUserHabits) {
        await unifiedStorage.setItem(newKey, oldHabits);
        console.log('Migrated habits to user-specific key');
      }
    }
    
    // Migrate activities
    const oldActivities = await unifiedStorage.getItem('activities');
    if (oldActivities) {
      const newKey = getUserStorageKey('activities', userId);
      const existingUserActivities = await unifiedStorage.getItem(newKey);
      
      if (!existingUserActivities) {
        await unifiedStorage.setItem(newKey, oldActivities);
        console.log('Migrated activities to user-specific key');
      }
    }
    
    // Migrate shows
    const oldShows = await unifiedStorage.getItem('shows');
    if (oldShows) {
      const newKey = getUserStorageKey('shows', userId);
      const existingUserShows = await unifiedStorage.getItem(newKey);
      
      if (!existingUserShows) {
        await unifiedStorage.setItem(newKey, oldShows);
        console.log('Migrated shows to user-specific key');
      }
    }
    
    // Migrate sports
    const oldSports = await unifiedStorage.getItem('sports');
    if (oldSports) {
      const newKey = getUserStorageKey('sports', userId);
      const existingUserSports = await unifiedStorage.getItem(newKey);
      
      if (!existingUserSports) {
        await unifiedStorage.setItem(newKey, oldSports);
        console.log('Migrated sports to user-specific key');
      }
    }
    
    // Mark migration as completed
    await unifiedStorage.setItem(migrationKey, 'true');
    console.log('Data migration completed for user:', userId);
  } catch (error) {
    console.error('Error during data migration:', error);
  }
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const supabaseSync = useSupabaseSync(userId);
  const { logHabitCompleted, logShowSaved } = useSocialActivity();
  
  // Get user-specific storage keys - use stable values
  const HABITS_STORAGE_KEY = React.useMemo(() => getUserStorageKey('habits', userId), [userId]);
  const ACTIVITIES_STORAGE_KEY = React.useMemo(() => getUserStorageKey('activities', userId), [userId]);
  const SHOWS_STORAGE_KEY = React.useMemo(() => getUserStorageKey('shows', userId), [userId]);
  const SPORTS_STORAGE_KEY = React.useMemo(() => getUserStorageKey('sports', userId), [userId]);
  
  // Run migration when user changes, then refetch so user-scoped keys pick up migrated data.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      await migrateDataToUserKeys(userId);
      if (cancelled) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['habits', userId] }),
        queryClient.invalidateQueries({ queryKey: ['activities', userId] }),
        queryClient.invalidateQueries({ queryKey: ['shows', userId] }),
        queryClient.invalidateQueries({ queryKey: ['sports', userId] }),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, queryClient]);
  
  // Fetch habits from AsyncStorage
  const habitsQuery = useQuery({
    queryKey: ['habits', userId],
    queryFn: async () => {
      try {
        const storedHabits = await unifiedStorage.getItem(HABITS_STORAGE_KEY);
        if (storedHabits) {
          try {
            return JSON.parse(storedHabits) as Habit[];
          } catch (parseError) {
            console.error('Error parsing habits JSON, resetting to initial data:', parseError);
            await unifiedStorage.removeItem(HABITS_STORAGE_KEY);
            await unifiedStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(initialHabits));
            return initialHabits;
          }
        }
        // Do not persist empty defaults here — cloud hydrate can run in parallel; writing [] would
        // overwrite Supabase-fetched habits on disk (race after login).
        return initialHabits;
      } catch (error) {
        console.error('Error fetching habits:', error);
        return initialHabits;
      }
    },
  });

  // Fetch activities from AsyncStorage
  const activitiesQuery = useQuery({
    queryKey: ['activities', userId],
    queryFn: async () => {
      try {
        const storedActivities = await unifiedStorage.getItem(ACTIVITIES_STORAGE_KEY);
        if (storedActivities) {
          try {
            return JSON.parse(storedActivities) as Activity[];
          } catch (parseError) {
            console.error('Error parsing activities JSON, resetting to initial data:', parseError);
            await unifiedStorage.removeItem(ACTIVITIES_STORAGE_KEY);
            await unifiedStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(initialActivities));
            return initialActivities;
          }
        }
        return initialActivities;
      } catch (error) {
        console.error('Error fetching activities:', error);
        return initialActivities;
      }
    },
  });

  // Fetch shows from AsyncStorage
  const showsQuery = useQuery({
    queryKey: ['shows', userId],
    queryFn: async () => {
      try {
        const storedShows = await unifiedStorage.getItem(SHOWS_STORAGE_KEY);
        if (storedShows) {
          try {
            return JSON.parse(storedShows) as Show[];
          } catch (parseError) {
            console.error('Error parsing shows JSON, resetting to initial data:', parseError);
            await unifiedStorage.removeItem(SHOWS_STORAGE_KEY);
            await unifiedStorage.setItem(SHOWS_STORAGE_KEY, JSON.stringify(initialShows));
            return initialShows;
          }
        }
        return initialShows;
      } catch (error) {
        console.error('Error fetching shows:', error);
        return initialShows;
      }
    },
  });

  // Fetch sports data from AsyncStorage
  const sportsQuery = useQuery({
    queryKey: ['sports', userId],
    queryFn: async () => {
      try {
        const storedSports = await unifiedStorage.getItem(SPORTS_STORAGE_KEY);
        if (storedSports) {
          try {
            return JSON.parse(storedSports) as SportMatch[];
          } catch (parseError) {
            console.error('Error parsing sports JSON, resetting to initial data:', parseError);
            await unifiedStorage.removeItem(SPORTS_STORAGE_KEY);
            await unifiedStorage.setItem(SPORTS_STORAGE_KEY, JSON.stringify(initialSportMatches));
            return initialSportMatches;
          }
        }
        return initialSportMatches;
      } catch (error) {
        console.error('Error fetching sports:', error);
        return initialSportMatches;
      }
    },
  });

  // Hydrate local queries from Supabase when authenticated.
  useEffect(() => {
    if (!userId || !supabaseSync.loadFromCloud) return;
    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        let cloudData = await supabaseSync.loadFromCloud();
        if (!cloudData && !cancelled) {
          await new Promise((r) => setTimeout(r, 700));
          if (!cancelled) cloudData = await supabaseSync.loadFromCloud();
        }
        if (!cloudData || cancelled) return;

        let localHabitsHydrate = queryClient.getQueryData<Habit[]>(['habits', userId]);
        if (!localHabitsHydrate?.length) {
          const storedLocal = await unifiedStorage.getItem(HABITS_STORAGE_KEY);
          if (storedLocal) {
            try {
              localHabitsHydrate = JSON.parse(storedLocal) as Habit[];
            } catch {
              /* use query cache only */
            }
          }
        }
        const mergedHabits = resolveHabitsAfterCloudSync(cloudData.habits, localHabitsHydrate);
        if (mergedHabits !== null) {
          queryClient.setQueryData(['habits', userId], mergedHabits);
          await unifiedStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(mergedHabits));
        }
        if (Array.isArray(cloudData.activities)) {
          queryClient.setQueryData(['activities', userId], cloudData.activities);
          await unifiedStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(cloudData.activities));
        }
        if (Array.isArray(cloudData.shows)) {
          queryClient.setQueryData(['shows', userId], cloudData.shows);
          await unifiedStorage.setItem(SHOWS_STORAGE_KEY, JSON.stringify(cloudData.shows));
        }
        if (Array.isArray(cloudData.sports)) {
          queryClient.setQueryData(['sports', userId], cloudData.sports);
          await unifiedStorage.setItem(SPORTS_STORAGE_KEY, JSON.stringify(cloudData.sports));
        }
        void queryClient.invalidateQueries({ queryKey: ['habits', userId] });
        void queryClient.invalidateQueries({ queryKey: ['activities', userId] });
        void queryClient.invalidateQueries({ queryKey: ['shows', userId] });
        void queryClient.invalidateQueries({ queryKey: ['sports', userId] });
      } catch (error) {
        console.warn('⚠️ Supabase cloud hydrate failed for habits store:', error);
      }
    };

    void hydrateFromCloud();
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    supabaseSync,
    queryClient,
    HABITS_STORAGE_KEY,
    ACTIVITIES_STORAGE_KEY,
    SHOWS_STORAGE_KEY,
    SPORTS_STORAGE_KEY,
  ]);

  // Listen for remote updates and patch local cache/storage.
  useEffect(() => {
    if (!userId || !supabaseSync.setupRealtimeSync) return;
    const unsubscribe = supabaseSync.setupRealtimeSync((cloudData) => {
      const localHabitsRt = queryClient.getQueryData<Habit[]>(['habits', userId]);
      const mergedHabits = resolveHabitsAfterCloudSync(cloudData.habits, localHabitsRt);
      if (mergedHabits !== null) {
        queryClient.setQueryData(['habits', userId], mergedHabits);
        void unifiedStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(mergedHabits));
      }
      if (Array.isArray(cloudData.activities)) {
        queryClient.setQueryData(['activities', userId], cloudData.activities);
        void unifiedStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(cloudData.activities));
      }
      if (Array.isArray(cloudData.shows)) {
        queryClient.setQueryData(['shows', userId], cloudData.shows);
        void unifiedStorage.setItem(SHOWS_STORAGE_KEY, JSON.stringify(cloudData.shows));
      }
      if (Array.isArray(cloudData.sports)) {
        queryClient.setQueryData(['sports', userId], cloudData.sports);
        void unifiedStorage.setItem(SPORTS_STORAGE_KEY, JSON.stringify(cloudData.sports));
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [
    userId,
    supabaseSync,
    queryClient,
    HABITS_STORAGE_KEY,
    ACTIVITIES_STORAGE_KEY,
    SHOWS_STORAGE_KEY,
    SPORTS_STORAGE_KEY,
  ]);

  // Save mutations
  const saveHabitsMutation = useMutation({
    mutationFn: async (habits: Habit[]) => {
      try {
        await unifiedStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
        
        if (userId && supabaseSync.saveToCloud) {
          try {
            await supabaseSync.saveToCloud({ habits });
            console.log('✅ Habits synced to Supabase');
          } catch (syncError) {
            console.warn('⚠️ Supabase sync failed for habits, data saved locally:', syncError);
          }
        }
        
        return habits;
      } catch (error) {
        console.error('Error saving habits:', error);
        throw error;
      }
    },
    onSuccess: (habits) => {
      queryClient.setQueryData(['habits', userId], habits);
    },
  });

  const saveActivitiesMutation = useMutation({
    mutationFn: async (activities: Activity[]) => {
      try {
        await unifiedStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
        
        if (userId && supabaseSync.saveToCloud) {
          try {
            await supabaseSync.saveToCloud({ activities });
            console.log('✅ Activities synced to Supabase');
          } catch (syncError) {
            console.warn('⚠️ Supabase sync failed for activities, data saved locally:', syncError);
          }
        }
        
        return activities;
      } catch (error) {
        console.error('❌ Error saving activities:', error);
        throw error;
      }
    },
    onSuccess: (activities) => {
      queryClient.setQueryData(['activities', userId], activities);
    },
  });

  const saveShowsMutation = useMutation({
    mutationFn: async (shows: Show[]) => {
      try {
        await unifiedStorage.setItem(SHOWS_STORAGE_KEY, JSON.stringify(shows));
        
        if (userId && supabaseSync.saveToCloud) {
          try {
            await supabaseSync.saveToCloud({ shows });
            console.log('✅ Shows synced to Supabase');
          } catch (syncError) {
            console.warn('⚠️ Supabase sync failed for shows, data saved locally:', syncError);
          }
        }
        
        return shows;
      } catch (error) {
        console.error('❌ Error saving shows:', error);
        throw error;
      }
    },
    onSuccess: (shows) => {
      queryClient.setQueryData(['shows', userId], shows);
    },
  });

  // Add a new habit
  const addHabit = (habitData: NewHabitFormData) => {
    const habits = habitsQuery.data || [];
    
    // Generate milestones if it's a progressive goal
    let milestones: Milestone[] = [];
    if (habitData.goalType === 'progressive' && habitData.mainGoal && habitData.goalDeadline) {
      const generatedMilestones = generateMilestones(habitData.mainGoal, habitData.goalDeadline);
      milestones = generatedMilestones.map((m, index) => ({
        ...m,
        id: `milestone-${Date.now()}-${index}`,
        completed: false,
        currentCompletions: 0,
      }));
    }
    
    const newHabit: Habit = {
      id: Date.now().toString(),
      ...habitData,
      completions: {},
      completionLogs: [],
      createdAt: new Date().toISOString(),
      milestones: milestones.length > 0 ? milestones : undefined,
      currentLevel: habitData.goalType === 'progressive' ? 1 : undefined,
      dailyTasks: habitData.goalType === 'progressive' ? {} : undefined,
    };
    
    // Generate initial daily tasks if progressive
    if (newHabit.goalType === 'progressive') {
      const today = getTodayFormatted();
      const tasks = generateDailyTasks(newHabit, today);
      if (tasks.length > 0) {
        newHabit.dailyTasks = { [today]: tasks };
      }
    }
    
    const updatedHabits = [...habits, newHabit];
    saveHabitsMutation.mutate(updatedHabits);
  };

  // Update an existing habit
  const updateHabit = (updatedHabit: Habit) => {
    const habits = habitsQuery.data || [];
    const updatedHabits = habits.map(habit => 
      habit.id === updatedHabit.id ? updatedHabit : habit
    );
    
    saveHabitsMutation.mutate(updatedHabits);
  };

  // Delete a habit
  const deleteHabit = (habitId: string) => {
    const habits = habitsQuery.data || [];
    const updatedHabits = habits.filter(habit => habit.id !== habitId);
    
    saveHabitsMutation.mutate(updatedHabits);
  };

  // Toggle completion status for today
  const toggleHabitCompletion = (habitId: string) => {
    const habits = habitsQuery.data || [];
    const today = getTodayFormatted();
    let completedHabitName: string | null = null;
    
    devLogSocial('🔄 Toggling habit completion', { habitId, today });
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId) {
        const updatedCompletions = { ...habit.completions };
        const wasCompleted = updatedCompletions[today];
        
        if (wasCompleted) {
          delete updatedCompletions[today];
          devLogSocial('❌ Removing habit completion', { habitId, today });
          const updatedLogs = (habit.completionLogs || []).filter(log => log.date !== today);
          return {
            ...habit,
            completions: updatedCompletions,
            completionLogs: updatedLogs,
          };
        } else {
          completedHabitName = habit.name;
          updatedCompletions[today] = true;
          devLogSocial('✅ Adding habit completion', { habitId, today });
          const quickLog: GoalCompletion = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: today,
            timestamp: new Date().toISOString(),
          };
          
          const comeback = detectComebackOpportunity(
            updatedCompletions,
            habit.frequency,
            habit.comebackBonus?.lastBonusDate
          );
          
          let updatedComebackBonus = habit.comebackBonus;
          if (comeback.isComeback) {
            const bonusXP = getComebackBonusXP(comeback.missedDays);
            console.log('🎉 Comeback bonus detected!', comeback.missedDays, 'missed days, bonus:', bonusXP, 'XP');
            updatedComebackBonus = {
              lastAbsenceEnd: today,
              bonusXpAwarded: (habit.comebackBonus?.bonusXpAwarded || 0) + bonusXP,
              comebackCount: (habit.comebackBonus?.comebackCount || 0) + 1,
              lastBonusDate: today,
            };
          }
          
          const partialCredit = calculatePartialCredit(
            updatedCompletions,
            habit.createdAt,
            habit.frequency
          );
          
          return {
            ...habit,
            completions: updatedCompletions,
            completionLogs: [...(habit.completionLogs || []), quickLog],
            comebackBonus: updatedComebackBonus,
            partialCredit: partialCredit,
          };
        }
      }
      return habit;
    });
    
    devLogSocial('💾 Saving updated habits to storage', { count: updatedHabits.length });
    saveHabitsMutation.mutate(updatedHabits);
    if (completedHabitName) {
      const completedHabit = habits.find((habit) => habit.id === habitId);
      void logHabitCompleted({
        habitId,
        habitName: completedHabitName,
        description: completedHabit?.description ?? null,
      });
    }
  };

  // Log detailed habit completion
  const logHabitCompletion = (habitId: string, completionData: GoalCompletionFormData) => {
    const habits = habitsQuery.data || [];
    const today = getTodayFormatted();
    const now = new Date().toISOString();
    
    devLogSocial('📝 Logging detailed habit completion', { habitId, today });
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId) {
        const newCompletion: GoalCompletion = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: today,
          timestamp: now,
          ...completionData,
        };
        
        const updatedCompletions = { ...habit.completions };
        updatedCompletions[today] = true;
        
        devLogSocial('✅ Marking habit as completed', { habitId, today });
        
        return {
          ...habit,
          completions: updatedCompletions,
          completionLogs: [...habit.completionLogs, newCompletion],
        };
      }
      return habit;
    });
    
    saveHabitsMutation.mutate(updatedHabits);
    devLogSocial('✅ Habit completion logged successfully', { habitId });
  };

  // Get completion logs for a specific habit
  const getHabitCompletionLogs = (habitId: string): GoalCompletion[] => {
    const habits = habitsQuery.data || [];
    const habit = habits.find(h => h.id === habitId);
    return habit?.completionLogs || [];
  };

  // Get habit statistics
  const getHabitStats = (habitId: string) => {
    const logs = getHabitCompletionLogs(habitId);
    const totalCompletions = logs.length;
    
    if (totalCompletions === 0) {
      return {
        totalCompletions: 0,
        averageMood: 0,
        averageEffort: 0,
        longestStreak: 0,
        completionsThisWeek: 0,
        completionsThisMonth: 0,
        mostProductiveTime: undefined,
      };
    }
    
    const moodValues = { excellent: 4, good: 3, okay: 2, difficult: 1 };
    const moods = logs.filter(l => l.mood).map(l => moodValues[l.mood!]);
    const efforts = logs.filter(l => l.effort).map(l => l.effort!);
    
    const averageMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    const averageEffort = efforts.length > 0 ? efforts.reduce((a, b) => a + b, 0) / efforts.length : 0;
    
    // Calculate completions this week/month
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const completionsThisWeek = logs.filter(l => new Date(l.timestamp) >= weekAgo).length;
    const completionsThisMonth = logs.filter(l => new Date(l.timestamp) >= monthAgo).length;
    
    // Find most productive time (hour of day)
    const hours = logs.map(l => new Date(l.timestamp).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const mostProductiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const mostProductiveTime = mostProductiveHour 
      ? `${mostProductiveHour.padStart(2, '0')}:00` 
      : undefined;
    
    return {
      totalCompletions,
      averageMood,
      averageEffort,
      longestStreak: (() => {
        const h = habitsQuery.data?.find(hb => hb.id === habitId);
        if (!h) return 0;
        return calculateStreak(h.completions || {}, {
          frozenDates: h.streakFreeze?.frozenDates,
          recoveredDates: h.gracePeriod?.recoveredDates,
          frequency: h.frequency,
        });
      })(),
      completionsThisWeek,
      completionsThisMonth,
      mostProductiveTime,
    };
  };

  // Get habits with additional stats
  const getHabitsWithStats = (): HabitWithStats[] => {
    const habits = habitsQuery.data || [];
    const today = getTodayFormatted();
    
    return habits.map(habit => {
      const streak = calculateStreak(habit.completions, {
        frozenDates: habit.streakFreeze?.frozenDates,
        recoveredDates: habit.gracePeriod?.recoveredDates,
        frequency: habit.frequency,
      });
      const completedToday = !!habit.completions[today];
      const totalCompletions = Object.values(habit.completions).filter(Boolean).length;
      
      return {
        ...habit,
        streak,
        completedToday,
        totalCompletions,
      };
    });
  };

  // Get habits that should be done today
  const getTodayHabits = (): HabitWithStats[] => {
    const habitsWithStats = getHabitsWithStats();
    return habitsWithStats.filter(habit => shouldDoHabitToday(habit.frequency));
  };

  // Activity CRUD operations
  const addActivity = (activityData: NewActivityFormData) => {
    const activities = activitiesQuery.data || [];
    const newActivity: Activity = {
      id: Date.now().toString(),
      ...activityData,
      status: 'Not Started',
      timeSpent: 0,
      sessions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedActivities = [...activities, newActivity];
    saveActivitiesMutation.mutate(updatedActivities);
  };

  const updateActivity = (updatedActivity: Activity) => {
    const activities = activitiesQuery.data || [];
    const updatedActivities = activities.map(activity => 
      activity.id === updatedActivity.id ? { ...updatedActivity, updatedAt: new Date().toISOString() } : activity
    );
    
    saveActivitiesMutation.mutate(updatedActivities);
  };

  const addActivitySession = (activityId: string, session: Omit<ActivitySession, 'id'>) => {
    const activities = activitiesQuery.data || [];
    const updatedActivities = activities.map(activity => {
      if (activity.id === activityId) {
        const newSession: ActivitySession = {
          id: Date.now().toString(),
          ...session,
        };
        return {
          ...activity,
          sessions: [...activity.sessions, newSession],
          timeSpent: activity.timeSpent + session.duration,
          updatedAt: new Date().toISOString(),
        };
      }
      return activity;
    });
    
    saveActivitiesMutation.mutate(updatedActivities);
  };

  // Show CRUD operations
  const addShow = (showData: NewShowFormData) => {
    const shows = showsQuery.data || [];
    
    // Check for duplicates based on tmdbId and mediaType
    const isDuplicate = shows.some(show => 
      show.tmdbId === showData.tmdbId && 
      show.mediaType === showData.mediaType
    );
    
    if (isDuplicate) {
      console.log('Show already exists in watchlist:', showData.title);
      return;
    }
    
    const newShow: Show = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      ...showData,
      status: showData.status || 'Plan to Watch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedShows = [...shows, newShow];
    saveShowsMutation.mutate(updatedShows);
    void logShowSaved(newShow.id, showData.title, showData.tmdbId, showData.mediaType);
  };

  const updateShow = (updatedShow: Show) => {
    const shows = showsQuery.data || [];
    const updatedShows = shows.map(show => 
      show.id === updatedShow.id ? { ...updatedShow, updatedAt: new Date().toISOString() } : show
    );
    
    saveShowsMutation.mutate(updatedShows);
  };

  const markEpisodeWatched = (showId: string) => {
    const shows = showsQuery.data || [];
    const updatedShows = shows.map(show => {
      if (show.id === showId && show.type === 'Series') {
        const newEpisode = (show.currentEpisode || 0) + 1;
        return {
          ...show,
          currentSeason: show.currentSeason || 1,
          currentEpisode: newEpisode,
          status: 'Watching' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return show;
    });
    
    saveShowsMutation.mutate(updatedShows);
  };

  const deleteShow = (showId: string) => {
    const shows = showsQuery.data || [];
    console.log('Deleting show with ID:', showId);
    console.log('Current shows:', shows.map(s => ({ id: s.id, title: s.title })));
    
    const updatedShows = shows.filter(show => show.id !== showId);
    console.log('Shows after deletion:', updatedShows.map(s => ({ id: s.id, title: s.title })));
    
    saveShowsMutation.mutate(updatedShows);
  };

  // Toggle daily task completion
  const toggleDailyTask = (habitId: string, taskId: string) => {
    const habits = habitsQuery.data || [];
    const today = getTodayFormatted();
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId && habit.dailyTasks) {
        const todayTasks = habit.dailyTasks[today] || [];
        const updatedTasks = todayTasks.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? new Date().toISOString() : undefined,
            };
          }
          return task;
        });
        
        // Update milestones if task is being completed
        let updatedMilestones = habit.milestones;
        const completingTask = updatedTasks.find(t => t.id === taskId);
        if (completingTask?.completed && updatedMilestones) {
          const nextMilestone = updatedMilestones.find(m => !m.completed);
          if (nextMilestone) {
            updatedMilestones = updatedMilestones.map(m => {
              if (m.id === nextMilestone.id) {
                const newCompletions = m.currentCompletions + 1;
                return {
                  ...m,
                  currentCompletions: newCompletions,
                  completed: newCompletions >= m.requiredCompletions,
                  completedAt: newCompletions >= m.requiredCompletions ? new Date().toISOString() : undefined,
                };
              }
              return m;
            });
          }
        }
        
        // Check if should level up
        let updatedLevel = habit.currentLevel;
        if (shouldLevelUp({ ...habit, dailyTasks: { ...habit.dailyTasks, [today]: updatedTasks } })) {
          updatedLevel = (habit.currentLevel || 1) + 1;
        }
        
        // Mark habit as completed if all tasks are done
        const allTasksCompleted = updatedTasks.every(t => t.completed);
        const updatedCompletions = { ...habit.completions };
        if (allTasksCompleted && updatedTasks.length > 0) {
          updatedCompletions[today] = true;
        } else {
          delete updatedCompletions[today];
        }
        
        return {
          ...habit,
          dailyTasks: {
            ...habit.dailyTasks,
            [today]: updatedTasks,
          },
          milestones: updatedMilestones,
          currentLevel: updatedLevel,
          completions: updatedCompletions,
        };
      }
      return habit;
    });
    
    saveHabitsMutation.mutate(updatedHabits);
  };
  
  // Generate today's tasks for a progressive habit
  const generateTodayTasks = (habitId: string) => {
    const habits = habitsQuery.data || [];
    const today = getTodayFormatted();
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId && habit.goalType === 'progressive') {
        // Calculate performance history
        const recentDates = Object.keys(habit.dailyTasks || {}).slice(-7);
        let performanceHistory = undefined;
        
        if (recentDates.length > 0) {
          const completionRates = recentDates.map(date => {
            const tasks = habit.dailyTasks![date];
            const completed = tasks.filter(t => t.completed).length;
            return completed / tasks.length;
          });
          
          const avgCompletionRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
          
          // Get average effort from completion logs
          const recentLogs = habit.completionLogs.slice(-7);
          const avgEffort = recentLogs.length > 0
            ? recentLogs.reduce((sum, log) => sum + (log.effort || 3), 0) / recentLogs.length
            : 3;
          
          performanceHistory = {
            completionRate: avgCompletionRate,
            averageEffort: avgEffort,
          };
        }
        
        const tasks = generateDailyTasks(habit, today, performanceHistory);
        
        return {
          ...habit,
          dailyTasks: {
            ...habit.dailyTasks,
            [today]: tasks,
          },
        };
      }
      return habit;
    });
    
    saveHabitsMutation.mutate(updatedHabits);
  };
  
  // Update milestone
  const updateMilestone = (habitId: string, milestoneId: string, updates: Partial<Milestone>) => {
    const habits = habitsQuery.data || [];
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId && habit.milestones) {
        const updatedMilestones = habit.milestones.map(m => {
          if (m.id === milestoneId) {
            return { ...m, ...updates };
          }
          return m;
        });
        
        return {
          ...habit,
          milestones: updatedMilestones,
        };
      }
      return habit;
    });
    
    saveHabitsMutation.mutate(updatedHabits);
  };

  const getWeekStart = (): string => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    return formatDate(startOfWeek);
  };

  const getStreakFreezeInfo = (habitId: string) => {
    const habits = habitsQuery.data || [];
    const habit = habits.find(h => h.id === habitId);
    const weekStart = getWeekStart();
    
    if (!habit?.streakFreeze) {
      return { availableFreezes: 2, frozenDates: [] as string[], freezesUsedThisWeek: 0, canFreeze: true };
    }
    
    const freeze = habit.streakFreeze;
    const needsRefill = freeze.lastFreezeRefill < weekStart;
    const availableFreezes = needsRefill ? 2 : freeze.availableFreezes;
    const freezesUsedThisWeek = needsRefill ? 0 : freeze.freezesUsedThisWeek;
    
    return {
      availableFreezes,
      frozenDates: freeze.frozenDates,
      freezesUsedThisWeek,
      canFreeze: availableFreezes > 0,
    };
  };

  const useStreakFreeze = (habitId: string): boolean => {
    const habits = habitsQuery.data || [];
    const today = getTodayFormatted();
    const weekStart = getWeekStart();
    
    const updatedHabits = habits.map(habit => {
      if (habit.id !== habitId) return habit;
      
      if (habit.completions[today]) {
        console.log('Cannot freeze: habit already completed today');
        return habit;
      }
      
      const currentFreeze: StreakFreeze = habit.streakFreeze || {
        availableFreezes: 2,
        frozenDates: [],
        lastFreezeRefill: weekStart,
        freezesUsedThisWeek: 0,
      };
      
      const needsRefill = currentFreeze.lastFreezeRefill < weekStart;
      let available = needsRefill ? 2 : currentFreeze.availableFreezes;
      let usedThisWeek = needsRefill ? 0 : currentFreeze.freezesUsedThisWeek;
      
      if (available <= 0) {
        console.log('Cannot freeze: no freezes available');
        return habit;
      }
      
      if (currentFreeze.frozenDates.includes(today)) {
        console.log('Cannot freeze: today already frozen');
        return habit;
      }
      
      return {
        ...habit,
        streakFreeze: {
          availableFreezes: available - 1,
          frozenDates: [...currentFreeze.frozenDates, today],
          lastFreezeRefill: needsRefill ? weekStart : currentFreeze.lastFreezeRefill,
          freezesUsedThisWeek: usedThisWeek + 1,
        },
      };
    });
    
    const habitBefore = habits.find(h => h.id === habitId);
    const habitAfter = updatedHabits.find(h => h.id === habitId);
    const didFreeze = habitBefore !== habitAfter;
    
    if (didFreeze) {
      saveHabitsMutation.mutate(updatedHabits);
      console.log('Streak freeze used for habit:', habitId);
    }
    
    return didFreeze;
  };

  // Dashboard summary
  const getDashboardSummary = (): DashboardSummary => {
    const todayHabits = getTodayHabits();
    const activities = activitiesQuery.data || [];
    const shows = showsQuery.data || [];
    const sports = sportsQuery.data || [];
    
    const completedHabits = todayHabits.filter(h => h.completedToday).length;
    const currentStreak = Math.max(...todayHabits.map(h => h.streak), 0);
    
    const inProgressActivities = activities.filter(a => a.status === 'In Progress').length;
    const todayTimeSpent = activities.reduce((total, activity) => {
      const todaySessions = activity.sessions.filter(s => s.date === getTodayFormatted());
      return total + todaySessions.reduce((sum, session) => sum + session.duration, 0);
    }, 0);
    
    const watchingShows = shows.filter(s => s.status === 'Watching').length;
    const nextToWatch = shows.find(s => s.status === 'Watching');
    
    const todayMatches = sports.filter(m => m.date === getTodayFormatted());
    const upcomingMatches = sports.filter(m => m.status === 'Upcoming').slice(0, 3);
    
    return {
      habits: {
        completed: completedHabits,
        total: todayHabits.length,
        currentStreak,
      },
      activities: {
        inProgress: inProgressActivities,
        totalTimeToday: todayTimeSpent,
        recentActivity: activities.find(a => a.status === 'In Progress'),
      },
      shows: {
        watching: watchingShows,
        nextToWatch,
      },
      sports: {
        upcomingMatches,
        todayMatches,
      },
      calendar: {
        upcomingEvents: [],
        todayEvents: [],
      },
      personalization: {
        insights: [],
        recommendations: [],
        suggestedStacks: [],
        upcomingNotifications: []
      }
    };
  };

  const mergeFromCloud = React.useCallback(
    async (payload: CloudPullPayload): Promise<Partial<CloudMergeStats>> => {
      if (!userId) return {};
      const stats: Partial<CloudMergeStats> = {};

      const readLocalHabits = async (): Promise<Habit[]> => {
        let local = queryClient.getQueryData<Habit[]>(['habits', userId]) ?? [];
        if (!local.length) {
          const raw = await unifiedStorage.getItem(HABITS_STORAGE_KEY);
          if (raw) {
            try {
              local = JSON.parse(raw) as Habit[];
            } catch {
              local = [];
            }
          }
        }
        return local;
      };

      if (payload.habits !== undefined) {
        const localHabits = await readLocalHabits();
        const mergedHabits = resolveHabitsAfterCloudSync(payload.habits, localHabits);
        if (mergedHabits !== null) {
          queryClient.setQueryData(['habits', userId], mergedHabits);
          await unifiedStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(mergedHabits));
          stats.habitsMerged = true;
        }
      }

      const mergeList = async <T extends { id?: string; updatedAt?: string; createdAt?: string }>(
        key: 'activities' | 'shows' | 'sports',
        storageKey: string,
        queryKey: string
      ) => {
        if (payload[key] === undefined) return;
        const local = queryClient.getQueryData<T[]>([queryKey, userId]) ?? [];
        const merged = resolveGenericRecordsAfterCloudSync(payload[key], local);
        if (merged === null) return;
        queryClient.setQueryData([queryKey, userId], merged);
        await unifiedStorage.setItem(storageKey, JSON.stringify(merged));
        if (key === 'activities') stats.activitiesMerged = true;
        if (key === 'shows') stats.showsMerged = true;
        if (key === 'sports') stats.sportsMerged = true;
      };

      await mergeList<Activity>('activities', ACTIVITIES_STORAGE_KEY, 'activities');
      await mergeList<Show>('shows', SHOWS_STORAGE_KEY, 'shows');
      await mergeList<SportMatch>('sports', SPORTS_STORAGE_KEY, 'sports');

      void queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      void queryClient.invalidateQueries({ queryKey: ['activities', userId] });
      void queryClient.invalidateQueries({ queryKey: ['shows', userId] });
      void queryClient.invalidateQueries({ queryKey: ['sports', userId] });

      return stats;
    },
    [
      userId,
      queryClient,
      HABITS_STORAGE_KEY,
      ACTIVITIES_STORAGE_KEY,
      SHOWS_STORAGE_KEY,
      SPORTS_STORAGE_KEY,
    ]
  );

  return {
    // Habits
    habits: habitsQuery.data || [],
    habitsWithStats: getHabitsWithStats(),
    todayHabits: getTodayHabits(),
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitCompletion,
    logHabitCompletion,
    getHabitCompletionLogs,
    getHabitStats,
    toggleDailyTask,
    generateTodayTasks,
    updateMilestone,
    useStreakFreeze,
    getStreakFreezeInfo,
    checkComebackBonus: React.useCallback((habitId: string) => {
      const habits = habitsQuery.data || [];
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return { isComeback: false, missedDays: 0, bonusXP: 0 };
      const result = detectComebackOpportunity(
        habit.completions,
        habit.frequency,
        habit.comebackBonus?.lastBonusDate
      );
      return { ...result, bonusXP: getComebackBonusXP(result.missedDays) };
    }, [habitsQuery.data]),
    getPartialCreditStats: React.useCallback((habitId: string) => {
      const habits = habitsQuery.data || [];
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return { monthlyRates: {}, weeklyRates: {}, allTimeRate: 0, totalScheduledDays: 0, totalCompletedDays: 0 };
      if (habit.partialCredit) return habit.partialCredit;
      return calculatePartialCredit(habit.completions, habit.createdAt, habit.frequency);
    }, [habitsQuery.data]),
    
    // Activities
    activities: activitiesQuery.data || [],
    addActivity,
    updateActivity,
    addActivitySession,
    
    // Shows
    shows: showsQuery.data || [],
    addShow,
    updateShow,
    markEpisodeWatched,
    deleteShow,
    
    // Sports
    sports: sportsQuery.data || [],
    
    // Dashboard
    dashboardSummary: getDashboardSummary(),
    
    // Loading states
    isLoading: habitsQuery.isLoading || activitiesQuery.isLoading || showsQuery.isLoading || sportsQuery.isLoading,

    mergeFromCloud,
  };
});

// Wrapper to ensure context is always available
export const useAppSafe = () => {
  const context = useApp();
  if (!context) {
    console.warn('useApp called outside of AppProvider, returning default context');
    return defaultAppContext;
  }
  return context;
};

// Legacy exports for backward compatibility
export const HabitsProvider = AppProvider;
export const useHabits = useAppSafe;

// Custom hook to get a single habit by ID
export const useHabit = (habitId: string) => {
  const context = useApp();
  if (!context) {
    console.warn('useHabit called outside of AppProvider');
    return undefined;
  }
  const { habitsWithStats } = context;
  return habitsWithStats?.find(habit => habit.id === habitId);
};