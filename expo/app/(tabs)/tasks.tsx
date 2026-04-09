import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity, 
  RefreshControl,
  Platform,
  Alert,
  Animated,
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Play, 
  Pause,
  CheckCircle2, 
  Circle,
  Zap,
  Clock,
  ChevronRight,
  Plus,
  Flame,
  Target,
  TrendingUp,
  Moon,
  Sun,
  Coffee,
  Sunset,
  Edit3,
  ListChecks
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Task } from '@/types/task';
import { useTasks } from '@/hooks/useTasksStore';
import { TaskEditModal } from '@/components/TaskEditModal';
import { getTodayFormatted, shouldDoHabitToday, calculateStreak } from '@/utils/dateUtils';
import TabWalkthrough from '@/components/TabWalkthrough';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isInPeakHours, getChronotypeInfo, getChronotypeGreetingTip, getSecondaryPeakHours } from '@/constants/chronotypes';



const TIME_BLOCKS = [
  { id: 'morning', label: 'Morning', icon: Coffee, hours: [6, 12], color: '#F59E0B' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, hours: [12, 17], color: '#3B82F6' },
  { id: 'evening', label: 'Evening', icon: Sunset, hours: [17, 21], color: '#8B5CF6' },
  { id: 'night', label: 'Night', icon: Moon, hours: [21, 6], color: '#6366F1' },
];

const getCurrentTimeBlock = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { profile } = useUserProfile();
  const { 
    tasks, 
    addTask,
    updateTask,
    deleteTask,
    activeTimer,
    startTimer,
    stopTimer
  } = useTasks();
  
  const [refreshing, setRefreshing] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const todayStr = getTodayFormatted();
  const currentBlock = getCurrentTimeBlock();
  
  const allTasks = useMemo(() => tasks.filter(t => !t.isHabit), [tasks]);
  const habits = useMemo(() => tasks.filter(t => t.isHabit), [tasks]);

  const chronoInfo = profile?.chronotype ? getChronotypeInfo(profile.chronotype) : undefined;
  const inPeak = chronoInfo ? isInPeakHours(chronoInfo) : false;
  const secondaryPeak = chronoInfo ? getSecondaryPeakHours(chronoInfo) : null;
  const inSecondaryPeak = secondaryPeak ? (() => {
    const h = new Date().getHours();
    return h >= secondaryPeak.start && h < secondaryPeak.end;
  })() : false;
  
  const todayHabits = useMemo(() => habits.filter(habit => {
    if (!habit.habitFrequency) return false;
    return shouldDoHabitToday(habit.habitFrequency);
  }), [habits]);
  
  const pendingTasks = useMemo(() => 
    allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const baseA = priorityOrder[a.priority] || 1;
        const baseB = priorityOrder[b.priority] || 1;
        if (inPeak || inSecondaryPeak) {
          const boostA = (a.priority === 'urgent' || a.priority === 'high') ? 2 : 0;
          const boostB = (b.priority === 'urgent' || b.priority === 'high') ? 2 : 0;
          return (baseB + boostB) - (baseA + boostA);
        }
        return baseB - baseA;
      }),
    [allTasks, inPeak, inSecondaryPeak]
  );
  
  const completedToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return allTasks.filter(t => 
      t.status === 'completed' && 
      t.completedAt && 
      new Date(t.completedAt) >= todayStart
    ).length;
  }, [allTasks]);
  
  const completedHabitsToday = useMemo(() => 
    todayHabits.filter(h => h.habitCompletions?.[todayStr]).length,
    [todayHabits, todayStr]
  );
  
  const totalTodayGoal = pendingTasks.length + todayHabits.length;
  const totalCompleted = completedToday + completedHabitsToday;
  const momentumPercent = totalTodayGoal > 0 ? Math.round((totalCompleted / (totalTodayGoal + totalCompleted)) * 100) : 0;
  
  const focusTask = useMemo(() => {
    if (focusedTaskId) {
      return pendingTasks.find(t => t.id === focusedTaskId) || pendingTasks[0];
    }
    return pendingTasks[0];
  }, [pendingTasks, focusedTaskId]);
  
  const upNextTasks = useMemo(() => 
    pendingTasks.filter(t => t.id !== focusTask?.id).slice(0, 5),
    [pendingTasks, focusTask]
  );
  
  const maxStreak = useMemo(() => 
    habits.reduce((max, h) => Math.max(max, h.habitStreak || 0), 0),
    [habits]
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: momentumPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [momentumPercent, progressAnim]);

  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const start = new Date(activeTimer.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      }, 1000);
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
      pulseAnim.setValue(1);
    }
  }, [activeTimer, pulseAnim]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleToggleFocus = useCallback((task: Task) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (activeTimer?.taskId === task.id) {
      stopTimer();
    } else {
      startTimer(task.id);
      setFocusedTaskId(task.id);
    }
  }, [activeTimer, startTimer, stopTimer]);

  const handleCompleteTask = useCallback((task: Task) => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (activeTimer?.taskId === task.id) {
      stopTimer();
    }
    
    updateTask(task.id, { 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    if (focusedTaskId === task.id) {
      setFocusedTaskId(null);
    }
  }, [activeTimer, stopTimer, updateTask, focusedTaskId]);

  const handleToggleHabit = useCallback((habit: Task) => {
    if (!habit.habitCompletions) return;
    
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const isCompleted = habit.habitCompletions[todayStr];
    const updatedCompletions = { ...habit.habitCompletions };
    
    if (isCompleted) {
      delete updatedCompletions[todayStr];
    } else {
      updatedCompletions[todayStr] = true;
    }
    
    const streak = calculateStreak(updatedCompletions);
    
    updateTask(habit.id, {
      habitCompletions: updatedCompletions,
      habitStreak: streak,
      status: updatedCompletions[todayStr] ? 'completed' : 'todo'
    });
  }, [todayStr, updateTask]);

  const handleQuickAdd = useCallback(() => {
    if (!quickTaskTitle.trim()) return;
    
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
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
    
    setQuickTaskTitle('');
  }, [quickTaskTitle, addTask]);

  const handleDeleteTask = useCallback((task: Task) => {
    Alert.alert(
      'Delete Task',
      `Delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            deleteTask(task.id);
          },
        },
      ]
    );
  }, [deleteTask]);

  const getPriorityGradient = (priority: string): [string, string] => {
    switch (priority) {
      case 'urgent': return ['#EF4444', '#DC2626'];
      case 'high': return ['#F97316', '#EA580C'];
      case 'medium': return ['#3B82F6', '#2563EB'];
      default: return ['#6B7280', '#4B5563'];
    }
  };

  const renderMomentumRing = () => {
    const size = 120;
    const strokeWidth = 10;
    
    return (
      <View style={styles.momentumContainer}>
        <View style={styles.momentumRing}>
          <View style={[styles.ringBackground, { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }]} />
          <Animated.View style={[styles.ringProgress, {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#10B981',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: [{ rotate: `${(momentumPercent / 100) * 360}deg` }],
          }]} />
          <View style={styles.momentumCenter}>
            <Zap size={20} color="#10B981" />
            <Text style={[styles.momentumValue, { color: colors.text }]}>{momentumPercent}%</Text>
            <Text style={[styles.momentumLabel, { color: colors.textSecondary }]}>momentum</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>done</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{pendingTasks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>pending</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.statItem}>
            <View style={styles.streakBadge}>
              <Flame size={14} color="#F59E0B" />
              <Text style={styles.streakNumber}>{maxStreak}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>streak</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFocusHero = () => {
    if (!focusTask) {
      return (
        <View style={[styles.emptyFocus, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
          <Target size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyFocusTitle, { color: colors.text }]}>All clear!</Text>
          <Text style={[styles.emptyFocusSubtitle, { color: colors.textSecondary }]}>
            Add a task to start your flow
          </Text>
        </View>
      );
    }
    
    const isActive = activeTimer?.taskId === focusTask.id;
    const gradientColors = getPriorityGradient(focusTask.priority);
    
    return (
      <Animated.View style={[styles.focusHero, { transform: [{ scale: isActive ? pulseAnim : 1 }] }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.focusGradient}
        >
          <View style={styles.focusHeader}>
            <View style={styles.focusBadge}>
              <Zap size={12} color="#fff" />
              <Text style={styles.focusBadgeText}>{(inPeak || inSecondaryPeak) ? 'PEAK FOCUS' : 'FOCUS'}</Text>
            </View>
            {isActive && (
              <View style={styles.timerBadge}>
                <Clock size={12} color="#fff" />
                <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.focusTitle} numberOfLines={2}>{focusTask.title}</Text>
          
          {focusTask.description && (
            <Text style={styles.focusDescription} numberOfLines={1}>{focusTask.description}</Text>
          )}
          
          <View style={styles.focusActions}>
            <TouchableOpacity 
              style={[styles.focusButton, styles.focusButtonPrimary]}
              onPress={() => handleToggleFocus(focusTask)}
              activeOpacity={0.8}
            >
              {isActive ? (
                <>
                  <Pause size={18} color={gradientColors[0]} />
                  <Text style={[styles.focusButtonText, { color: gradientColors[0] }]}>Pause</Text>
                </>
              ) : (
                <>
                  <Play size={18} color={gradientColors[0]} />
                  <Text style={[styles.focusButtonText, { color: gradientColors[0] }]}>Start</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.focusButton, styles.focusButtonEdit]}
              onPress={() => setEditingTask(focusTask)}
              activeOpacity={0.8}
            >
              <Edit3 size={18} color="#fff" />
              <Text style={[styles.focusButtonText, { color: '#fff' }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.focusButton, styles.focusButtonSecondary]}
              onPress={() => handleCompleteTask(focusTask)}
              activeOpacity={0.8}
            >
              <CheckCircle2 size={18} color="#fff" />
              <Text style={[styles.focusButtonText, { color: '#fff' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderUpNext = () => {
    if (upNextTasks.length === 0 && todayHabits.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={18} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Up Next</Text>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.upNextScroll}
        >
          {upNextTasks.map((task) => (
            <TouchableOpacity 
              key={task.id}
              style={[styles.upNextCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
              onPress={() => setEditingTask(task)}
              onLongPress={() => handleDeleteTask(task)}
              activeOpacity={0.7}
            >
              <View style={[styles.priorityStripe, { backgroundColor: getPriorityGradient(task.priority)[0] }]} />
              <Text style={[styles.upNextTitle, { color: colors.text }]} numberOfLines={2}>
                {task.title}
              </Text>
              <TouchableOpacity 
                style={styles.upNextAction}
                onPress={() => {
                  setFocusedTaskId(task.id);
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text style={styles.upNextActionText}>Focus</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderHabits = () => {
    if (todayHabits.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target size={18} color="#10B981" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Habits</Text>
          <Text style={[styles.sectionBadge, { backgroundColor: '#DCFCE7' }]}>
            {completedHabitsToday}/{todayHabits.length}
          </Text>
        </View>
        
        <View style={styles.habitsGrid}>
          {todayHabits.map((habit) => {
            const isCompleted = habit.habitCompletions?.[todayStr];
            const habitColor = habit.color || '#10B981';
            
            return (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitChip,
                  { 
                    backgroundColor: isCompleted ? habitColor : (isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'),
                    borderColor: isCompleted ? habitColor : 'transparent',
                  }
                ]}
                onPress={() => handleToggleHabit(habit)}
                activeOpacity={0.7}
              >
                {isCompleted ? (
                  <CheckCircle2 size={16} color="#fff" />
                ) : (
                  <Circle size={16} color={habitColor} />
                )}
                <Text 
                  style={[
                    styles.habitChipText, 
                    { color: isCompleted ? '#fff' : colors.text }
                  ]}
                  numberOfLines={1}
                >
                  {habit.title}
                </Text>
                {(habit.habitStreak || 0) > 0 && (
                  <View style={[styles.miniStreak, { backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : '#FEF3C7' }]}>
                    <Flame size={10} color={isCompleted ? '#fff' : '#F59E0B'} />
                    <Text style={[styles.miniStreakText, { color: isCompleted ? '#fff' : '#D97706' }]}>
                      {habit.habitStreak}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAllTasks = () => {
    const allPendingAndCompleted = allTasks.filter(t => t.status !== 'cancelled');
    if (allPendingAndCompleted.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ListChecks size={18} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Tasks</Text>
          <Text style={[styles.allTasksCount, { color: colors.textSecondary }]}>
            {allPendingAndCompleted.length}
          </Text>
        </View>
        
        {allPendingAndCompleted.map((task) => {
          const isCompleted = task.status === 'completed';
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
          const gradientColors = getPriorityGradient(task.priority);
          
          return (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.allTaskCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' },
                isCompleted && styles.allTaskCardCompleted,
              ]}
              onPress={() => setEditingTask(task)}
              activeOpacity={0.7}
              testID={`all-task-${task.id}`}
            >
              <TouchableOpacity
                style={styles.allTaskCheckbox}
                onPress={() => {
                  if (isCompleted) {
                    updateTask(task.id, { status: 'todo', completedAt: undefined });
                  } else {
                    handleCompleteTask(task);
                  }
                }}
              >
                {isCompleted ? (
                  <View style={styles.allTaskChecked}>
                    <CheckCircle2 size={20} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.allTaskUnchecked, { borderColor: isOverdue ? '#EF4444' : '#D1D5DB' }]}>
                    <Circle size={20} color={isOverdue ? '#EF4444' : '#D1D5DB'} />
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.allTaskContent}>
                <Text 
                  style={[
                    styles.allTaskTitle, 
                    { color: colors.text },
                    isCompleted && styles.allTaskTitleDone
                  ]} 
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                <View style={styles.allTaskMeta}>
                  <View style={[styles.allTaskPriority, { backgroundColor: gradientColors[0] + '18' }]}>
                    <Text style={[styles.allTaskPriorityText, { color: gradientColors[0] }]}>
                      {task.priority}
                    </Text>
                  </View>
                  {task.dueDate && (
                    <Text style={[styles.allTaskDue, isOverdue && { color: '#EF4444' }]}>
                      {isOverdue ? 'Overdue' : new Date(task.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                  {task.description && (
                    <Text style={[styles.allTaskDescHint, { color: colors.textSecondary }]} numberOfLines={1}>
                      {task.description}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.allTaskActions}>
                <TouchableOpacity
                  style={styles.allTaskEditBtn}
                  onPress={() => setEditingTask(task)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit3 size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTimeBlocks = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={18} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Day</Text>
          {chronoInfo && (inPeak || inSecondaryPeak) && (
            <View style={[styles.peakIndicator, { backgroundColor: chronoInfo.color + '18' }]}>
              <Zap size={12} color={chronoInfo.color} />
              <Text style={[styles.peakIndicatorText, { color: chronoInfo.color }]}>Peak Zone</Text>
            </View>
          )}
        </View>

        <View style={styles.timeBlocksRow}>
          {TIME_BLOCKS.map((block) => {
            const IconComponent = block.icon;
            const isActive = block.id === currentBlock;
            const isPeakBlock = chronoInfo ? (() => {
              const start = chronoInfo.peakHours.start;
              const end = chronoInfo.peakHours.end;
              const [bStart, bEnd] = block.hours;
              if (start <= end) {
                return bStart < end && bEnd > start;
              }
              return bStart >= start || bEnd <= end;
            })() : false;
            
            return (
              <View 
                key={block.id}
                style={[
                  styles.timeBlock,
                  { 
                    backgroundColor: isActive 
                      ? `${block.color}15` 
                      : (isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB'),
                    borderColor: isActive ? block.color : 'transparent',
                  }
                ]}
              >
                <IconComponent size={20} color={isActive ? block.color : colors.textSecondary} />
                <Text style={[
                  styles.timeBlockLabel, 
                  { color: isActive ? block.color : colors.textSecondary }
                ]}>
                  {block.label}
                </Text>
                {isActive && <View style={[styles.timeBlockDot, { backgroundColor: block.color }]} />}
                {isPeakBlock && chronoInfo && (
                  <View style={[styles.timeBlockPeakBadge, { backgroundColor: chronoInfo.color + '20' }]}>
                    <Zap size={8} color={chronoInfo.color} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderQuickAdd = () => {
    return (
      <View style={[styles.quickAdd, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}>
        <TextInput
          style={[styles.quickAddInput, { color: colors.text }]}
          placeholder="Quick add task..."
          placeholderTextColor={colors.textSecondary}
          value={quickTaskTitle}
          onChangeText={setQuickTaskTitle}
          onSubmitEditing={handleQuickAdd}
          returnKeyType="done"
        />
        <TouchableOpacity 
          style={[styles.quickAddButton, { opacity: quickTaskTitle.trim() ? 1 : 0.4 }]}
          onPress={handleQuickAdd}
          disabled={!quickTaskTitle.trim()}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <TabWalkthrough tabName="tasks" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        >
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {currentBlock === 'morning' ? 'Good morning' : 
               currentBlock === 'afternoon' ? 'Good afternoon' : 
               currentBlock === 'evening' ? 'Good evening' : 'Late night'}
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>Focus Flow</Text>
            {chronoInfo && (
              <Text style={[styles.chronoSubtitle, { color: (inPeak || inSecondaryPeak) ? chronoInfo.color : colors.textSecondary }]}>
                {getChronotypeGreetingTip(chronoInfo)}
              </Text>
            )}
          </View>
          
          {allTasks.length === 0 && todayHabits.length === 0 ? (
            <View style={styles.zeroState}>
              <View style={styles.zeroStateIconWrap}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.zeroStateIconGradient}
                >
                  <ListChecks size={36} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.zeroStateTitle, { color: colors.text }]}>No tasks yet</Text>
              <Text style={[styles.zeroStateSubtitle, { color: colors.textSecondary }]}>
                Add your first task below to start building momentum
              </Text>
              {renderQuickAdd()}
              <TouchableOpacity
                style={styles.zeroStateButton}
                onPress={() => setIsCreatingTask(true)}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.zeroStateButtonText}>Create Detailed Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {renderMomentumRing()}
              {renderFocusHero()}
              {renderQuickAdd()}
              {renderUpNext()}
              {renderHabits()}
              {renderTimeBlocks()}
              {renderAllTasks()}
            </>
          )}
          
          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
      
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
        isCreating={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 28,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    opacity: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  chronoSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  momentumContainer: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 8,
  },
  momentumRing: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  ringBackground: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
  },
  momentumCenter: {
    alignItems: 'center',
  },
  momentumValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  momentumLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  focusHero: {
    marginBottom: 22,
    borderRadius: 26,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 28,
      },
      android: { elevation: 12 },
    }),
  },
  focusGradient: {
    padding: 22,
    minHeight: 180,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  focusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
  },
  focusTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 28,
  },
  focusDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  focusActions: {
    flexDirection: 'row',
    gap: 12,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    flex: 1,
  },
  focusButtonPrimary: {
    backgroundColor: '#fff',
  },
  focusButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  focusButtonEdit: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  focusButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  emptyFocus: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyFocusTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 16,
  },
  emptyFocusSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  zeroState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 12,
  },
  zeroStateIconWrap: {
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
  },
  zeroStateIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroStateTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  zeroStateSubtitle: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },
  zeroStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
  },
  zeroStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  quickAddInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    letterSpacing: -0.1,
  },
  quickAddButton: {
    backgroundColor: '#10B981',
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    flex: 1,
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  upNextScroll: {
    paddingRight: 20,
    gap: 12,
  },
  upNextCard: {
    width: 165,
    padding: 14,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
    overflow: 'hidden',
  },
  priorityStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  upNextTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    marginBottom: 12,
    minHeight: 40,
  },
  upNextAction: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upNextActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  habitChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    maxWidth: 100,
  },
  miniStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  miniStreakText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  allTasksCount: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  allTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  allTaskCardCompleted: {
    opacity: 0.6,
  },
  allTaskCheckbox: {
    marginRight: 12,
  },
  allTaskChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allTaskUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allTaskContent: {
    flex: 1,
    marginRight: 8,
  },
  allTaskTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  allTaskTitleDone: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.6,
  },
  allTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allTaskPriority: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  allTaskPriorityText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  allTaskDue: {
    fontSize: 12,
    color: '#6B7280',
  },
  allTaskDescHint: {
    fontSize: 12,
    flex: 1,
  },
  allTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allTaskEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBlocksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    position: 'relative',
  },
  timeBlockLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  timeBlockDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  peakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto' as const,
  },
  peakIndicatorText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },

  timeBlockPeakBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
