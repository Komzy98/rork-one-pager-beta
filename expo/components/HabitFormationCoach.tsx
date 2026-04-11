import React, { useMemo, useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Brain,
  Zap,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Flame,
  Target,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  MessageCircle,
  RefreshCw,
  Clock,
  Shield,
  ArrowRight,
  Trophy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { useTasks } from '@/hooks/useTasksStore';
import { useApp } from '@/hooks/useHabitsStore';
import { useBusyModeSafe } from '@/hooks/useBusyMode';
import { Task } from '@/types/task';
import {
  generateMinimalHabits,
  generateHabitInsights,
  MinimalHabit,
  HabitInsight,
} from '@/utils/habitFormationAnalysis';
import { generateText } from '@rork-ai/toolkit-sdk';

interface HabitFormationCoachProps {
  onComplete?: (habitId: string) => void;
  maxItems?: number;
}

interface QuickWinItemProps {
  item: {
    id: string;
    title: string;
    color: string;
    streak: number;
    minimalVersion: string;
    minimalDuration: number;
    isAtRisk: boolean;
  };
  onComplete: (id: string) => void;
}

const QuickWinItem = memo(function QuickWinItem({ item, onComplete }: QuickWinItemProps) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !expanded;
    setExpanded(next);
    Animated.spring(rotateAnim, {
      toValue: next ? 1 : 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.quickItemWrapper}>
      <TouchableOpacity
        style={styles.quickItem}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={[styles.quickDot, { backgroundColor: item.color }]} />
        <View style={styles.quickItemInfo}>
          <View style={styles.quickItemRow}>
            <Text style={styles.quickItemName} numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
            {item.isAtRisk && (
              <View style={styles.riskBadge}>
                <Shield size={9} color="#DC2626" strokeWidth={2.5} />
              </View>
            )}
          </View>
          <Text style={styles.quickItemMinimal} numberOfLines={expanded ? undefined : 1}>{item.minimalVersion}</Text>
        </View>
        <View style={styles.quickItemRight}>
          <View style={styles.durationBadge}>
            <Clock size={10} color="#64748B" strokeWidth={2} />
            <Text style={styles.durationText}>{item.minimalDuration}m</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <ChevronDown size={16} color="#94A3B8" strokeWidth={2} />
          </Animated.View>
        </View>
      </TouchableOpacity>
      {expanded && (
        <TouchableOpacity
          style={styles.quickCompleteBtn}
          onPress={() => onComplete(item.id)}
          activeOpacity={0.7}
        >
          <CheckCircle2 size={16} color="#fff" strokeWidth={2.5} />
          <Text style={styles.quickCompleteBtnText}>Mark complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function HabitFormationCoach({ onComplete, maxItems = 3 }: HabitFormationCoachProps) {
  const tasksContext = useTasks();
  useApp();
  const busyMode = useBusyModeSafe();
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const allHabits = useMemo(() => {
    return (tasksContext?.allTasks || []).filter(
      (task: Task) => task.isHabit && task.habitFrequency
    );
  }, [tasksContext?.allTasks]);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  const habitStats = useMemo(() => {
    const total = allHabits.length;
    const completedToday = allHabits.filter(h => h.habitCompletions?.[today]).length;
    const currentHour = new Date().getHours();
    const atRisk = allHabits.filter(h => {
      const streak = h.habitStreak || 0;
      return streak >= 3 && !h.habitCompletions?.[today] && currentHour >= 18;
    });
    const longestStreak = Math.max(0, ...allHabits.map(h => h.habitStreak || 0));
    const avgCompletion = total > 0 ? Math.round((completedToday / total) * 100) : 0;

    return { total, completedToday, atRisk, longestStreak, avgCompletion };
  }, [allHabits, today]);

  const insights = useMemo(() => {
    return generateHabitInsights(allHabits);
  }, [allHabits]);

  const minimalHabits = useMemo(() => {
    return generateMinimalHabits(allHabits);
  }, [allHabits]);

  const incompleteHabits = useMemo(() => {
    return allHabits.filter(h => !h.habitCompletions?.[today]);
  }, [allHabits, today]);

  const quickRoutine = useMemo(() => {
    const quickable = incompleteHabits.filter(h => {
      const minimal = minimalHabits.find(m => m.id === h.id);
      return minimal?.hasQuickVersion === true;
    });
    return quickable.slice(0, 4).map(h => {
      const minimal = minimalHabits.find(m => m.id === h.id);
      return {
        id: h.id,
        title: h.title,
        color: h.color || COLORS.primary,
        streak: h.habitStreak || 0,
        minimalVersion: minimal?.minimalVersion || h.title,
        minimalDuration: minimal?.minimalDuration || 2,
        isAtRisk: (h.habitStreak || 0) >= 3,
      };
    });
  }, [incompleteHabits, minimalHabits]);

  const buildCoachPrompt = useCallback(() => {
    const habitSummaries = allHabits.map(h => {
      const completionCount = Object.keys(h.habitCompletions || {}).length;
      const doneToday = h.habitCompletions?.[today] ? 'yes' : 'no';
      return `- "${h.title}" (streak: ${h.habitStreak || 0}d, total completions: ${completionCount}, done today: ${doneToday})`;
    }).join('\n');

    const atRiskNames = habitStats.atRisk.map(h => `"${h.title}" (${h.habitStreak}d streak)`).join(', ');

    return `You are a concise, motivating habit coach. Give ONE short coaching message (2-3 sentences max) based on this data:

Habits today: ${habitStats.completedToday}/${habitStats.total} completed
${habitSummaries}
${atRiskNames ? `Streaks at risk: ${atRiskNames}` : 'No streaks at risk.'}
Longest active streak: ${habitStats.longestStreak} days
Time of day: ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}

Rules:
- Be specific about THEIR habits by name
- If streaks are at risk, mention them urgently
- If all done, celebrate genuinely
- Give one actionable tip
- Sound human, warm, direct. No fluff.
- Do NOT use any markdown formatting like ** or * or # — output plain text only`;
  }, [allHabits, habitStats, today]);

  const getCoaching = useCallback(async () => {
    if (allHabits.length === 0) return;
    setIsLoadingCoach(true);
    try {
      const prompt = buildCoachPrompt();
      console.log('🧠 [HabitCoach] Requesting coaching...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await generateText({
        messages: [{ role: 'user', content: prompt }],
      });
      clearTimeout(timeoutId);
      if (response && typeof response === 'string' && response.trim().length > 0) {
        const cleaned = response.replace(/\*\*/g, '');
        setCoachMessage(cleaned);
        console.log('✅ [HabitCoach] Got coaching response');
      } else {
        console.log('⚠️ [HabitCoach] Empty response, using fallback');
        setCoachMessage(getFallbackMessage());
      }
      setHasLoadedOnce(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ [HabitCoach] AI unavailable, using fallback:', errorMessage);
      setCoachMessage(getFallbackMessage());
      setHasLoadedOnce(true);
    } finally {
      setIsLoadingCoach(false);
    }
  }, [allHabits, buildCoachPrompt]);

  const getFallbackMessage = () => {
    if (habitStats.completedToday === habitStats.total && habitStats.total > 0) {
      return "You crushed every habit today! Consistency like this is what separates builders from wishers. Enjoy the win.";
    }
    if (habitStats.atRisk.length > 0) {
      const name = habitStats.atRisk[0].title;
      const streak = habitStats.atRisk[0].habitStreak || 0;
      return `Your ${streak}-day streak on "${name}" needs you today. Even 2 minutes counts — don't let momentum slip.`;
    }
    if (habitStats.completedToday > 0) {
      return `${habitStats.completedToday} down, ${habitStats.total - habitStats.completedToday} to go. You've already started — finishing is the easy part now.`;
    }
    return "Today is a fresh page. Pick your easiest habit and knock it out right now — momentum builds from one small win.";
  };

  const retryCountRef = useRef(0);

  useEffect(() => {
    if (allHabits.length > 0 && !hasLoadedOnce && !isLoadingCoach && retryCountRef.current < 2) {
      retryCountRef.current += 1;
      getCoaching();
    }
  }, [allHabits.length, hasLoadedOnce, isLoadingCoach, getCoaching]);

  const handleQuickComplete = (habitId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onComplete) {
      onComplete(habitId);
    }
    const task = allHabits.find(h => h.id === habitId);
    if (task && tasksContext?.updateTask) {
      const updatedCompletions = { ...(task.habitCompletions || {}) };
      updatedCompletions[today] = true;
      tasksContext.updateTask(habitId, {
        habitCompletions: updatedCompletions,
        status: 'completed',
      });
    }
  };

  if (allHabits.length === 0) {
    return null;
  }

  const allDone = habitStats.completedToday === habitStats.total;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.iconBg, allDone && styles.iconBgDone]}>
              {allDone ? (
                <Trophy size={18} color="#fff" strokeWidth={2.5} />
              ) : (
                <Brain size={18} color="#fff" strokeWidth={2.5} />
              )}
            </View>
          </Animated.View>
          <View>
            <Text style={styles.headerTitle}>Habit Coach</Text>
            <Text style={styles.headerSubtitle}>
              {allDone ? 'All done today!' : `${habitStats.completedToday}/${habitStats.total} completed`}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {habitStats.longestStreak > 0 && (
            <View style={styles.statPill}>
              <Flame size={11} color="#F59E0B" strokeWidth={2.5} />
              <Text style={styles.statPillText}>{habitStats.longestStreak}d</Text>
            </View>
          )}
          <View style={[styles.statPill, allDone ? styles.statPillDone : styles.statPillProgress]}>
            <Text style={[styles.statPillText, allDone ? styles.statPillTextDone : styles.statPillTextProgress]}>
              {habitStats.avgCompletion}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.coachSection}>
        <View style={styles.coachBubble}>
          <View style={styles.coachBubbleHeader}>
            <MessageCircle size={13} color="#0F172A" strokeWidth={2.5} />
            <Text style={styles.coachBubbleLabel}>Coach says</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                getCoaching();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.refreshBtn}
            >
              {isLoadingCoach ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <RefreshCw size={13} color="#94A3B8" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.coachText}>
            {isLoadingCoach && !coachMessage
              ? 'Analyzing your habits...'
              : coachMessage || getFallbackMessage()}
          </Text>
        </View>
      </View>

      {habitStats.atRisk.length > 0 && !allDone && (
        <View style={styles.alertSection}>
          <View style={styles.alertHeader}>
            <AlertTriangle size={14} color="#DC2626" strokeWidth={2.5} />
            <Text style={styles.alertTitle}>Streaks at risk</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertScroll}>
            {habitStats.atRisk.slice(0, 4).map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={styles.atRiskChip}
                onPress={() => handleQuickComplete(habit.id)}
                activeOpacity={0.7}
              >
                <Flame size={12} color="#DC2626" strokeWidth={2.5} />
                <Text style={styles.atRiskName} numberOfLines={1}>{habit.title}</Text>
                <Text style={styles.atRiskStreak}>{habit.habitStreak}d</Text>
                <ArrowRight size={10} color="#DC2626" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {quickRoutine.length > 0 && !allDone && (
        <View style={styles.quickSection}>
          <View style={styles.quickHeaderRow}>
            <View style={styles.quickIconWrap}>
              <Zap size={13} color="#fff" strokeWidth={2.5} />
            </View>
            <View style={styles.quickHeaderText}>
              <Text style={styles.quickTitle}>Quick wins</Text>
              <Text style={styles.quickSubtitle}>Simplified versions to keep your streak</Text>
            </View>
          </View>
          <View style={styles.quickList}>
            {quickRoutine.map((item, index) => (
              <React.Fragment key={item.id}>
                <QuickWinItem
                  item={item}
                  onComplete={handleQuickComplete}
                />
                {index < quickRoutine.length - 1 && <View style={styles.quickDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {allDone && (
        <View style={styles.celebrationSection}>
          <View style={styles.celebrationContent}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>Perfect day!</Text>
            <Text style={styles.celebrationText}>
              All {habitStats.total} habits completed. Keep this energy going tomorrow.
            </Text>
          </View>
        </View>
      )}

      {insights.length > 0 && (
        <View style={styles.insightSection}>
          {insights.slice(0, 2).map((insight, idx) => {
            const isHigh = insight.priority === 'high';
            const isMomentum = insight.type === 'momentum';
            return (
              <View
                key={`${insight.habitId}-${idx}`}
                style={[
                  styles.insightCard,
                  isHigh && styles.insightCardHigh,
                  isMomentum && styles.insightCardMomentum,
                ]}
              >
                <View style={[
                  styles.insightIconWrap,
                  isHigh && styles.insightIconWrapHigh,
                  isMomentum && styles.insightIconWrapMomentum,
                ]}>
                  {isHigh ? (
                    <Flame size={14} color="#DC2626" strokeWidth={2.5} />
                  ) : isMomentum ? (
                    <Trophy size={14} color="#D97706" strokeWidth={2.5} />
                  ) : (
                    <TrendingUp size={14} color="#3B82F6" strokeWidth={2.5} />
                  )}
                </View>
                <View style={styles.insightContent}>
                  <Text style={[
                    styles.insightTitle,
                    isHigh && styles.insightTitleHigh,
                    isMomentum && styles.insightTitleMomentum,
                  ]}>{insight.title}</Text>
                  <Text style={styles.insightDesc} numberOfLines={2}>{insight.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgDone: {
    backgroundColor: '#059669',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statPillProgress: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  statPillDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  statPillTextProgress: {
    color: '#007AFF',
  },
  statPillTextDone: {
    color: '#059669',
  },
  coachSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 4,
  },
  coachBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  coachBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  coachBubbleLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    flex: 1,
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 21,
    fontWeight: '500' as const,
  },
  alertSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#DC2626',
  },
  alertScroll: {
    flexDirection: 'row',
  },
  atRiskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.12)',
  },
  atRiskName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#991B1B',
    maxWidth: 120,
  },
  atRiskStreak: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  quickSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  quickHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  quickIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickHeaderText: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  quickSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  quickList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  quickDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginHorizontal: 12,
  },
  quickItemWrapper: {
    overflow: 'hidden',
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  quickCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  quickCompleteBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: -0.1,
  },
  quickDot: {
    width: 3,
    height: 28,
    borderRadius: 2,
    marginRight: 12,
  },
  quickItemInfo: {
    flex: 1,
  },
  quickItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E293B',
    flex: 1,
    letterSpacing: -0.1,
  },
  riskBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickItemMinimal: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  quickItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#64748B',
  },

  celebrationSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  celebrationContent: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  celebrationEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#065F46',
    marginBottom: 4,
  },
  celebrationText: {
    fontSize: 13,
    color: '#047857',
    textAlign: 'center' as const,
    lineHeight: 19,
  },
  insightSection: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  insightCardHigh: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220, 38, 38, 0.1)',
  },
  insightCardMomentum: {
    backgroundColor: '#FFFBEB',
    borderColor: 'rgba(217, 119, 6, 0.12)',
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightIconWrapHigh: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  insightIconWrapMomentum: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  insightContent: {
    flex: 1,
    paddingTop: 2,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1E293B',
    letterSpacing: -0.1,
  },
  insightTitleHigh: {
    color: '#991B1B',
  },
  insightTitleMomentum: {
    color: '#92400E',
  },
  insightDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
});
