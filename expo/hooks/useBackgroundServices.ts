import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import createContextHook from '@nkzw/create-context-hook';
import { useUserProfile } from './useUserProfile';
import { useAuth } from './useAuth';
import { useAppSafe } from './useHabitsStore';
import { useTasks } from './useTasksStore';
import { notificationService, ScheduledNotification } from '@/utils/notificationService';
import { syncDailySummaryNotification } from '@/utils/dailySummaryNotifications';
import { 
  UnifiedActivity, 
  ActivityInsight, 
  SmartRecommendation, 
  UnifiedTimeline,
  CrossActivityInsight
} from '@/types/activity';
import { activityIntelligence } from '@/utils/activityIntelligence';

interface NotificationState {
  permissionStatus: string;
  isEnabled: boolean;
  scheduledNotifications: ScheduledNotification[];
  lastNotification: Notifications.Notification | null;
}

interface WeeklyRecapSummary {
  weekLabel: string;
  completedHabits: number;
  completionRate: number;
  activeHabits: number;
  topHabitName?: string;
  atRiskHabits: number;
}

export const [BackgroundServicesProvider, useBackgroundServices] = createContextHook(() => {
  const { user } = useAuth();
  const { profile, updateNotificationSettings } = useUserProfile();
  const appContext = useAppSafe();
  const tasksContext = useTasks();
  const habits = appContext?.habits || [];
  const allTasks = tasksContext?.allTasks || [];

  // === NOTIFICATION STATE ===
  const [notifState, setNotifState] = useState<NotificationState>({
    permissionStatus: 'undetermined',
    isEnabled: false,
    scheduledNotifications: [],
    lastNotification: null,
  });

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // === ACTIVITY INTELLIGENCE STATE ===
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [unifiedActivities, setUnifiedActivities] = useState<UnifiedActivity[]>([]);
  const [insights, setInsights] = useState<ActivityInsight[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [timeline, setTimeline] = useState<UnifiedTimeline[]>([]);
  const [crossInsights, setCrossInsights] = useState<CrossActivityInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const activitiesRef = useRef<UnifiedActivity[]>([]);

  const toMinutes = useCallback((hhmm?: string, fallback: number = 0) => {
    if (!hhmm || !hhmm.includes(':')) return fallback;
    const [h, m] = hhmm.split(':').map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
    return h * 60 + m;
  }, []);

  const isInQuietHours = useCallback((date: Date) => {
    const settings = profile?.notificationSettings;
    if (!settings?.quietHoursEnabled) return false;
    const start = toMinutes(settings.quietHoursStart, 22 * 60 + 30);
    const end = toMinutes(settings.quietHoursEnd, 7 * 60);
    const nowMinutes = date.getHours() * 60 + date.getMinutes();

    if (start === end) return false;
    if (start < end) return nowMinutes >= start && nowMinutes < end;
    return nowMinutes >= start || nowMinutes < end;
  }, [profile?.notificationSettings, toMinutes]);

  const shiftOutOfQuietHours = useCallback((date: Date) => {
    const settings = profile?.notificationSettings;
    if (!settings?.quietHoursEnabled || !isInQuietHours(date)) return date;
    const end = toMinutes(settings.quietHoursEnd, 7 * 60);
    const adjusted = new Date(date);
    adjusted.setHours(Math.floor(end / 60), end % 60, 0, 0);
    if (adjusted <= new Date()) {
      adjusted.setDate(adjusted.getDate() + 1);
    }
    return adjusted;
  }, [profile?.notificationSettings, isInQuietHours, toMinutes]);

  // === NOTIFICATION FUNCTIONS ===
  const checkPermissions = useCallback(async () => {
    const status = await notificationService.getPermissionStatus();
    setNotifState(prev => ({
      ...prev,
      permissionStatus: status,
      isEnabled: status === 'granted',
    }));
    return status === 'granted';
  }, []);

  const requestPermissions = useCallback(async () => {
    const granted = await notificationService.requestPermissions();
    setNotifState(prev => ({
      ...prev,
      permissionStatus: granted ? 'granted' : 'denied',
      isEnabled: granted,
    }));
    return granted;
  }, []);

  const loadScheduledNotifications = useCallback(async () => {
    const scheduled = await notificationService.getScheduledNotifications();
    setNotifState(prev => ({ ...prev, scheduledNotifications: scheduled }));
  }, []);

  const scheduleHabitReminders = useCallback(async () => {
    if (!profile?.notificationSettings.habitReminders || !notifState.isEnabled) return;

    for (const habit of habits) {
      const { days } = habit.frequency;
      if (days.length > 0) {
        const todayKey = new Date().toISOString().slice(0, 10);
        const completedToday = !!habit.completions?.[todayKey];
        const streak = Object.values(habit.completions || {}).filter(Boolean).length;
        const isAtRisk = (profile.notificationSettings.habitRiskAlerts ?? true) && !completedToday && streak >= 2;
        const baseHour = isAtRisk ? 18 : 9;
        const reminderDate = shiftOutOfQuietHours(new Date(new Date().setHours(baseHour, 0, 0, 0)));
        const reminderHour = reminderDate.getHours();
        const reminderMinute = reminderDate.getMinutes();
        await notificationService.scheduleHabitReminder(
          habit.id,
          isAtRisk ? `${habit.name} (streak at risk)` : habit.name,
          reminderHour,
          reminderMinute,
          days
        );
      }
    }
    await loadScheduledNotifications();
  }, [habits, profile?.notificationSettings.habitReminders, notifState.isEnabled, loadScheduledNotifications, shiftOutOfQuietHours]);

  const scheduleTaskReminders = useCallback(async () => {
    if (!notifState.isEnabled) return;

    const tasksWithDueDates = allTasks.filter(task => task.dueDate && task.status !== 'completed');

    for (const task of tasksWithDueDates) {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(23, 59, 0, 0);
        
        if (dueDate > new Date()) {
          await notificationService.scheduleTaskDueReminder(task.id, task.title, dueDate, 60);
        }
      }
    }
    await loadScheduledNotifications();
  }, [allTasks, notifState.isEnabled, loadScheduledNotifications]);

  const scheduleMatchReminder = useCallback(async (
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    matchTime: Date
  ) => {
    if (!profile?.notificationSettings.matchReminders || !notifState.isEnabled) return null;

    const leadMinutes = profile.notificationSettings.eventReminderLeadMinutes ?? 30;
    const adjustedMatchTime = shiftOutOfQuietHours(matchTime);
    const identifier = await notificationService.scheduleMatchReminder(matchId, homeTeam, awayTeam, adjustedMatchTime, leadMinutes);
    await loadScheduledNotifications();
    return identifier;
  }, [profile?.notificationSettings, notifState.isEnabled, loadScheduledNotifications, shiftOutOfQuietHours]);

  const sendLiveMatchAlert = useCallback(async (
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    event: string,
    score?: { home: number; away: number }
  ) => {
    if (!profile?.notificationSettings.liveMatches || !notifState.isEnabled) return null;
    if (isInQuietHours(new Date())) return null;
    return notificationService.sendLiveMatchAlert(matchId, homeTeam, awayTeam, event, score);
  }, [profile?.notificationSettings.liveMatches, notifState.isEnabled, isInQuietHours]);

  const sendGoalAlert = useCallback(async (
    matchId: string,
    scoringTeam: string,
    scorer: string,
    homeTeam: string,
    awayTeam: string,
    score: { home: number; away: number }
  ) => {
    if (!profile?.notificationSettings.goalAlerts || !notifState.isEnabled) return null;
    if (isInQuietHours(new Date())) return null;
    return notificationService.sendGoalAlert(matchId, scoringTeam, scorer, homeTeam, awayTeam, score);
  }, [profile?.notificationSettings.goalAlerts, notifState.isEnabled, isInQuietHours]);

  const cancelAllHabitReminders = useCallback(async () => {
    for (const habit of habits) {
      await notificationService.cancelHabitReminders(habit.id);
    }
    await loadScheduledNotifications();
  }, [habits, loadScheduledNotifications]);

  const cancelAllTaskReminders = useCallback(async () => {
    for (const task of allTasks) {
      await notificationService.cancelTaskReminder(task.id);
    }
    await loadScheduledNotifications();
  }, [allTasks, loadScheduledNotifications]);

  const cancelAllNotifications = useCallback(async () => {
    await notificationService.cancelAllNotifications();
    await loadScheduledNotifications();
  }, [loadScheduledNotifications]);

  const sendTestNotification = useCallback(async () => {
    if (!notifState.isEnabled) {
      const granted = await requestPermissions();
      if (!granted) return null;
    }
    return notificationService.sendImmediateNotification(
      '🔔 Test Notification',
      'Your notifications are working correctly!',
      { type: 'habit_reminder' }
    );
  }, [notifState.isEnabled, requestPermissions]);

  const toggleNotificationSetting = useCallback(async (
    setting: keyof NonNullable<typeof profile>['notificationSettings'],
    value: boolean
  ) => {
    updateNotificationSettings({ [setting]: value });

    if (value && !notifState.isEnabled) {
      await requestPermissions();
    }

    if (setting === 'habitReminders') {
      if (value) {
        await scheduleHabitReminders();
      } else {
        await cancelAllHabitReminders();
      }
    }
  }, [notifState.isEnabled, requestPermissions, updateNotificationSettings, scheduleHabitReminders, cancelAllHabitReminders]);

  // === ACTIVITY INTELLIGENCE FUNCTIONS ===
  const allActivities = useMemo(() => {
    if (!isInitialized || !appContext || !tasksContext) return [];
    
    return activityIntelligence.unifyActivities(
      appContext.habits || [],
      tasksContext.allTasks || [],
      appContext.activities || [],
      appContext.shows || [],
      [],
      []
    );
  }, [isInitialized, appContext, tasksContext]);

  const generateIntelligence = useCallback(async () => {
    const currentActivities = activitiesRef.current;
    if (currentActivities.length === 0) return;
    
    setIsGenerating(true);
    try {
      const newInsights = await activityIntelligence.generateInsights(currentActivities);
      setInsights(newInsights);

      const patterns = activityIntelligence['detectPatterns'](currentActivities);
      const newRecommendations = await activityIntelligence.generateSmartRecommendations(currentActivities, patterns);
      setRecommendations(newRecommendations);

      const newCrossInsights = activityIntelligence.generateCrossActivityInsights(currentActivities);
      setCrossInsights(newCrossInsights);

      const newTimeline = await activityIntelligence.createUnifiedTimeline(currentActivities, newInsights, newRecommendations);
      setTimeline(newTimeline);

      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Error generating activity intelligence:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const todayActivities = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return unifiedActivities.filter(activity => {
      if (activity.scheduledTime) return activity.scheduledTime.startsWith(today);
      return activity.type === 'habit' || (activity.type === 'task' && !activity.scheduledTime);
    });
  }, [unifiedActivities]);

  const upcomingActivities = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return unifiedActivities.filter(activity => {
      if (activity.scheduledTime) {
        const activityDate = new Date(activity.scheduledTime);
        return activityDate >= today && activityDate <= nextWeek;
      }
      return false;
    }).sort((a, b) => {
      if (a.scheduledTime && b.scheduledTime) {
        return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
      }
      return 0;
    });
  }, [unifiedActivities]);

  const highPriorityActivities = useMemo(() => {
    return unifiedActivities.filter(activity => 
      activity.priority === 'high' || activity.priority === 'urgent'
    ).slice(0, 5);
  }, [unifiedActivities]);

  const overdueActivities = useMemo(() => {
    return unifiedActivities.filter(activity => activity.status === 'overdue');
  }, [unifiedActivities]);

  const activityStats = useMemo(() => {
    const total = unifiedActivities.length;
    const completed = unifiedActivities.filter(a => a.status === 'completed').length;
    const active = unifiedActivities.filter(a => a.status === 'active').length;
    const overdue = overdueActivities.length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const todayCompleted = todayActivities.filter(a => a.status === 'completed').length;
    const todayTotal = todayActivities.length;
    const todayProductivity = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;
    
    return {
      total,
      completed,
      active,
      overdue,
      completionRate: Math.round(completionRate),
      todayProductivity: Math.round(todayProductivity),
      todayCompleted,
      todayTotal
    };
  }, [unifiedActivities, todayActivities, overdueActivities]);

  const getActivitiesByCategory = useCallback((category: string) => {
    return unifiedActivities.filter(activity => 
      activity.category.toLowerCase() === category.toLowerCase()
    );
  }, [unifiedActivities]);

  const getActivitiesByType = useCallback((type: string) => {
    return unifiedActivities.filter(activity => activity.type === type);
  }, [unifiedActivities]);

  const todayTimeline = useMemo(() => {
    const now2 = new Date();
    const today = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-${String(now2.getDate()).padStart(2, '0')}`;
    return timeline.find(t => t.date === today);
  }, [timeline]);

  const actionableInsights = useMemo(() => insights.filter(insight => insight.actionable), [insights]);

  const rankRecommendation = useCallback((rec: SmartRecommendation) => {
    const nowHour = new Date().getHours();
    const timingBoost =
      rec.urgencyLabel === 'now' ? 0.15 : rec.urgencyLabel === 'today' ? 0.08 : 0.02;
    const morningFocusBoost = nowHour < 12 && rec.type === 'focus' ? 0.08 : 0;
    const actionBoost = rec.actions?.length ? 0.05 : 0;
    const explicitScore = typeof rec.priorityScore === 'number' ? rec.priorityScore : 0;
    return explicitScore + rec.confidence * 0.45 + rec.estimatedBenefit * 0.35 + timingBoost + morningFocusBoost + actionBoost - rec.difficulty * 0.12;
  }, []);

  const topRecommendations = useMemo(() => {
    return recommendations
      .filter(rec => rec.confidence > 0.7)
      .sort((a, b) => rankRecommendation(b) - rankRecommendation(a))
      .slice(0, 3);
  }, [recommendations, rankRecommendation]);

  const rankedCrossInsights = useMemo(() => {
    return [...crossInsights].sort((a, b) => {
      const aScore = (a.priorityScore || 0) + a.confidence + (a.actionable ? 0.1 : 0);
      const bScore = (b.priorityScore || 0) + b.confidence + (b.actionable ? 0.1 : 0);
      return bScore - aScore;
    });
  }, [crossInsights]);

  const weeklyRecap = useMemo<WeeklyRecapSummary>(() => {
    const now = new Date();
    const monday = new Date(now);
    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let completedHabits = 0;
    let scheduledHabitSlots = 0;
    let atRiskHabits = 0;
    let topHabitName = '';
    let topHabitCompletions = 0;

    habits.forEach((habit) => {
      const entries = Object.entries(habit.completions || {});
      let habitCompletions = 0;
      entries.forEach(([date, completed]) => {
        if (!completed) return;
        const d = new Date(date);
        if (d >= monday && d <= sunday) {
          habitCompletions++;
          completedHabits++;
        }
      });
      if (habitCompletions > topHabitCompletions) {
        topHabitCompletions = habitCompletions;
        topHabitName = habit.name;
      }
      const weeklyDays = habit.frequency?.days?.length || 0;
      scheduledHabitSlots += weeklyDays;
      const todayKey = new Date().toISOString().slice(0, 10);
      const isAtRisk = !habit.completions?.[todayKey] && habitCompletions > 0;
      if (isAtRisk) atRiskHabits++;
    });

    const completionRate = scheduledHabitSlots > 0
      ? Math.round((completedHabits / scheduledHabitSlots) * 100)
      : 0;

    return {
      weekLabel: `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`,
      completedHabits,
      completionRate,
      activeHabits: habits.length,
      topHabitName: topHabitName || undefined,
      atRiskHabits,
    };
  }, [habits]);

  // === EFFECTS ===
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    setUnifiedActivities(allActivities);
    activitiesRef.current = allActivities;
  }, [allActivities]);

  useEffect(() => {
    if (isInitialized && allActivities.length > 0 && !lastUpdated) {
      const timeoutId = setTimeout(() => generateIntelligence(), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, allActivities.length]);

  useEffect(() => {
    setNotifState(prev => ({ ...prev, scheduledNotifications: [] }));
    void loadScheduledNotifications();
  }, [user?.id, loadScheduledNotifications]);

  useEffect(() => {
    checkPermissions();
    loadScheduledNotifications();

    if (Platform.OS !== 'web') {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotifState(prev => ({ ...prev, lastNotification: notification }));
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.type) {
          console.log('Notification tapped:', data.type, data.id);
        }
        if (data?.type === 'daily_summary') {
          router.push('/(tabs)/activities' as never);
        }
      });
    }

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        await checkPermissions();
      }
      appState.current = nextAppState;
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      subscription.remove();
    };
  }, [checkPermissions, loadScheduledNotifications]);

  useEffect(() => {
    if (notifState.isEnabled && profile?.notificationSettings.habitReminders && habits.length > 0) {
      const timer = setTimeout(() => scheduleHabitReminders(), 2000);
      return () => clearTimeout(timer);
    }
  }, [notifState.isEnabled, profile?.notificationSettings.habitReminders, habits.length, scheduleHabitReminders]);

  useEffect(() => {
    if (notifState.isEnabled && allTasks.length > 0) {
      const timer = setTimeout(() => scheduleTaskReminders(), 3000);
      return () => clearTimeout(timer);
    }
  }, [notifState.isEnabled, allTasks.length, scheduleTaskReminders]);

  useEffect(() => {
    if (!user?.id || !notifState.isEnabled) return;
    void syncDailySummaryNotification({ userId: user.id });
  }, [user?.id, notifState.isEnabled]);

  useEffect(() => {
    if (!notifState.isEnabled || !profile?.notificationSettings.habitReminders) return;

    const scheduleRetentionNotifications = async () => {
      const scheduled = await notificationService.getScheduledNotifications();
      const existingRetention = scheduled.filter(
        n => n.type === 'weekly_recap' || n.type === 'streak_protection'
      );
      for (const item of existingRetention) {
        await notificationService.cancelNotification(item.identifier);
      }

      const now = new Date();
      const daysUntilSunday = (7 - now.getDay()) % 7;
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + daysUntilSunday);
      sunday.setHours(19, 0, 0, 0);
      const recapTime = shiftOutOfQuietHours(sunday);
      if (recapTime > new Date()) {
        await notificationService.scheduleNotification(
          '📈 Weekly Recap',
          `You completed ${weeklyRecap.completedHabits} habits this week (${weeklyRecap.completionRate}%). ${weeklyRecap.topHabitName ? `Top habit: ${weeklyRecap.topHabitName}.` : ''}`,
          recapTime,
          {
            type: 'weekly_recap',
            id: 'weekly_recap',
            payload: weeklyRecap as unknown as Record<string, any>,
          }
        );
      }

      if (weeklyRecap.atRiskHabits > 0 && (profile.notificationSettings.habitRiskAlerts ?? true)) {
        const streakTime = shiftOutOfQuietHours(new Date(now.setHours(18, 30, 0, 0)));
        if (streakTime > new Date()) {
          await notificationService.scheduleNotification(
            '🔥 Streak Protection',
            `${weeklyRecap.atRiskHabits} habit streak${weeklyRecap.atRiskHabits > 1 ? 's are' : ' is'} at risk today. Complete one quick habit to keep momentum.`,
            streakTime,
            {
              type: 'streak_protection',
              id: 'streak_protection',
            }
          );
        }
      }
      await loadScheduledNotifications();
    };

    const timer = setTimeout(() => {
      void scheduleRetentionNotifications();
    }, 1500);
    return () => clearTimeout(timer);
  }, [notifState.isEnabled, profile?.notificationSettings, weeklyRecap, shiftOutOfQuietHours, loadScheduledNotifications]);

  return {
    // Notifications
    permissionStatus: notifState.permissionStatus,
    isNotificationsEnabled: notifState.isEnabled,
    scheduledNotifications: notifState.scheduledNotifications,
    lastNotification: notifState.lastNotification,
    requestPermissions,
    checkPermissions,
    scheduleHabitReminders,
    scheduleTaskReminders,
    scheduleMatchReminder,
    sendLiveMatchAlert,
    sendGoalAlert,
    sendTestNotification,
    cancelAllHabitReminders,
    cancelAllTaskReminders,
    cancelAllNotifications,
    toggleNotificationSetting,
    clearBadge: notificationService.clearBadge.bind(notificationService),
    setBadgeCount: notificationService.setBadgeCount.bind(notificationService),

    // Activity Intelligence
    unifiedActivities,
    insights,
    recommendations,
    timeline,
    crossInsights,
    rankedCrossInsights,
    todayActivities,
    upcomingActivities,
    highPriorityActivities,
    overdueActivities,
    todayTimeline,
    actionableInsights,
    topRecommendations,
    weeklyRecap,
    stats: activityStats,
    isGenerating,
    lastUpdated,
    generateIntelligence,
    getActivitiesByCategory,
    getActivitiesByType,
    isLoading: !isInitialized || isGenerating || !lastUpdated,
  };
});

// Re-export hooks for backward compatibility
export const useNotifications = () => {
  const ctx = useBackgroundServices();
  return {
    permissionStatus: ctx.permissionStatus,
    isEnabled: ctx.isNotificationsEnabled,
    scheduledNotifications: ctx.scheduledNotifications,
    lastNotification: ctx.lastNotification,
    requestPermissions: ctx.requestPermissions,
    checkPermissions: ctx.checkPermissions,
    scheduleHabitReminders: ctx.scheduleHabitReminders,
    scheduleTaskReminders: ctx.scheduleTaskReminders,
    scheduleMatchReminder: ctx.scheduleMatchReminder,
    sendLiveMatchAlert: ctx.sendLiveMatchAlert,
    sendGoalAlert: ctx.sendGoalAlert,
    sendTestNotification: ctx.sendTestNotification,
    cancelAllHabitReminders: ctx.cancelAllHabitReminders,
    cancelAllTaskReminders: ctx.cancelAllTaskReminders,
    cancelAllNotifications: ctx.cancelAllNotifications,
    toggleNotificationSetting: ctx.toggleNotificationSetting,
    weeklyRecap: ctx.weeklyRecap,
    clearBadge: ctx.clearBadge,
    setBadgeCount: ctx.setBadgeCount,
  };
};

export const useNotificationsSafe = () => {
  try {
    return useNotifications();
  } catch {
    return {
      permissionStatus: 'unavailable',
      isEnabled: false,
      scheduledNotifications: [],
      lastNotification: null,
      requestPermissions: async () => false,
      checkPermissions: async () => false,
      scheduleHabitReminders: async () => {},
      scheduleTaskReminders: async () => {},
      scheduleMatchReminder: async () => null,
      sendLiveMatchAlert: async () => null,
      sendGoalAlert: async () => null,
      sendTestNotification: async () => null,
      cancelAllHabitReminders: async () => {},
      cancelAllTaskReminders: async () => {},
      cancelAllNotifications: async () => {},
      toggleNotificationSetting: async () => {},
      weeklyRecap: {
        weekLabel: '',
        completedHabits: 0,
        completionRate: 0,
        activeHabits: 0,
        topHabitName: undefined,
        atRiskHabits: 0,
      },
      clearBadge: async () => {},
      setBadgeCount: async () => {},
    };
  }
};

export const useActivityIntelligence = () => {
  const ctx = useBackgroundServices();
  return {
    unifiedActivities: ctx.unifiedActivities,
    insights: ctx.insights,
    recommendations: ctx.recommendations,
    timeline: ctx.timeline,
    crossInsights: ctx.crossInsights,
    rankedCrossInsights: ctx.rankedCrossInsights,
    todayActivities: ctx.todayActivities,
    upcomingActivities: ctx.upcomingActivities,
    highPriorityActivities: ctx.highPriorityActivities,
    overdueActivities: ctx.overdueActivities,
    todayTimeline: ctx.todayTimeline,
    actionableInsights: ctx.actionableInsights,
    topRecommendations: ctx.topRecommendations,
    stats: ctx.stats,
    isGenerating: ctx.isGenerating,
    lastUpdated: ctx.lastUpdated,
    generateIntelligence: ctx.generateIntelligence,
    getActivitiesByCategory: ctx.getActivitiesByCategory,
    getActivitiesByType: ctx.getActivitiesByType,
    isLoading: ctx.isLoading,
  };
};
