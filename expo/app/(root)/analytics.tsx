import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Flame,
  Target,
  Calendar,
  BarChart3,
  Zap,
  Award,
  Clock,
  SmilePlus,
  CheckCircle2,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import {
  getHabitCompletionTimeline,
  getWeeklyAggregation,
  getStreakHistory,
  getTaskCategoryBreakdown,
  getMoodDistribution,
  getMoodTotalLogs,
  getProductivityByHour,
  getPeakHourLabel,
  getCompletionTimeDistribution,
  getOverallStats,
  TimeRange,
  DayData,
  StreakHistory,
  CategoryBreakdown,
  MoodDistribution,
  ProductivityHour,
} from '@/utils/analyticsUtils';
import type { ThemeColors } from '@/types/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ChartMode = 'daily' | 'weekly';

function AnimatedBar({
  height,
  maxHeight,
  color,
  delay,
  width: barWidth,
}: {
  height: number;
  maxHeight: number;
  color: string;
  delay: number;
  width: number;
}) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      delay,
      useNativeDriver: false,
    }).start();
  }, [animValue, delay, height]);

  const animatedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(height, 2)],
  });

  return (
    <View style={{ height: maxHeight, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View
        style={{
          width: barWidth,
          height: animatedHeight,
          borderRadius: barWidth / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function CompletionChart({
  data,
  range,
  colors,
  chartMode,
}: {
  data: DayData[];
  range: TimeRange;
  colors: ThemeColors;
  chartMode: ChartMode;
}) {
  const maxBarHeight = 120;

  if (chartMode === 'weekly') {
    const weeklyData = getWeeklyAggregation(data);
    const maxRate = Math.max(...weeklyData.map(w => w.rate), 1);
    const barWidth = Math.min(28, (SCREEN_WIDTH - 80) / weeklyData.length - 8);

    return (
      <View style={chartStyles.chartContainer}>
        <View style={chartStyles.barsRow}>
          {weeklyData.map((week, i) => {
            const barH = (week.rate / 100) * maxBarHeight;
            return (
              <View key={week.startDate} style={chartStyles.barCol}>
                <Text style={[chartStyles.barValue, { color: colors.textSecondary }]}>
                  {week.rate}%
                </Text>
                <AnimatedBar
                  height={barH}
                  maxHeight={maxBarHeight}
                  color={week.rate >= 80 ? '#10B981' : week.rate >= 50 ? '#3B82F6' : '#F59E0B'}
                  delay={i * 60}
                  width={barWidth}
                />
                <Text style={[chartStyles.barLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                  {week.weekLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const displayData = range === '7d' ? data : range === '30d' ? data : data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
  const barWidth = range === '7d' ? 28 : Math.min(16, (SCREEN_WIDTH - 80) / displayData.length - 4);
  const showLabels = range === '7d' || displayData.length <= 15;

  return (
    <View style={chartStyles.chartContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={chartStyles.barsRow}>
          {displayData.map((day, i) => {
            const barH = (day.rate / 100) * maxBarHeight;
            return (
              <View key={day.date} style={[chartStyles.barCol, { minWidth: barWidth + 8 }]}>
                {range === '7d' && (
                  <Text style={[chartStyles.barValue, { color: colors.textSecondary }]}>
                    {day.rate}%
                  </Text>
                )}
                <AnimatedBar
                  height={barH}
                  maxHeight={maxBarHeight}
                  color={day.rate >= 80 ? '#10B981' : day.rate >= 50 ? '#3B82F6' : '#F59E0B'}
                  delay={i * 30}
                  width={barWidth}
                />
                {showLabels && (
                  <Text style={[chartStyles.barLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                    {day.label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function HeatmapRow({
  data,
  colors,
}: {
  data: DayData[];
  colors: ThemeColors;
}) {
  const last28 = data.slice(-28);
  const weeks: DayData[][] = [];
  for (let i = 0; i < last28.length; i += 7) {
    weeks.push(last28.slice(i, i + 7));
  }

  const getHeatColor = (rate: number): string => {
    if (rate === 0) return colors.surfaceSecondary;
    if (rate < 30) return '#FEF3C7';
    if (rate < 60) return '#FDE68A';
    if (rate < 80) return '#86EFAC';
    return '#22C55E';
  };

  return (
    <View style={heatmapStyles.container}>
      <View style={heatmapStyles.dayLabels}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={`label-${i}`} style={[heatmapStyles.dayLabel, { color: colors.textTertiary }]}>{d}</Text>
        ))}
      </View>
      <View style={heatmapStyles.grid}>
        {weeks.map((week, wi) => (
          <View key={`week-${wi}`} style={heatmapStyles.weekCol}>
            {week.map((day, di) => (
              <View
                key={day.date}
                style={[
                  heatmapStyles.cell,
                  { backgroundColor: getHeatColor(day.rate) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={heatmapStyles.legend}>
        <Text style={[heatmapStyles.legendText, { color: colors.textTertiary }]}>Less</Text>
        {[0, 25, 50, 75, 100].map(rate => (
          <View
            key={`legend-${rate}`}
            style={[heatmapStyles.legendCell, { backgroundColor: getHeatColor(rate) }]}
          />
        ))}
        <Text style={[heatmapStyles.legendText, { color: colors.textTertiary }]}>More</Text>
      </View>
    </View>
  );
}

function StreakCard({
  streak,
  colors,
  index,
}: {
  streak: StreakHistory;
  colors: ThemeColors;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View
      style={[
        streakStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <View style={[streakStyles.colorDot, { backgroundColor: streak.color }]} />
      <View style={streakStyles.info}>
        <Text style={[streakStyles.name, { color: colors.text }]} numberOfLines={1}>
          {streak.habitName}
        </Text>
        <Text style={[streakStyles.detail, { color: colors.textTertiary }]}>
          {streak.totalCompletions} total completions
        </Text>
      </View>
      <View style={streakStyles.streakBadge}>
        <Flame size={14} color="#F59E0B" />
        <Text style={streakStyles.streakValue}>{streak.currentStreak}</Text>
      </View>
      <View style={streakStyles.bestBadge}>
        <Star size={12} color="#A78BFA" />
        <Text style={[streakStyles.bestValue, { color: colors.textSecondary }]}>{streak.longestStreak}</Text>
      </View>
    </Animated.View>
  );
}

function CategoryChart({
  categories,
  colors,
}: {
  categories: CategoryBreakdown[];
  colors: ThemeColors;
}) {
  if (categories.length === 0) {
    return (
      <View style={catStyles.empty}>
        <Text style={[catStyles.emptyText, { color: colors.textTertiary }]}>No tasks yet</Text>
      </View>
    );
  }

  const maxCount = Math.max(...categories.map(c => c.count), 1);

  return (
    <View style={catStyles.container}>
      {categories.map((cat, i) => (
        <View key={cat.category} style={catStyles.row}>
          <View style={catStyles.labelRow}>
            <View style={[catStyles.dot, { backgroundColor: cat.color }]} />
            <Text style={[catStyles.label, { color: colors.text }]}>
              {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
            </Text>
            <Text style={[catStyles.count, { color: colors.textTertiary }]}>
              {cat.completed}/{cat.count}
            </Text>
          </View>
          <View style={[catStyles.barBg, { backgroundColor: colors.surfaceSecondary }]}>
            <View
              style={[
                catStyles.barFill,
                {
                  backgroundColor: cat.color,
                  width: `${(cat.count / maxCount) * 100}%` as any,
                },
              ]}
            />
            {cat.completed > 0 && (
              <View
                style={[
                  catStyles.barCompleted,
                  {
                    backgroundColor: cat.color,
                    opacity: 0.4,
                    width: `${(cat.completed / maxCount) * 100}%` as any,
                  },
                ]}
              />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const MOOD_EMOJIS: Record<string, string> = {
  excellent: '🔥',
  good: '😊',
  okay: '😐',
  difficult: '😤',
};

const MOOD_DESCRIPTIONS: Record<string, string> = {
  excellent: 'Feeling on fire',
  good: 'Positive vibes',
  okay: 'Just getting by',
  difficult: 'Pushed through',
};

function MoodRow({
  mood,
  colors,
  index,
}: {
  mood: MoodDistribution;
  colors: ThemeColors;
  index: number;
}) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: mood.percentage,
      duration: 700,
      delay: index * 100,
      useNativeDriver: false,
    }).start();
  }, [barAnim, mood.percentage, index]);

  const animWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={moodStyles.row}>
      <View style={[moodStyles.emojiWrap, { backgroundColor: `${mood.color}15` }]}>
        <Text style={moodStyles.emoji}>{MOOD_EMOJIS[mood.mood] || '•'}</Text>
      </View>
      <View style={moodStyles.info}>
        <View style={moodStyles.labelRow}>
          <Text style={[moodStyles.label, { color: colors.text }]}>
            {mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1)}
          </Text>
          <Text style={[moodStyles.countBadge, { color: colors.textTertiary }]}>
            {mood.count}×
          </Text>
        </View>
        <Text style={[moodStyles.description, { color: colors.textTertiary }]}>
          {MOOD_DESCRIPTIONS[mood.mood] || ''}
        </Text>
        <View style={[moodStyles.barBg, { backgroundColor: colors.surfaceSecondary }]}>
          <Animated.View
            style={[moodStyles.barFill, { backgroundColor: mood.color, width: animWidth as any }]}
          />
        </View>
      </View>
      <View style={moodStyles.percentWrap}>
        <Text style={[moodStyles.percent, { color: mood.color }]}>{mood.percentage}%</Text>
      </View>
    </View>
  );
}

function MoodChart({
  moods,
  colors,
  totalLogs,
  isDark,
}: {
  moods: MoodDistribution[];
  colors: ThemeColors;
  totalLogs: number;
  isDark: boolean;
}) {
  if (moods.length === 0) {
    return (
      <View style={moodStyles.emptyContainer}>
        <View style={[moodStyles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(236,72,153,0.12)' : 'rgba(236,72,153,0.08)' }]}>
          <SmilePlus size={28} color="#EC4899" />
        </View>
        <Text style={[moodStyles.emptyTitle, { color: colors.text }]}>
          No mood data yet
        </Text>
        <Text style={[moodStyles.emptyText, { color: colors.textTertiary }]}>
          When you complete habits, log how you feel to track your emotional patterns over time
        </Text>
        {totalLogs > 0 && (
          <View style={[moodStyles.emptyHint, { backgroundColor: isDark ? 'rgba(236,72,153,0.08)' : '#FDF2F8' }]}>
            <Text style={[moodStyles.emptyHintText, { color: '#EC4899' }]}>
              {totalLogs} completion{totalLogs !== 1 ? 's' : ''} logged without mood — try adding mood next time!
            </Text>
          </View>
        )}
      </View>
    );
  }

  const totalMoodEntries = moods.reduce((sum, m) => sum + m.count, 0);
  const dominantMood = moods.reduce((best, m) => (m.count > best.count ? m : best), moods[0]);

  return (
    <View style={moodStyles.container}>
      <View style={[moodStyles.summaryRow, { backgroundColor: isDark ? 'rgba(236,72,153,0.08)' : '#FDF2F8', borderColor: isDark ? 'rgba(236,72,153,0.15)' : '#FCE7F3' }]}>
        <Text style={moodStyles.summaryEmoji}>{MOOD_EMOJIS[dominantMood.mood] || '•'}</Text>
        <View style={moodStyles.summaryInfo}>
          <Text style={[moodStyles.summaryLabel, { color: colors.text }]}>
            Mostly {dominantMood.mood}
          </Text>
          <Text style={[moodStyles.summaryDetail, { color: colors.textTertiary }]}>
            {totalMoodEntries} mood entr{totalMoodEntries !== 1 ? 'ies' : 'y'} logged
          </Text>
        </View>
      </View>

      {moods.map((mood, index) => (
        <MoodRow key={mood.mood} mood={mood} colors={colors} index={index} />
      ))}
    </View>
  );
}

function ProductivityChart({
  hours,
  colors,
  peakLabel,
  timeDist,
  isDark,
}: {
  hours: ProductivityHour[];
  colors: ThemeColors;
  peakLabel: string | null;
  timeDist: { morning: number; afternoon: number; evening: number; night: number };
  isDark: boolean;
}) {
  const maxCount = Math.max(...hours.map(h => h.count), 1);
  const barMaxH = 80;
  const totalCompletions = hours.reduce((s, h) => s + h.count, 0);

  const timeSegments = [
    { label: 'Morning', emoji: '🌅', count: timeDist.morning, color: '#F59E0B', range: '5am–12pm' },
    { label: 'Afternoon', emoji: '☀️', count: timeDist.afternoon, color: '#3B82F6', range: '12pm–5pm' },
    { label: 'Evening', emoji: '🌇', count: timeDist.evening, color: '#8B5CF6', range: '5pm–9pm' },
    { label: 'Night', emoji: '🌙', count: timeDist.night, color: '#6366F1', range: '9pm–5am' },
  ];
  const totalDist = timeDist.morning + timeDist.afternoon + timeDist.evening + timeDist.night;

  if (totalCompletions === 0) {
    return (
      <View style={prodStyles.emptyContainer}>
        <View style={[prodStyles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)' }]}>
          <Clock size={28} color="#F59E0B" />
        </View>
        <Text style={[prodStyles.emptyTitle, { color: colors.text }]}>
          No peak hours data yet
        </Text>
        <Text style={[prodStyles.emptyText, { color: colors.textTertiary }]}>
          Complete habits to discover when you're most productive throughout the day
        </Text>
      </View>
    );
  }

  const getBarColor = (h: ProductivityHour): string => {
    if (h.count === 0) return colors.surfaceSecondary;
    const ratio = h.count / maxCount;
    if (ratio >= 0.8) return '#F59E0B';
    if (ratio >= 0.5) return '#3B82F6';
    if (ratio >= 0.25) return '#6366F1';
    return isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)';
  };

  return (
    <View>
      {peakLabel && (
        <View style={[prodStyles.peakBanner, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB', borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7' }]}>
          <Zap size={16} color="#F59E0B" />
          <Text style={[prodStyles.peakText, { color: colors.text }]}>
            Your peak hour is <Text style={prodStyles.peakHighlight}>{peakLabel}</Text>
          </Text>
        </View>
      )}

      {totalDist > 0 && (
        <View style={prodStyles.segmentsRow}>
          {timeSegments.map(seg => {
            const pct = totalDist > 0 ? Math.round((seg.count / totalDist) * 100) : 0;
            if (seg.count === 0) return null;
            return (
              <View key={seg.label} style={[prodStyles.segment, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                <Text style={prodStyles.segEmoji}>{seg.emoji}</Text>
                <Text style={[prodStyles.segLabel, { color: colors.text }]}>{seg.label}</Text>
                <Text style={[prodStyles.segPct, { color: seg.color }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={prodStyles.chartScroll}>
        <View style={prodStyles.container}>
          {hours.map((h, i) => {
            const barH = (h.count / maxCount) * barMaxH;
            const isPeak = peakLabel === h.label;
            return (
              <View key={h.hour} style={prodStyles.col}>
                {h.count > 0 && (
                  <Text style={[prodStyles.barCount, { color: isPeak ? '#F59E0B' : colors.textTertiary }]}>
                    {h.count}
                  </Text>
                )}
                <View style={{ height: barMaxH, justifyContent: 'flex-end' }}>
                  <AnimatedBar
                    height={Math.max(barH, 2)}
                    maxHeight={barMaxH}
                    color={getBarColor(h)}
                    delay={i * 30}
                    width={22}
                  />
                </View>
                <Text style={[
                  prodStyles.label,
                  { color: isPeak ? '#F59E0B' : colors.textTertiary },
                  isPeak && prodStyles.labelPeak,
                ]}>
                  {h.label}
                </Text>
                {isPeak && <View style={prodStyles.peakDot} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const appContext = useApp();
  const tasksContext = useTasks();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartMode, setChartMode] = useState<ChartMode>('daily');

  const habits = useMemo(() => appContext?.habits || [], [appContext?.habits]);
  const allTasks = useMemo(() => tasksContext?.allTasks || [], [tasksContext?.allTasks]);
  const taskHabits = useMemo(() => allTasks.filter(t => t.isHabit), [allTasks]);

  const timeline = useMemo(
    () => getHabitCompletionTimeline(habits, taskHabits, timeRange),
    [habits, taskHabits, timeRange]
  );

  const overallStats = useMemo(
    () => getOverallStats(habits, taskHabits, allTasks, timeRange),
    [habits, taskHabits, allTasks, timeRange]
  );

  const streaks = useMemo(
    () => getStreakHistory(habits, taskHabits),
    [habits, taskHabits]
  );

  const categories = useMemo(
    () => getTaskCategoryBreakdown(allTasks),
    [allTasks]
  );

  const moods = useMemo(
    () => getMoodDistribution(habits, allTasks),
    [habits, allTasks]
  );

  const productivityHours = useMemo(
    () => getProductivityByHour(habits, allTasks),
    [habits, allTasks]
  );

  const totalLogs = useMemo(
    () => getMoodTotalLogs(habits, allTasks),
    [habits, allTasks]
  );

  const peakHourLabel = useMemo(
    () => getPeakHourLabel(productivityHours),
    [productivityHours]
  );

  const timeDist = useMemo(
    () => getCompletionTimeDistribution(habits, allTasks),
    [habits, allTasks]
  );

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, []);

  const handleTimeRange = useCallback((range: TimeRange) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setTimeRange(range);
  }, []);

  const gradientColors = isDark
    ? ['#0F172A', '#1E293B', '#0F172A'] as const
    : ['#F0F9FF', '#E0F2FE', '#F0F9FF'] as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={gradientColors as unknown as [string, string, ...string[]]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            testID="analytics-back"
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
              Your progress at a glance
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.timeRangeRow}>
          {(['7d', '30d', '90d'] as TimeRange[]).map(range => (
            <TouchableOpacity
              key={range}
              onPress={() => handleTimeRange(range)}
              style={[
                styles.timeRangeBtn,
                timeRange === range && {
                  backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF',
                },
              ]}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: timeRange === range ? '#6366F1' : colors.textTertiary },
                  timeRange === range && styles.timeRangeTextActive,
                ]}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.overviewIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Target size={18} color="#10B981" />
            </View>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {overallStats.habitCompletionRate}%
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>Habit Rate</Text>
          </View>

          <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.overviewIconWrap, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <Flame size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {overallStats.bestStreak}
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>Best Streak</Text>
          </View>

          <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.overviewIconWrap, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
              <CheckCircle2 size={18} color="#6366F1" />
            </View>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {overallStats.totalHabitCompletions}
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>Completions</Text>
          </View>

          <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.overviewIconWrap, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
              <Award size={18} color="#EC4899" />
            </View>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {overallStats.perfectDays}
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>Perfect Days</Text>
          </View>
        </View>

        {/* Completion Rate Chart */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <BarChart3 size={18} color="#6366F1" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Habit Completion Rate</Text>
            </View>
            <View style={styles.chartModeRow}>
              <TouchableOpacity
                onPress={() => setChartMode('daily')}
                style={[
                  styles.chartModeBtn,
                  chartMode === 'daily' && { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF' },
                ]}
              >
                <Text style={[styles.chartModeText, chartMode === 'daily' && { color: '#6366F1' }]}>
                  Daily
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setChartMode('weekly')}
                style={[
                  styles.chartModeBtn,
                  chartMode === 'weekly' && { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF' },
                ]}
              >
                <Text style={[styles.chartModeText, chartMode === 'weekly' && { color: '#6366F1' }]}>
                  Weekly
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <CompletionChart data={timeline} range={timeRange} colors={colors} chartMode={chartMode} />
        </View>

        {/* Heatmap */}
        {timeRange !== '7d' && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Calendar size={18} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Heatmap</Text>
              </View>
            </View>
            <HeatmapRow data={timeline} colors={colors} />
          </View>
        )}

        {/* Streaks */}
        {streaks.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Flame size={18} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Streak Leaderboard</Text>
              </View>
            </View>
            <View style={streakStyles.headerRow}>
              <Text style={[streakStyles.headerLabel, { color: colors.textTertiary }]}>Habit</Text>
              <Text style={[streakStyles.headerLabel, { color: colors.textTertiary }]}>Current</Text>
              <Text style={[streakStyles.headerLabel, { color: colors.textTertiary }]}>Best</Text>
            </View>
            {streaks.slice(0, 8).map((s, i) => (
              <StreakCard key={s.habitId} streak={s} colors={colors} index={i} />
            ))}
          </View>
        )}

        {/* Task Categories */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={18} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Categories</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              {overallStats.completedTasks}/{overallStats.totalTasks} completed
            </Text>
          </View>
          <CategoryChart categories={categories} colors={colors} />
        </View>

        {/* Mood Distribution */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <SmilePlus size={18} color="#EC4899" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood When Completing</Text>
            </View>
          </View>
          <MoodChart moods={moods} colors={colors} totalLogs={totalLogs} isDark={isDark} />
        </View>

        {/* Productivity by Hour */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Zap size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Peak Hours</Text>
            </View>
          </View>
          <ProductivityChart hours={productivityHours} colors={colors} peakLabel={peakHourLabel} timeDist={timeDist} isDark={isDark} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  timeRangeRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  timeRangeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  timeRangeTextActive: {
    fontWeight: '700' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 52) / 2 - 5,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  overviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  overviewLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  chartModeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  chartModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chartModeText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#9CA3AF',
  },
});

const chartStyles = StyleSheet.create({
  chartContainer: {
    paddingTop: 4,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  barCol: {
    alignItems: 'center',
    gap: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});

const heatmapStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  dayLabels: {
    flexDirection: 'column',
    position: 'absolute',
    left: 0,
    top: 0,
    gap: 4,
  },
  dayLabel: {
    fontSize: 10,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 20,
  },
  weekCol: {
    flexDirection: 'column',
    gap: 4,
  },
  cell: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  legendText: {
    fontSize: 10,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});

const streakStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detail: {
    fontSize: 11,
    marginTop: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  streakValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 36,
  },
  bestValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

const catStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  count: {
    fontSize: 12,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barCompleted: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});

const moodStyles = StyleSheet.create({
  container: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
    gap: 10,
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  summaryDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  description: {
    fontSize: 11,
    marginBottom: 2,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  percentWrap: {
    minWidth: 42,
    alignItems: 'flex-end',
  },
  percent: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  emptyContainer: {
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  emptyHint: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyHintText: {
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 17,
    fontWeight: '500' as const,
  },
});

const prodStyles = StyleSheet.create({
  peakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  peakText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  peakHighlight: {
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  segment: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  segEmoji: {
    fontSize: 16,
  },
  segLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  segPct: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  chartScroll: {
    marginTop: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingVertical: 4,
  },
  col: {
    alignItems: 'center',
    gap: 3,
    minWidth: 28,
  },
  barCount: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  bar: {
    width: 22,
    borderRadius: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '500' as const,
  },
  labelPeak: {
    fontWeight: '700' as const,
  },
  peakDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});
