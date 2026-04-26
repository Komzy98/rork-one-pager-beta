import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { unifiedStorage } from '@/utils/unifiedStorage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Task, 
  TaskProject, 
  TaskFilter, 
  TaskStats, 
  TaskTimeEntry,
  TaskStatus,
  SubTask,
  TaskCompletion,
  TaskCompletionFormData
} from '@/types/task';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSync } from '@/utils/supabaseUserSync';

const formatDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isScheduledDayForTask = (
  date: Date,
  frequency?: { type?: string; days: number[]; timesPerWeek?: number }
): boolean => {
  if (!frequency) return true;
  if (frequency.type === 'times_per_week') return true;
  return frequency.days.includes(date.getDay());
};

const getWeekStartForTask = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekCompletionCountForTask = (
  completions: Record<string, boolean>,
  weekStart: Date
): number => {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    if (completions[formatDateStr(d)]) count++;
  }
  return count;
};

const calculateHabitStreak = (
  completions: Record<string, boolean>,
  task?: Pick<Task, 'habitFrequency' | 'streakFreeze' | 'gracePeriod'>
): number => {
  const frozenDates = new Set(task?.streakFreeze?.frozenDates || []);
  const recoveredDates = new Set(task?.gracePeriod?.recoveredDates || []);
  const frequency = task?.habitFrequency;

  if (frequency?.type === 'times_per_week' && frequency.timesPerWeek) {
    const today = new Date();
    const currentWeekStart = getWeekStartForTask(today);
    let weekStart = new Date(currentWeekStart);
    let streak = 0;

    const currentWeekCount = getWeekCompletionCountForTask(completions, weekStart);
    if (currentWeekCount >= frequency.timesPerWeek) {
      streak++;
    }

    weekStart.setDate(weekStart.getDate() - 7);
    let maxWeeks = 52;

    while (maxWeeks > 0) {
      const weekCount = getWeekCompletionCountForTask(completions, weekStart);
      let frozenThisWeek = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        if (frozenDates.has(formatDateStr(d))) frozenThisWeek++;
      }

      if (weekCount >= frequency.timesPerWeek || frozenThisWeek > 0) {
        streak++;
      } else {
        break;
      }

      weekStart.setDate(weekStart.getDate() - 7);
      maxWeeks--;
    }

    return streak;
  }

  const today = new Date();
  let currentDate = new Date(today);
  let streak = 0;

  const todayFormatted = formatDateStr(today);
  const isTodayCompleted = completions[todayFormatted];
  const isTodayFrozen = frozenDates.has(todayFormatted);
  const isTodayRecovered = recoveredDates.has(todayFormatted);

  if (!isTodayCompleted && !isTodayFrozen && !isTodayRecovered) {
    if (frequency && !isScheduledDayForTask(today, frequency)) {
      // not a scheduled day, skip
    } else {
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }

  let maxIterations = 365;
  let iterations = 0;

  while (iterations < maxIterations) {
    const dateStr = formatDateStr(currentDate);
    const checkDate = new Date(currentDate);

    if (frequency && !isScheduledDayForTask(checkDate, frequency)) {
      currentDate.setDate(currentDate.getDate() - 1);
      iterations++;
      continue;
    }

    if (completions[dateStr] || frozenDates.has(dateStr) || recoveredDates.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }

    iterations++;
  }

  return streak;
};

// Helper function to get user-specific storage keys
const getUserStorageKey = (baseKey: string, userId?: string) => {
  const userIdentifier = userId || 'default';
  return `${baseKey}_${userIdentifier}`;
};

const resetRecurringTasks = (tasks: Task[]): { tasks: Task[]; changed: boolean } => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  let changed = false;
  const updated = tasks.map(task => {
    if (
      task.isRecurring &&
      task.recurringPattern &&
      task.status === 'completed' &&
      task.completedAt
    ) {
      const completedDate = new Date(task.completedAt);
      const completedDayStart = new Date(completedDate);
      completedDayStart.setHours(0, 0, 0, 0);

      if (completedDayStart.getTime() < todayStart.getTime()) {
        const shouldResetToday = isRecurringDueToday(task.recurringPattern, now);
        if (shouldResetToday) {
          console.log(`🔄 [Tasks] Resetting recurring task "${task.title}" for today`);
          changed = true;
          return {
            ...task,
            status: 'todo' as TaskStatus,
            completedAt: undefined,
            updatedAt: now.toISOString(),
          };
        }
      }
    }
    return task;
  });

  return { tasks: updated, changed };
};

const isRecurringDueToday = (
  pattern: NonNullable<Task['recurringPattern']>,
  date: Date
): boolean => {
  const dayOfWeek = date.getDay();

  switch (pattern.type) {
    case 'daily':
      return true;
    case 'weekly':
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        return pattern.daysOfWeek.includes(dayOfWeek);
      }
      return true;
    case 'monthly': {
      return true;
    }
    case 'yearly': {
      return true;
    }
    default:
      return true;
  }
};

// Initial data for first-time users - empty so users start fresh
const initialTasks: Task[] = [];

// Migration function to move data from old keys to user-specific keys
const migrateTaskDataToUserKeys = async (userId: string) => {
  try {
    const migrationKey = `task_migration_completed_${userId}`;
    const migrationCompleted = await unifiedStorage.getItem(migrationKey);
    
    if (migrationCompleted === 'true') {
      return;
    }
    
    console.log('Starting task data migration for user:', userId);
    
    // Migrate tasks
    const oldTasks = await unifiedStorage.getItem('tasks');
    if (oldTasks) {
      const newKey = getUserStorageKey('tasks', userId);
      const existingUserTasks = await unifiedStorage.getItem(newKey);
      
      if (!existingUserTasks) {
        await unifiedStorage.setItem(newKey, oldTasks);
        console.log('Migrated tasks to user-specific key');
      }
    }
    
    // Migrate projects
    const oldProjects = await unifiedStorage.getItem('task_projects');
    if (oldProjects) {
      const newKey = getUserStorageKey('task_projects', userId);
      const existingUserProjects = await unifiedStorage.getItem(newKey);
      
      if (!existingUserProjects) {
        await unifiedStorage.setItem(newKey, oldProjects);
        console.log('Migrated projects to user-specific key');
      }
    }
    
    // Migrate time entries
    const oldTimeEntries = await unifiedStorage.getItem('task_time_entries');
    if (oldTimeEntries) {
      const newKey = getUserStorageKey('task_time_entries', userId);
      const existingUserTimeEntries = await unifiedStorage.getItem(newKey);
      
      if (!existingUserTimeEntries) {
        await unifiedStorage.setItem(newKey, oldTimeEntries);
        console.log('Migrated time entries to user-specific key');
      }
    }
    
    await unifiedStorage.setItem(migrationKey, 'true');
    console.log('Task data migration completed for user:', userId);
  } catch (error) {
    console.error('Error during task data migration:', error);
  }
};

export const [TaskProvider, useTasks] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const supabaseSync = useSupabaseSync(userId);
  const [filter, setFilter] = useState<TaskFilter>({});
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: string } | null>(null);
  
  // Get user-specific storage keys - use stable values
  const TASKS_STORAGE_KEY = React.useMemo(() => getUserStorageKey('tasks', userId), [userId]);
  const PROJECTS_STORAGE_KEY = React.useMemo(() => getUserStorageKey('task_projects', userId), [userId]);
  const TIME_ENTRIES_STORAGE_KEY = React.useMemo(() => getUserStorageKey('task_time_entries', userId), [userId]);
  
  // Run migration when user logs in
  useEffect(() => {
    if (userId) {
      migrateTaskDataToUserKeys(userId);
    }
  }, [userId]);

  // Tasks Query
  const tasksQuery = useQuery({
    queryKey: ['tasks', userId],
    queryFn: async (): Promise<Task[]> => {
      try {
        const stored = await unifiedStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (parseError) {
            console.error('Error parsing tasks JSON, resetting to initial data:', parseError);
            await unifiedStorage.removeItem(TASKS_STORAGE_KEY);
            await unifiedStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(initialTasks));
            return initialTasks;
          }
        }
        await unifiedStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(initialTasks));
        return initialTasks;
      } catch (error) {
        console.error('Error loading tasks:', error);
        return initialTasks;
      }
    },
  });

  // Projects Query
  const projectsQuery = useQuery({
    queryKey: ['task-projects', userId],
    queryFn: async (): Promise<TaskProject[]> => {
      try {
        const stored = await unifiedStorage.getItem(PROJECTS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error loading projects:', error);
        return [];
      }
    },
  });

  // Time Entries Query
  const timeEntriesQuery = useQuery({
    queryKey: ['task-time-entries', userId],
    queryFn: async (): Promise<TaskTimeEntry[]> => {
      try {
        const stored = await unifiedStorage.getItem(TIME_ENTRIES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error loading time entries:', error);
        return [];
      }
    },
  });

  // Hydrate tasks/projects/time entries from Supabase when authenticated.
  useEffect(() => {
    if (!userId || !supabaseSync.loadFromCloud) return;
    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        const cloudData = await supabaseSync.loadFromCloud();
        if (!cloudData || cancelled) return;

        if (Array.isArray(cloudData.tasks)) {
          queryClient.setQueryData(['tasks', userId], cloudData.tasks);
          await unifiedStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cloudData.tasks));
        }
        if (Array.isArray(cloudData.taskProjects)) {
          queryClient.setQueryData(['task-projects', userId], cloudData.taskProjects);
          await unifiedStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(cloudData.taskProjects));
        }
        if (Array.isArray(cloudData.taskTimeEntries)) {
          queryClient.setQueryData(['task-time-entries', userId], cloudData.taskTimeEntries);
          await unifiedStorage.setItem(TIME_ENTRIES_STORAGE_KEY, JSON.stringify(cloudData.taskTimeEntries));
        }
      } catch (error) {
        console.warn('⚠️ Supabase cloud hydrate failed for tasks store:', error);
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
    TASKS_STORAGE_KEY,
    PROJECTS_STORAGE_KEY,
    TIME_ENTRIES_STORAGE_KEY,
  ]);

  // Listen for remote task updates.
  useEffect(() => {
    if (!userId || !supabaseSync.setupRealtimeSync) return;
    const unsubscribe = supabaseSync.setupRealtimeSync((cloudData) => {
      if (Array.isArray(cloudData.tasks)) {
        queryClient.setQueryData(['tasks', userId], cloudData.tasks);
        void unifiedStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cloudData.tasks));
      }
      if (Array.isArray(cloudData.taskProjects)) {
        queryClient.setQueryData(['task-projects', userId], cloudData.taskProjects);
        void unifiedStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(cloudData.taskProjects));
      }
      if (Array.isArray(cloudData.taskTimeEntries)) {
        queryClient.setQueryData(['task-time-entries', userId], cloudData.taskTimeEntries);
        void unifiedStorage.setItem(TIME_ENTRIES_STORAGE_KEY, JSON.stringify(cloudData.taskTimeEntries));
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [
    userId,
    supabaseSync,
    queryClient,
    TASKS_STORAGE_KEY,
    PROJECTS_STORAGE_KEY,
    TIME_ENTRIES_STORAGE_KEY,
  ]);

  // Save Tasks Mutation
  const saveTasksMutation = useMutation({
    mutationFn: async (tasks: Task[]) => {
      try {
        await unifiedStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        
        if (userId && supabaseSync.saveToCloud) {
          try {
            await supabaseSync.saveToCloud({ tasks });
            console.log('✅ Tasks synced to Supabase');
          } catch (syncError) {
            console.warn('⚠️ Supabase sync failed for tasks, data saved locally:', syncError);
          }
        }
        
        return tasks;
      } catch (error) {
        console.error('❌ Error saving tasks:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    },
  });

  // Save Projects Mutation
  const saveProjectsMutation = useMutation({
    mutationFn: async (projects: TaskProject[]) => {
      try {
        await unifiedStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        
        if (userId && supabaseSync.saveToCloud) {
          try {
            await supabaseSync.saveToCloud({ taskProjects: projects });
            console.log('✅ Task projects synced to Supabase');
          } catch (syncError) {
            console.warn('⚠️ Supabase sync failed for task projects, data saved locally:', syncError);
          }
        }
        
        return projects;
      } catch (error) {
        console.error('❌ Error saving task projects:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-projects', userId] });
    },
  });

  // Save Time Entries Mutation
  const saveTimeEntriesMutation = useMutation({
    mutationFn: async (entries: TaskTimeEntry[]) => {
      try {
        await unifiedStorage.setItem(TIME_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
        
        if (userId && supabaseSync.saveToCloud) {
          try {
            await supabaseSync.saveToCloud({ taskTimeEntries: entries });
            console.log('✅ Task time entries synced to Supabase');
          } catch (syncError) {
            console.warn('⚠️ Supabase sync failed for task time entries, data saved locally:', syncError);
          }
        }
        
        return entries;
      } catch (error) {
        console.error('❌ Error saving task time entries:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', userId] });
    },
  });

  const tasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];
  const timeEntries = timeEntriesQuery.data || [];
  
  // Reset recurring tasks and recalculate streaks on load
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    let workingTasks = [...tasks];
    let needsSave = false;

    // Reset recurring tasks that were completed on a previous day
    const recurringResult = resetRecurringTasks(workingTasks);
    if (recurringResult.changed) {
      workingTasks = recurringResult.tasks;
      needsSave = true;
      console.log('🔄 [Tasks] Recurring tasks reset for today');
    }

    // Recalculate streaks for habit tasks
    const habitsNeedingStreakUpdate = workingTasks.filter(task => 
      task.isHabit && task.habitCompletions && Object.keys(task.habitCompletions).length > 0
    );
    
    if (habitsNeedingStreakUpdate.length > 0) {
      console.log('🔄 [Tasks] Checking streaks for', habitsNeedingStreakUpdate.length, 'habits');
      
      workingTasks = workingTasks.map(task => {
        if (task.isHabit && task.habitCompletions) {
          const newStreak = calculateHabitStreak(task.habitCompletions, task);
          if (task.habitStreak !== newStreak) {
            console.log(`📊 [Tasks] Updating streak for "${task.title}" from ${task.habitStreak || 0} to ${newStreak}`);
            needsSave = true;
            return { ...task, habitStreak: newStreak };
          }
        }
        return task;
      });
    }

    if (needsSave) {
      console.log('💾 [Tasks] Saving updated tasks to storage');
      saveTasksMutate(workingTasks);
    }
  }, [tasks.length, formatDateStr(new Date())]); // Run when tasks change or day changes

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (filter.status?.length) {
      filtered = filtered.filter(task => filter.status!.includes(task.status));
    }

    if (filter.priority?.length) {
      filtered = filtered.filter(task => filter.priority!.includes(task.priority));
    }

    if (filter.category?.length) {
      filtered = filtered.filter(task => filter.category!.includes(task.category));
    }

    if (filter.tags?.length) {
      filtered = filtered.filter(task => 
        filter.tags!.some(tag => task.tags.includes(tag))
      );
    }

    if (filter.projectId) {
      filtered = filtered.filter(task => task.projectId === filter.projectId);
    }

    if (filter.dueDateRange) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = task.dueDate;
        const { start, end } = filter.dueDateRange!;
        
        if (start && dueDate < start) return false;
        if (end && dueDate > end) return false;
        
        return true;
      });
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return filtered.sort((a, b) => {
      // Sort by priority first, then by due date
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, filter]);

  // Task Statistics
  const taskStats = useMemo((): TaskStats => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.actualDuration);
    const averageCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length
      : 0;
    
    // Simple productivity score based on completion rate and overdue tasks
    const productivityScore = Math.max(0, completionRate - (overdue * 5));
    
    // Calculate additional stats from completion logs
    const allCompletionLogs = tasks.flatMap(t => t.completionLogs);
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const completionsThisWeek = allCompletionLogs.filter(log => 
      new Date(log.completedAt) >= weekAgo
    ).length;
    
    const completionsThisMonth = allCompletionLogs.filter(log => 
      new Date(log.completedAt) >= monthAgo
    ).length;
    
    // Calculate average mood and effort
    const moodValues = { excellent: 4, good: 3, okay: 2, difficult: 1 };
    const moods = allCompletionLogs.filter(l => l.mood).map(l => moodValues[l.mood!]);
    const efforts = allCompletionLogs.filter(l => l.effort).map(l => l.effort!);
    
    const averageMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    const averageEffort = efforts.length > 0 ? efforts.reduce((a, b) => a + b, 0) / efforts.length : 0;
    
    // Find most productive time
    const hours = allCompletionLogs.map(l => new Date(l.completedAt).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const mostProductiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const mostProductiveTime = mostProductiveHour 
      ? `${mostProductiveHour.padStart(2, '0')}:00` 
      : undefined;
    
    const completionDayKeys = new Set<string>();
    for (const log of allCompletionLogs) {
      if (!log.completedAt) continue;
      completionDayKeys.add(formatDateStr(new Date(log.completedAt)));
    }

    const countConsecutiveDaysBackward = (start: Date): number => {
      let n = 0;
      const d = new Date(start);
      d.setHours(0, 0, 0, 0);
      while (completionDayKeys.has(formatDateStr(d))) {
        n++;
        d.setDate(d.getDate() - 1);
      }
      return n;
    };

    let currentStreak = 0;
    if (completionDayKeys.size > 0) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayKey = formatDateStr(todayStart);
      if (completionDayKeys.has(todayKey)) {
        currentStreak = countConsecutiveDaysBackward(todayStart);
      } else {
        const y = new Date(todayStart);
        y.setDate(y.getDate() - 1);
        if (completionDayKeys.has(formatDateStr(y))) {
          currentStreak = countConsecutiveDaysBackward(y);
        }
      }
    }

    let longestStreak = 0;
    if (completionDayKeys.size > 0) {
      const sorted = Array.from(completionDayKeys).sort();
      let run = 1;
      longestStreak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1] + "T12:00:00");
        const cur = new Date(sorted[i] + "T12:00:00");
        const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) {
          run++;
          longestStreak = Math.max(longestStreak, run);
        } else {
          run = 1;
        }
      }
    }
    
    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate,
      averageCompletionTime,
      productivityScore,
      completionsThisWeek,
      completionsThisMonth,
      averageMood,
      averageEffort,
      mostProductiveTime,
      longestStreak,
      currentStreak,
    };
  }, [tasks]);

  // Task Actions
  const { mutate: saveTasksMutate } = saveTasksMutation;
  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      completionLogs: taskData.completionLogs || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Initialize habit-specific fields if this is a habit
      habitCompletions: taskData.isHabit ? (taskData.habitCompletions || {}) : undefined,
      habitStreak: taskData.isHabit ? 0 : undefined,
    };
    
    const updatedTasks = [...tasks, newTask];
    saveTasksMutate(updatedTasks);
    
    console.log('Task added:', newTask.title);
    return newTask;
  }, [tasks, saveTasksMutate]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, ...updates, updatedAt: new Date().toISOString() };
        
        // If this is a habit and we're updating completions, recalculate the streak
        if (updatedTask.isHabit && updates.habitCompletions !== undefined) {
          updatedTask.habitStreak = calculateHabitStreak(updatedTask.habitCompletions || {}, updatedTask);
          console.log('📈 [Tasks] Updated habit streak for', updatedTask.title, ':', updatedTask.habitStreak);
        }
        
        return updatedTask;
      }
      return task;
    });
    
    saveTasksMutate(updatedTasks);
    console.log('Task updated:', taskId);
  }, [tasks, saveTasksMutate]);

  const deleteTask = useCallback((taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasksMutate(updatedTasks);
    console.log('Task deleted:', taskId);
  }, [tasks, saveTasksMutate]);

  const toggleTaskStatus = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newStatus: TaskStatus;
    let completedAt: string | undefined;

    switch (task.status) {
      case 'todo':
        newStatus = 'in-progress';
        break;
      case 'in-progress':
        newStatus = 'completed';
        completedAt = new Date().toISOString();
        break;
      case 'completed':
        newStatus = 'todo';
        completedAt = undefined;
        break;
      default:
        newStatus = 'todo';
        completedAt = undefined;
    }

    updateTask(taskId, { status: newStatus, completedAt });
  }, [tasks, updateTask]);

  // Log detailed task completion
  const logTaskCompletion = useCallback((taskId: string, completionData: TaskCompletionFormData) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletion: TaskCompletion = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      completedAt: new Date().toISOString(),
      ...completionData,
    };

    const updatedCompletionLogs = [...task.completionLogs, newCompletion];
    
    updateTask(taskId, { 
      status: 'completed',
      completedAt: newCompletion.completedAt,
      completionLogs: updatedCompletionLogs,
      actualDuration: completionData.duration || task.actualDuration
    });
    
    console.log('Task completion logged:', taskId, completionData);
    return newCompletion;
  }, [tasks, updateTask]);

  // Get completion logs for a specific task
  const getTaskCompletionLogs = useCallback((taskId: string): TaskCompletion[] => {
    const task = tasks.find(t => t.id === taskId);
    return task?.completionLogs || [];
  }, [tasks]);

  const addSubTask = useCallback((taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubTask: SubTask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedSubTasks = [...task.subTasks, newSubTask];
    updateTask(taskId, { subTasks: updatedSubTasks });
  }, [tasks, updateTask]);

  const toggleSubTask = useCallback((taskId: string, subTaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubTasks = task.subTasks.map(st =>
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );

    // Update task progress based on subtasks
    const completedSubTasks = updatedSubTasks.filter(st => st.completed).length;
    const progress = updatedSubTasks.length > 0 
      ? (completedSubTasks / updatedSubTasks.length) * 100 
      : 0;

    updateTask(taskId, { subTasks: updatedSubTasks, progress });
  }, [tasks, updateTask]);

  // Project Actions
  const { mutate: saveProjectsMutate } = saveProjectsMutation;
  const addProject = useCallback((projectData: Omit<TaskProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: TaskProject = {
      ...projectData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedProjects = [...projects, newProject];
    saveProjectsMutate(updatedProjects);
    
    console.log('Project added:', newProject.name);
    return newProject;
  }, [projects, saveProjectsMutate]);

  const updateProject = useCallback((projectId: string, updates: Partial<TaskProject>) => {
    const updatedProjects = projects.map(project =>
      project.id === projectId
        ? { ...project, ...updates, updatedAt: new Date().toISOString() }
        : project
    );
    
    saveProjectsMutate(updatedProjects);
    console.log('Project updated:', projectId);
  }, [projects, saveProjectsMutate]);

  const deleteProject = useCallback((projectId: string) => {
    const updatedProjects = projects.filter(project => project.id !== projectId);
    saveProjectsMutate(updatedProjects);
    
    // Remove project reference from tasks
    const updatedTasks = tasks.map(task =>
      task.projectId === projectId
        ? { ...task, projectId: undefined, updatedAt: new Date().toISOString() }
        : task
    );
    saveTasksMutate(updatedTasks);
    
    console.log('Project deleted:', projectId);
  }, [projects, tasks, saveProjectsMutate, saveTasksMutate]);

  // Time Tracking
  const { mutate: saveTimeEntriesMutate } = saveTimeEntriesMutation;
  
  const stopTimer = useCallback(() => {
    if (!activeTimer) return;

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - new Date(activeTimer.startTime).getTime()) / 60000); // minutes

    const newTimeEntry: TaskTimeEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      taskId: activeTimer.taskId,
      startTime: activeTimer.startTime,
      endTime: endTime.toISOString(),
      duration,
      createdAt: new Date().toISOString(),
    };

    const updatedEntries = [...timeEntries, newTimeEntry];
    saveTimeEntriesMutate(updatedEntries);

    // Update task actual duration
    const task = tasks.find(t => t.id === activeTimer.taskId);
    if (task) {
      const newActualDuration = (task.actualDuration || 0) + duration;
      updateTask(activeTimer.taskId, { actualDuration: newActualDuration });
    }

    setActiveTimer(null);
    console.log('Timer stopped. Duration:', duration, 'minutes');
  }, [activeTimer, timeEntries, tasks, saveTimeEntriesMutate, updateTask]);

  const startTimer = useCallback((taskId: string) => {
    if (activeTimer) {
      stopTimer();
    }
    
    setActiveTimer({
      taskId,
      startTime: new Date().toISOString(),
    });
    
    console.log('Timer started for task:', taskId);
  }, [activeTimer, stopTimer]);

  const clearFilter = useCallback(() => setFilter({}), []);
  const getTaskById = useCallback((id: string) => tasks.find(t => t.id === id), [tasks]);
  const getProjectById = useCallback((id: string) => projects.find(p => p.id === id), [projects]);
  const getTasksByProject = useCallback((projectId: string) => tasks.filter(t => t.projectId === projectId), [tasks]);
  const getOverdueTasks = useCallback(() => tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ), [tasks]);
  const getTodayTasks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow
    );
  }, [tasks]);

  return {
    // Data
    tasks: filteredTasks,
    allTasks: tasks,
    projects,
    timeEntries,
    taskStats,
    filter,
    activeTimer,
    
    // Loading states
    isLoading: tasksQuery.isLoading || projectsQuery.isLoading,
    isError: tasksQuery.isError || projectsQuery.isError,
    
    // Actions
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    logTaskCompletion,
    getTaskCompletionLogs,
    addSubTask,
    toggleSubTask,
    
    // Projects
    addProject,
    updateProject,
    deleteProject,
    
    // Filtering
    setFilter,
    clearFilter,
    
    // Time tracking
    startTimer,
    stopTimer,
    
    // Utility functions
    getTaskById,
    getProjectById,
    getTasksByProject,
    getOverdueTasks,
    getTodayTasks,
  };
});

// Default context for when provider is not available
const defaultTasksContext = {
  tasks: [],
  allTasks: [],
  projects: [],
  timeEntries: [],
  taskStats: {
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    completionRate: 0,
    totalTimeSpent: 0,
    averageTaskDuration: 0,
  },
  filter: {},
  activeTimer: null,
  isLoading: false,
  isError: false,
  addTask: () => {},
  updateTask: () => {},
  deleteTask: () => {},
  toggleTaskStatus: () => {},
  logTaskCompletion: () => {},
  getTaskCompletionLogs: () => [],
  addSubTask: () => {},
  toggleSubTask: () => {},
  addProject: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  setFilter: () => {},
  clearFilter: () => {},
  startTimer: () => {},
  stopTimer: () => {},
  getTaskById: () => undefined,
  getProjectById: () => undefined,
  getTasksByProject: () => [],
  getOverdueTasks: () => [],
  getTodayTasks: () => [],
};

// Wrapper to ensure context is always available
export const useTasksSafe = () => {
  try {
    const context = useTasks();
    if (!context) {
      console.warn('useTasks called outside of TaskProvider, returning default context');
      return defaultTasksContext;
    }
    return context;
  } catch {
    console.warn('useTasks called outside of TaskProvider, returning default context');
    return defaultTasksContext;
  }
};

// Legacy exports for backward compatibility
export const TasksProvider = TaskProvider;
export const useTasksContext = useTasksSafe;