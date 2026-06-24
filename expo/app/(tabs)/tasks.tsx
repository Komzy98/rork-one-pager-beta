import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Coffee, Sun, Sunset, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { Task, TaskPriority } from '@/types/task';
import { useTasks } from '@/hooks/useTasksStore';
import { TaskEditModal } from '@/components/TaskEditModal';
import { getTodayFormatted } from '@/utils/dateUtils';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { entriesToDisplayTasks } from '@/utils/todayHabits';
import TabWalkthrough from '@/components/TabWalkthrough';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  isInPeakHours,
  getChronotypeInfo,
  getSecondaryPeakHours,
} from '@/constants/chronotypes';
import TasksDashboardView, {
  QuickAddMode,
  TimeBlockViewModel,
} from '@/components/tasks/TasksDashboardView';
import TasksAllListModal from '@/components/tasks/TasksAllListModal';
import HabitsAllListModal from '@/components/tasks/HabitsAllListModal';
import PeakPerformanceScheduler from '@/components/PeakPerformanceScheduler';
import CalendarHabitPlanner from '@/components/CalendarHabitPlanner';
import EventKitManager from '@/components/EventKitManager';
import { getTasksAISuggestion } from '@/utils/tasksAISuggestion';
import { useCalendarHabitRecommendations } from '@/hooks/useCalendarHabitRecommendations';
import {
  buildTodayPlanItems,
  buildWeekCompletedPlanItems,
  countResolvedPlanItems,
  countTodayPlanItems,
  formatTimeBlockSubtitle,
  getTimeBlockScheduleMeta,
  resolveTodayPlanList,
  type TimeBlockId,
  type TodayDoneScope,
  type TodaySourceFilter,
  type TodayStatusFilter,
} from '@/utils/todayPlanSchedule';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { HABIT_COLORS } from '@/constants/colors';

const TIME_BLOCKS: {
  id: TimeBlockId;
  label: string;
  icon: typeof Coffee;
  hours: readonly [number, number];
}[] = [
  { id: 'morning', label: 'Morning', icon: Coffee, hours: [6, 12] },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, hours: [12, 17] },
  { id: 'evening', label: 'Evening', icon: Sunset, hours: [17, 21] },
  { id: 'night', label: 'Night', icon: Moon, hours: [21, 6] },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3578F6',
  low: '#7B61FF',
};

const getCurrentTimeBlock = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const getPeakPillText = (chronoInfo: ReturnType<typeof getChronotypeInfo>, inPeak: boolean) => {
  if (!chronoInfo) return 'Build your rhythm';
  if (inPeak) return 'In your peak now';

  const hour = new Date().getHours();
  let hoursUntil = chronoInfo.peakHours.start - hour;
  if (hoursUntil < 0) hoursUntil += 24;
  if (hoursUntil <= 3) {
    return `Peak in ${hoursUntil}–${Math.min(hoursUntil + 1, 3)} hours`;
  }
  return 'Peak window ahead';
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { profile } = useUserProfile();
  const { tasks, addTask, updateTask, deleteTask, activeTimer, startTimer, stopTimer } = useTasks();

  const [refreshing, setRefreshing] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [todaySourceFilter, setTodaySourceFilter] = useState<TodaySourceFilter>('all');
  const [todayStatusFilter, setTodayStatusFilter] = useState<TodayStatusFilter>('open');
  const [todayDoneScope, setTodayDoneScope] = useState<TodayDoneScope>('today');
  const [quickAddMode, setQuickAddMode] = useState<QuickAddMode>('task');
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);
  const [allTasksModalStatus, setAllTasksModalStatus] = useState<'all' | 'completed'>('all');
  const reduceMotion = useReduceMotion();
  const [showAllHabitsModal, setShowAllHabitsModal] = useState(false);
  const [showPeakScheduler, setShowPeakScheduler] = useState(false);
  const [showHabitCoach, setShowHabitCoach] = useState(false);
  const [showEventKitManager, setShowEventKitManager] = useState(false);
  const [isCreatingHabit, setIsCreatingHabit] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const todayStr = getTodayFormatted();
  const currentBlock = getCurrentTimeBlock();

  const allTasks = useMemo(() => tasks.filter((t) => !t.isHabit), [tasks]);
  const habits = useMemo(() => tasks.filter((t) => t.isHabit), [tasks]);

  const chronoInfo = profile?.chronotype ? getChronotypeInfo(profile.chronotype) : undefined;
  const inPeak = chronoInfo ? isInPeakHours(chronoInfo) : false;
  const secondaryPeak = chronoInfo ? getSecondaryPeakHours(chronoInfo) : null;
  const inSecondaryPeak = secondaryPeak
    ? (() => {
        const h = new Date().getHours();
        return h >= secondaryPeak.start && h < secondaryPeak.end;
      })()
    : false;

  const {
    entries: todayHabitEntries,
    stats: todayHabitStats,
    todayLog,
    feedback: completionFeedback,
    dismissFeedback,
    toggleTodayHabit,
    setTodayMood,
  } = useTodayHabits();

  const todayHabits = useMemo(
    () => entriesToDisplayTasks(todayHabitEntries, tasks),
    [todayHabitEntries, tasks],
  );

  const pendingTasks = useMemo(
    () =>
      allTasks
        .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
        .sort((a, b) => {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const baseA = priorityOrder[a.priority] || 1;
          const baseB = priorityOrder[b.priority] || 1;
          if (inPeak || inSecondaryPeak) {
            const boostA = a.priority === 'urgent' || a.priority === 'high' ? 2 : 0;
            const boostB = b.priority === 'urgent' || b.priority === 'high' ? 2 : 0;
            return baseB + boostB - (baseA + boostA);
          }
          return baseB - baseA;
        }),
    [allTasks, inPeak, inSecondaryPeak],
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const completedTodayTasks = useMemo(
    () =>
      allTasks.filter(
        (t) => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= todayStart,
      ),
    [allTasks, todayStart],
  );

  const momentumTasksTotal = pendingTasks.length + completedTodayTasks.length;
  const momentumTasksDone = completedTodayTasks.length;
  const momentumHabitsTotal = todayHabitStats.totalHabits;
  const momentumHabitsDone = todayHabitStats.completedHabits;
  const momentumPlanTotal = momentumTasksTotal + momentumHabitsTotal;
  const momentumPlanDone = momentumTasksDone + momentumHabitsDone;
  const momentumPercent =
    momentumPlanTotal > 0 ? Math.round((momentumPlanDone / momentumPlanTotal) * 100) : 0;

  const allTodayPlanItems = useMemo(
    () => buildTodayPlanItems(allTasks, todayHabits, todayStr, chronoInfo),
    [allTasks, todayHabits, todayStr, chronoInfo],
  );

  const weekCompletedPlanItems = useMemo(
    () => buildWeekCompletedPlanItems(allTasks, habits, chronoInfo),
    [allTasks, habits, chronoInfo],
  );

  const filteredTodayPlanItems = useMemo(
    () =>
      resolveTodayPlanList(
        allTodayPlanItems,
        weekCompletedPlanItems,
        todaySourceFilter,
        todayStatusFilter,
        todayDoneScope,
      ),
    [
      allTodayPlanItems,
      weekCompletedPlanItems,
      todaySourceFilter,
      todayStatusFilter,
      todayDoneScope,
    ],
  );

  const allOpenCount = useMemo(
    () => countTodayPlanItems(allTodayPlanItems, 'all', 'open'),
    [allTodayPlanItems],
  );
  const allDoneCount = useMemo(
    () => countTodayPlanItems(allTodayPlanItems, 'all', 'done'),
    [allTodayPlanItems],
  );
  const tasksOpenCount = useMemo(
    () => countTodayPlanItems(allTodayPlanItems, 'tasks', 'open'),
    [allTodayPlanItems],
  );
  const tasksDoneCount = useMemo(
    () => countTodayPlanItems(allTodayPlanItems, 'tasks', 'done'),
    [allTodayPlanItems],
  );
  const habitsOpenCount = useMemo(
    () => countTodayPlanItems(allTodayPlanItems, 'habits', 'open'),
    [allTodayPlanItems],
  );
  const habitsDoneCount = useMemo(
    () => countTodayPlanItems(allTodayPlanItems, 'habits', 'done'),
    [allTodayPlanItems],
  );
  const allWeekDoneCount = useMemo(
    () => countResolvedPlanItems(allTodayPlanItems, weekCompletedPlanItems, 'all', 'done', 'week'),
    [allTodayPlanItems, weekCompletedPlanItems],
  );
  const tasksWeekDoneCount = useMemo(
    () => countResolvedPlanItems(allTodayPlanItems, weekCompletedPlanItems, 'tasks', 'done', 'week'),
    [allTodayPlanItems, weekCompletedPlanItems],
  );
  const habitsWeekDoneCount = useMemo(
    () => countResolvedPlanItems(allTodayPlanItems, weekCompletedPlanItems, 'habits', 'done', 'week'),
    [allTodayPlanItems, weekCompletedPlanItems],
  );

  const focusTask = useMemo(() => {
    if (pendingTasks.length === 0) return undefined;
    if (focusedTaskId) {
      return pendingTasks.find((t) => t.id === focusedTaskId) || pendingTasks[0];
    }
    return pendingTasks[0];
  }, [pendingTasks, focusedTaskId]);

  const incompleteHabitsToday = useMemo(
    () => todayHabits.filter((h) => !h.habitCompletions?.[todayStr]),
    [todayHabits, todayStr],
  );

  const calendarHabits = useCalendarHabitRecommendations(incompleteHabitsToday, chronoInfo);

  const habitTimeById = useMemo(() => {
    const map: Record<string, string> = {};
    calendarHabits.recommendations.forEach((rec) => {
      map[rec.habitId] = rec.timeLabel;
    });
    return map;
  }, [calendarHabits.recommendations]);

  const focusHabit = useMemo(() => {
    if (pendingTasks.length > 0) return null;
    return incompleteHabitsToday[0] ?? null;
  }, [pendingTasks.length, incompleteHabitsToday]);

  const maxStreak = todayHabitStats.currentStreak;

  const weeklyProgressByHabitId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const e of todayHabitEntries) {
      map[e.id] = e.weeklyProgress?.label;
    }
    return map;
  }, [todayHabitEntries]);

  const activeFocusTask = useMemo(() => {
    if (!activeTimer) return null;
    return allTasks.find((t) => t.id === activeTimer.taskId) ?? null;
  }, [activeTimer, allTasks]);

  const aiSuggestionCopy = useMemo(
    () =>
      getTasksAISuggestion({
        chronoInfo,
        inPeak,
        inSecondaryPeak,
        focusTask: focusTask ?? null,
        pendingTasks,
        todayHabits,
        todayStr,
        momentumPercent,
        totalCompletedToday: momentumPlanDone,
        pendingCount: pendingTasks.length,
        activeFocusTask,
        activeTimerStartTime: activeTimer?.startTime ?? null,
        calendarConnected: calendarHabits.isConnected,
        nextHabitTimeLabel: calendarHabits.nextRecommendation?.timeLabel ?? null,
        nextHabitTitle: calendarHabits.nextRecommendation?.habitTitle ?? null,
      }),
    [
      chronoInfo,
      inPeak,
      inSecondaryPeak,
      focusTask,
      pendingTasks,
      todayHabits,
      todayStr,
      momentumPercent,
      momentumPlanDone,
      activeFocusTask,
      activeTimer?.startTime,
      elapsedSeconds,
      calendarHabits.isConnected,
      calendarHabits.nextRecommendation,
    ],
  );

  const timeBlocks: TimeBlockViewModel[] = useMemo(() => {
    return TIME_BLOCKS.map((block) => {
      const isCurrent = block.id === currentBlock;
      const meta = getTimeBlockScheduleMeta(allTodayPlanItems, block.id);
      const subtitle = formatTimeBlockSubtitle(allTodayPlanItems, block.id);

      let status: TimeBlockViewModel['status'] = 'Upcoming';
      if (meta.itemCount === 0) {
        status = 'Upcoming';
      } else if (meta.openCount === 0) {
        status = 'Done';
      } else if (isCurrent) {
        status = 'Current';
      } else {
        const isPast =
          (block.id === 'morning' && ['afternoon', 'evening', 'night'].includes(currentBlock)) ||
          (block.id === 'afternoon' && ['evening', 'night'].includes(currentBlock)) ||
          (block.id === 'evening' && currentBlock === 'night');
        status = isPast ? 'Done' : 'Upcoming';
      }

      return {
        id: block.id,
        label: block.label,
        subtitle,
        status,
        icon: block.icon,
      } as TimeBlockViewModel;
    });
  }, [currentBlock, allTodayPlanItems]);

  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const start = new Date(activeTimer.startTime).getTime();
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);

      let pulseLoop: Animated.CompositeAnimation | null = null;
      if (!reduceMotion) {
        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ]),
        );
        pulseLoop.start();
      } else {
        pulseAnim.setValue(1);
      }

      return () => {
        clearInterval(interval);
        pulseLoop?.stop();
      };
    }

    setElapsedSeconds(0);
    pulseAnim.setValue(1);
  }, [activeTimer, pulseAnim, reduceMotion]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await calendarHabits.refreshCalendar();
    setTimeout(() => setRefreshing(false), 600);
  }, [calendarHabits.refreshCalendar]);

  const handleToggleFocus = useCallback(() => {
    if (!focusTask) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeTimer?.taskId === focusTask.id) {
      stopTimer();
    } else {
      startTimer(focusTask.id);
      setFocusedTaskId(focusTask.id);
    }
  }, [activeTimer, focusTask, startTimer, stopTimer]);

  const handleCompleteTask = useCallback(
    (task: Task) => {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (activeTimer?.taskId === task.id) {
        stopTimer();
      }
      updateTask(task.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      if (focusedTaskId === task.id) {
        setFocusedTaskId(null);
      }
    },
    [activeTimer, stopTimer, updateTask, focusedTaskId],
  );

  const handleToggleHabit = useCallback(
    (habit: Task) => {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      toggleTodayHabit(habit.id);
    },
    [toggleTodayHabit],
  );

  const handleQuickAdd = useCallback(() => {
    if (!quickTaskTitle.trim()) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (quickAddMode === 'habit') {
      addTask({
        title: quickTaskTitle.trim(),
        priority: 'medium',
        status: 'todo',
        category: 'personal',
        tags: [],
        subTasks: [],
        reminders: [],
        attachments: [],
        completionLogs: [],
        progress: 0,
        isRecurring: false,
        isHabit: true,
        habitFrequency: { days: [0, 1, 2, 3, 4, 5, 6] },
        habitCompletions: {},
        habitStreak: 0,
        color: HABIT_COLORS[habits.length % HABIT_COLORS.length],
      });
    } else {
      addTask({
        title: quickTaskTitle.trim(),
        priority: 'medium',
        status: 'todo',
        category: 'personal',
        tags: [],
        subTasks: [],
        reminders: [],
        attachments: [],
        completionLogs: [],
        progress: 0,
        isRecurring: false,
        isHabit: false,
      });
    }
    setQuickTaskTitle('');
  }, [quickTaskTitle, quickAddMode, addTask, habits.length]);

  const handleDeleteTask = useCallback(
    (task: Task) => {
      Alert.alert('Delete Task', `Delete "${task.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            if (activeTimer?.taskId === task.id) {
              stopTimer();
            }
            deleteTask(task.id);
          },
        },
      ]);
    },
    [activeTimer, deleteTask, stopTimer],
  );

  const handleSetInProgress = useCallback(
    (task: Task) => {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      updateTask(task.id, { status: 'in-progress' });
    },
    [updateTask],
  );

  const handleAISuggestionPress = useCallback(() => {
    const { action } = aiSuggestionCopy;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    switch (action.type) {
      case 'focus_task': {
        const task = allTasks.find((t) => t.id === action.taskId);
        if (!task || task.isHabit) return;
        setFocusedTaskId(task.id);
        if (task.status !== 'completed' && task.status !== 'cancelled') {
          startTimer(task.id);
        }
        break;
      }
      case 'complete_habit': {
        const habit = habits.find((h) => h.id === action.habitId);
        if (habit) handleToggleHabit(habit);
        break;
      }
      case 'edit_task': {
        const task = allTasks.find((t) => t.id === action.taskId);
        if (task) setEditingTask(task);
        break;
      }
      case 'create_task':
        if (quickAddMode === 'habit') {
          setIsCreatingHabit(true);
        } else {
          setIsCreatingTask(true);
        }
        break;
      default:
        break;
    }
  }, [
    aiSuggestionCopy,
    allTasks,
    habits,
    handleToggleHabit,
    startTimer,
    quickAddMode,
  ]);

  const handleViewAllHabits = useCallback(() => {
    setShowAllHabitsModal(true);
  }, []);

  const handleTaskPress = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleTaskCompleteFromList = useCallback(
    (task: Task) => {
      if (task.status === 'completed') {
        updateTask(task.id, { status: 'todo', completedAt: undefined });
      } else {
        handleCompleteTask(task);
      }
    },
    [handleCompleteTask, updateTask],
  );

  const getTaskColor = useCallback((task: Task) => {
    if (task.color) return task.color;
    return PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  }, []);

  const getTaskMeta = useCallback((task: Task) => {
    const parts: string[] = [task.priority];
    if (task.estimatedDuration) {
      parts.push(`${task.estimatedDuration} min`);
    } else if (task.category) {
      parts.push(task.category);
    }
    return parts.join(' · ');
  }, []);

  const handleConnectCalendar = useCallback(async () => {
    const connected = await calendarHabits.connectCalendar();
    if (!connected) {
      setShowEventKitManager(true);
      return;
    }
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [calendarHabits.connectCalendar]);

  const calendarPlannerEl = (
    <CalendarHabitPlanner
      colors={colors}
      isDark={isDark}
      isCalendarAvailable={calendarHabits.isCalendarAvailable}
      isConnected={calendarHabits.isConnected}
      isLoading={calendarHabits.isLoading}
      todayEventCount={calendarHabits.todayEventCount}
      recommendations={calendarHabits.recommendations}
      onConnectPress={handleConnectCalendar}
      onManageCalendarsPress={() => setShowEventKitManager(true)}
    />
  );

  const hasContent = allTasks.length > 0 || todayHabits.length > 0;
  const isFocusActive = !!(focusTask && activeTimer?.taskId === focusTask.id);

  return (
    <>
      <TabWalkthrough tabName="tasks" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F6F7FA' }]}>
        <TasksDashboardView
          colors={colors}
          isDark={isDark}
          paddingTop={insets.top + 16}
          paddingBottom={120}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          momentumPercent={momentumPercent}
          momentumTasksDone={momentumTasksDone}
          momentumTasksTotal={momentumTasksTotal}
          momentumHabitsDone={momentumHabitsDone}
          momentumHabitsTotal={momentumHabitsTotal}
          streakCount={maxStreak}
          peakPillText={getPeakPillText(chronoInfo, inPeak || inSecondaryPeak)}
          aiSuggestion={aiSuggestionCopy.message}
          aiSuggestionBold={aiSuggestionCopy.emphasis}
          focusTask={focusTask ?? null}
          isFocusActive={isFocusActive}
          focusElapsed={formatTime(elapsedSeconds)}
          inPeak={inPeak || inSecondaryPeak}
          quickTaskTitle={quickTaskTitle}
          onQuickTaskTitleChange={setQuickTaskTitle}
          quickAddMode={quickAddMode}
          onQuickAddModeChange={setQuickAddMode}
          onQuickAdd={handleQuickAdd}
          focusHabit={focusHabit}
          incompleteHabitsCount={incompleteHabitsToday.length}
          onCompleteFocusHabit={() => focusHabit && handleToggleHabit(focusHabit)}
          completionFeedback={completionFeedback}
          onDismissCompletionFeedback={dismissFeedback}
          onHabitMood={setTodayMood}
          todayLog={todayLog}
          weeklyProgressByHabitId={weeklyProgressByHabitId}
          onEditFocusHabit={() => focusHabit && setEditingTask(focusHabit)}
          onStartFocus={handleToggleFocus}
          onPauseFocus={handleToggleFocus}
          onCompleteFocus={() => focusTask && handleCompleteTask(focusTask)}
          onEditFocus={() => focusTask && setEditingTask(focusTask)}
          todaySourceFilter={todaySourceFilter}
          onTodaySourceFilterChange={setTodaySourceFilter}
          todayStatusFilter={todayStatusFilter}
          onTodayStatusFilterChange={(filter) => {
            setTodayStatusFilter(filter);
            if (filter === 'open') {
              setTodayDoneScope('today');
            }
          }}
          todayDoneScope={todayDoneScope}
          onTodayDoneScopeChange={setTodayDoneScope}
          allOpenCount={allOpenCount}
          allDoneCount={allDoneCount}
          allWeekDoneCount={allWeekDoneCount}
          tasksOpenCount={tasksOpenCount}
          tasksDoneCount={tasksDoneCount}
          tasksWeekDoneCount={tasksWeekDoneCount}
          habitsOpenCount={habitsOpenCount}
          habitsDoneCount={habitsDoneCount}
          habitsWeekDoneCount={habitsWeekDoneCount}
          reduceMotion={reduceMotion}
          onViewCompletionHistory={() => {
            setAllTasksModalStatus('completed');
            setShowAllTasksModal(true);
          }}
          todayPlanItems={filteredTodayPlanItems}
          focusedTaskId={focusedTaskId}
          onTaskPress={handleTaskPress}
          onTaskComplete={handleTaskCompleteFromList}
          onTaskDelete={handleDeleteTask}
          onSetInProgress={handleSetInProgress}
          onSetTaskFocus={(taskId) => {
            setFocusedTaskId(taskId);
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          getTaskColor={getTaskColor}
          getTaskMeta={getTaskMeta}
          onToggleHabit={handleToggleHabit}
          timeBlocks={timeBlocks}
          pulseAnim={pulseAnim}
          hasContent={hasContent}
          onCreateTask={() => setIsCreatingTask(true)}
          onSeeAllTasks={() => {
            setAllTasksModalStatus('all');
            setShowAllTasksModal(true);
          }}
          onViewAllHabits={handleViewAllHabits}
          onAISuggestionPress={handleAISuggestionPress}
          aiActionable={aiSuggestionCopy.action.type !== 'none'}
          onOpenPeakScheduler={() => setShowPeakScheduler(true)}
          onOpenHabitCoach={() => setShowHabitCoach((v) => !v)}
          showHabitCoach={showHabitCoach}
          calendarPlanner={calendarPlannerEl}
          habitTimeById={habitTimeById}
        />
      </View>

      <EventKitManager
        visible={showEventKitManager}
        onClose={() => setShowEventKitManager(false)}
      />

      <TasksAllListModal
        visible={showAllTasksModal}
        onClose={() => setShowAllTasksModal(false)}
        initialStatusFilter={allTasksModalStatus}
        tasks={tasks}
        colors={colors}
        isDark={isDark}
        focusedTaskId={focusedTaskId}
        getTaskColor={getTaskColor}
        getTaskMeta={getTaskMeta}
        onTaskPress={(task) => {
          setShowAllTasksModal(false);
          setEditingTask(task);
        }}
        onTaskComplete={handleTaskCompleteFromList}
        onTaskDelete={handleDeleteTask}
        onSetInProgress={handleSetInProgress}
        onSetFocus={(taskId) => {
          setFocusedTaskId(taskId);
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
      />

      <PeakPerformanceScheduler
        visible={showPeakScheduler}
        onClose={() => setShowPeakScheduler(false)}
        peakStartHour={chronoInfo?.peakHours.start}
        peakEndHour={chronoInfo?.peakHours.end}
      />

      <HabitsAllListModal
        visible={showAllHabitsModal}
        onClose={() => setShowAllHabitsModal(false)}
        habits={todayHabits}
        todayStr={todayStr}
        colors={colors}
        isDark={isDark}
        weeklyProgressByHabitId={weeklyProgressByHabitId}
        onToggleHabit={handleToggleHabit}
        onHabitPress={(habit) => {
          setShowAllHabitsModal(false);
          setEditingTask(habit);
        }}
      />

      <TaskEditModal
        visible={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={(taskId, updates) => {
          updateTask(taskId, updates);
        }}
        onDelete={(taskId) => {
          deleteTask(taskId);
          setEditingTask(null);
        }}
        isHabit={editingTask?.isHabit}
      />

      <TaskEditModal
        visible={isCreatingTask}
        task={null}
        onClose={() => setIsCreatingTask(false)}
        onSave={(_, updates) => {
          addTask({
            title: updates.title || 'New Task',
            description: updates.description,
            priority: updates.priority || 'medium',
            status: 'todo',
            category: updates.category || 'personal',
            tags: updates.tags || [],
            subTasks: [],
            reminders: [],
            attachments: [],
            completionLogs: [],
            progress: 0,
            isRecurring: false,
            isHabit: false,
            dueDate: updates.dueDate,
          });
          setIsCreatingTask(false);
        }}
        isCreating
      />

      <TaskEditModal
        visible={isCreatingHabit}
        task={null}
        onClose={() => setIsCreatingHabit(false)}
        onSave={(_, updates) => {
          addTask({
            title: updates.title || 'New Habit',
            description: updates.description,
            priority: updates.priority || 'medium',
            status: 'todo',
            category: updates.category || 'personal',
            tags: updates.tags || [],
            subTasks: [],
            reminders: [],
            attachments: [],
            completionLogs: [],
            progress: 0,
            isRecurring: false,
            isHabit: true,
            habitFrequency: { days: [0, 1, 2, 3, 4, 5, 6] },
            habitCompletions: {},
            habitStreak: 0,
            color: HABIT_COLORS[habits.length % HABIT_COLORS.length],
          });
          setIsCreatingHabit(false);
        }}
        isCreating
        isHabit
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
