import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Clock,
  Layers,
  Zap,
  ChevronRight,
  X,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Timer,
  Link2,
  Target,
  AlertTriangle,
  Coffee,
  Battery,
  Hourglass,
  Brain,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { useTasks } from '@/hooks/useTasksStore';
import { useApp } from '@/hooks/useHabitsStore';
import { useBusyModeSafe } from '@/hooks/useBusyMode';
import { Task } from '@/types/task';
import {
  analyzeHabitCompletionTimes,
  generateHabitStackSuggestions,
  generateMinimalHabits,
  getHabitFormationTip,
  generateHabitInsights,
  HabitStackSuggestion,
  MinimalHabit,
} from '@/utils/habitFormationAnalysis';

interface HabitFormationCoachProps {
  onComplete?: (habitId: string) => void;
  maxItems?: number;
}

export default function HabitFormationCoach({ onComplete, maxItems = 3 }: HabitFormationCoachProps) {
  const tasksContext = useTasks();
  useApp();
  const busyMode = useBusyModeSafe();
  const [activeTab, setActiveTab] = useState<'stack' | 'time' | 'quick'>('stack');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBusyModeModal, setShowBusyModeModal] = useState(false);
  const [selectedStack, setSelectedStack] = useState<HabitStackSuggestion | null>(null);
  const [selectedMinimalHabit, setSelectedMinimalHabit] = useState<MinimalHabit | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const allHabits = useMemo(() => {
    const taskHabits = (tasksContext?.allTasks || []).filter(
      (task: Task) => task.isHabit && task.habitFrequency
    );
    return taskHabits;
  }, [tasksContext?.allTasks]);

  const stackSuggestions = useMemo(() => {
    return generateHabitStackSuggestions(allHabits);
  }, [allHabits]);

  const optimalTimes = useMemo(() => {
    return analyzeHabitCompletionTimes(allHabits);
  }, [allHabits]);

  const minimalHabits = useMemo(() => {
    return generateMinimalHabits(allHabits);
  }, [allHabits]);

  const todayTip = useMemo(() => getHabitFormationTip(), []);

  const insights = useMemo(() => {
    return generateHabitInsights(allHabits);
  }, [allHabits]);

  const priorityInsight = useMemo(() => {
    return insights.find(i => i.priority === 'high') || insights[0];
  }, [insights]);

  const handleStackPress = (stack: HabitStackSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStack(stack);
    setShowDetailModal(true);
  };

  const handleQuickComplete = (habit: MinimalHabit) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onComplete) {
      onComplete(habit.id);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const task = allHabits.find(h => h.id === habit.id);
    if (task && tasksContext?.updateTask) {
      const updatedCompletions = { ...(task.habitCompletions || {}) };
      updatedCompletions[today] = true;
      tasksContext.updateTask(habit.id, {
        habitCompletions: updatedCompletions,
        status: 'completed'
      });
    }
  };

  const toggleQuickMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowBusyModeModal(true);
  };

  const handleEnableBusyMode = async (reason: 'busy_day' | 'low_energy' | 'time_crunch', hours?: number) => {
    await busyMode.enableBusyMode(reason, hours);
    setShowBusyModeModal(false);
  };

  const handleMinimalHabitPress = (habit: MinimalHabit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMinimalHabit(habit);
  };

  if (allHabits.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.08)', 'rgba(6, 182, 212, 0.04)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#7c3aed', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Brain size={18} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerTitle}>Habit Coach</Text>
              <Text style={styles.headerSubtitle}>Build better habits</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.quickModeBtn, busyMode.isEnabled && styles.quickModeBtnActive]}
            onPress={toggleQuickMode}
          >
            <Zap size={14} color={busyMode.isEnabled ? '#fff' : '#F59E0B'} />
            <Text style={[styles.quickModeBtnText, busyMode.isEnabled && styles.quickModeBtnTextActive]}>
              {busyMode.isEnabled ? `Busy ${busyMode.getTimeRemaining() || 'On'}` : 'Busy Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        {priorityInsight && priorityInsight.priority === 'high' && (
          <TouchableOpacity style={styles.insightBanner}>
            <View style={styles.insightIconBg}>
              <AlertTriangle size={14} color="#F59E0B" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{priorityInsight.title}</Text>
              <Text style={styles.insightDesc} numberOfLines={1}>{priorityInsight.description}</Text>
            </View>
            <ChevronRight size={16} color="#F59E0B" />
          </TouchableOpacity>
        )}

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stack' && styles.tabActive]}
            onPress={() => setActiveTab('stack')}
          >
            <Link2 size={14} color={activeTab === 'stack' ? '#7c3aed' : COLORS.textLight} />
            <Text style={[styles.tabText, activeTab === 'stack' && styles.tabTextActive]}>
              Stack
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'time' && styles.tabActive]}
            onPress={() => setActiveTab('time')}
          >
            <Clock size={14} color={activeTab === 'time' ? '#7c3aed' : COLORS.textLight} />
            <Text style={[styles.tabText, activeTab === 'time' && styles.tabTextActive]}>
              Best Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'quick' && styles.tabActive]}
            onPress={() => setActiveTab('quick')}
          >
            <Zap size={14} color={activeTab === 'quick' ? '#7c3aed' : COLORS.textLight} />
            <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>
              2-Min
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'stack' && (
          <View style={styles.contentSection}>
            {stackSuggestions.length > 0 ? (
              stackSuggestions.slice(0, maxItems).map((stack, index) => (
                <TouchableOpacity
                  key={stack.id}
                  style={styles.stackCard}
                  onPress={() => handleStackPress(stack)}
                  activeOpacity={0.8}
                >
                  <View style={styles.stackVisual}>
                    <View style={[styles.habitDot, { backgroundColor: stack.anchorHabit.color || '#7c3aed' }]} />
                    <View style={styles.stackArrow}>
                      <ArrowRight size={12} color={COLORS.textLight} />
                    </View>
                    <View style={[styles.habitDot, { backgroundColor: stack.stackedHabit.color || '#06b6d4' }]} />
                  </View>
                  <View style={styles.stackContent}>
                    <Text style={styles.stackTitle}>
                      {stack.trigger === 'after' ? 'After' : 'Before'} {stack.anchorHabit.name}
                    </Text>
                    <Text style={styles.stackHabit}>{stack.stackedHabit.name}</Text>
                    <Text style={styles.stackReason} numberOfLines={1}>{stack.reason}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Layers size={32} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>No stacks yet</Text>
                <Text style={styles.emptyText}>Add more habits to get stacking suggestions</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'time' && (
          <View style={styles.contentSection}>
            {optimalTimes.slice(0, maxItems).map((slot, index) => (
              <View key={slot.habitId} style={styles.timeCard}>
                <View style={[styles.timeIconBg, { backgroundColor: (slot.color || '#7c3aed') + '15' }]}>
                  <Clock size={16} color={slot.color || '#7c3aed'} />
                </View>
                <View style={styles.timeContent}>
                  <View style={styles.timeNameRow}>
                    <Text style={styles.timeName}>{slot.habitName}</Text>
                    {slot.peakProductivityMatch && (
                      <View style={styles.peakBadge}>
                        <Zap size={10} color="#F59E0B" />
                        <Text style={styles.peakBadgeText}>Peak</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.timeReason} numberOfLines={2}>{slot.reasoning}</Text>
                  <View style={styles.timeMetrics}>
                    {slot.successRate > 0 && (
                      <View style={styles.metricChip}>
                        <Target size={10} color="#10B981" />
                        <Text style={styles.metricText}>{slot.successRate}% success</Text>
                      </View>
                    )}
                    {slot.consistencyScore > 0 && (
                      <View style={styles.metricChip}>
                        <CheckCircle2 size={10} color="#7c3aed" />
                        <Text style={styles.metricText}>{slot.consistencyScore}% consistent</Text>
                      </View>
                    )}
                    {slot.suggestedReminder && (
                      <View style={styles.metricChip}>
                        <Clock size={10} color="#6B7280" />
                        <Text style={styles.metricText}>Remind {slot.suggestedReminder}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.timeBadgeContainer}>
                  <View style={[styles.timeBadge, slot.successRate >= 80 && styles.timeBadgeHigh]}>
                    <Text style={[styles.timeLabel, slot.successRate >= 80 && styles.timeLabelHigh]}>{slot.optimalTimeLabel}</Text>
                  </View>
                  {slot.successRate === 0 && (
                    <Text style={styles.timeBadgeHint}>suggested</Text>
                  )}
                </View>
              </View>
            ))}
            {optimalTimes.length === 0 && (
              <View style={styles.emptyState}>
                <Clock size={32} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>No timing data yet</Text>
                <Text style={styles.emptyText}>Complete habits to discover your optimal times</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'quick' && (
          <View style={styles.contentSection}>
            <View style={styles.quickHeader}>
              <Zap size={16} color="#F59E0B" />
              <Text style={styles.quickHeaderText}>
                {busyMode.isEnabled ? 'Tap to complete minimum version' : '2-minute versions when you\'re busy'}
              </Text>
            </View>
            {minimalHabits.slice(0, maxItems).map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={[styles.quickCard, busyMode.isEnabled && styles.quickCardEnabled]}
                onPress={() => busyMode.isEnabled ? handleQuickComplete(habit) : handleMinimalHabitPress(habit)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBg, { backgroundColor: (habit.color || '#10B981') + '15' }]}>
                  <Target size={16} color={habit.color || '#10B981'} />
                </View>
                <View style={styles.quickContent}>
                  <Text style={styles.quickName}>{habit.name}</Text>
                  <Text style={styles.quickMinimal}>{habit.minimalVersion}</Text>
                  {habit.scientificReason && (
                    <Text style={styles.quickReason} numberOfLines={1}>{habit.scientificReason}</Text>
                  )}
                </View>
                <View style={styles.quickDuration}>
                  <Timer size={12} color="#F59E0B" />
                  <Text style={styles.quickDurationText}>{habit.minimalDuration}m</Text>
                </View>
                {busyMode.isEnabled && (
                  <View style={styles.quickCompleteBtn}>
                    <CheckCircle2 size={20} color="#10B981" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>{todayTip.icon}</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>{todayTip.title}</Text>
            <Text style={styles.tipText}>{todayTip.tip}</Text>
          </View>
        </View>
      </LinearGradient>

      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Habit Stack</Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => setShowDetailModal(false)}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {selectedStack && (
              <View style={styles.modalBody}>
                <View style={styles.stackDetailVisual}>
                  <View style={styles.stackDetailHabit}>
                    <View style={[styles.stackDetailDot, { backgroundColor: selectedStack.anchorHabit.color || '#7c3aed' }]} />
                    <Text style={styles.stackDetailName}>{selectedStack.anchorHabit.name}</Text>
                    <Text style={styles.stackDetailLabel}>Anchor Habit</Text>
                  </View>
                  
                  <View style={styles.stackDetailArrow}>
                    <View style={styles.arrowLine} />
                    <Text style={styles.arrowText}>{selectedStack.trigger}</Text>
                    <View style={styles.arrowLine} />
                  </View>
                  
                  <View style={styles.stackDetailHabit}>
                    <View style={[styles.stackDetailDot, { backgroundColor: selectedStack.stackedHabit.color || '#06b6d4' }]} />
                    <Text style={styles.stackDetailName}>{selectedStack.stackedHabit.name}</Text>
                    <Text style={styles.stackDetailLabel}>Stacked Habit</Text>
                  </View>
                </View>
                
                <View style={styles.reasonCard}>
                  <Lightbulb size={18} color="#F59E0B" />
                  <Text style={styles.reasonText}>{selectedStack.reason}</Text>
                </View>
                
                <View style={styles.formulaCard}>
                  <Text style={styles.formulaTitle}>Your habit stack formula:</Text>
                  <Text style={styles.formulaText}>
                    &quot;{selectedStack.trigger === 'after' ? 'After I' : 'Before I'} <Text style={styles.formulaHighlight}>{selectedStack.anchorHabit.name.toLowerCase()}</Text>, I will <Text style={styles.formulaHighlight}>{selectedStack.stackedHabit.name.toLowerCase()}</Text>.&quot;
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.applyBtn}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowDetailModal(false);
                  }}
                >
                  <LinearGradient
                    colors={['#7c3aed', '#06b6d4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.applyBtnGradient}
                  >
                    <Text style={styles.applyBtnText}>Got it!</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showBusyModeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBusyModeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {busyMode.isEnabled ? 'Busy Mode Active' : 'Enable Busy Mode'}
              </Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => setShowBusyModeModal(false)}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {busyMode.isEnabled ? (
                <>
                  <View style={styles.busyModeActiveCard}>
                    <Zap size={32} color="#F59E0B" />
                    <Text style={styles.busyModeActiveTitle}>{busyMode.getBusyModeMessage()}</Text>
                    {busyMode.getTimeRemaining() && (
                      <Text style={styles.busyModeTimeLeft}>Time remaining: {busyMode.getTimeRemaining()}</Text>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.disableBusyModeBtn}
                    onPress={async () => {
                      await busyMode.disableBusyMode();
                      setShowBusyModeModal(false);
                    }}
                  >
                    <Text style={styles.disableBusyModeBtnText}>Turn Off Busy Mode</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.busyModeDesc}>
                    When you&apos;re pressed for time, Busy Mode shows 2-minute versions of your habits to protect your streaks.
                  </Text>
                  
                  <Text style={styles.busyModeQuestion}>What&apos;s your situation?</Text>
                  
                  <TouchableOpacity 
                    style={styles.busyModeOption}
                    onPress={() => handleEnableBusyMode('busy_day', 4)}
                  >
                    <View style={[styles.busyModeOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Coffee size={20} color="#D97706" />
                    </View>
                    <View style={styles.busyModeOptionContent}>
                      <Text style={styles.busyModeOptionTitle}>Busy Day</Text>
                      <Text style={styles.busyModeOptionDesc}>Enable for 4 hours</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.busyModeOption}
                    onPress={() => handleEnableBusyMode('low_energy', 8)}
                  >
                    <View style={[styles.busyModeOptionIcon, { backgroundColor: '#E0E7FF' }]}>
                      <Battery size={20} color="#4F46E5" />
                    </View>
                    <View style={styles.busyModeOptionContent}>
                      <Text style={styles.busyModeOptionTitle}>Low Energy</Text>
                      <Text style={styles.busyModeOptionDesc}>Enable for 8 hours</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.busyModeOption}
                    onPress={() => handleEnableBusyMode('time_crunch', 2)}
                  >
                    <View style={[styles.busyModeOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Hourglass size={20} color="#DC2626" />
                    </View>
                    <View style={styles.busyModeOptionContent}>
                      <Text style={styles.busyModeOptionTitle}>Time Crunch</Text>
                      <Text style={styles.busyModeOptionDesc}>Enable for 2 hours</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                  
                  <View style={styles.busyModeTip}>
                    <Lightbulb size={16} color="#10B981" />
                    <Text style={styles.busyModeTipText}>
                      Completing the 2-minute version still counts toward your streak!
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedMinimalHabit}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMinimalHabit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Minimal Version</Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => setSelectedMinimalHabit(null)}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {selectedMinimalHabit && (
              <View style={styles.modalBody}>
                <View style={styles.minimalHabitHeader}>
                  <View style={[styles.minimalHabitIcon, { backgroundColor: (selectedMinimalHabit.color || '#10B981') + '15' }]}>
                    <Target size={28} color={selectedMinimalHabit.color || '#10B981'} />
                  </View>
                  <Text style={styles.minimalHabitName}>{selectedMinimalHabit.name}</Text>
                </View>
                
                <View style={styles.minimalVersionCard}>
                  <View style={styles.minimalVersionHeader}>
                    <Timer size={16} color="#F59E0B" />
                    <Text style={styles.minimalVersionTime}>{selectedMinimalHabit.minimalDuration} minutes</Text>
                  </View>
                  <Text style={styles.minimalVersionText}>{selectedMinimalHabit.minimalVersion}</Text>
                </View>
                
                {selectedMinimalHabit.scientificReason && (
                  <View style={styles.scienceCard}>
                    <View style={styles.scienceHeader}>
                      <Brain size={16} color="#7C3AED" />
                      <Text style={styles.scienceTitle}>Why It Works</Text>
                    </View>
                    <Text style={styles.scienceText}>{selectedMinimalHabit.scientificReason}</Text>
                  </View>
                )}
                
                {selectedMinimalHabit.motivationalTip && (
                  <View style={styles.motivationCard}>
                    <Text style={styles.motivationText}>&quot;{selectedMinimalHabit.motivationalTip}&quot;</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.applyBtn}
                  onPress={() => {
                    handleQuickComplete(selectedMinimalHabit);
                    setSelectedMinimalHabit(null);
                  }}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.applyBtnGradient}
                  >
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={styles.applyBtnText}>Complete Minimal Version</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientBg: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  quickModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  quickModeBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  quickModeBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  quickModeBtnTextActive: {
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: '#7c3aed',
  },
  contentSection: {
    gap: 10,
    marginBottom: 16,
  },
  stackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  stackVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  habitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stackArrow: {
    marginHorizontal: 4,
  },
  stackContent: {
    flex: 1,
  },
  stackTitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  stackHabit: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginTop: 2,
  },
  stackReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  timeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  timeContent: {
    flex: 1,
  },
  timeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  peakBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#D97706',
    textTransform: 'uppercase' as const,
  },
  timeReason: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    lineHeight: 16,
  },
  timeMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metricText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  timeBadgeContainer: {
    alignItems: 'center',
    marginLeft: 10,
  },
  timeBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timeBadgeHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  timeLabelHigh: {
    color: '#059669',
  },
  timeBadgeHint: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  quickHeaderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  quickCardEnabled: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
  },
  quickIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickContent: {
    flex: 1,
  },
  quickName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  quickMinimal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickReason: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
  quickDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickDurationText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  quickCompleteBtn: {
    marginLeft: 10,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  tipText: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  stackDetailVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stackDetailHabit: {
    alignItems: 'center',
    flex: 1,
  },
  stackDetailDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 10,
  },
  stackDetailName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
  },
  stackDetailLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  stackDetailArrow: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  arrowLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  arrowText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textLight,
    textTransform: 'uppercase' as const,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
  },
  formulaCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  formulaTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textLight,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  formulaText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
    fontStyle: 'italic' as const,
  },
  formulaHighlight: {
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  applyBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  applyBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginLeft: 8,
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  insightIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  insightDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  busyModeActiveCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  busyModeActiveTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#92400E',
    marginTop: 12,
    textAlign: 'center' as const,
  },
  busyModeTimeLeft: {
    fontSize: 14,
    color: '#B45309',
    marginTop: 8,
  },
  disableBusyModeBtn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  disableBusyModeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  busyModeDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  busyModeQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 12,
  },
  busyModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  busyModeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  busyModeOptionContent: {
    flex: 1,
  },
  busyModeOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  busyModeOptionDesc: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  busyModeTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 10,
  },
  busyModeTipText: {
    flex: 1,
    fontSize: 13,
    color: '#059669',
    lineHeight: 20,
  },
  minimalHabitHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  minimalHabitIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  minimalHabitName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
  },
  minimalVersionCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  minimalVersionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  minimalVersionTime: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  minimalVersionText: {
    fontSize: 16,
    color: '#78350F',
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  scienceCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  scienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scienceTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  scienceText: {
    fontSize: 14,
    color: '#5B21B6',
    lineHeight: 22,
  },
  motivationCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  motivationText: {
    fontSize: 15,
    color: '#065F46',
    fontStyle: 'italic' as const,
    lineHeight: 24,
  },
});
