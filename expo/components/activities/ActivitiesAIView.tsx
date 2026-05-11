import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Sparkles,
  CheckCircle2,
  Target,
  Flame,
  Clock,
  Trophy,
  ChevronRight,
  LayoutGrid,
  Play,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { HABIT_COLORS } from '@/constants/colors';
import { SHOWS_HREF } from '@/constants/showsNavigation';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useActivityIntelligence } from '@/hooks/useBackgroundServices';
import UnifiedTimeline from '@/components/UnifiedTimeline';

type Props = {
  onRequestPeakScheduler: () => void;
};

const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
} as const;

/** Cross-insight cards only — keep section chrome on `colors.primary` for cohesion */
const ACCENT = ['#8B5CF6', '#06B6D4', '#10B981'] as const;
const ACCENT_SOFT = [
  'rgba(139, 92, 246, 0.14)',
  'rgba(6, 182, 212, 0.14)',
  'rgba(16, 185, 129, 0.14)',
] as const;

export default function ActivitiesAIView({ onRequestPeakScheduler }: Props) {
  const { colors, isDark } = useTheme();
  const { width: windowW } = useWindowDimensions();
  const appContext = useApp();
  const tasksContext = useTasks();
  const { profile } = useUserProfile();
  const intelligence = useActivityIntelligence();

  const useBentoInsights = windowW >= 390;
  const useTwoColumnInsights = windowW >= 430;

  const stats = useMemo(() => {
    const today = new Date().getDay();
    const d = new Date();
    const todayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const taskHabits =
      tasksContext?.allTasks?.filter((task) => {
        if (!task.isHabit || !task.habitFrequency) return false;
        return task.habitFrequency.days.includes(today);
      }) || [];
    const legacyHabits = appContext?.todayHabits || [];
    const taskHabitIds = new Set(taskHabits.map((h) => h.id));
    const uniqueLegacyHabits = legacyHabits.filter((h) => !taskHabitIds.has(h.id));
    const completedTaskHabits = taskHabits.filter((task) => task.habitCompletions?.[todayDate]).length;
    const completedLegacyHabits = uniqueLegacyHabits.filter((h) => h.completedToday).length;
    const totalHabits = taskHabits.length + uniqueLegacyHabits.length;
    const completedHabits = completedTaskHabits + completedLegacyHabits;
    const taskStreaks = taskHabits.map((h) => h.habitStreak || 0);
    const legacyStreaks = uniqueLegacyHabits.map((h) => h.streak || 0);
    const allStreaks = [...taskStreaks, ...legacyStreaks];
    const currentStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : 0;
    return { totalHabits, completedHabits, currentStreak };
  }, [tasksContext?.allTasks, appContext?.todayHabits]);

  const firstName = profile?.name?.split(' ')[0] || 'there';

  const todayHabits = useMemo(() => {
    return [
      ...(appContext?.todayHabits || []),
      ...(tasksContext?.allTasks?.filter((task) => {
        if (!task.isHabit || !task.habitFrequency) return false;
        const today = new Date().getDay();
        return task.habitFrequency.days.includes(today);
      }) || []),
    ];
  }, [appContext?.todayHabits, tasksContext?.allTasks]);

  const surface = colors.card;
  const outline = colors.border;
  const heroTint = isDark ? 'dark' : 'light';

  const runCardAction = useCallback((action?: { action: string; params?: Record<string, any> }) => {
    if (!action) return;
    const screen = action.params?.screen;
    if (action.action === 'open_peak_scheduler') {
      onRequestPeakScheduler();
      return;
    }
    if (action.action === 'navigate' && typeof screen === 'string') {
      if (screen === 'tasks') {
        router.push('/tasks' as any);
        return;
      }
      if (screen === 'shows') {
        router.push(SHOWS_HREF.streaming as any);
        return;
      }
      if (screen === 'activities') {
        return;
      }
    }
  }, [onRequestPeakScheduler]);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      accessibilityRole="summary"
      accessibilityLabel="AI insights for your day"
    >
      {/* Hero: bento + restrained glass (iOS) */}
      <View style={[styles.heroShell, { borderColor: outline }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 28 : 42}
            tint={heroTint}
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)' },
            ]}
            accessibilityElementsHidden
          />
        )}
        <LinearGradient
          colors={
            isDark
              ? [`${colors.primary}33`, 'transparent', 'rgba(0,0,0,0)']
              : [`${colors.primary}18`, 'transparent', `${colors.primary}08`]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.heroInner}>
          <View style={styles.heroTopRow}>
            <View style={[styles.kickerPill, { borderColor: outline, backgroundColor: `${colors.primary}18` }]}>
              <LayoutGrid size={14} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.kickerText, { color: colors.primary }]}>AI INSIGHTS</Text>
            </View>
          </View>

          <Text style={[styles.display, { color: colors.text }]} accessibilityRole="header">
            Today, {firstName}
          </Text>
          <Text style={[styles.lede, { color: colors.textSecondary }]}>
            One calm overview of focus, completion, and what&apos;s next — tuned to your habits and tasks.
          </Text>

          {/* Bento metrics — equal column height, calmer hierarchy */}
          <View style={styles.bentoGrid}>
            <View
              style={[
                styles.bentoHero,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)',
                  borderColor: `${colors.primary}55`,
                },
              ]}
              accessibilityLabel={`Focus score ${intelligence.stats.todayProductivity} out of ten`}
            >
              <Text style={[styles.bentoHeroEyebrow, { color: colors.textSecondary }]}>Focus</Text>
              <Text style={[styles.bentoHeroValue, { color: colors.primary }]}>
                {intelligence.stats.todayProductivity}
              </Text>
              <Text style={[styles.bentoHeroHint, { color: colors.textSecondary }]}>
                Blended from tasks & habits completed today
              </Text>
            </View>

            <View style={styles.bentoStack}>
              <View
                style={[
                  styles.bentoTile,
                  { backgroundColor: surface, borderColor: outline },
                ]}
                accessibilityLabel={`Completed ${intelligence.stats.todayCompleted} of ${intelligence.stats.todayTotal} items`}
              >
                <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>Done</Text>
                <Text style={[styles.tileValue, { color: colors.text }]}>
                  {intelligence.stats.todayCompleted}
                  <Text style={[styles.tileValueSm, { color: colors.textSecondary }]}>
                    {' '}
                    / {Math.max(1, intelligence.stats.todayTotal)}
                  </Text>
                </Text>
              </View>
              <View
                style={[styles.bentoTile, { backgroundColor: surface, borderColor: outline }]}
                accessibilityLabel={`Best streak ${stats.currentStreak} days`}
              >
                <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>Streak</Text>
                <View style={styles.tileRow}>
                  <Flame size={18} color={colors.primary} accessibilityLabel="Streak" />
                  <Text style={[styles.tileValue, { color: colors.text }]}>{stats.currentStreak}</Text>
                  <Text style={[styles.tileSuffix, { color: colors.textSecondary }]}>d</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Habits */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <CheckCircle2 size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.sectionTitles}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Routine</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s habits</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/tasks' as any)}
            style={({ pressed }) => [
              styles.textLink,
              { opacity: pressed ? 0.75 : 1 },
              { minHeight: 44, justifyContent: 'center' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open tasks to manage habits"
          >
            <Text style={[styles.textLinkLabel, { color: colors.primary }]}>Manage</Text>
            <ChevronRight size={18} color={colors.primary} />
          </Pressable>
        </View>

        {todayHabits.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: outline }]}>
            <Sparkles size={28} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing scheduled for today</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Add habits or turn tasks into habits so this list reflects your real day.
            </Text>
          </View>
        ) : (
          todayHabits.slice(0, 6).map((habit, index) => {
            const isCompleted =
              'completedToday' in habit
                ? habit.completedToday
                : (() => {
                    const dh = new Date();
                    const today = `${dh.getFullYear()}-${String(dh.getMonth() + 1).padStart(2, '0')}-${String(dh.getDate()).padStart(2, '0')}`;
                    return !!(habit as { habitCompletions?: Record<string, boolean> }).habitCompletions?.[today];
                  })();
            const streak =
              'streak' in habit ? habit.streak : (habit as { habitStreak?: number }).habitStreak || 0;
            const habitName = 'name' in habit ? habit.name : (habit as { title: string }).title;
            const habitColor = (habit as { color?: string }).color || HABIT_COLORS[index % HABIT_COLORS.length];

            return (
              <Pressable
                key={habit.id}
                style={({ pressed }) => [
                  styles.habitRow,
                  {
                    backgroundColor: surface,
                    borderColor: outline,
                    borderLeftWidth: 4,
                    borderLeftColor: habitColor,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
                android_ripple={{ color: `${colors.primary}22` }}
                onPress={async () => {
                  if (Platform.OS !== 'web') {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  if ('name' in habit) {
                    appContext?.toggleHabitCompletion(habit.id);
                  } else {
                    const dt = new Date();
                    const today = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                    const t = habit as { habitCompletions?: Record<string, boolean> };
                    const updated = { ...t.habitCompletions };
                    if (updated?.[today]) delete updated[today];
                    else updated[today] = true;
                    tasksContext.updateTask(habit.id, {
                      habitCompletions: updated,
                      status: updated[today] ? 'completed' : 'todo',
                    });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${habitName}${isCompleted ? ', completed' : ', not completed'}. Double tap to toggle.`}
                accessibilityState={{ checked: isCompleted }}
              >
                <View style={styles.habitMain}>
                  <Text
                    style={[
                      styles.habitName,
                      { color: colors.text },
                      isCompleted && { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {habitName}
                  </Text>
                  {streak > 0 ? (
                    <View style={styles.streakRow}>
                      <Flame size={14} color={colors.primary} accessibilityLabel="Streak" />
                      <Text style={[styles.streakText, { color: colors.textSecondary }]}>
                        {streak} day streak
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.check,
                    { borderColor: outline },
                    isCompleted && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  {isCompleted ? <CheckCircle2 size={20} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Schedule + momentum (paired bento) */}
      <View style={styles.section}>
        <View style={styles.sectionHeadBlock}>
          <View style={styles.sectionHeadLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Target size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.sectionTitles}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Plan</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule & momentum</Text>
            </View>
          </View>
        </View>

        <View style={[styles.pairRow, useBentoInsights && styles.pairRowWide]}>
          <View
            style={[
              styles.planCard,
              { backgroundColor: surface, borderColor: outline },
              useBentoInsights && styles.pairFlex,
            ]}
          >
            <View style={styles.planCardTop}>
              <View style={styles.planIconRow}>
                <Clock size={20} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.planTitle, { color: colors.text }]}>Peak window</Text>
              </View>
              <Text style={[styles.planBody, { color: colors.textSecondary }]}>
                Block deep work when your energy is highest — we suggest a morning anchor (9–11).
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRequestPeakScheduler();
              }}
              style={({ pressed }) => [
                styles.schedulerLink,
                {
                  borderColor: `${colors.primary}44`,
                  backgroundColor: `${colors.primary}10`,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open peak performance scheduler"
            >
              <Text style={[styles.schedulerLinkText, { color: colors.primary }]}>Open scheduler</Text>
              <ChevronRight size={18} color={colors.primary} />
            </Pressable>
          </View>

          <View
            style={[
              styles.planCard,
              { backgroundColor: surface, borderColor: outline },
              useBentoInsights && styles.pairFlex,
            ]}
          >
            <View style={styles.planCardTop}>
              <View style={styles.planIconRow}>
                <Trophy size={20} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.planTitle, { color: colors.text }]}>Momentum</Text>
              </View>
              <Text style={[styles.planBody, { color: colors.textSecondary }]}>
                Small wins compound. Protect streaks by finishing at least one priority before noon.
              </Text>
            </View>
            {useBentoInsights ? <View style={styles.planCardFooterSpacer} /> : null}
          </View>
        </View>
      </View>

      {/* Insights */}
      {intelligence.rankedCrossInsights.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeadBlock}>
            <View style={styles.sectionHeadLeft}>
              <View style={[styles.sectionIconWrap, { backgroundColor: ACCENT_SOFT[0] }]}>
                <Sparkles size={18} color={ACCENT[0]} strokeWidth={2.2} />
              </View>
              <View style={styles.sectionTitles}>
                <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Signals</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Cross-insights</Text>
              </View>
            </View>
          </View>
          <View style={[styles.insightGrid, useTwoColumnInsights && styles.insightGridWide]}>
            {intelligence.rankedCrossInsights.slice(0, 4).map((insight, index) => (
              <View
                key={insight.id || `ins-${index}`}
                style={[
                  styles.insightCard,
                  { backgroundColor: surface, borderColor: outline },
                  useTwoColumnInsights && styles.insightGridItem,
                ]}
                accessibilityLabel={`${insight.title}. ${insight.description}`}
              >
                <View style={[styles.insightAccent, { backgroundColor: ACCENT[index % 3] }]} />
                <View style={styles.insightInner}>
                  <View style={styles.insightTopRow}>
                    <View style={[styles.insightIcon, { backgroundColor: ACCENT_SOFT[index % 3] }]}>
                      <Sparkles size={16} color={ACCENT[index % 3]} />
                    </View>
                    <View style={[styles.confidencePill, { borderColor: outline }]}>
                      <Text style={[styles.confidenceText, { color: ACCENT[index % 3] }]}>
                        {Math.round(insight.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.insightCopy}>
                    <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
                    <Text style={[styles.insightDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                      {insight.description}
                    </Text>
                  </View>
                  {insight.actions?.[0] ? (
                    <Pressable
                      onPress={() => runCardAction(insight.actions?.[0])}
                      style={({ pressed }) => [
                        styles.cardActionBtn,
                        { borderColor: outline, backgroundColor: `${ACCENT[index % 3]}14`, opacity: pressed ? 0.86 : 1 },
                      ]}
                    >
                      <Play size={14} color={ACCENT[index % 3]} />
                      <Text style={[styles.cardActionText, { color: ACCENT[index % 3] }]}>
                        {insight.actions[0].label}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Recommendations */}
      {intelligence.topRecommendations.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeadBlock}>
            <View style={styles.sectionHeadLeft}>
              <View style={[styles.sectionIconWrap, { backgroundColor: ACCENT_SOFT[1] }]}>
                <Target size={18} color={ACCENT[1]} strokeWidth={2.2} />
              </View>
              <View style={styles.sectionTitles}>
                <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Next best</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
              </View>
            </View>
          </View>
          {intelligence.topRecommendations.slice(0, 4).map((rec, index) => (
            <View
              key={rec.id || `rec-${index}`}
              style={[styles.recCard, { backgroundColor: surface, borderColor: outline }]}
              accessibilityLabel={`${rec.title}. ${rec.description}`}
            >
              <View style={[styles.recDot, { backgroundColor: ACCENT[index % 3] }]} />
              <View style={styles.recBody}>
                <Text style={[styles.recTitle, { color: colors.text }]}>{rec.title}</Text>
                <Text style={[styles.recDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                  {rec.description}
                </Text>
                {rec.actions?.[0] ? (
                  <Pressable
                    onPress={() => runCardAction(rec.actions?.[0])}
                    style={({ pressed }) => [
                      styles.cardActionBtn,
                      { borderColor: outline, backgroundColor: `${ACCENT[index % 3]}14`, opacity: pressed ? 0.86 : 1, marginTop: SPACE.sm },
                    ]}
                  >
                    <Play size={14} color={ACCENT[index % 3]} />
                    <Text style={[styles.cardActionText, { color: ACCENT[index % 3] }]}>
                      {rec.actions[0].label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Timeline */}
      <View style={[styles.section, styles.sectionLast]}>
        <View style={styles.sectionHeadBlock}>
          <View style={styles.sectionHeadLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Clock size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.sectionTitles}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Flow</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s timeline</Text>
            </View>
          </View>
        </View>
        <View style={[styles.timelineShell, { backgroundColor: surface, borderColor: outline }]}>
          <UnifiedTimeline
            activities={intelligence.todayActivities}
            insights={intelligence.actionableInsights}
            recommendations={intelligence.topRecommendations}
            crossInsights={intelligence.crossInsights}
            onActivityPress={(activity) => {
              if (activity.type === 'habit' && activity.metadata?.originalId) {
                const habitId = activity.metadata.originalId;
                if (activity.status === 'completed') {
                  router.push(`/habit/${habitId}` as any);
                } else {
                  if (activity.metadata.source === 'tasks') {
                    const task = tasksContext.tasks.find((t) => t.id === habitId && t.isHabit);
                    if (task) {
                      const da = new Date();
                      const today = `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
                      const updatedCompletions = { ...task.habitCompletions };
                      if (updatedCompletions?.[today]) delete updatedCompletions[today];
                      else updatedCompletions[today] = true;
                      tasksContext.updateTask(habitId, {
                        habitCompletions: updatedCompletions,
                        status: updatedCompletions[today] ? 'completed' : 'todo',
                      });
                    }
                  } else {
                    appContext?.toggleHabitCompletion(habitId);
                  }
                  setTimeout(() => void intelligence.generateIntelligence(), 120);
                }
              } else if (activity.type === 'task') {
                router.push('/tasks' as any);
              } else if (activity.type === 'show') {
                router.push(SHOWS_HREF.streaming as any);
              }
            }}
            onInsightPress={() => {}}
            onRecommendationPress={() => {}}
            onCrossInsightPress={() => {}}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
  },
  heroShell: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACE.xxxl,
    overflow: 'hidden',
    minHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
    }),
  },
  heroInner: {
    padding: SPACE.xxl,
  },
  heroTopRow: {
    marginBottom: SPACE.lg,
  },
  kickerPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  kickerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  display: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 34,
  },
  lede: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: SPACE.md,
    marginBottom: SPACE.xl,
    maxWidth: 520,
    fontWeight: '400',
  },
  bentoGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACE.lg,
  },
  bentoHero: {
    flex: 1.06,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACE.xl,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  bentoHeroEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  bentoHeroValue: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    marginVertical: SPACE.xs,
  },
  bentoHeroHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  bentoStack: {
    flex: 1,
    minWidth: 0,
    minHeight: 148,
    gap: SPACE.sm,
    justifyContent: 'space-between',
  },
  bentoTile: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.xl,
    justifyContent: 'center',
    minHeight: 0,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.35,
    marginBottom: SPACE.sm,
    textTransform: 'none',
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tileValueSm: {
    fontSize: 15,
    fontWeight: '700',
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  tileSuffix: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    marginBottom: SPACE.xxxl,
  },
  sectionLast: {
    marginBottom: SPACE.xxl,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.xl,
  },
  sectionHeadBlock: {
    marginBottom: SPACE.xl,
  },
  sectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.lg,
    flex: 1,
    minWidth: 0,
  },
  sectionTitles: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.35,
    marginBottom: SPACE.xs,
    opacity: 0.92,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACE.sm,
  },
  textLinkLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE.xxl,
    alignItems: 'center',
    gap: SPACE.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACE.lg,
    overflow: 'hidden',
    minHeight: 64,
  },
  habitMain: {
    flex: 1,
    paddingVertical: SPACE.lg,
    paddingRight: SPACE.sm,
    paddingLeft: SPACE.lg,
    minWidth: 0,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    marginRight: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairRow: {
    flexDirection: 'column',
    gap: SPACE.md,
  },
  pairRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pairFlex: {
    flex: 1,
    minWidth: 0,
  },
  planCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE.xxl,
    justifyContent: 'space-between',
    minHeight: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
      },
      android: { elevation: 2 },
    }),
  },
  planCardTop: {
    flexShrink: 0,
  },
  planIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  planBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 0,
  },
  schedulerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    paddingVertical: 13,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 48,
    marginTop: SPACE.xl,
  },
  schedulerLinkText: {
    fontSize: 15,
    fontWeight: '700',
  },
  planCardFooterSpacer: {
    minHeight: 48,
    marginTop: SPACE.xl,
  },
  insightGrid: {
    gap: SPACE.md,
  },
  insightGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: SPACE.md,
    rowGap: SPACE.md,
  },
  insightGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  insightCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  insightAccent: {
    height: 3,
    width: '100%',
  },
  insightInner: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: SPACE.lg,
    gap: SPACE.sm,
  },
  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
    minWidth: 0,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACE.xs,
    lineHeight: 20,
  },
  insightDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  confidencePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '800',
  },
  recCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
    gap: SPACE.md,
    alignItems: 'flex-start',
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  recBody: {
    flex: 1,
    minWidth: 0,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACE.sm,
    lineHeight: 20,
  },
  recDesc: {
    fontSize: 14,
    lineHeight: 21,
  },
  cardActionBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  timelineShell: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
    }),
  },
});
