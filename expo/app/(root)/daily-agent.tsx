import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Sparkles,
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Target,
  Scale,
  Lightbulb,
  Clock,
  Heart,
  Briefcase,
  BookOpen,
  Users,
  Coffee,
  Dumbbell,
  CheckCircle2,
  Circle,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCalendar } from '@/hooks/useCalendar';
import {
  generateDailyAgentReport,
  DailyAgentReport,
  DailyAgentInput,
} from '@/utils/dailyAgent';
import { useMutation } from '@tanstack/react-query';
import type { ThemeColors } from '@/types/theme';
import { calendarEventOnLocalDay, getLocalDateStr } from '@/utils/dateUtils';

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const last7Dates = (): string[] => {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
};

function useAnimatedNumber(target: number, duration: number = 1000) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    const listener = anim.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(listener);
    };
  }, [target, duration, anim]);

  return display;
}

function ScoreRing({
  score,
  grade,
  colors,
}: {
  score: number;
  grade: string;
  colors: ThemeColors;
}) {
  const size = 180;
  const strokeWidth = 14;
  const animated = useAnimatedNumber(score, 1400);
  const progress = animated / 100;

  const ringColor =
    score >= 85 ? '#10B981' : score >= 70 ? '#3B82F6' : score >= 50 ? '#F59E0B' : '#EF4444';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const dashes = 60;
  const activeDashes = Math.round(progress * dashes);

  return (
    <Animated.View style={[ringStyles.wrapper, { width: size, height: size, transform: [{ scale: pulseAnim }] }]}>
      <View style={[ringStyles.track, { width: size, height: size, borderRadius: size / 2, borderColor: colors.border }]} />
      <View style={[ringStyles.dashContainer, { width: size, height: size }]}>
        {Array.from({ length: dashes }).map((_, i) => {
          const angle = (i / dashes) * 360;
          const active = i < activeDashes;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: size / 2 - 1.5,
                top: 4,
                width: 3,
                height: strokeWidth,
                borderRadius: 2,
                backgroundColor: active ? ringColor : colors.border,
                opacity: active ? 1 : 0.35,
                transform: [
                  { translateY: size / 2 - strokeWidth - 4 },
                  { rotate: `${angle}deg` },
                  { translateY: -(size / 2 - strokeWidth - 4) },
                ],
              }}
            />
          );
        })}
      </View>
      <View style={ringStyles.center}>
        <Text style={[ringStyles.scoreValue, { color: colors.text }]}>{animated}</Text>
        <Text style={[ringStyles.scoreLabel, { color: colors.textTertiary }]}>Productivity</Text>
        <View style={[ringStyles.gradeBadge, { backgroundColor: ringColor + '20', borderColor: ringColor + '60' }]}>
          <Text style={[ringStyles.gradeText, { color: ringColor }]}>{grade}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const ringStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  track: { position: 'absolute', borderWidth: 2, opacity: 0.15 },
  dashContainer: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 56, fontWeight: '800' as const, letterSpacing: -2 },
  scoreLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginTop: -4 },
  gradeBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  gradeText: { fontSize: 13, fontWeight: '800' as const, letterSpacing: 1 },
});

function MetricBar({
  label,
  value,
  color,
  colors,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  colors: ThemeColors;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, delay, anim]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={metricStyles.row}>
      <View style={metricStyles.labelRow}>
        <Text style={[metricStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[metricStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
      <View style={[metricStyles.track, { backgroundColor: colors.surfaceSecondary }]}>
        <Animated.View style={[metricStyles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  row: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600' as const },
  value: { fontSize: 13, fontWeight: '700' as const },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

const DIMENSION_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Work: Briefcase,
  Health: Heart,
  Leisure: Coffee,
  Social: Users,
  Learning: BookOpen,
  Rest: Dumbbell,
};

const DIMENSION_COLORS: Record<string, string> = {
  Work: '#3B82F6',
  Health: '#EF4444',
  Leisure: '#F59E0B',
  Social: '#EC4899',
  Learning: '#8B5CF6',
  Rest: '#10B981',
};

const CAT_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  habit: Flame,
  task: Target,
  rest: Coffee,
  social: Users,
  learning: BookOpen,
  focus: Zap,
  health: Heart,
};

export default function DailyAgentScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { habitsWithStats, shows } = useApp();
  const { allTasks } = useTasks();
  const { profile } = useUserProfile();
  const calendarData = useCalendar();
  const getUpcomingCalendarEvents = calendarData?.getUpcomingCalendarEvents || (() => []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const input: DailyAgentInput = useMemo(() => {
    const today = todayStr();
    const last7 = last7Dates();

    const habitsFromStore = (habitsWithStats || []).map(h => ({
      name: h.name,
      completedToday: !!h.completions?.[today],
      streak: h.streak,
      totalCompletions: h.totalCompletions,
      frequencyType: h.frequency?.type,
      last7DaysCompleted: last7.filter(d => h.completions?.[d]).length,
    }));

    const taskHabits = (allTasks || []).filter(t => t.isHabit);
    const habitsFromTasks = taskHabits.map(t => {
      const completions = t.habitCompletions || {};
      const totalCompletions = Object.values(completions).filter(Boolean).length;
      return {
        name: t.title,
        completedToday: !!completions[today],
        streak: t.habitStreak ?? 0,
        totalCompletions,
        frequencyType: t.habitFrequency?.type,
        last7DaysCompleted: last7.filter(d => completions[d]).length,
      };
    });

    const habits = [...habitsFromStore, ...habitsFromTasks];

    const tasks = (allTasks || [])
      .filter(t => !t.isHabit)
      .map(t => {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        const todayDate = new Date();
        const completedToday = t.status === 'completed' && !!t.completedAt?.startsWith(today);
        const dueToday = !!due && due.toDateString() === todayDate.toDateString();
        const overdue = !!due && due < todayDate && t.status !== 'completed' && t.status !== 'cancelled';
        return {
          title: t.title,
          status: t.status,
          priority: t.priority,
          category: t.category,
          completedToday,
          dueToday,
          overdue,
        };
      });

    const showsIn = (shows || []).map(s => ({
      title: s.title,
      status: s.status,
      platform: s.platform,
      progress:
        s.currentSeason && s.currentEpisode
          ? `S${s.currentSeason}E${s.currentEpisode}`
          : undefined,
    }));

    const upcomingEvents = getUpcomingCalendarEvents(7);
    const eventsToday = upcomingEvents.filter((e) =>
      calendarEventOnLocalDay(e.startDate, today, e.isAllDay),
    ).length;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateStr(tomorrow);
    const eventsTomorrow = upcomingEvents.filter((e) =>
      calendarEventOnLocalDay(e.startDate, tomorrowStr, e.isAllDay),
    ).length;

    const habitsCompletedToday = habits.filter(h => h.completedToday).length;
    const tasksCompletedToday = tasks.filter(t => t.completedToday).length;
    const tasksOpen = tasks.filter(t => t.status === 'todo' || t.status === 'in-progress').length;
    const tasksOverdue = tasks.filter(t => t.overdue).length;
    const activeStreaks = habits.filter(h => h.streak > 0).length;
    const longestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);

    return {
      date: today,
      userName: profile?.name,
      habits,
      tasks,
      shows: showsIn,
      sports: {
        favouriteTeam: profile?.favoriteTeams?.[0]?.name ?? 'None',
        upcomingMatches: 0,
        watchedThisWeek: 0,
      },
      calendar: {
        eventsToday,
        eventsTomorrow,
        upcomingTitles: upcomingEvents.slice(0, 5).map(e => e.title),
      },
      aggregates: {
        habitsCompletedToday,
        habitsTotal: habits.length,
        tasksCompletedToday,
        tasksOpen,
        tasksOverdue,
        activeStreaks,
        longestStreak,
      },
    };
  }, [habitsWithStats, allTasks, shows, profile, getUpcomingCalendarEvents]);

  const reportMutation = useMutation({
    mutationFn: async () => generateDailyAgentReport(input),
    onSuccess: () => {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    },
    onError: (err) => {
      console.error('[DailyAgent] Error generating report:', err);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  useEffect(() => {
    if (!reportMutation.data && !reportMutation.isPending) {
      reportMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = useCallback(() => {
    fadeAnim.setValue(0);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    reportMutation.mutate();
  }, [fadeAnim, reportMutation]);

  const report: DailyAgentReport | undefined = reportMutation.data;
  const isLoading = reportMutation.isPending;
  const isError = reportMutation.isError;

  const dateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={isDark ? ['#0B0B1F', '#120A2A', colors.background] : ['#EEF2FF', '#FDF4FF', colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
          testID="daily-agent-back"
        >
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.textTertiary }]}>{dateLabel}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pulse</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Go deeper on how to live today well
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={regenerate}
          disabled={isLoading}
          testID="daily-agent-refresh"
        >
          <RefreshCw size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <LinearGradient
              colors={['#7c3aed', '#06b6d4', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadgeGrad}
            >
              <Brain size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.heroBadgeText}>AI Daily Agent</Text>
            </LinearGradient>
          </View>
        </View>

        {isLoading && !report && (
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LoadingAurora />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Analysing your day…</Text>
            <Text style={[styles.loadingSub, { color: colors.textTertiary }]}>
              Reading habits, tasks, shows & calendar signals
            </Text>
            <View style={styles.loadingSteps}>
              <LoadingStep text="Scanning habits & streaks" colors={colors} delay={0} />
              <LoadingStep text="Reviewing tasks" colors={colors} delay={600} />
              <LoadingStep text="Checking lifestyle balance" colors={colors} delay={1200} />
              <LoadingStep text="Crafting recommendations" colors={colors} delay={1800} />
            </View>
          </View>
        )}

        {isError && !report && (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: '#EF4444' + '40' }]}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn&apos;t generate report</Text>
            <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
              Please check your connection and try again.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={regenerate}
            >
              <RefreshCw size={14} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {report && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Headline card */}
            <View style={[styles.headlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.headlineTop}>
                <Sparkles size={14} color="#7c3aed" />
                <Text style={[styles.headlineEyebrow, { color: '#7c3aed' }]}>Today&apos;s take</Text>
              </View>
              <Text style={[styles.headline, { color: colors.text }]}>{report.headline}</Text>
              <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
                {report.subheadline}
              </Text>
            </View>

            {/* Score + breakdown */}
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scoreCardInner}>
                <ScoreRing
                  score={report.productivityScore}
                  grade={report.productivityGrade}
                  colors={colors}
                />
              </View>
              <View style={styles.metricsWrap}>
                <MetricBar label="Focus" value={report.productivityBreakdown.focus} color="#3B82F6" colors={colors} delay={200} />
                <MetricBar label="Consistency" value={report.productivityBreakdown.consistency} color="#10B981" colors={colors} delay={300} />
                <MetricBar label="Balance" value={report.productivityBreakdown.balance} color="#F59E0B" colors={colors} delay={400} />
                <MetricBar label="Momentum" value={report.productivityBreakdown.momentum} color="#EC4899" colors={colors} delay={500} />
              </View>
            </View>

            {/* Behaviour insights */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#3B82F6' + '18' }]}>
                <TrendingUp size={16} color="#3B82F6" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Behaviour insights</Text>
            </View>
            {report.behaviourInsights.map((ins, i) => {
              const TrendIcon = ins.trend === 'up' ? TrendingUp : ins.trend === 'down' ? TrendingDown : Minus;
              const trendColor = ins.trend === 'up' ? '#10B981' : ins.trend === 'down' ? '#EF4444' : '#6B7280';
              const expanded = expandedInsight === i;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setExpandedInsight(expanded ? null : i);
                  }}
                  style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  testID={`insight-${i}`}
                >
                  <View style={[styles.insightTrend, { backgroundColor: trendColor + '18' }]}>
                    <TrendIcon size={16} color={trendColor} />
                  </View>
                  <View style={styles.insightBody}>
                    <Text style={[styles.insightTitle, { color: colors.text }]}>{ins.title}</Text>
                    <Text
                      numberOfLines={expanded ? undefined : 2}
                      style={[styles.insightDesc, { color: colors.textSecondary }]}
                    >
                      {ins.description}
                    </Text>
                    <View style={styles.insightTags}>
                      <View style={[styles.insightTag, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.insightTagText, { color: colors.textTertiary }]}>
                          {ins.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Lifestyle balance */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10B981' + '18' }]}>
                <Scale size={16} color="#10B981" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Lifestyle balance</Text>
            </View>
            <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.balanceSummary, { color: colors.textSecondary }]}>
                {report.lifestyleBalance.summary}
              </Text>
              <View style={styles.dimensionsGrid}>
                {report.lifestyleBalance.dimensions.map((d, idx) => {
                  const Icon = DIMENSION_ICONS[d.name] ?? Target;
                  const c = DIMENSION_COLORS[d.name] ?? colors.primary;
                  return (
                    <View
                      key={d.name + idx}
                      style={[styles.dimensionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                    >
                      <View style={styles.dimensionTopRow}>
                        <View style={[styles.dimensionIcon, { backgroundColor: c + '20' }]}>
                          <Icon size={14} color={c} />
                        </View>
                        <Text style={[styles.dimensionScore, { color: c }]}>{d.score}</Text>
                      </View>
                      <Text style={[styles.dimensionName, { color: colors.text }]}>{d.name}</Text>
                      <Text style={[styles.dimensionNote, { color: colors.textTertiary }]} numberOfLines={3}>
                        {d.note}
                      </Text>
                      <View style={[styles.dimensionBar, { backgroundColor: colors.border }]}>
                        <View style={{ height: 4, borderRadius: 2, width: `${d.score}%`, backgroundColor: c }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Recommendations */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#F59E0B' + '18' }]}>
                <Lightbulb size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tomorrow&apos;s playbook</Text>
            </View>
            {report.recommendations.map((rec, i) => {
              const Icon = CAT_ICONS[rec.category] ?? Target;
              const priColor =
                rec.priority === 'high' ? '#EF4444' : rec.priority === 'medium' ? '#F59E0B' : '#10B981';
              return (
                <View
                  key={i}
                  style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.recHeader}>
                    <View style={[styles.recIcon, { backgroundColor: priColor + '18' }]}>
                      <Icon size={16} color={priColor} />
                    </View>
                    <View style={styles.recHeaderText}>
                      <Text style={[styles.recTitle, { color: colors.text }]}>{rec.title}</Text>
                      <View style={styles.recMetaRow}>
                        <View style={[styles.priorityPill, { backgroundColor: priColor + '18' }]}>
                          <Text style={[styles.priorityText, { color: priColor }]}>
                            {rec.priority.toUpperCase()}
                          </Text>
                        </View>
                        {rec.suggestedTime && (
                          <View style={styles.recTimeRow}>
                            <Clock size={11} color={colors.textTertiary} />
                            <Text style={[styles.recTime, { color: colors.textTertiary }]}>
                              {rec.suggestedTime}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.recDesc, { color: colors.textSecondary }]}>{rec.description}</Text>
                </View>
              );
            })}

            <View style={styles.footer}>
              <Sparkles size={12} color={colors.textTertiary} />
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                Analysed {input.aggregates.habitsTotal} habits · {input.tasks.length} tasks · {input.shows.length} shows
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function LoadingStep({ text, colors, delay }: { text: string; colors: ThemeColors; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState<boolean>(false);
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
        setDone(true);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [anim, delay]);

  return (
    <Animated.View style={[styles.loadingStep, { opacity: anim }]}>
      {done ? (
        <CheckCircle2 size={14} color="#10B981" />
      ) : (
        <Circle size={14} color={colors.textTertiary} />
      )}
      <Text style={[styles.loadingStepText, { color: colors.textSecondary }]}>{text}</Text>
    </Animated.View>
  );
}

function LoadingAurora() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.auroraWrap}>
      <Animated.View style={[styles.auroraOrb, { transform: [{ rotate }] }]}>
        <LinearGradient
          colors={['#7c3aed', '#06b6d4', '#ec4899', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.auroraGrad}
        />
      </Animated.View>
      <View style={styles.auroraCenter}>
        <ActivityIndicator color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const, fontWeight: '600' as const },
  headerTitle: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5, marginTop: 2 },
  headerSubtitle: { fontSize: 12, fontWeight: '500' as const, marginTop: 2, textAlign: 'center' as const },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  heroRow: { alignItems: 'flex-start', marginBottom: 12 },
  heroBadge: { borderRadius: 999, overflow: 'hidden' },
  heroBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.3 },
  loadingCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  loadingTitle: { fontSize: 17, fontWeight: '700' as const, marginTop: 20 },
  loadingSub: { fontSize: 13, marginTop: 4, textAlign: 'center' as const },
  loadingSteps: { alignSelf: 'stretch', marginTop: 20, gap: 10 },
  loadingStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingStepText: { fontSize: 13, fontWeight: '500' as const },
  auroraWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auroraOrb: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden' },
  auroraGrad: { flex: 1, borderRadius: 40 },
  auroraCenter: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  errorTitle: { fontSize: 16, fontWeight: '700' as const },
  errorSub: { fontSize: 13, marginTop: 4, textAlign: 'center' as const },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
  headlineCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  headlineTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  headlineEyebrow: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
  headline: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.6, lineHeight: 32 },
  subheadline: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  scoreCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  scoreCardInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  metricsWrap: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3 },
  insightCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  insightTrend: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: { flex: 1 },
  insightTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 4 },
  insightDesc: { fontSize: 13, lineHeight: 18 },
  insightTags: { flexDirection: 'row', marginTop: 8, gap: 6 },
  insightTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  insightTagText: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  balanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  balanceSummary: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  dimensionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dimensionCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  dimensionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimensionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dimensionScore: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.5 },
  dimensionName: { fontSize: 13, fontWeight: '700' as const, marginTop: 8 },
  dimensionNote: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  dimensionBar: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  recCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  recHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  recIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recHeaderText: { flex: 1 },
  recTitle: { fontSize: 15, fontWeight: '700' as const },
  recMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
  recTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recTime: { fontSize: 11, fontWeight: '600' as const },
  recDesc: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  footerText: { fontSize: 11, fontWeight: '500' as const },
});
