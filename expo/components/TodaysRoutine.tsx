import React, { useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
} from 'react-native';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Target,
  Zap,
  Crown,
  TrendingUp,
  Award,
  Gem,
  Star,
  Timer,
  Sparkles,
  CircleDot,
  Play,
  X,
  BookOpen,
} from 'lucide-react-native';
import { COLORS, HABIT_COLORS } from '@/constants/colors';
import { useSavedHabits } from '@/hooks/useHabitsEnhancement';
import { useTasks } from '@/hooks/useTasksStore';
import { useApp } from '@/hooks/useHabitsStore';
import { useBusyModeSafe } from '@/hooks/useBusyMode';
import { CommunityHabit, ExerciseFormGuide } from '@/types/habit';
import { Task } from '@/types/task';
import { COMMUNITY_HABITS } from '@/mocks/communityHabits';
import { generateMinimalHabits, MinimalHabit } from '@/utils/habitFormationAnalysis';
import { shouldDoHabitToday } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';


interface ConvertedHabit {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'todo';
  priority: 'medium';
  category: string;
  createdAt: string;
  updatedAt: string;
  isHabit: boolean;
  habitFrequency: { days: number[] };
  habitCompletions: Record<string, boolean>;
  habitStreak: number;
  color: string;
  icon?: string;
  isLegacy: boolean;
}

type RoutineHabit = Task | ConvertedHabit;

interface RoutineItemProps {
  habit: RoutineHabit;
  communityInfo?: CommunityHabit;
  minimalVersion?: MinimalHabit;
  isBusyMode: boolean;
  onToggle: () => void;
  onRemove: () => void;
  index: number;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const findExerciseGif = (activityText: string, exerciseGifs?: Record<string, string>): string | null => {
  if (!exerciseGifs) return null;
  const normalized = activityText.toLowerCase();
  for (const [name, url] of Object.entries(exerciseGifs)) {
    if (normalized.includes(name.toLowerCase())) return url;
  }
  return null;
};

const findExerciseFormGuide = (activityText: string, formGuides?: Record<string, ExerciseFormGuide>): { name: string; guide: ExerciseFormGuide } | null => {
  if (!formGuides) return null;
  const normalized = activityText.toLowerCase();
  for (const [name, guide] of Object.entries(formGuides)) {
    if (normalized.includes(name.toLowerCase())) return { name, guide };
  }
  return null;
};

interface ExerciseListProps {
  activities: string[];
  habitColor: string;
  exerciseGifs?: Record<string, string>;
  exerciseFormGuides?: Record<string, ExerciseFormGuide>;
}

const ExerciseList = ({ activities, habitColor, exerciseGifs, exerciseFormGuides }: ExerciseListProps) => {
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<'gif' | 'guide'>('gif');

  const handleFormPress = (idx: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedIdx === idx) {
      setExpandedIdx(null);
    } else {
      setExpandedIdx(idx);
      setActiveTab('gif');
    }
  };

  return (
    <View style={styles.exercisesList}>
      {activities.map((activity, idx) => {
        const gifUrl = findExerciseGif(activity, exerciseGifs);
        const formGuide = findExerciseFormGuide(activity, exerciseFormGuides);
        const hasForm = gifUrl || formGuide;
        const isOpen = expandedIdx === idx;
        return (
          <View key={idx}>
            <View style={styles.exerciseItem}>
              <View style={[styles.exerciseNumberBadge, { backgroundColor: habitColor + '10' }]}>
                <Text style={[styles.exerciseNumber, { color: habitColor }]}>{idx + 1}</Text>
              </View>
              <Text style={styles.exerciseText}>{activity}</Text>
              {hasForm && (
                <TouchableOpacity
                  onPress={() => handleFormPress(idx)}
                  style={[styles.formBtn, isOpen && { backgroundColor: habitColor, borderColor: habitColor }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Play size={10} color={isOpen ? '#fff' : habitColor} fill={isOpen ? '#fff' : habitColor} />
                  <Text style={[styles.formBtnText, { color: isOpen ? '#fff' : habitColor }]}>Form</Text>
                </TouchableOpacity>
              )}
            </View>
            {isOpen && hasForm && (
              <View style={styles.formGifContainer}>
                <View style={styles.formGifHeader}>
                  <View style={styles.formTabRow}>
                    {gifUrl && (
                      <TouchableOpacity
                        onPress={() => setActiveTab('gif')}
                        style={[styles.formTab, activeTab === 'gif' && { backgroundColor: habitColor + '15' }]}
                      >
                        <Text style={[styles.formTabText, activeTab === 'gif' && { color: habitColor }]}>Animation</Text>
                      </TouchableOpacity>
                    )}
                    {formGuide && (
                      <TouchableOpacity
                        onPress={() => setActiveTab('guide')}
                        style={[styles.formTab, activeTab === 'guide' && { backgroundColor: habitColor + '15' }]}
                      >
                        <Text style={[styles.formTabText, activeTab === 'guide' && { color: habitColor }]}>Guide</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setExpandedIdx(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={14} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {activeTab === 'gif' && gifUrl && (
                  <Image
                    source={{ uri: gifUrl }}
                    style={styles.formGifImage}
                    resizeMode="contain"
                  />
                )}

                {activeTab === 'guide' && formGuide && (
                  <View style={styles.formGuideContent}>
                    <Text style={[styles.formGuideExerciseName, { color: habitColor }]}>{formGuide.name}</Text>

                    <View style={styles.formGuideMuscles}>
                      {formGuide.guide.musclesWorked.map((muscle, i) => (
                        <View key={i} style={[styles.muscleTag, { backgroundColor: habitColor + '10' }]}>
                          <Text style={[styles.muscleTagText, { color: habitColor }]}>{muscle}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.formGuideSection}>
                      <Text style={styles.formGuideSectionTitle}>Setup</Text>
                      <Text style={styles.formGuideText}>{formGuide.guide.setup}</Text>
                    </View>

                    <View style={styles.formGuideSection}>
                      <Text style={styles.formGuideSectionTitle}>Steps</Text>
                      {formGuide.guide.steps.map((step, i) => (
                        <View key={i} style={styles.formGuideStep}>
                          <View style={[styles.formGuideStepNum, { backgroundColor: habitColor }]}>
                            <Text style={styles.formGuideStepNumText}>{i + 1}</Text>
                          </View>
                          <Text style={styles.formGuideStepText}>{step}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.formGuideSection}>
                      <Text style={[styles.formGuideSectionTitle, { color: '#DC2626' }]}>Common Mistakes</Text>
                      {formGuide.guide.commonMistakes.map((mistake, i) => (
                        <View key={i} style={styles.formGuideMistake}>
                          <Text style={styles.formGuideMistakeIcon}>\u26A0\uFE0F</Text>
                          <Text style={styles.formGuideMistakeText}>{mistake}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.formGuideSection}>
                      <Text style={[styles.formGuideSectionTitle, { color: '#059669' }]}>Pro Tips</Text>
                      {formGuide.guide.tips.map((tip, i) => (
                        <View key={i} style={styles.formGuideTip}>
                          <Text style={styles.formGuideTipIcon}>\u2705</Text>
                          <Text style={styles.formGuideTipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {activeTab === 'guide' && !formGuide && gifUrl && (
                  <Image
                    source={{ uri: gifUrl }}
                    style={styles.formGifImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const RoutineItem = ({ habit, communityInfo, minimalVersion, isBusyMode, onToggle, onRemove, index }: RoutineItemProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = React.useState(false);
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const isCompleted = habit.habitCompletions?.[today] || false;
  const hasProgram = !!(communityInfo?.weeks || (habit as Task).programData?.weeks);
  const habitColor = habit.color || COLORS.primary;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: isCompleted ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isCompleted, checkAnim]);
  
  const programInfo = React.useMemo(() => {
    const task = habit as Task;
    console.log('🏋️ [TodaysRoutine] Checking workout for habit:', task.title);
    
    let programWeeks = task.programData?.weeks;
    let currentWeek = task.currentWeek;
    let programStartDate = task.programStartDate;
    
    if (!programWeeks && communityInfo?.weeks) {
      console.log('🔄 [TodaysRoutine] Using community habit program data as fallback for:', task.title);
      programWeeks = communityInfo.weeks;
      if (!currentWeek) {
        currentWeek = 1;
      }
      if (!programStartDate) {
        programStartDate = task.createdAt || new Date().toISOString();
      }
    }
    
    console.log('📊 [TodaysRoutine] Program data:', {
      hasWeeks: !!programWeeks,
      weeksCount: programWeeks?.length,
      currentWeek: currentWeek,
      totalWeeks: task.totalWeeks || programWeeks?.length,
      programStartDate: programStartDate,
      habitFrequency: task.habitFrequency,
      hasCommunityInfo: !!communityInfo,
      communityWeeks: communityInfo?.weeks?.length
    });
    
    if (!programWeeks || !currentWeek) {
      console.log('❌ [TodaysRoutine] Missing program data for', task.title);
      return { hasProgram: false, todaysWorkout: null, isRestDay: false, nextWorkoutDay: null, currentDay: 0, totalDays: 0, programProgressPercent: 0 };
    }

    const totalWeeks = programWeeks.length;
    const habitDays = task.habitFrequency?.days || communityInfo?.frequency?.days || [];
    const isDaily = habitDays.length === 7;
    
    let currentDay = 0;
    let totalDays = 0;
    
    if (programStartDate) {
      const startDate = new Date(programStartDate);
      startDate.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (isDaily) {
        const diffMs = now.getTime() - startDate.getTime();
        currentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        totalDays = totalWeeks * 7;
      } else {
        const completionCount = Object.keys(task.habitCompletions || {}).filter(d => task.habitCompletions?.[d]).length;
        currentDay = completionCount + (isCompleted ? 0 : 1);
        totalDays = totalWeeks * habitDays.length;
      }
      currentDay = Math.max(1, Math.min(currentDay, totalDays));
    }
    
    const programProgressPercent = totalDays > 0 ? Math.min(100, Math.round((currentDay / totalDays) * 100)) : 0;
    
    const currentWeekData = programWeeks.find((w: any) => w.week === currentWeek);
    if (!currentWeekData?.days) {
      console.log('❌ [TodaysRoutine] No days found for week', currentWeek);
      return { hasProgram: true, todaysWorkout: null, isRestDay: true, nextWorkoutDay: null, currentWeek, totalWeeks, weekTitle: undefined, currentDay, totalDays, programProgressPercent };
    }
    
    const dayOfWeek = new Date().getDay();
    
    if (!habitDays.includes(dayOfWeek)) {
      let nextDay = null;
      for (let i = 1; i <= 7; i++) {
        const checkDay = (dayOfWeek + i) % 7;
        if (habitDays.includes(checkDay)) {
          nextDay = DAY_NAMES_SHORT[checkDay];
          break;
        }
      }
      console.log('⏭️ [TodaysRoutine] Rest day. Next workout:', nextDay);
      return { 
        hasProgram: true, 
        todaysWorkout: null, 
        isRestDay: true, 
        nextWorkoutDay: nextDay,
        currentWeek,
        totalWeeks,
        weekTitle: currentWeekData.title,
        currentDay,
        totalDays,
        programProgressPercent,
      };
    }
    
    const dayIndex = habitDays.indexOf(dayOfWeek);
    const workoutDay = currentWeekData.days[dayIndex];
    
    console.log('✅ [TodaysRoutine] Found workout:', {
      dayIndex,
      title: workoutDay?.title,
      hasActivities: !!workoutDay?.activities
    });
    
    return { 
      hasProgram: true, 
      todaysWorkout: workoutDay, 
      isRestDay: false, 
      nextWorkoutDay: null,
      currentWeek,
      totalWeeks,
      weekTitle: currentWeekData.title,
      currentDay,
      totalDays,
      programProgressPercent,
    };
  }, [habit, communityInfo, isCompleted]);
  
  const todaysActivities = programInfo.todaysWorkout;
  
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    
    onToggle();
  };
  
  const handleToggleExpand = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };
  
  const handleLongPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove Habit',
      `Are you sure you want to remove "${habit.title}" from your routine?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onRemove,
        },
      ],
      { cancelable: true }
    );
  };

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  return (
    <Animated.View style={[
      styles.routineItem,
      isCompleted && styles.routineItemCompleted,
      {
        transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        opacity: fadeAnim,
      }
    ]}>
      <TouchableOpacity
        style={styles.routineItemContent}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={[styles.colorAccent, { backgroundColor: habitColor }]} />
        
        <TouchableOpacity onPress={handlePress} style={styles.checkContainer}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            {isCompleted ? (
              <View style={styles.checkCircleDone}>
                <CheckCircle2 size={18} color="#fff" strokeWidth={2.5} />
              </View>
            ) : (
              <View style={[styles.checkCircleEmpty, { borderColor: habitColor + '60' }]}>
                <View style={[styles.checkCircleInner, { backgroundColor: habitColor + '12' }]} />
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
        
        <View style={styles.routineItemInfo}>
          <Text
            style={[
              styles.routineItemTitle,
              isCompleted && styles.routineItemTitleCompleted,
            ]}
            numberOfLines={1}
          >
            {habit.title}
          </Text>
          
          {programInfo.hasProgram && programInfo.currentDay > 0 && programInfo.totalDays > 0 ? (
            <View style={styles.programProgressInline}>
              <View style={styles.programDayBadge}>
                <BookOpen size={9} color={habitColor} strokeWidth={2.5} />
                <Text style={[styles.programDayText, { color: habitColor }]}>
                  Day {programInfo.currentDay} of {programInfo.totalDays}
                </Text>
              </View>
              <View style={styles.programMiniBar}>
                <View style={[styles.programMiniBarFill, { width: `${programInfo.programProgressPercent}%`, backgroundColor: habitColor }]} />
              </View>
              <Text style={styles.programMiniPercent}>{programInfo.programProgressPercent}%</Text>
              {habit.habitStreak && habit.habitStreak > 0 ? (
                <View style={[
                  styles.streakBadgeCompact,
                  habit.habitStreak >= 30 && styles.streakBadgeGold
                ]}>
                  <Flame size={8} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.streakText}>{habit.habitStreak}d</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.routineItemMeta}>
              {habit.habitStreak && habit.habitStreak > 0 ? (
                <View style={[
                  styles.streakBadge,
                  habit.habitStreak >= 7 && styles.streakBadgePremium,
                  habit.habitStreak >= 30 && styles.streakBadgeGold
                ]}>
                  {habit.habitStreak >= 30 ? (
                    <Crown size={9} color="#B45309" strokeWidth={2.5} />
                  ) : habit.habitStreak >= 7 ? (
                    <Gem size={9} color="#D97706" strokeWidth={2.5} />
                  ) : (
                    <Flame size={9} color="#F59E0B" strokeWidth={2.5} />
                  )}
                  <Text style={[
                    styles.streakText,
                    habit.habitStreak >= 30 && styles.streakTextGold
                  ]}>{habit.habitStreak}d</Text>
                </View>
              ) : null}
              {hasProgram && (habit as Task).currentWeek && (habit as Task).totalWeeks ? (
                <View style={styles.weekBadge}>
                  <Text style={styles.weekText}>
                    W{(habit as Task).currentWeek}/{(habit as Task).totalWeeks}
                  </Text>
                </View>
              ) : null}
              {isBusyMode && minimalVersion && !isCompleted && (
                <View style={styles.minimalBadge}>
                  <Timer size={9} color="#F59E0B" />
                  <Text style={styles.minimalBadgeText}>{minimalVersion.minimalDuration}m</Text>
                </View>
              )}
            </View>
          )}

          {programInfo.hasProgram && programInfo.todaysWorkout && !isExpanded && (
            <View style={[styles.todayReadingPreview, { borderLeftColor: habitColor }]}>
              <Text style={styles.todayReadingTitle} numberOfLines={1}>
                {programInfo.todaysWorkout.title}
              </Text>
              {programInfo.todaysWorkout.activities && programInfo.todaysWorkout.activities.length > 0 && (
                <Text style={styles.todayReadingDesc} numberOfLines={1}>
                  {programInfo.todaysWorkout.activities[0]}
                </Text>
              )}
            </View>
          )}
        </View>
        
        {!isCompleted ? (
          <TouchableOpacity 
            onPress={handlePress}
            style={[styles.actionBtn, isBusyMode && styles.actionBtnBusy]}
            activeOpacity={0.75}
          >
            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
              {isBusyMode ? 'Quick' : 'Do it'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.doneIndicator}>
            <Text style={styles.doneText}>Done</Text>
          </View>
        )}
        
        {programInfo.hasProgram && (
          <TouchableOpacity 
            onPress={handleToggleExpand}
            style={styles.expandButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRight 
              size={14} 
              color="#94A3B8" 
              style={[styles.chevronIcon, isExpanded && styles.chevronExpanded]} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      
      {isExpanded && programInfo.hasProgram && (
        <View style={styles.activitiesSection}>
          {programInfo.isRestDay ? (
            <View style={styles.restDayContainer}>
              <View style={styles.restDayHeader}>
                <View style={styles.restDayIconBadge}>
                  <Text style={styles.restDayEmoji}>😴</Text>
                </View>
                <View style={styles.restDayInfo}>
                  <Text style={styles.restDayTitle}>Rest Day</Text>
                  {programInfo.nextWorkoutDay && (
                    <Text style={styles.restDaySubtitle}>Next session: {programInfo.nextWorkoutDay}</Text>
                  )}
                </View>
              </View>
              {programInfo.weekTitle && (
                <View style={styles.weekInfoCard}>
                  <Text style={styles.weekInfoLabel}>Week {programInfo.currentWeek} of {programInfo.totalWeeks}</Text>
                  <Text style={styles.weekInfoTitle}>{programInfo.weekTitle}</Text>
                </View>
              )}
              <Text style={styles.restDayMessage}>
                Recovery is essential for muscle growth and preventing injury. Use this time to stretch, hydrate, and prepare for your next session.
              </Text>
            </View>
          ) : todaysActivities ? (
            <>
              <View style={styles.workoutHeaderCard}>
                <View style={styles.workoutTitleRow}>
                  <View style={[styles.workoutIconBadge, { backgroundColor: habitColor + '12' }]}>
                    <Target size={15} color={habitColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workoutTitle}>{todaysActivities.title}</Text>
                    <View style={styles.workoutDuration}>
                      <Clock size={11} color="#94A3B8" />
                      <Text style={styles.workoutDurationText}>{todaysActivities.duration}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {todaysActivities.description && (
                <Text style={styles.workoutDescription}>{todaysActivities.description}</Text>
              )}

              <View style={styles.divider} />

              <ExerciseList
                activities={todaysActivities.activities || []}
                habitColor={habitColor}
                exerciseGifs={communityInfo?.exerciseGifs}
                exerciseFormGuides={communityInfo?.exerciseFormGuides}
              />

              {todaysActivities.notes && (
                <View style={styles.notesSection}>
                  <View style={styles.notesHeader}>
                    <View style={styles.notesIconBadge}>
                      <Sparkles size={11} color="#D97706" />
                    </View>
                    <Text style={styles.notesLabel}>Pro Tip</Text>
                  </View>
                  <Text style={styles.notesText}>{todaysActivities.notes}</Text>
                </View>
              )}

              <TouchableOpacity 
                onPress={handlePress}
                style={[
                  styles.completeWorkoutBtn, 
                  { 
                    backgroundColor: isCompleted ? '#F0FDF4' : habitColor,
                    borderWidth: isCompleted ? 1.5 : 0,
                    borderColor: isCompleted ? '#10B981' : 'transparent'
                  }
                ]}
                activeOpacity={0.8}
              >
                {isCompleted ? (
                  <View style={styles.completedBtnContent}>
                    <CheckCircle2 size={17} color="#10B981" strokeWidth={2.5} />
                    <Text style={[styles.completeWorkoutBtnText, { color: '#059669' }]}>Completed</Text>
                  </View>
                ) : (
                  <Text style={styles.completeWorkoutBtnText}>Mark as Complete</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
};

interface TodaysRoutineProps {
  maxItems?: number;
  showHeader?: boolean;
  onViewAll?: () => void;
}

export default function TodaysRoutine({ 
  maxItems = 5, 
  showHeader = true,
  onViewAll,
}: TodaysRoutineProps) {
  const savedHabitsContext = useSavedHabits();
  const tasksContext = useTasks();
  const appContext = useApp();
  const busyMode = useBusyModeSafe();
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const savedHabits = useMemo(() => savedHabitsContext?.savedHabits || [], [savedHabitsContext?.savedHabits]);
  const updateTask = tasksContext?.updateTask || (() => {});
  
  const taskBasedHabits = useMemo(() => {
    return (tasksContext?.allTasks || []).filter((task: Task) => {
      if (!task.isHabit || !task.habitFrequency) return false;
      return shouldDoHabitToday(task.habitFrequency);
    });
  }, [tasksContext?.allTasks]);
  
  const legacyHabits = useMemo(() => {
    return appContext?.todayHabits || [];
  }, [appContext?.todayHabits]);
  
  const convertedLegacyHabits = useMemo(() => {
    return legacyHabits.map((habit, index) => ({
      id: habit.id,
      title: habit.name,
      description: habit.description || '',
      status: habit.completedToday ? 'completed' as const : 'todo' as const,
      priority: 'medium' as const,
      category: (habit as any).category || 'Personal',
      createdAt: habit.createdAt,
      updatedAt: habit.createdAt,
      isHabit: true,
      habitFrequency: habit.frequency,
      habitCompletions: Object.keys(habit.completions || {}).reduce((acc, date) => {
        if (habit.completions[date]) acc[date] = true;
        return acc;
      }, {} as Record<string, boolean>),
      habitStreak: habit.streak || 0,
      color: habit.color || HABIT_COLORS[index % HABIT_COLORS.length],
      icon: habit.icon,
      isLegacy: true,
    }));
  }, [legacyHabits]);
  
  const todayHabits = useMemo(() => {
    const taskIds = new Set(taskBasedHabits.map(h => h.id));
    const combined = [
      ...taskBasedHabits,
      ...convertedLegacyHabits.filter(h => !taskIds.has(h.id))
    ];
    console.log('📋 TodaysRoutine - Combined habits:', combined.length, '(tasks:', taskBasedHabits.length, ', legacy:', convertedLegacyHabits.length, ')');
    return combined;
  }, [taskBasedHabits, convertedLegacyHabits]);

  
  const todayTasks = useMemo(() => {
    if (!tasksContext) return [];
    
    return (tasksContext.allTasks || []).filter((task: Task) => {
      if (task.isHabit) return false;
      return true;
    });
  }, [tasksContext]);

  const pendingTasks = useMemo(() => {
    return todayTasks.filter(t => t.status !== 'completed');
  }, [todayTasks]);

  const completedTodayTasks = useMemo(() => {
    return todayTasks.filter(t => t.status === 'completed');
  }, [todayTasks]);

  const minimalHabitsMap = useMemo(() => {
    const allTaskHabits = (tasksContext?.allTasks || []).filter((t: Task) => t.isHabit);
    const minimalList = generateMinimalHabits(allTaskHabits);
    const map: Record<string, MinimalHabit> = {};
    minimalList.forEach(m => {
      map[m.id] = m;
    });
    return map;
  }, [tasksContext?.allTasks]);

  const routineItems = useMemo(() => {
    return todayHabits.slice(0, maxItems).map(habit => {
      const savedEntry = savedHabits.find(sh => sh.habitId === habit.id);
      const communityInfo = savedEntry 
        ? COMMUNITY_HABITS.find(ch => ch.id === savedEntry.communityHabitId)
        : undefined;
      const minimalVersion = minimalHabitsMap[habit.id];
      
      return { habit, communityInfo, minimalVersion };
    });
  }, [todayHabits, savedHabits, maxItems, minimalHabitsMap]);

  const completedHabitsCount = useMemo(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return todayHabits.filter((h: RoutineHabit) => h.habitCompletions?.[today]).length;
  }, [todayHabits]);
  
  const completedTasksCount = useMemo(() => 
    completedTodayTasks.length,
    [completedTodayTasks]
  );

  const totalCount = todayHabits.length + todayTasks.length;
  const completedCount = completedHabitsCount + completedTasksCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const handleToggle = (habitId: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const legacyHabit = convertedLegacyHabits.find(h => h.id === habitId);
    if (legacyHabit && (legacyHabit as any).isLegacy) {
      console.log('🔄 Toggling legacy habit:', habitId);
      appContext?.toggleHabitCompletion(habitId);
      return;
    }
    
    const habit = taskBasedHabits.find((h: Task) => h.id === habitId);
    if (!habit) return;
    
    const d2 = new Date();
    const today = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
    const updatedCompletions = { ...(habit.habitCompletions || {}) };
    
    if (updatedCompletions[today]) {
      delete updatedCompletions[today];
    } else {
      updatedCompletions[today] = true;
    }
    
    updateTask(habitId, {
      habitCompletions: updatedCompletions,
      status: updatedCompletions[today] ? 'completed' : 'todo'
    });
  };
  
  const handleRemove = (habitId: string) => {
    console.log('🗑️ Removing habit:', habitId);
    
    const legacyHabit = convertedLegacyHabits.find(h => h.id === habitId);
    if (legacyHabit && (legacyHabit as any).isLegacy) {
      console.log('🗑️ Removing legacy habit:', habitId);
      appContext?.deleteHabit(habitId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    
    if (savedHabitsContext?.removeSavedHabitByTaskId) {
      savedHabitsContext.removeSavedHabitByTaskId(habitId);
    }
    
    if (tasksContext?.deleteTask) {
      tasksContext.deleteTask(habitId);
      console.log('🗑️ Removed task-based habit:', habitId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Star size={28} color="#F59E0B" fill="#FEF3C7" strokeWidth={2} />
        </View>
        <Text style={styles.emptyTitle}>Start your routine</Text>
        <Text style={styles.emptyText}>
          Add habits to build a daily routine that works for you
        </Text>
        <TouchableOpacity 
          style={styles.discoverBtn}
          onPress={() => router.push('/discover' as any)}
          activeOpacity={0.8}
        >
          <Sparkles size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.discoverBtnText}>Discover Habits</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allDone = completedCount === totalCount && totalCount > 0;

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconBadge, allDone && styles.headerIconBadgeDone]}>
                {allDone ? (
                  <Award size={14} color="#fff" strokeWidth={2.5} />
                ) : (
                  <TrendingUp size={14} color="#fff" strokeWidth={2.5} />
                )}
              </View>
              <Text style={styles.title}>Today&apos;s Routine</Text>
              {busyMode.isEnabled && (
                <View style={styles.busyModePill}>
                  <Zap size={9} color="#fff" />
                  <Text style={styles.busyModePillText}>Busy</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>
              {allDone
                ? 'All tasks crushed today!' 
                : busyMode.isEnabled 
                  ? `${completedCount} of ${totalCount} • Quick mode`
                  : `${completedCount} of ${totalCount} completed`}
            </Text>
          </View>
          
          {onViewAll && (
            <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>All</Text>
              <ChevronRight size={13} color={COLORS.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {busyMode.isEnabled && (
        <View style={styles.busyModeNotice}>
          <Zap size={13} color="#D97706" />
          <Text style={styles.busyModeNoticeText}>
            Busy mode • Complete 2-min versions to protect streaks
          </Text>
        </View>
      )}

      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <Animated.View 
            style={[
              styles.progressFill,
              allDone && styles.progressFillDone,
              { width: progressWidth }
            ]} 
          />
        </View>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressPercent, allDone && styles.progressPercentDone]}>
            {Math.round(progressPercent)}%
          </Text>
          {allDone && (
            <View style={styles.allDoneBadge}>
              <CheckCircle2 size={10} color="#059669" strokeWidth={2.5} />
              <Text style={styles.allDoneText}>Complete</Text>
            </View>
          )}
        </View>
      </View>
      
      {todayHabits.length > 0 && (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <CircleDot size={13} color="#F59E0B" strokeWidth={2.5} />
            <Text style={styles.sectionHeaderText}>Habits</Text>
          </View>
          <View style={styles.sectionCountPill}>
            <Text style={styles.sectionCountText}>{completedHabitsCount}/{todayHabits.length}</Text>
          </View>
        </View>
      )}

      <View style={styles.routineList}>
        {routineItems.map(({ habit, communityInfo, minimalVersion }, idx) => (
          <RoutineItem
            key={habit.id}
            habit={habit as RoutineHabit}
            communityInfo={communityInfo}
            minimalVersion={minimalVersion}
            isBusyMode={busyMode.isEnabled}
            onToggle={() => handleToggle(habit.id)}
            onRemove={() => handleRemove(habit.id)}
            index={idx}
          />
        ))}
      </View>

      {todayHabits.length > maxItems && (
        <TouchableOpacity 
          style={styles.moreBtn}
          onPress={onViewAll}
          activeOpacity={0.7}
        >
          <Text style={styles.moreBtnText}>
            +{todayHabits.length - maxItems} more
          </Text>
          <ChevronRight size={12} color={COLORS.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
      
      <View style={[styles.sectionHeader, { marginTop: 22 }]}>
        <View style={styles.sectionHeaderLeft}>
          <Target size={13} color="#007AFF" strokeWidth={2.5} />
          <Text style={styles.sectionHeaderText}>Tasks</Text>
        </View>
        <View style={[styles.sectionCountPill, styles.sectionCountPillBlue]}>
          <Text style={[styles.sectionCountText, styles.sectionCountTextBlue]}>{completedTasksCount}/{todayTasks.length}</Text>
        </View>
      </View>

      {todayTasks.length > 0 ? (
        <>
          <View style={styles.routineList}>
            {[...pendingTasks, ...completedTodayTasks].slice(0, 5).map((task: Task) => {
              const taskColor = task.priority === 'high' || task.priority === 'urgent' ? '#EF4444' : '#007AFF';
              return (
                <Animated.View key={task.id} style={styles.routineItem}>
                  <TouchableOpacity
                    style={styles.routineItemContent}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (tasksContext?.toggleTaskStatus) {
                        tasksContext.toggleTaskStatus(task.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorAccent, { backgroundColor: taskColor }]} />
                    
                    <TouchableOpacity 
                      onPress={() => {
                        if (tasksContext?.toggleTaskStatus) {
                          tasksContext.toggleTaskStatus(task.id);
                        }
                      }} 
                      style={styles.checkContainer}
                    >
                      {task.status === 'completed' ? (
                        <View style={styles.checkCircleDone}>
                          <CheckCircle2 size={18} color="#fff" strokeWidth={2.5} />
                        </View>
                      ) : (
                        <View style={[styles.checkCircleEmpty, { borderColor: taskColor + '50' }]}>
                          <View style={[styles.checkCircleInner, { backgroundColor: taskColor + '10' }]} />
                        </View>
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.routineItemInfo}>
                      <Text
                        style={[
                          styles.routineItemTitle,
                          task.status === 'completed' && styles.routineItemTitleCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      
                      <View style={styles.routineItemMeta}>
                        {(task.priority === 'high' || task.priority === 'urgent') && (
                          <View style={styles.priorityBadge}>
                            <Text style={styles.priorityText}>!</Text>
                          </View>
                        )}
                        {task.category && (
                          <Text style={styles.categoryText}>{task.category}</Text>
                        )}
                      </View>
                    </View>
                    
                    {task.status !== 'completed' ? (
                      <TouchableOpacity 
                        onPress={() => {
                          if (tasksContext?.toggleTaskStatus) {
                            tasksContext.toggleTaskStatus(task.id);
                          }
                        }}
                        style={styles.actionBtn}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Do it</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.doneIndicator}>
                        <Text style={styles.doneText}>Done</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
          
          {todayTasks.length > 5 && (
            <TouchableOpacity 
              style={styles.moreBtn}
              onPress={() => router.push('/tasks' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.moreBtnText}>
                +{todayTasks.length - 5} more tasks
              </Text>
              <ChevronRight size={12} color={COLORS.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.emptyTasksContainer}>
          <Text style={styles.emptyTasksText}>No tasks yet</Text>
          <TouchableOpacity
            style={styles.addTaskBtn}
            onPress={() => router.push('/tasks' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.addTaskBtnText}>Add a task</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 5,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconBadgeDone: {
    backgroundColor: '#059669',
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#0F172A',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 43,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.07)',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.primary,
  },
  progressSection: {
    marginBottom: 22,
    gap: 8,
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 3,
  },
  progressFillDone: {
    backgroundColor: '#10B981',
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#334155',
    letterSpacing: -0.3,
  },
  progressPercentDone: {
    color: '#059669',
  },
  allDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.1)',
  },
  allDoneText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#059669',
  },
  routineList: {
    gap: 10,
  },
  routineItem: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  routineItemCompleted: {
    backgroundColor: '#F7FBF8',
    borderColor: 'rgba(16, 185, 129, 0.12)',
  },
  routineItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    gap: 10,
  },
  colorAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginLeft: 2,
    marginRight: 8,
  },
  checkContainer: {
  },
  checkCircleDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  checkCircleEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routineItemInfo: {
    flex: 1,
    gap: 3,
  },
  routineItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  routineItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B0B8C4',
  },
  routineItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF9EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  streakBadgePremium: {
    backgroundColor: '#FEF3C7',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakBadgeGold: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#B45309',
    letterSpacing: -0.2,
  },
  streakTextGold: {
    color: '#92400E',
  },
  weekBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  weekText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  programProgressInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  programDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  programDayText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  programMiniBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 60,
  },
  programMiniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  programMiniPercent: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#94A3B8',
    letterSpacing: -0.2,
  },
  streakBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF9EE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  todayReadingPreview: {
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
  },
  todayReadingTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#475569',
    letterSpacing: -0.2,
  },
  todayReadingDesc: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500' as const,
    marginTop: 1,
    letterSpacing: -0.1,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  actionBtnBusy: {
    backgroundColor: '#78350F',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
    color: '#FFFFFF',
  },
  doneIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.1)',
  },
  doneText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#059669',
  },
  expandButton: {
    padding: 4,
    marginRight: 2,
  },
  chevronIcon: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  activitiesSection: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  workoutHeaderCard: {
    marginBottom: 16,
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  workoutDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutDurationText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  workoutDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 16,
  },
  exercisesList: {
    gap: 8,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  exerciseNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  exerciseNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  exerciseText: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
  },
  notesSection: {
    backgroundColor: '#FFFDF5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.1)',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  notesIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#92400E',
    letterSpacing: -0.1,
  },
  notesText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  completeWorkoutBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  completedBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  completeWorkoutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  restDayContainer: {
    padding: 2,
  },
  restDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  restDayIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restDayEmoji: {
    fontSize: 22,
  },
  restDayInfo: {
    flex: 1,
  },
  restDayTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  restDaySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  weekInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  weekInfoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  weekInfoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  restDayMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 14,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  moreBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 44,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FEF9EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 22,
    letterSpacing: -0.1,
  },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  discoverBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 0,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#475569',
    letterSpacing: -0.1,
  },
  sectionCountPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionCountPillBlue: {
    backgroundColor: '#F0F7FF',
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#059669',
  },
  sectionCountTextBlue: {
    color: '#007AFF',
  },
  priorityBadge: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#DC2626',
  },
  categoryText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  minimalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF9EE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  minimalBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  busyModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  busyModePillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  busyModeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF9EE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.12)',
  },
  busyModeNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500' as const,
    letterSpacing: -0.1,
  },
  emptyTasksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  emptyTasksText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  addTaskBtn: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addTaskBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  formBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#FFFFFF',
  },
  formBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  formBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  formBtnTextActive: {
    color: '#FFFFFF',
  },
  formGifContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0,
    marginTop: -1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  formGifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  formGifLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#475569',
    letterSpacing: -0.1,
  },
  formGifImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F8FAFC',
  },
  formTabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  formTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  formTabText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#94A3B8',
    letterSpacing: -0.2,
  },
  formGuideContent: {
    padding: 14,
    gap: 14,
  },
  formGuideExerciseName: {
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  formGuideMuscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  formGuideSection: {
    gap: 8,
  },
  formGuideSectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#1E293B',
    letterSpacing: -0.2,
    textTransform: 'uppercase' as const,
  },
  formGuideText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  formGuideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  formGuideStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 1,
  },
  formGuideStepNumText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  formGuideStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  formGuideMistake: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  formGuideMistakeIcon: {
    fontSize: 13,
    marginTop: 1,
  },
  formGuideMistakeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#7F1D1D',
  },
  formGuideTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  formGuideTipIcon: {
    fontSize: 13,
    marginTop: 1,
  },
  formGuideTipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#065F46',
  },
});
