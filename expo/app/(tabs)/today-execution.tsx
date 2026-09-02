import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Flame,
  Sparkles,
  SunMedium,
  Sunset,
  Trophy,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasksStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import type { Task } from '@/types/task';

type ExecutionKind = 'calendar' | 'task' | 'routine' | 'saved' | 'sport';

type ExecutionItem = {
  id: string;
  kind: ExecutionKind;
  title: string;
  meta: string;
  timeLabel?: string;
  start?: Date | null;
  urgent?: boolean;
  done?: boolean;
  action?: () => void;
};

type DayPart = {
  id: 'morning' | 'afternoon' | 'evening';
  label: string;
  range: string;
  startHour: number;
  endHour: number;
  icon: typeof SunMedium;
};

const DAY_PARTS: DayPart[] = [
  { id: 'morning', label: 'Morning', range: '06–12', startHour: 6, endHour: 12, icon: SunMedium },
  { id: 'afternoon', label: 'Afternoon', range: '12–17', startHour: 12, endHour: 17, icon: SunMedium },
  { id: 'evening', label: 'Evening', range: '17–22', startHour: 17, endHour: 22, icon: Sunset },
];

function localDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(value: string | Date | undefined | null, today: Date) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) && localDayKey(date) === localDayKey(today);
}

function formatClock(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function priorityRank(task: Task) {
  return task.priority === 'urgent' ? 4 : task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
}

function matchFavoriteTeam(title: string, favorites: { name: string }[]) {
  const normalized = title.toLowerCase();
  return favorites.find((team) => normalized.includes(team.name.toLowerCase()))?.name ?? null;
}

function ItemIcon({ kind, color }: { kind: ExecutionKind; color: string }) {
  if (kind === 'calendar' || kind === 'saved') return <CalendarDays size={18} color={color} />;
  if (kind === 'routine') return <Flame size={18} color={color} />;
  if (kind === 'sport') return <Trophy size={18} color={color} />;
  return <Circle size={18} color={color} />;
}

function dayPartForHour(hour: number) {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function TodayExecutionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const taskStore = useTasks();
  const calendar = useCalendar();
  const habits = useTodayHabits();
  const saved = useSavedEvents();
  const app = useAppSafe();
  const { profile } = useUserProfile();

  const now = new Date();
  const hour = now.getHours();
  const currentPart = dayPartForHour(hour);
  const dayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const surface = isDark ? '#15171C' : '#FFFFFF';
  const subtle = isDark ? '#1D2027' : '#F4F5F7';
  const border = isDark ? '#292D36' : '#E5E8EE';

  const todayCalendar = useMemo(
    () => calendar.getTodayCalendarEvents().sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [calendar],
  );

  const activeTasks = useMemo(() => taskStore.allTasks
    .filter((task) => !task.isHabit && task.status !== 'completed' && task.status !== 'cancelled')
    .filter((task) => sameDay(task.dueDate, now) || Boolean(task.dueDate && new Date(task.dueDate).getTime() < now.getTime()) || task.status === 'in-progress')
    .sort((a, b) => {
      const overdueA = a.dueDate && new Date(a.dueDate).getTime() < now.getTime() ? 1 : 0;
      const overdueB = b.dueDate && new Date(b.dueDate).getTime() < now.getTime() ? 1 : 0;
      if (overdueA !== overdueB) return overdueB - overdueA;
      return priorityRank(b) - priorityRank(a);
    }), [taskStore.allTasks, now]);

  const completedTasksToday = useMemo(() => taskStore.allTasks
    .filter((task) => !task.isHabit && task.status === 'completed' && task.completedAt && sameDay(task.completedAt, now)),
  [taskStore.allTasks, now]);

  const routineItems = useMemo<ExecutionItem[]>(() => habits.entries.map((entry) => ({
    id: `routine-${entry.id}`,
    kind: 'routine',
    title: entry.title,
    meta: entry.habitStreak ? `${entry.habitStreak}-day streak` : 'Today’s routine',
    timeLabel: 'Anytime',
    done: Boolean(entry.habitCompletions?.[habits.today]),
    action: () => habits.toggleTodayHabit(entry.id),
  })), [habits.entries, habits.today, habits.toggleTodayHabit]);

  const savedToday = useMemo<ExecutionItem[]>(() => saved.upcomingSaved
    .map((event) => ({ event, start: parseEventStartDateTime(event) }))
    .filter(({ start }) => start && sameDay(start, now))
    .map(({ event, start }) => ({
      id: `saved-${event.id}`,
      kind: 'saved' as const,
      title: event.title,
      meta: event.venue || event.location || 'Saved plan',
      timeLabel: event.time || formatClock(start),
      start,
      action: () => router.push(`/(root)/event/${event.id}` as never),
    })), [saved.upcomingSaved, now]);

  const favoriteSports = useMemo<ExecutionItem[]>(() => {
    const favorites = profile?.favoriteTeams ?? [];
    return app.sports
      .filter((match) => match.status !== 'Completed' && sameDay(match.date, now))
      .map((match) => {
        const favorite = matchFavoriteTeam(`${match.homeTeam} ${match.awayTeam}`, favorites);
        if (!favorite) return null;
        return {
          id: `sport-${match.id}`,
          kind: 'sport' as const,
          title: `${match.homeTeam} vs ${match.awayTeam}`,
          meta: `${favorite} · ${match.league}`,
          timeLabel: match.status === 'Live' ? 'LIVE' : match.time,
          start: match.date ? new Date(match.date) : null,
          urgent: match.status === 'Live',
          action: () => router.push('/(tabs)/sports' as never),
        };
      })
      .filter((item): item is ExecutionItem => Boolean(item))
      .sort((a, b) => (a.start?.getTime() ?? Number.POSITIVE_INFINITY) - (b.start?.getTime() ?? Number.POSITIVE_INFINITY));
  }, [app.sports, now, profile?.favoriteTeams]);

  const calendarItems = useMemo<ExecutionItem[]>(() => todayCalendar.map((event) => ({
    id: `calendar-${event.id}`,
    kind: 'calendar' as const,
    title: event.title,
    meta: event.location || (event.isAllDay ? 'All day' : 'Calendar'),
    timeLabel: event.isAllDay ? 'All day' : formatClock(event.startDate),
    start: new Date(event.startDate),
  })), [todayCalendar]);

  const taskItems = useMemo<ExecutionItem[]>(() => activeTasks.map((task) => ({
    id: `task-${task.id}`,
    kind: 'task' as const,
    title: task.title,
    meta: [task.priority === 'urgent' ? 'Urgent' : task.priority === 'high' ? 'High priority' : task.category, task.estimatedDuration ? `${task.estimatedDuration} min` : null].filter(Boolean).join(' · '),
    timeLabel: task.dueDate && sameDay(task.dueDate, now) ? formatClock(task.dueDate) || 'Today' : task.dueDate ? 'Overdue' : 'Today',
    urgent: task.priority === 'urgent' || Boolean(task.dueDate && new Date(task.dueDate).getTime() < now.getTime()),
    action: () => router.push('/(tabs)/tasks' as never),
  })), [activeTasks, now]);

  const allToday = useMemo(() => {
    const rows = [...calendarItems, ...savedToday, ...favoriteSports, ...taskItems, ...routineItems.filter((item) => !item.done)];
    return rows.sort((a, b) => {
      if (a.start && b.start) return a.start.getTime() - b.start.getTime();
      if (a.start) return -1;
      if (b.start) return 1;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return 0;
    });
  }, [calendarItems, favoriteSports, routineItems, savedToday, taskItems]);

  const currentCalendar = todayCalendar.find((event) => {
    const start = new Date(event.startDate).getTime();
    const end = new Date(event.endDate).getTime();
    return start <= now.getTime() && end >= now.getTime();
  });

  const nextItem = useMemo<ExecutionItem | null>(() => {
    if (currentCalendar) {
      return {
        id: `now-${currentCalendar.id}`,
        kind: 'calendar',
        title: currentCalendar.title,
        meta: currentCalendar.location || `Until ${formatClock(currentCalendar.endDate)}`,
        timeLabel: 'NOW',
        start: new Date(currentCalendar.startDate),
      };
    }
    return allToday.find((item) => !item.done && (!item.start || item.start.getTime() >= now.getTime() - 5 * 60_000))
      ?? allToday.find((item) => !item.done)
      ?? null;
  }, [allToday, currentCalendar, now]);

  const laterItems = useMemo(() => allToday.filter((item) => item.id !== nextItem?.id).slice(0, 6), [allToday, nextItem?.id]);
  const completedRoutines = routineItems.filter((item) => item.done);
  const completedCount = completedRoutines.length + completedTasksToday.length;
  const remaining = allToday.filter((item) => !item.done).length;
  const nextTimed = allToday.find((item) => item.start && item.start.getTime() > now.getTime());

  const dayParts = useMemo(() => DAY_PARTS.map((part) => {
    const timedCount = allToday.filter((item) => {
      if (!item.start) return false;
      const itemHour = item.start.getHours();
      return itemHour >= part.startHour && itemHour < part.endHour;
    }).length;
    const isCurrent = part.id === currentPart;
    const isPast = hour >= part.endHour;
    const status = isCurrent ? (timedCount > 0 ? `${timedCount} ahead` : 'Open now') : isPast ? 'Done' : timedCount > 0 ? `${timedCount} planned` : 'Open';
    return { ...part, timedCount, isCurrent, isPast, status };
  }), [allToday, currentPart, hour]);

  const currentPartLabel = currentPart === 'morning' ? 'morning' : currentPart === 'afternoon' ? 'afternoon' : 'evening';
  const clearHeadline = nextTimed
    ? `You’re clear until ${nextTimed.timeLabel || formatClock(nextTimed.start)}`
    : `Your ${currentPartLabel} is open`;
  const clearCopy = completedCount > 0
    ? `${completedCount} thing${completedCount === 1 ? '' : 's'} already done today. ${nextTimed ? 'Nothing needs you before the next commitment.' : 'No unfinished commitments are competing for your attention.'}`
    : nextTimed
      ? 'Nothing needs you before the next commitment.'
      : 'No unfinished commitments are competing for your attention.';

  const completionPreview = [
    ...completedTasksToday.map((task) => ({ id: `done-task-${task.id}`, title: task.title, meta: 'Task completed' })),
    ...completedRoutines.map((item) => ({ id: `done-${item.id}`, title: item.title, meta: item.meta })),
  ].slice(0, 4);

  const primarySport = favoriteSports.find((item) => item.id !== nextItem?.id) ?? null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: floatingTabBarScrollPadding(insets.bottom) }]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>TODAY</Text>
            <Text style={[styles.date, { color: colors.text }]}>{dayLabel}</Text>
          </View>
          <View style={[styles.nowPill, { backgroundColor: subtle }]}>
            <Clock3 size={14} color={colors.textSecondary} />
            <Text style={[styles.nowPillText, { color: colors.textSecondary }]}>{formatClock(now)}</Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your day, stripped down to what matters now.</Text>
      </View>

      <LinearGradient
        colors={nextItem ? (isDark ? ['#1D315E', '#17213A'] : ['#234FCC', '#16358E']) : (isDark ? ['#172A25', '#14211E'] : ['#EAF8F1', '#F6FBF8'])}
        style={styles.hero}
      >
        {nextItem ? (
          <TouchableOpacity activeOpacity={0.9} onPress={nextItem.action} disabled={!nextItem.action} style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroKickerRow}><ItemIcon kind={nextItem.kind} color="#FFFFFF" /><Text style={styles.heroKicker}>{nextItem.timeLabel === 'NOW' ? 'HAPPENING NOW' : 'UP NEXT'}</Text></View>
              <Text style={styles.heroTime}>{nextItem.timeLabel}</Text>
            </View>
            <View>
              <Text style={styles.heroTitle}>{nextItem.title}</Text>
              <Text style={styles.heroMeta}>{nextItem.meta}</Text>
            </View>
            {nextItem.action ? <View style={styles.heroAction}><Text style={styles.heroActionText}>Open</Text><ArrowRight size={17} color="#FFFFFF" /></View> : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroKickerRow, styles.clearKicker]}><Sparkles size={16} color={isDark ? '#77D7A9' : '#168A51'} /><Text style={[styles.heroKicker, { color: isDark ? '#77D7A9' : '#168A51' }]}>ALL CLEAR</Text></View>
              <CheckCircle2 size={24} color={isDark ? '#77D7A9' : '#168A51'} />
            </View>
            <View>
              <Text style={[styles.clearHeroTitle, { color: isDark ? '#F4FBF7' : '#153B2A' }]}>{clearHeadline}</Text>
              <Text style={[styles.clearHeroMeta, { color: isDark ? 'rgba(244,251,247,0.68)' : '#547062' }]}>{clearCopy}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={[styles.pulseCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{remaining === 0 ? 'Clear' : remaining}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{remaining === 0 ? 'open items' : 'things left'}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{completedRoutines.length}/{routineItems.length}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>routines</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{todayCalendar.length === 0 ? 'Open' : todayCalendar.length}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{todayCalendar.length === 0 ? 'calendar' : 'calendar items'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Shape of today</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>See where your attention is actually needed.</Text></View>
        </View>
        <View style={styles.dayPartRow}>
          {dayParts.map((part) => {
            const Icon = part.icon;
            return (
              <View key={part.id} style={[styles.dayPartCard, { backgroundColor: part.isCurrent ? (isDark ? '#172447' : '#EEF3FF') : surface, borderColor: part.isCurrent ? colors.primary : border }]}>
                <View style={[styles.dayPartIcon, { backgroundColor: part.isCurrent ? `${colors.primary}16` : subtle }]}><Icon size={17} color={part.isCurrent ? colors.primary : colors.textSecondary} /></View>
                <Text style={[styles.dayPartTitle, { color: colors.text }]}>{part.label}</Text>
                <Text style={[styles.dayPartRange, { color: colors.textSecondary }]}>{part.range}</Text>
                <Text style={[styles.dayPartStatus, { color: part.isCurrent ? colors.primary : part.isPast ? '#168A51' : colors.textSecondary }]}>{part.status}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {laterItems.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>Later today</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Only things that still belong to today.</Text></View><TouchableOpacity onPress={() => router.push('/(tabs)/my-life' as never)}><Text style={[styles.manageLink, { color: colors.primary }]}>Manage</Text></TouchableOpacity></View>
          <View style={[styles.timeline, { backgroundColor: surface, borderColor: border }]}>
            {laterItems.map((item, index) => (
              <TouchableOpacity key={item.id} activeOpacity={item.action ? 0.8 : 1} onPress={item.action} disabled={!item.action} style={[styles.timelineRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>
                <View style={[styles.timelineIcon, { backgroundColor: subtle }]}><ItemIcon kind={item.kind} color={item.urgent ? '#D64B45' : colors.textSecondary} /></View>
                <View style={styles.timelineCopy}><Text style={[styles.timelineTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text><Text style={[styles.timelineMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.meta}</Text></View>
                <Text style={[styles.timelineTime, { color: item.urgent ? '#D64B45' : colors.textSecondary }]}>{item.timeLabel}</Text>
                {item.action ? <ChevronRight size={15} color={colors.textSecondary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {completionPreview.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Done today</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{completedCount} completed — this is progress, not empty space.</Text></View>
            {completedCount > 4 ? <Text style={[styles.completionCount, { color: colors.primary }]}>+{completedCount - 4}</Text> : null}
          </View>
          <View style={[styles.doneCard, { backgroundColor: surface, borderColor: border }]}>
            {completionPreview.map((item, index) => (
              <View key={item.id} style={[styles.doneRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>
                <View style={styles.doneIcon}><Check size={16} color="#168A51" /></View>
                <View style={styles.timelineCopy}><Text style={[styles.doneTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text><Text style={[styles.timelineMeta, { color: colors.textSecondary }]}>{item.meta}</Text></View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {primarySport ? (
        <View style={styles.section}>
          <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>ONE HEADS-UP</Text>
          <TouchableOpacity onPress={primarySport.action} activeOpacity={0.86} style={[styles.headsUp, { backgroundColor: isDark ? '#211D12' : '#FFF8E8' }]}>
            <Trophy size={20} color="#C77D00" />
            <View style={styles.timelineCopy}><Text style={[styles.headsUpTitle, { color: colors.text }]}>{primarySport.title}</Text><Text style={[styles.timelineMeta, { color: colors.textSecondary }]}>{primarySport.timeLabel} · {primarySport.meta}</Text></View>
            <ChevronRight size={17} color="#C77D00" />
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity activeOpacity={0.84} onPress={() => router.push('/(tabs)/my-life' as never)} style={[styles.bottomLink, { borderColor: border }]}>
        <View><Text style={[styles.bottomLinkTitle, { color: colors.text }]}>Need to change the plan?</Text><Text style={[styles.bottomLinkMeta, { color: colors.textSecondary }]}>Tasks, routines, calendar and saved plans are managed in My Life.</Text></View>
        <ChevronRight size={18} color={colors.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  header: { gap: 7 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  date: { marginTop: 7, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -0.9 },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  nowPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  nowPillText: { fontSize: 12, fontWeight: '700' },
  hero: { minHeight: 228, borderRadius: 26, overflow: 'hidden' },
  heroInner: { flex: 1, padding: 21, justifyContent: 'space-between' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearKicker: { alignSelf: 'flex-start' },
  heroKicker: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heroTime: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  heroMeta: { color: 'rgba(255,255,255,0.72)', marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  clearHeroTitle: { fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  clearHeroMeta: { marginTop: 9, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pulseCard: { borderWidth: 1, borderRadius: 20, minHeight: 82, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 19, fontWeight: '800' },
  metricLabel: { marginTop: 3, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  metricDivider: { width: 1, height: 34 },
  section: { gap: 12 },
  sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  sectionTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.55 },
  sectionSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  manageLink: { fontSize: 13, fontWeight: '800' },
  dayPartRow: { flexDirection: 'row', gap: 9 },
  dayPartCard: { flex: 1, minHeight: 135, borderWidth: 1, borderRadius: 18, padding: 12 },
  dayPartIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dayPartTitle: { fontSize: 14, fontWeight: '800' },
  dayPartRange: { marginTop: 2, fontSize: 10, fontWeight: '600' },
  dayPartStatus: { marginTop: 13, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  timeline: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  timelineRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 11 },
  timelineIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineCopy: { flex: 1, minWidth: 0 },
  timelineTitle: { fontSize: 15, fontWeight: '700' },
  timelineMeta: { marginTop: 3, fontSize: 12 },
  timelineTime: { fontSize: 12, fontWeight: '700', maxWidth: 72 },
  completionCount: { fontSize: 15, fontWeight: '800' },
  doneCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  doneRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10 },
  doneIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F7EE' },
  doneTitle: { fontSize: 14, fontWeight: '700' },
  headsUp: { borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headsUpTitle: { fontSize: 15, fontWeight: '800' },
  bottomLink: { borderTopWidth: 1, paddingTop: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  bottomLinkTitle: { fontSize: 15, fontWeight: '800' },
  bottomLinkMeta: { marginTop: 3, fontSize: 12, lineHeight: 18, maxWidth: 290 },
});