import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Trash2, Check, Flame, Calendar, Clock, TrendingUp, Target, Edit2, X, Snowflake, Shield, Repeat, Zap, Gift, BarChart3 } from 'lucide-react-native';
import { useHabit, useHabits } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { TaskHabitPartnerScreen } from '@/components/habit/TaskHabitPartnerScreen';
import { COLORS } from '@/constants/colors';
import HabitIcon from '@/components/HabitIcon';
import ProgressCircle from '@/components/ProgressCircle';
import DaySelector from '@/components/DaySelector';
import { getCompletionRate, getLast7Days, getDayName, getWeekStartDate, getWeekCompletionCount } from '@/utils/dateUtils';
import { useTheme } from '@/hooks/useTheme';
import { HabitAccountabilitySection } from '@/components/social/HabitAccountabilitySection';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HabitDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { colors } = useTheme();
  const habit = useHabit(id ?? '');
  const tasksContext = useTasks();
  const taskHabit = useMemo(() => {
    if (!id) return undefined;
    return (tasksContext?.allTasks ?? []).find((t) => t.id === id && t.isHabit);
  }, [tasksContext?.allTasks, id]);
  const { toggleHabitCompletion, deleteHabit, getHabitStats, updateHabit, useStreakFreeze, getStreakFreezeInfo, getPartialCreditStats } = useHabits();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDays, setEditingDays] = useState<number[]>([]);
  const [_freezeAnimating, setFreezeAnimating] = useState(false);
  
  const freezeInfo = useMemo(() => {
    if (!habit) return { availableFreezes: 0, frozenDates: [] as string[], freezesUsedThisWeek: 0, canFreeze: false };
    return getStreakFreezeInfo(habit.id);
  }, [habit, getStreakFreezeInfo]);

  const isTodayFrozen = useMemo(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return freezeInfo.frozenDates.includes(today);
  }, [freezeInfo]);

  const handleUseFreeze = useCallback(() => {
    if (!habit || !freezeInfo.canFreeze || habit.completedToday || isTodayFrozen) return;
    
    Alert.alert(
      'Use Streak Freeze?',
      `This will protect your ${habit.streak > 0 ? habit.streak + ' day' : ''} streak for today. You have ${freezeInfo.availableFreezes} freeze${freezeInfo.availableFreezes !== 1 ? 's' : ''} left this week.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze It',
          onPress: () => {
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setFreezeAnimating(true);
            useStreakFreeze(habit.id);
            setTimeout(() => setFreezeAnimating(false), 1500);
          },
        },
      ]
    );
  }, [habit, freezeInfo, isTodayFrozen, useStreakFreeze]);

  const handleToggleCompletion = useCallback(() => {
    if (habit) {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      toggleHabitCompletion(habit.id);
    }
  }, [habit, toggleHabitCompletion]);
  
  const handleDelete = useCallback(() => {
    if (!habit) return;
    
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            deleteHabit(habit.id);
            router.back();
          },
        },
      ]
    );
  }, [habit, deleteHabit, router]);
  
  const handleEditSchedule = useCallback(() => {
    if (!habit) return;
    setEditingDays(habit.frequency.days);
    setShowEditModal(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [habit]);
  
  const handleSaveSchedule = useCallback(() => {
    if (!habit) return;
    
    if (editingDays.length === 0) {
      Alert.alert('No Days Selected', 'Please select at least one day for the habit.');
      return;
    }
    
    updateHabit({
      ...habit,
      frequency: {
        ...habit.frequency,
        type: habit.frequency?.type || 'specific_days',
        days: editingDays,
      },
    });
    
    setShowEditModal(false);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [habit, editingDays, updateHabit]);
  
  const handleDaySelect = useCallback((day: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditingDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  }, []);

  const stats = useMemo(() => {
    if (!habit) return null;
    return getHabitStats(habit.id);
  }, [habit, getHabitStats]);

  const partialCreditStats = useMemo(() => {
    if (!habit) return null;
    return getPartialCreditStats(habit.id);
  }, [habit, getPartialCreditStats]);

  const comebackInfo = useMemo(() => {
    if (!habit) return null;
    return habit.comebackBonus;
  }, [habit]);

  const last7Days = useMemo(() => getLast7Days(), []);

  const isFlexibleSchedule = habit?.frequency?.type === 'times_per_week';
  const hasGracePeriod = habit?.gracePeriod?.enabled === true;

  const weeklyProgress = useMemo(() => {
    if (!habit || !isFlexibleSchedule) return { completed: 0, target: 0 };
    const weekStart = getWeekStartDate(new Date());
    const completed = getWeekCompletionCount(habit.completions, weekStart);
    return { completed, target: habit.frequency.timesPerWeek || 0 };
  }, [habit, isFlexibleSchedule]);

  const frequencyText = useMemo(() => {
    if (!habit) return '';
    if (habit.frequency?.type === 'times_per_week' && habit.frequency.timesPerWeek) {
      return `${habit.frequency.timesPerWeek}x per week (flexible)`;
    }
    const days = habit.frequency.days;
    if (days.length === 7) return 'Every day';
    if (days.length === 0) return 'No schedule set';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map(d => FULL_DAY_NAMES[d]).join(', ');
  }, [habit]);
  
  if (!habit && taskHabit) {
    return <TaskHabitPartnerScreen task={taskHabit} />;
  }

  if (!habit) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Habit not found</Text>
      </View>
    );
  }
  
  const completionRate = getCompletionRate(habit.completions);
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: '',
          headerTransparent: true,
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: habit.color }]}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <HabitIcon name={habit.icon || 'check'} color="#FFFFFF" size={36} />
            </View>
            <Text style={styles.habitName}>{habit.name}</Text>
            {habit.description ? (
              <Text style={styles.habitDescription}>{habit.description}</Text>
            ) : null}
            
            {habit.streak > 0 && (
              <View style={[styles.streakBadge, isTodayFrozen && styles.streakBadgeFrozen]}>
                {isTodayFrozen ? (
                  <Snowflake size={16} color="#0EA5E9" />
                ) : (
                  <Flame size={16} color="#FFA000" />
                )}
                <Text style={[styles.streakBadgeText, isTodayFrozen && styles.streakBadgeTextFrozen]}>
                  {habit.streak} day streak{isTodayFrozen ? ' (frozen)' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: habit.color + '15' }]}>
                <TrendingUp size={20} color={habit.color} />
              </View>
              <Text style={styles.statValue}>{habit.totalCompletions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#34C75915' }]}>
                <Target size={20} color="#34C759" />
              </View>
              <Text style={styles.statValue}>{Math.round(completionRate)}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FF950015' }]}>
                <Flame size={20} color="#FF9500" />
              </View>
              <Text style={styles.statValue}>{habit.streak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={18} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Streak Freeze</Text>
            </View>
            <View style={styles.freezeCard}>
              <View style={styles.freezeHeader}>
                <View style={styles.freezeIconContainer}>
                  <Snowflake size={24} color="#0EA5E9" />
                </View>
                <View style={styles.freezeInfo}>
                  <Text style={styles.freezeTitle}>Protect Your Streak</Text>
                  <Text style={styles.freezeSubtitle}>
                    Skip a day without losing momentum
                  </Text>
                </View>
              </View>
              
              <View style={styles.freezeCountRow}>
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.freezeDot,
                      i < freezeInfo.availableFreezes && styles.freezeDotAvailable,
                    ]}
                  >
                    <Snowflake
                      size={14}
                      color={i < freezeInfo.availableFreezes ? '#0EA5E9' : '#D1D5DB'}
                    />
                  </View>
                ))}
                <Text style={styles.freezeCountText}>
                  {freezeInfo.availableFreezes}/2 available this week
                </Text>
              </View>

              {isTodayFrozen ? (
                <View style={styles.frozenTodayBanner}>
                  <Snowflake size={16} color="#0EA5E9" />
                  <Text style={styles.frozenTodayText}>Streak is frozen for today</Text>
                </View>
              ) : habit.completedToday ? (
                <View style={styles.completedTodayBanner}>
                  <Check size={16} color="#34C759" strokeWidth={3} />
                  <Text style={styles.completedTodayText}>Already completed today</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.freezeButton,
                    !freezeInfo.canFreeze && styles.freezeButtonDisabled,
                  ]}
                  onPress={handleUseFreeze}
                  disabled={!freezeInfo.canFreeze}
                  activeOpacity={0.8}
                >
                  <Snowflake size={18} color={freezeInfo.canFreeze ? '#fff' : '#9CA3AF'} />
                  <Text
                    style={[
                      styles.freezeButtonText,
                      !freezeInfo.canFreeze && styles.freezeButtonTextDisabled,
                    ]}
                  >
                    {freezeInfo.canFreeze ? 'Use Streak Freeze' : 'No Freezes Left'}
                  </Text>
                </TouchableOpacity>
              )}

              {freezeInfo.frozenDates.length > 0 && (
                <View style={styles.frozenHistoryRow}>
                  <Text style={styles.frozenHistoryLabel}>Recent freezes:</Text>
                  <Text style={styles.frozenHistoryDates}>
                    {freezeInfo.frozenDates.slice(-3).map(d => {
                      const date = new Date(d + 'T12:00:00');
                      return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
                    }).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              {isFlexibleSchedule ? (
                <Repeat size={18} color={COLORS.text} />
              ) : (
                <Calendar size={18} color={COLORS.text} />
              )}
              <Text style={styles.sectionTitle}>
                {isFlexibleSchedule ? 'Flexible Schedule' : 'Weekly Schedule'}
              </Text>
              {!isFlexibleSchedule && (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEditSchedule}
                >
                  <Edit2 size={16} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.scheduleCard}>
              {isFlexibleSchedule ? (
                <View>
                  <View style={styles.weeklyProgressRow}>
                    <View style={styles.weeklyProgressInfo}>
                      <Text style={styles.weeklyProgressLabel}>This Week</Text>
                      <Text style={styles.weeklyProgressCount}>
                        <Text style={{ color: habit.color }}>{weeklyProgress.completed}</Text>
                        <Text style={styles.weeklyProgressTarget}> / {weeklyProgress.target}</Text>
                      </Text>
                    </View>
                    <View style={styles.weeklyProgressBar}>
                      <View style={styles.weeklyProgressBarTrack}>
                        <View
                          style={[
                            styles.weeklyProgressBarFill,
                            {
                              backgroundColor: habit.color,
                              width: `${Math.min(100, (weeklyProgress.completed / Math.max(1, weeklyProgress.target)) * 100)}%` as any,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.flexibleHint}>
                    <Repeat size={14} color={COLORS.textMuted} />
                    <Text style={styles.flexibleHintText}>
                      Complete on any {weeklyProgress.target} days this week
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.daysRow}>
                  {DAY_NAMES.map((day, index) => {
                    const isActive = habit.frequency.days.includes(index);
                    return (
                      <View key={day} style={styles.dayItem}>
                        <View style={[
                          styles.dayCircle,
                          isActive && { backgroundColor: habit.color }
                        ]}>
                          <Text style={[
                            styles.dayText,
                            isActive && styles.dayTextActive
                          ]}>
                            {day.charAt(0)}
                          </Text>
                        </View>
                        <Text style={styles.dayLabel}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={styles.frequencyRow}>
                <Clock size={14} color={COLORS.textMuted} />
                <Text style={styles.frequencyText}>{frequencyText}</Text>
              </View>
            </View>
          </View>

          {partialCreditStats && partialCreditStats.totalScheduledDays > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <BarChart3 size={18} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Partial Credit</Text>
              </View>
              <View style={styles.partialCreditCard}>
                <View style={styles.partialCreditMain}>
                  <View style={styles.partialCreditCircle}>
                    <Text style={[styles.partialCreditPercent, { color: habit.color }]}>
                      {partialCreditStats.allTimeRate}%
                    </Text>
                    <Text style={styles.partialCreditLabel}>Overall</Text>
                  </View>
                  <View style={styles.partialCreditDetails}>
                    <Text style={styles.partialCreditHeading}>Completion Score</Text>
                    <Text style={styles.partialCreditDesc}>
                      {partialCreditStats.totalCompletedDays} of {partialCreditStats.totalScheduledDays} scheduled days completed
                    </Text>
                    <View style={styles.partialCreditBar}>
                      <View style={styles.partialCreditBarTrack}>
                        <View
                          style={[
                            styles.partialCreditBarFill,
                            {
                              backgroundColor: partialCreditStats.allTimeRate >= 80 ? '#34C759' : partialCreditStats.allTimeRate >= 50 ? '#FF9500' : '#FF3B30',
                              width: `${Math.min(100, partialCreditStats.allTimeRate)}%` as any,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
                {Object.keys(partialCreditStats.monthlyRates).length > 0 && (
                  <View style={styles.partialCreditMonths}>
                    {Object.entries(partialCreditStats.monthlyRates)
                      .slice(-3)
                      .map(([monthKey, rateVal]) => {
                        const rate = rateVal as number;
                        const [year, month] = monthKey.split('-');
                        const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-GB', { month: 'short' });
                        return (
                          <View key={monthKey} style={styles.partialCreditMonth}>
                            <View style={styles.partialCreditMonthBarBg}>
                              <View
                                style={[
                                  styles.partialCreditMonthBarFill,
                                  {
                                    height: `${Math.max(4, rate)}%` as any,
                                    backgroundColor: rate >= 80 ? '#34C759' : rate >= 50 ? '#FF9500' : '#FF3B30',
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.partialCreditMonthLabel}>{monthName}</Text>
                            <Text style={styles.partialCreditMonthRate}>{rate}%</Text>
                          </View>
                        );
                      })}
                  </View>
                )}
                <View style={styles.partialCreditHint}>
                  <BarChart3 size={13} color={COLORS.textMuted} />
                  <Text style={styles.partialCreditHintText}>
                    Missing one day doesn't erase your progress
                  </Text>
                </View>
              </View>
            </View>
          )}

          {comebackInfo && comebackInfo.comebackCount > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Gift size={18} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Comeback Bonus</Text>
              </View>
              <View style={styles.comebackCard}>
                <View style={styles.comebackHeader}>
                  <View style={styles.comebackIconBg}>
                    <Gift size={22} color="#059669" />
                  </View>
                  <View style={styles.comebackInfo}>
                    <Text style={styles.comebackTitle}>Welcome Back Rewards</Text>
                    <Text style={styles.comebackSubtitle}>
                      You've earned bonus XP for getting back on track
                    </Text>
                  </View>
                </View>
                <View style={styles.comebackStatsRow}>
                  <View style={styles.comebackStat}>
                    <Text style={styles.comebackStatValue}>{comebackInfo.comebackCount}</Text>
                    <Text style={styles.comebackStatLabel}>Comebacks</Text>
                  </View>
                  <View style={styles.comebackStatDivider} />
                  <View style={styles.comebackStat}>
                    <Text style={[styles.comebackStatValue, { color: '#059669' }]}>+{comebackInfo.bonusXpAwarded}</Text>
                    <Text style={styles.comebackStatLabel}>Bonus XP</Text>
                  </View>
                </View>
                {comebackInfo.lastAbsenceEnd && (
                  <View style={styles.comebackLastDate}>
                    <Text style={styles.comebackLastDateText}>
                      Last comeback: {new Date(comebackInfo.lastAbsenceEnd + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {hasGracePeriod && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Zap size={18} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Grace Period</Text>
              </View>
              <View style={styles.gracePeriodCard}>
                <View style={styles.gracePeriodHeader}>
                  <View style={styles.gracePeriodIconBg}>
                    <Zap size={20} color="#D97706" />
                  </View>
                  <View style={styles.gracePeriodInfo}>
                    <Text style={styles.gracePeriodTitle}>24h Recovery Window</Text>
                    <Text style={styles.gracePeriodSubtitle}>
                      If you miss a day, complete the habit within 24 hours to keep your streak alive
                    </Text>
                  </View>
                </View>
                {(habit.gracePeriod?.recoveredDates?.length ?? 0) > 0 && (
                  <View style={styles.gracePeriodHistory}>
                    <Text style={styles.gracePeriodHistoryLabel}>Recovered dates:</Text>
                    <Text style={styles.gracePeriodHistoryDates}>
                      {habit.gracePeriod!.recoveredDates.slice(-3).map(d => {
                        const date = new Date(d + 'T12:00:00');
                        return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
                      }).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Last 7 Days</Text>
            </View>
            <View style={styles.weekCard}>
              <View style={styles.weekRow}>
                {last7Days.map((dateStr) => {
                  const isCompleted = habit.completions[dateStr];
                  const isFrozen = habit.streakFreeze?.frozenDates?.includes(dateStr) ?? false;
                  const dayName = getDayName(dateStr);
                  const isToday = dateStr === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
                  
                  return (
                    <View key={dateStr} style={styles.weekDayItem}>
                      <View style={[
                        styles.weekDayCircle,
                        isCompleted && { backgroundColor: habit.color },
                        isFrozen && !isCompleted && { backgroundColor: '#0EA5E9' },
                        isToday && !isCompleted && !isFrozen && styles.weekDayToday
                      ]}>
                        {isCompleted ? (
                          <Check size={14} color="#fff" strokeWidth={3} />
                        ) : isFrozen ? (
                          <Snowflake size={14} color="#fff" />
                        ) : (
                          <View style={styles.weekDayDot} />
                        )}
                      </View>
                      <Text style={[
                        styles.weekDayLabel,
                        isToday && styles.weekDayLabelToday
                      ]}>{dayName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={18} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Progress Overview</Text>
            </View>
            <View style={styles.progressCard}>
              <View style={styles.progressCircleContainer}>
                <ProgressCircle
                  progress={completionRate}
                  size={100}
                  color={habit.color}
                  strokeWidth={10}
                />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>Completion Rate</Text>
                <Text style={styles.progressDescription}>
                  You have completed this habit {habit.totalCompletions} times since you started tracking.
                </Text>
                {'mostProductiveTime' in (stats || {}) && (stats as any)?.mostProductiveTime && (
                  <View style={styles.insightRow}>
                    <Clock size={14} color={COLORS.textMuted} />
                    <Text style={styles.insightText}>
                      Best time: {(stats as any).mostProductiveTime}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={[
              styles.completeButton,
              habit.completedToday 
                ? { backgroundColor: habit.color }
                : { backgroundColor: '#fff', borderWidth: 2, borderColor: habit.color }
            ]}
            onPress={handleToggleCompletion}
            activeOpacity={0.8}
          >
            {habit.completedToday ? (
              <>
                <Check size={20} color="#fff" strokeWidth={3} />
                <Text style={[styles.completeButtonText, { color: '#fff' }]}>
                  Completed Today
                </Text>
              </>
            ) : (
              <Text style={[styles.completeButtonText, { color: habit.color }]}>
                Mark as Completed
              </Text>
            )}
          </TouchableOpacity>

          <HabitAccountabilitySection
            habitId={habit.id}
            habitName={habit.name}
            colors={{
              text: colors.text,
              textSecondary: colors.textSecondary,
              textTertiary: colors.textTertiary,
              card: colors.card,
              border: colors.border,
              primary: colors.primary,
              surfaceSecondary: colors.surfaceSecondary,
            }}
          />
          
          <TouchableOpacity
            style={styles.deleteRow}
            onPress={handleDelete}
          >
            <Trash2 size={18} color={COLORS.error} />
            <Text style={styles.deleteText}>Delete Habit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Schedule</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Select which days you want to perform this habit
            </Text>
            
            <DaySelector 
              selectedDays={editingDays}
              onSelectDay={handleDaySelect}
              color={habit?.color || COLORS.primary}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: habit?.color || COLORS.primary }]}
                onPress={handleSaveSchedule}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 18,
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 100,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  habitName: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  habitDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  streakBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  streakBadgeFrozen: {
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
  },
  streakBadgeTextFrozen: {
    color: '#E0F2FE',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -40,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayItem: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  dayTextActive: {
    color: '#fff',
  },
  dayLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  frequencyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayItem: {
    alignItems: 'center',
    gap: 8,
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  weekDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  weekDayLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  weekDayLabelToday: {
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 6,
  },
  progressDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 19,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  insightText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    marginTop: 8,
  },
  deleteText: {
    fontSize: 15,
    color: COLORS.error,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  freezeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  freezeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  freezeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  freezeInfo: {
    flex: 1,
  },
  freezeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  freezeSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  freezeCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  freezeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  freezeDotAvailable: {
    backgroundColor: '#E0F2FE',
  },
  freezeCountText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  freezeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0EA5E9',
    paddingVertical: 14,
    borderRadius: 12,
  },
  freezeButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  freezeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  freezeButtonTextDisabled: {
    color: '#9CA3AF',
  },
  frozenTodayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    borderRadius: 12,
  },
  frozenTodayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0369A1',
  },
  completedTodayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  completedTodayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#166534',
  },
  frozenHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  frozenHistoryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  frozenHistoryDates: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  weeklyProgressRow: {
    marginBottom: 16,
  },
  weeklyProgressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weeklyProgressLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textMuted,
  },
  weeklyProgressCount: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  weeklyProgressTarget: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.textMuted,
  },
  weeklyProgressBar: {
    marginBottom: 4,
  },
  weeklyProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden' as const,
  },
  weeklyProgressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  flexibleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  flexibleHintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  gracePeriodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gracePeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gracePeriodIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gracePeriodInfo: {
    flex: 1,
  },
  gracePeriodTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  gracePeriodSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  gracePeriodHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  gracePeriodHistoryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  gracePeriodHistoryDates: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  partialCreditCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  partialCreditMain: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginBottom: 16,
  },
  partialCreditCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  partialCreditPercent: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  partialCreditLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  partialCreditDetails: {
    flex: 1,
  },
  partialCreditHeading: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  partialCreditDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
    lineHeight: 18,
  },
  partialCreditBar: {
    marginTop: 2,
  },
  partialCreditBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden' as const,
  },
  partialCreditBarFill: {
    height: 6,
    borderRadius: 3,
  },
  partialCreditMonths: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  partialCreditMonth: {
    alignItems: 'center' as const,
    gap: 6,
  },
  partialCreditMonthBarBg: {
    width: 28,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'flex-end' as const,
    overflow: 'hidden' as const,
  },
  partialCreditMonthBarFill: {
    width: 28,
    borderRadius: 6,
  },
  partialCreditMonthLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  partialCreditMonthRate: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  partialCreditHint: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  partialCreditHintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  comebackCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  comebackHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    marginBottom: 16,
  },
  comebackIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  comebackInfo: {
    flex: 1,
  },
  comebackTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  comebackSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  comebackStatsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 12,
  },
  comebackStat: {
    alignItems: 'center' as const,
    paddingHorizontal: 24,
  },
  comebackStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  comebackStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  comebackStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#D1D5DB',
  },
  comebackLastDate: {
    alignItems: 'center' as const,
    paddingTop: 8,
  },
  comebackLastDateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
});