import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import {
  X,
  Clock,
  Flame,
  Target,
  Calendar,
  Zap,
  Heart,
  Bookmark,
  Plus,
  Check,
  ChevronRight,
  Award,
  Package,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChefHat,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { CommunityHabit, ExerciseFormGuide } from '@/types/habit';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';



interface HabitDetailModalProps {
  visible: boolean;
  habit: CommunityHabit | null;
  onClose: () => void;
  onAdd: (habit: CommunityHabit) => void;
  isAdded: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case 'Easy':
      return '#34C759';
    case 'Medium':
      return '#FF9500';
    case 'Hard':
      return '#FF3B30';
    default:
      return COLORS.textLight;
  }
};

const getDifficultyBg = (difficulty?: string) => {
  switch (difficulty) {
    case 'Easy':
      return '#D1FAE5';
    case 'Medium':
      return '#FEF3C7';
    case 'Hard':
      return '#FEE2E2';
    default:
      return '#F3F4F6';
  }
};

const getIconEmoji = (icon: string) => {
  const iconMap: Record<string, string> = {
    'dumbbell': '💪',
    'sparkles': '✨',
    'book-open': '📖',
    'clock': '⏰',
    'droplet': '💧',
    'heart': '❤️',
    'book': '📚',
    'footprints': '👣',
    'smartphone': '📱',
    'utensils': '🍽️',
    'brain': '🧠',
    'circle': '🧘',
    'pen-tool': '✍️',
    'moon': '🌙',
    'music': '🎸',
  };
  return iconMap[icon] || '✨';
};

const findExerciseGif = (activityText: string, exerciseGifs?: Record<string, string>): string | null => {
  if (!exerciseGifs) return null;
  
  const normalizedActivity = activityText.toLowerCase();
  
  for (const [exerciseName, gifUrl] of Object.entries(exerciseGifs)) {
    const normalizedExercise = exerciseName.toLowerCase();
    if (normalizedActivity.includes(normalizedExercise)) {
      return gifUrl;
    }
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

const parseProgramWeeks = (programLength?: string): number | null => {
  if (!programLength) return null;
  const weekMatch = programLength.match(/(\d+)\s*week/i);
  if (weekMatch) return parseInt(weekMatch[1], 10);
  const monthMatch = programLength.match(/(\d+)\s*month/i);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 4;
  const dayMatch = programLength.match(/(\d+)\s*day/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    return Math.max(1, Math.round(days / 7));
  }
  return null;
};

const computeAdaptiveWeeks = (
  originalWeeks: number,
  originalDaysPerWeek: number,
  selectedDaysPerWeek: number,
): number => {
  if (selectedDaysPerWeek <= 0 || originalDaysPerWeek <= 0) return originalWeeks;
  const totalSessions = originalWeeks * originalDaysPerWeek;
  return Math.max(1, Math.ceil(totalSessions / selectedDaysPerWeek));
};

const getFrequencyDescription = (days: number[]) => {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays only';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends only';
  if (days.length === 1) return `Once a week (${DAY_NAMES_FULL[days[0]]})`;
  return `${days.length} days per week`;
};

export default function HabitDetailModal({
  visible,
  habit,
  onClose,
  onAdd,
  isAdded,
}: HabitDetailModalProps) {
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [expandedFormGuide, setExpandedFormGuide] = useState<string | null>(null);
  const [formGuideTab, setFormGuideTab] = useState<'gif' | 'guide'>('gif');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    if (habit) {
      setSelectedDays([...habit.frequency.days].sort((a, b) => a - b));
    }
  }, [habit?.id]);

  const originalDaysPerWeek = habit?.frequency?.timesPerWeek ?? habit?.frequency?.days?.length ?? 0;
  const originalWeeks = parseProgramWeeks(habit?.programLength);
  const adaptiveWeeks = originalWeeks && originalDaysPerWeek > 0 && selectedDays.length > 0
    ? computeAdaptiveWeeks(originalWeeks, originalDaysPerWeek, selectedDays.length)
    : null;
  const isFitnessProgram = !!(habit?.weeks && habit.weeks.length > 0 && originalWeeks);

  if (!habit) return null;

  const toggleDay = (dayIndex: number) => {
    void Haptics.selectionAsync();
    setSelectedDays(prev => {
      const isActive = prev.includes(dayIndex);
      if (isActive) {
        if (prev.length <= 1) return prev;
        return prev.filter(d => d !== dayIndex).sort((a, b) => a - b);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNumber]: !prev[weekNumber] }));
  };

  const handleAdd = () => {
    if (isAdded) return;
    
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    
    const customizedHabit: CommunityHabit = {
      ...habit,
      frequency: {
        ...habit.frequency,
        days: selectedDays,
        timesPerWeek: selectedDays.length,
      },
    };
    onAdd(customizedHabit);
    setTimeout(onClose, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.modalContainer}>
          <View style={styles.handle} />
          
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: (habit.color || '#007AFF') + '20' }]}>
                <Text style={styles.iconEmoji}>{getIconEmoji(habit.icon || 'sparkles')}</Text>
              </View>
              
              <View style={styles.headerInfo}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  {habit.trending && (
                    <View style={styles.trendingBadge}>
                      <Flame size={12} color="#FF6B35" />
                      <Text style={styles.trendingText}>Trending</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categoryText}>{habit.category}</Text>
              </View>
            </View>

            {habit?.dietTags && habit.dietTags.length > 0 && (
              <TouchableOpacity
                style={styles.dietCTA}
                activeOpacity={0.85}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const primaryDiet = habit.dietTags![0];
                  console.log('[HabitDetail] Browsing recipes for diet:', primaryDiet);
                  onClose();
                  setTimeout(() => {
                    router.push({
                      pathname: '/(tabs)/cooking' as any,
                      params: {
                        diet: primaryDiet,
                        dietLabel: habit.dietLabel ?? '',
                        habitName: habit.name,
                      },
                    });
                  }, 250);
                }}
                testID="browse-recipes-cta"
              >
                <LinearGradient
                  colors={[(habit.color || '#E8603C'), (habit.color || '#E8603C') + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dietCTAGradient}
                >
                  <View style={styles.dietCTAIcon}>
                    <ChefHat size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.dietCTAContent}>
                    <Text style={styles.dietCTALabel}>PAIRED WITH COOKING</Text>
                    <Text style={styles.dietCTATitle}>Browse {habit.dietLabel ?? 'matching'} recipes</Text>
                    <Text style={styles.dietCTASub}>See meal ideas curated for this habit</Text>
                  </View>
                  <View style={styles.dietCTAArrow}>
                    <ChevronRight size={18} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {habit.mainGoal && (
              <View style={styles.outcomeSection}>
                <View style={styles.sectionHeader}>
                  <Target size={18} color={habit.color || COLORS.primary} />
                  <Text style={styles.sectionTitle}>What You&apos;ll Achieve</Text>
                </View>
                <Text style={styles.outcomeText}>{habit.mainGoal}</Text>
              </View>
            )}

            {habit.targetAudience && (
              <View style={styles.targetAudienceSection}>
                <Text style={styles.targetAudienceLabel}>Who is this for?</Text>
                <Text style={styles.targetAudienceText}>{habit.targetAudience}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{habit.estimatedDuration || 'Varies'}</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Target size={16} color={getDifficultyColor(habit.difficulty)} />
                <Text style={styles.statLabel}>Difficulty</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyBg(habit.difficulty) }]}>
                  <Text style={[styles.difficultyText, { color: getDifficultyColor(habit.difficulty) }]}>
                    {habit.difficulty || 'Medium'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Calendar size={16} color={COLORS.textSecondary} />
                <Text style={styles.statLabel}>Frequency</Text>
                <Text style={styles.statValue}>
                  {selectedDays.length === 7 ? 'Daily' : `${selectedDays.length}x/wk`}
                </Text>
              </View>
            </View>

            <View style={styles.socialProofSection}>
              <View style={styles.socialProofRow}>
                <View style={styles.socialProofItem}>
                  <Heart size={18} color="#FF3B30" fill="#FF3B30" />
                  <Text style={styles.socialProofValue}>{habit.likes.toLocaleString()}</Text>
                  <Text style={styles.socialProofLabel}>people like this</Text>
                </View>
                <View style={styles.socialProofDivider} />
                <View style={styles.socialProofItem}>
                  <Bookmark size={18} color={COLORS.primary} fill={COLORS.primary} />
                  <Text style={styles.socialProofValue}>{habit.saves.toLocaleString()}</Text>
                  <Text style={styles.socialProofLabel}>doing this now</Text>
                </View>
              </View>
            </View>

            <View style={styles.dividerSection} />

            {habit.description && (
              <Text style={styles.description}>{habit.description}</Text>
            )}

            {habit.longDescription && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <BookOpen size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>About This Program</Text>
                </View>
                <Text style={styles.longDescriptionText}>{habit.longDescription}</Text>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={18} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Weekly Schedule</Text>
              </View>
              
              <Text style={styles.frequencyDescription}>
                {getFrequencyDescription(selectedDays)}
              </Text>

              <Text style={styles.scheduleHint}>Tap a day to customize your schedule</Text>
              
              <View style={styles.weekCalendar}>
                {DAY_NAMES.map((day, index) => {
                  const isActive = selectedDays.includes(index);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={styles.dayColumn}
                      onPress={() => toggleDay(index)}
                      activeOpacity={0.7}
                      testID={`schedule-day-${index}`}
                    >
                      <Text style={[styles.dayName, isActive && styles.dayNameActive]}>
                        {day}
                      </Text>
                      <View style={[
                        styles.dayIndicator,
                        isActive && styles.dayIndicatorActive,
                        isActive && { backgroundColor: habit.color || '#007AFF' }
                      ]}>
                        {isActive && <Check size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isFitnessProgram && adaptiveWeeks && (
                <View style={[styles.adaptiveDurationCard, { borderColor: (habit.color || COLORS.primary) + '40', backgroundColor: (habit.color || COLORS.primary) + '0D' }]}>
                  <View style={[styles.adaptiveIconBg, { backgroundColor: (habit.color || COLORS.primary) + '22' }]}>
                    <Zap size={18} color={habit.color || COLORS.primary} />
                  </View>
                  <View style={styles.adaptiveContent}>
                    <Text style={styles.adaptiveLabel}>ADAPTIVE PROGRAM DURATION</Text>
                    <Text style={styles.adaptiveTitle}>
                      {adaptiveWeeks} week{adaptiveWeeks === 1 ? '' : 's'} at {selectedDays.length}x/week
                    </Text>
                    <Text style={styles.adaptiveSub}>
                      {selectedDays.length === originalDaysPerWeek
                        ? `Original program: ${originalWeeks} weeks with ${originalDaysPerWeek} sessions/week`
                        : `Scaled from ${originalWeeks} weeks • ${originalWeeks * originalDaysPerWeek} total sessions preserved`}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.schedulePresetsRow}>
                <TouchableOpacity
                  style={styles.schedulePresetBtn}
                  onPress={() => { void Haptics.selectionAsync(); setSelectedDays([0,1,2,3,4,5,6]); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.schedulePresetText}>Every day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.schedulePresetBtn}
                  onPress={() => { void Haptics.selectionAsync(); setSelectedDays([1,2,3,4,5]); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.schedulePresetText}>Weekdays</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.schedulePresetBtn}
                  onPress={() => { void Haptics.selectionAsync(); setSelectedDays([0,6]); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.schedulePresetText}>Weekends</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.schedulePresetBtn}
                  onPress={() => { void Haptics.selectionAsync(); setSelectedDays([...habit.frequency.days].sort((a, b) => a - b)); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.schedulePresetText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Created by</Text>
              </View>
              
              <View style={styles.creatorCard}>
                <Image source={{ uri: habit.user.avatar }} style={styles.creatorAvatar} />
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorName}>{habit.user.name}</Text>
                  <Text style={styles.creatorStats}>
                    {habit.user.followersCount?.toLocaleString() || 0} followers • {habit.user.habitsShared || 0} habits shared
                  </Text>
                </View>
                <ChevronRight size={20} color={COLORS.textLight} />
              </View>
            </View>

            {habit.benefits && habit.benefits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Award size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Benefits</Text>
                </View>
                <View style={styles.listContainer}>
                  {habit.benefits.map((benefit, index) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.listItemText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {habit.equipment && habit.equipment.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Package size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Equipment Needed</Text>
                </View>
                <View style={styles.listContainer}>
                  {habit.equipment.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.listItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {habit.prerequisites && habit.prerequisites.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AlertCircle size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Prerequisites</Text>
                </View>
                <View style={styles.listContainer}>
                  {habit.prerequisites.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.listItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {habit.scientificBacking && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TrendingUp size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Scientific Backing</Text>
                </View>
                <Text style={styles.scientificText}>{habit.scientificBacking}</Text>
              </View>
            )}

            {habit.phases && habit.phases.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Target size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Program Phases</Text>
                </View>
                {habit.phases.map((phase, index) => (
                  <View key={index} style={styles.phaseCard}>
                    <View style={styles.phaseHeader}>
                      <View style={[styles.phaseNumber, { backgroundColor: habit.color || COLORS.primary }]}>
                        <Text style={styles.phaseNumberText}>{phase.phase}</Text>
                      </View>
                      <View style={styles.phaseInfo}>
                        <Text style={styles.phaseTitle}>{phase.title}</Text>
                        <Text style={styles.phaseWeeks}>Weeks {phase.weeks[0]}-{phase.weeks[phase.weeks.length - 1]}</Text>
                      </View>
                    </View>
                    <Text style={styles.phaseDescription}>{phase.description}</Text>
                    <View style={styles.focusAreasContainer}>
                      {phase.focusAreas.map((area, areaIndex) => (
                        <View key={areaIndex} style={styles.focusTag}>
                          <Text style={styles.focusTagText}>{area}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {habit.weeks && habit.weeks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Calendar size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Week-by-Week Breakdown</Text>
                </View>
                <Text style={styles.sectionSubtext}>Tap on any week to see daily activities</Text>
                
                {habit.weeks.slice(0, showAllWeeks ? habit.weeks.length : 3).map((week, _index) => (
                  <View key={week.week} style={styles.weekCard}>
                    <TouchableOpacity 
                      style={styles.weekHeader}
                      onPress={() => toggleWeek(week.week)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.weekHeaderLeft}>
                        <Text style={styles.weekNumber}>Week {week.week}</Text>
                        {week.title && <Text style={styles.weekTitle}>{week.title}</Text>}
                      </View>
                      {expandedWeeks[week.week] ? (
                        <ChevronUp size={20} color={COLORS.textSecondary} />
                      ) : (
                        <ChevronDown size={20} color={COLORS.textSecondary} />
                      )}
                    </TouchableOpacity>
                    {week.description && (
                      <Text style={styles.weekDescription}>{week.description}</Text>
                    )}
                    
                    {expandedWeeks[week.week] && week.days && (
                      <View style={styles.daysContainer}>
                        {week.days.map((day, dayIndex) => (
                          <View key={dayIndex} style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                              <Text style={styles.dayTitle}>{day.title}</Text>
                              <Text style={styles.dayDuration}>{day.duration}</Text>
                            </View>
                            {day.description && (
                              <Text style={styles.dayDescription}>{day.description}</Text>
                            )}
                            {day.activities && day.activities.length > 0 && (
                              <View style={styles.activitiesContainer}>
                                {day.activities.map((activity, actIndex) => {
                                  const exerciseGif = findExerciseGif(activity, habit.exerciseGifs);
                                  const formGuide = findExerciseFormGuide(activity, habit.exerciseFormGuides);
                                  const hasForm = exerciseGif || formGuide;
                                  const formKey = `${week.week}-${dayIndex}-${actIndex}`;
                                  const isFormOpen = expandedFormGuide === formKey;
                                  const habitColor = habit.color || '#007AFF';
                                  return (
                                    <View key={actIndex} style={styles.activityItemContainer}>
                                      <View style={styles.activityItem}>
                                        <View style={styles.activityBullet} />
                                        <Text style={styles.activityText}>{activity}</Text>
                                        {hasForm && (
                                          <TouchableOpacity
                                            onPress={() => {
                                              if (isFormOpen) {
                                                setExpandedFormGuide(null);
                                              } else {
                                                setExpandedFormGuide(formKey);
                                                setFormGuideTab('gif');
                                              }
                                            }}
                                            style={[styles.formButton, isFormOpen && { backgroundColor: habitColor, borderColor: habitColor }]}
                                            activeOpacity={0.7}
                                          >
                                            <Text style={[styles.formButtonText, { color: isFormOpen ? '#fff' : habitColor }]}>Form</Text>
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                      {isFormOpen && hasForm && (
                                        <View style={styles.formExpandedContainer}>
                                          <View style={styles.formExpandedHeader}>
                                            <View style={styles.formTabsRow}>
                                              {exerciseGif && (
                                                <TouchableOpacity
                                                  onPress={() => setFormGuideTab('gif')}
                                                  style={[styles.formTabBtn, formGuideTab === 'gif' && { backgroundColor: habitColor + '15' }]}
                                                >
                                                  <Text style={[styles.formTabBtnText, formGuideTab === 'gif' && { color: habitColor }]}>Animation</Text>
                                                </TouchableOpacity>
                                              )}
                                              {formGuide && (
                                                <TouchableOpacity
                                                  onPress={() => setFormGuideTab('guide')}
                                                  style={[styles.formTabBtn, formGuideTab === 'guide' && { backgroundColor: habitColor + '15' }]}
                                                >
                                                  <Text style={[styles.formTabBtnText, formGuideTab === 'guide' && { color: habitColor }]}>Guide</Text>
                                                </TouchableOpacity>
                                              )}
                                            </View>
                                            <TouchableOpacity onPress={() => setExpandedFormGuide(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                              <X size={14} color={COLORS.textLight} />
                                            </TouchableOpacity>
                                          </View>

                                          {formGuideTab === 'gif' && exerciseGif && (
                                            <Image
                                              source={{ uri: exerciseGif }}
                                              style={styles.exerciseGif}
                                              resizeMode="contain"
                                            />
                                          )}

                                          {formGuideTab === 'guide' && formGuide && (
                                            <View style={styles.guideContent}>
                                              <Text style={[styles.guideExerciseName, { color: habitColor }]}>{formGuide.name}</Text>

                                              <View style={styles.guideMusclesRow}>
                                                {formGuide.guide.musclesWorked.map((muscle, i) => (
                                                  <View key={i} style={[styles.guideMuscleTag, { backgroundColor: habitColor + '12' }]}>
                                                    <Text style={[styles.guideMuscleText, { color: habitColor }]}>{muscle}</Text>
                                                  </View>
                                                ))}
                                              </View>

                                              <View style={styles.guideSection}>
                                                <Text style={styles.guideSectionTitle}>Setup</Text>
                                                <Text style={styles.guideSectionText}>{formGuide.guide.setup}</Text>
                                              </View>

                                              <View style={styles.guideSection}>
                                                <Text style={styles.guideSectionTitle}>Steps</Text>
                                                {formGuide.guide.steps.map((step, i) => (
                                                  <View key={i} style={styles.guideStepRow}>
                                                    <View style={[styles.guideStepBadge, { backgroundColor: habitColor }]}>
                                                      <Text style={styles.guideStepBadgeText}>{i + 1}</Text>
                                                    </View>
                                                    <Text style={styles.guideStepText}>{step}</Text>
                                                  </View>
                                                ))}
                                              </View>

                                              <View style={styles.guideSection}>
                                                <Text style={[styles.guideSectionTitle, { color: '#DC2626' }]}>Common Mistakes</Text>
                                                {formGuide.guide.commonMistakes.map((mistake, i) => (
                                                  <View key={i} style={styles.guideMistakeRow}>
                                                    <AlertTriangle size={16} color="#DC2626" style={styles.guideMistakeIcon} />
                                                    <Text style={styles.guideMistakeText}>{mistake}</Text>
                                                  </View>
                                                ))}
                                              </View>

                                              <View style={styles.guideSection}>
                                                <Text style={[styles.guideSectionTitle, { color: '#059669' }]}>Pro Tips</Text>
                                                {formGuide.guide.tips.map((tip, i) => (
                                                  <View key={i} style={styles.guideTipRow}>
                                                    <Check size={16} color="#059669" style={styles.guideTipIcon} />
                                                    <Text style={styles.guideTipText}>{tip}</Text>
                                                  </View>
                                                ))}
                                              </View>
                                            </View>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                            {day.notes && (
                              <View style={styles.dayNotes}>
                                <Text style={styles.dayNotesText}>💡 {day.notes}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                
                {habit.weeks.length > 3 && (
                  <TouchableOpacity 
                    style={styles.showMoreButton}
                    onPress={() => setShowAllWeeks(!showAllWeeks)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllWeeks ? 'Show Less' : `Show All ${habit.weeks.length} Weeks`}
                    </Text>
                    {showAllWeeks ? (
                      <ChevronUp size={16} color={COLORS.primary} />
                    ) : (
                      <ChevronDown size={16} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {habit.dailyStructure && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Daily Structure</Text>
                </View>
                <Text style={styles.dailyStructureText}>{habit.dailyStructure}</Text>
              </View>
            )}

            {habit.resources && habit.resources.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <BookOpen size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Recommended Resources</Text>
                </View>
                {habit.resources.map((resource, index) => (
                  <View key={index} style={styles.resourceCard}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    {resource.description && (
                      <Text style={styles.resourceDescription}>{resource.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {habit.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {habit.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Animated.View style={{ flex: 1, transform: [{ scale: scaleValue }] }}>
              <TouchableOpacity
                style={[styles.addButton, isAdded && styles.addButtonAdded]}
                onPress={handleAdd}
                activeOpacity={0.8}
                disabled={isAdded}
              >
                {isAdded ? (
                  <>
                    <Check size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Added to Your Routine</Text>
                  </>
                ) : (
                  <>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add to My Routine</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: 40,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 4,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingRight: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconEmoji: {
    fontSize: 32,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
    flex: 1,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FF6B35',
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  frequencyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.textLight,
  },
  dayNameActive: {
    color: COLORS.text,
    fontWeight: '600' as const,
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayIndicatorActive: {
    backgroundColor: COLORS.primary,
  },
  scheduleHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 10,
    fontStyle: 'italic' as const,
  },
  schedulePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 12,
  },
  schedulePresetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#E5E5E8',
  },
  schedulePresetText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  adaptiveDurationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  adaptiveIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adaptiveContent: {
    flex: 1,
  },
  adaptiveLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    color: COLORS.textLight,
  },
  adaptiveTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginTop: 2,
  },
  adaptiveSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#E5E5E5',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  creatorStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  outcomeSection: {
    marginBottom: 20,
  },
  outcomeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    lineHeight: 24,
  },
  targetAudienceSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  targetAudienceLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1E40AF',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  targetAudienceText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: COLORS.text,
    lineHeight: 22,
  },
  socialProofSection: {
    marginBottom: 24,
  },
  socialProofRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  socialProofItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  socialProofDivider: {
    width: 1,
    backgroundColor: '#BFDBFE',
    marginHorizontal: 16,
  },
  socialProofValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  socialProofLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
  },
  dividerSection: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  addButtonAdded: {
    backgroundColor: '#34C759',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  longDescriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  listContainer: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  scientificText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    fontStyle: 'italic' as const,
  },
  phaseCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phaseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phaseNumberText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  phaseWeeks: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  phaseDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  focusAreasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  focusTag: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  focusTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  sectionSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  weekCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  weekHeaderLeft: {
    flex: 1,
  },
  weekNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  weekTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  weekDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  daysContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    flex: 1,
  },
  dayDuration: {
    fontSize: 12,
    color: COLORS.textLight,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  activitiesContainer: {
    gap: 12,
  },
  activityItemContainer: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  exerciseGifContainer: {
    marginLeft: 13,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative' as const,
  },
  exerciseGif: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  exerciseGifLabel: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseGifLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  activityBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
  },
  dayNotes: {
    marginTop: 8,
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB800',
  },
  dayNotesText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8B6914',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  dailyStructureText: {
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.textSecondary,
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
  },
  resourceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dietCTA: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  dietCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  dietCTAIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietCTAContent: {
    flex: 1,
  },
  dietCTALabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  dietCTATitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  dietCTASub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  dietCTAArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
  formButtonText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  formExpandedContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  formExpandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  formTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  formTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  formTabBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#94A3B8',
    letterSpacing: -0.2,
  },
  guideContent: {
    padding: 14,
    gap: 14,
  },
  guideExerciseName: {
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  guideMusclesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  guideMuscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  guideMuscleText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  guideSection: {
    gap: 8,
  },
  guideSectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#1E293B',
    letterSpacing: -0.2,
    textTransform: 'uppercase' as const,
  },
  guideSectionText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  guideStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideStepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 1,
  },
  guideStepBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  guideStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  guideMistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  guideMistakeIcon: {
    marginTop: 1,
  },
  guideMistakeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#7F1D1D',
  },
  guideTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  guideTipIcon: {
    marginTop: 1,
  },
  guideTipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#065F46',
  },
});
