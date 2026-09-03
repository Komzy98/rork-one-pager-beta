import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Flame,
  Sparkles,
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

export default function TodayFocusScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const taskStore = useTasks();
  const calendar = useCalendar();
  const habits = useTodayHabits();
  const saved = useSavedEvents();
  const app = useAppSafe();
  const { profile } = useUserProfile();

  const now = new Date();
  const dayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const surface = isDark ? '#15171C' : '#FFFFFF';
  const subtle = isDark ? '#1D2027' : '#F4F5F7';
  const border = isDark ? '#272B34' : '#E7E9EE';

  const todayCalendar = useMemo(
    () => calendar.getTodayCalendarEvents().sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [calendar],
  );

  const activeTasks = useMemo(() => {
    return taskStore.allTasks
      .filter((task) => !task.isHabit && task.status !== 'completed' && task.status !== 'cancelled')
      .filter((task) => sameDay(task.dueDate, now) || (task.dueDate && new Date(task.dueDate).getTime() < now.getTime()) || task.status === 'in-progress')
      .sort((a, b) => {
        const overdueA = a.dueDate && new Date(a.dueDate).getTime() < now.getTime() ? 1 : 0;
        const overdueB = b.dueDate && new Date(b.dueDate).getTime() < now.getTime() ? 1 : 0;
        if (overdueA !== overdueB) return overdueB - overdueA;
        return priorityRank(b) - priorityRank(a);
      });
  }, [taskStore.allTasks, now]);

  const routineItems = useMemo<ExecutionItem[]>(() => {
    return habits.entries.map((entry) => ({
      id: `routine-${entry.id}`,
      kind: 'routine',
      title: entry.title,
      meta: entry.habitStreak ? `${entry.habitStreak}-day streak` : 'Today’s routine',
      timeLabel: 'Anytime',
      done: Boolean(entry.habitCompletions?.[habits.today]),
      action: () => habits.toggleTodayHabit(entry.id),
    }));
  }, [habits.entries, habits.today, habits.toggleTodayHabit]);

  const savedToday = useMemo<ExecutionItem[]>(() => {
    return saved.upcomingSaved
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
      }));
  }, [saved.upcomingSaved, now]);

  const favoriteSport = useMemo<ExecutionItem | null>(() => {
    const favorites = profile?.favoriteTeams ?? [];
    const matches = app.sports
      .filter((match) => match.status !== 'Completed')
      .filter((match) => sameDay(match.date, now));
    const match = matches.find((candidate) => matchFavoriteTeam(`${candidate.homeTeam} ${candidate.awayTeam}`, favorites));
    if (!match) return null;
    const favorite = matchFavoriteTeam(`${match.homeTeam} ${match.awayTeam}`, favorites);
    return {
      id: `sport-${match.id}`,
      kind: 'sport',
      title: `${match.homeTeam} vs ${match.awayTeam}`,
      meta: favorite ? `${favorite} · ${match.league}` : match.league,
      timeLabel: match.status === 'Live' ? 'LIVE' : match.time,
      start: match.date ? new Date(match.date) : null,
      urgent: match.status === 'Live',
      action: () => router.push('/(tabs)/sports' as never),
    };
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
    const rows = [...calendarItems, ...savedToday, ...(favoriteSport ? [favoriteSport] : []), ...taskItems, ...routineItems.filter((item) => !item.done)];
    return rows.sort((a, b) => {
      if (a.start && b.start) return a.start.getTime() - b.start.getTime();
      if (a.start) return -1;
      if (b.start) return 1;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return 0;
    });
  }, [calendarItems, favoriteSport, routineItems, savedToday, taskItems]);

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
    return allToday.find((item) => !item.done && (!item.start || item.start.getTime() >= now.getTime() - 5 * 60_000)) ?? allToday.find((item) => !item.done) ?? null;
  }, [allToday, currentCalendar, now]);

  const laterItems = useMemo(() => allToday.filter((item) => item.id !== nextItem?.id).slice(0, 6), [allToday, nextItem?.id]);
  const remaining = allToday.filter((item) => !item.done).length;
  const completedRoutines = routineItems.filter((item) => item.done).length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: floatingTabBarScrollPadding(insets.bottom) }]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>TODAY</Text>
        <Text style={[styles.title, { color: colors.text }]}>{dayLabel}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Only what matters before the day ends.</Text>
      </View>

      <View style={[styles.statusRow, { backgroundColor: subtle }]}>
        <View>
          <Text style={[styles.statusValue, { color: colors.text }]}>{remaining}</Text>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>things left</Text>
        </View>
        <View style={[styles.statusDivider, { backgroundColor: border }]} />
        <View>
          <Text style={[styles.statusValue, { color: colors.text }]}>{todayCalendar.length}</Text>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>calendar</Text>
        </View>
        <View style={[styles.statusDivider, { backgroundColor: border }]} />
        <View>
          <Text style={[styles.statusValue, { color: colors.text }]}>{completedRoutines}/{routineItems.length}</Text>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>routines</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>NOW / NEXT</Text>
        {nextItem ? (
          <TouchableOpacity activeOpacity={0.88} onPress={nextItem.action} disabled={!nextItem.action} style={[styles.nextCard, { backgroundColor: colors.text }]}> 
            <View style={styles.nextTop}>
              <View style={styles.nextKind}><ItemIcon kind={nextItem.kind} color={isDark ? '#111318' : '#FFFFFF'} /><Text style={[styles.nextKindText, { color: isDark ? '#111318' : '#FFFFFF' }]}>{nextItem.kind === 'routine' ? 'ROUTINE' : nextItem.kind.toUpperCase()}</Text></View>
              <Text style={[styles.nextTime, { color: isDark ? '#111318' : '#FFFFFF' }]}>{nextItem.timeLabel}</Text>
            </View>
            <Text style={[styles.nextTitle, { color: isDark ? '#111318' : '#FFFFFF' }]}>{nextItem.title}</Text>
            <Text style={[styles.nextMeta, { color: isDark ? 'rgba(17,19,24,0.65)' : 'rgba(255,255,255,0.72)' }]}>{nextItem.meta}</Text>
            {nextItem.action ? <View style={styles.nextFooter}><Text style={[styles.nextAction, { color: isDark ? '#111318' : '#FFFFFF' }]}>Open</Text><ArrowRight size={17} color={isDark ? '#111318' : '#FFFFFF'} /></View> : null}
          </TouchableOpacity>
        ) : (
          <View style={[styles.clearCard, { backgroundColor: surface, borderColor: border }]}>
            <Sparkles size={22} color={colors.primary} />
            <View style={styles.clearCopy}><Text style={[styles.clearTitle, { color: colors.text }]}>Nothing pressing right now</Text><Text style={[styles.clearMeta, { color: colors.textSecondary }]}>Today should get quieter when your day is clear.</Text></View>
          </View>
        )}
      </View>

      {laterItems.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Later today</Text><TouchableOpacity onPress={() => router.push('/(tabs)/my-life' as never)}><Text style={[styles.manageLink, { color: colors.primary }]}>Manage in My Life</Text></TouchableOpacity></View>
          <View style={[styles.timeline, { backgroundColor: surface, borderColor: border }]}>
            {laterItems.map((item, index) => (
              <TouchableOpacity key={item.id} activeOpacity={item.action ? 0.8 : 1} onPress={item.action} disabled={!item.action} style={[styles.timelineRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}> 
                <View style={[styles.timelineIcon, { backgroundColor: item.done ? '#E7F7EE' : subtle }]}>{item.done ? <Check size={17} color="#168A51" /> : <ItemIcon kind={item.kind} color={item.urgent ? '#D64B45' : colors.textSecondary} />}</View>
                <View style={styles.timelineCopy}><Text style={[styles.timelineTitle, { color: item.done ? colors.textSecondary : colors.text }]} numberOfLines={1}>{item.title}</Text><Text style={[styles.timelineMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.meta}</Text></View>
                <Text style={[styles.timelineTime, { color: item.urgent ? '#D64B45' : colors.textSecondary }]}>{item.timeLabel}</Text>
                {item.action ? <ChevronRight size={15} color={colors.textSecondary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {favoriteSport && favoriteSport.id !== nextItem?.id ? (
        <View style={styles.section}>
          <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>ONE HEADS-UP</Text>
          <TouchableOpacity onPress={favoriteSport.action} activeOpacity={0.86} style={[styles.headsUp, { backgroundColor: isDark ? '#211D12' : '#FFF8E8' }]}>
            <Trophy size={20} color="#C77D00" />
            <View style={styles.headsUpCopy}><Text style={[styles.headsUpTitle, { color: colors.text }]}>{favoriteSport.title}</Text><Text style={[styles.headsUpMeta, { color: colors.textSecondary }]}>{favoriteSport.timeLabel} · {favoriteSport.meta}</Text></View>
            <ChevronRight size={17} color="#C77D00" />
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity activeOpacity={0.84} onPress={() => router.push('/(tabs)/my-life' as never)} style={[styles.bottomLink, { borderColor: border }]}>
        <View><Text style={[styles.bottomLinkTitle, { color: colors.text }]}>Need to reorganise something?</Text><Text style={[styles.bottomLinkMeta, { color: colors.textSecondary }]}>Tasks, routines, calendar and saved plans live in My Life.</Text></View>
        <ChevronRight size={18} color={colors.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 28 },
  header: { gap: 7 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  statusRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, justifyContent: 'space-between' },
  statusValue: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  statusLabel: { marginTop: 2, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  statusDivider: { width: 1, height: 30 },
  section: { gap: 12 },
  sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  manageLink: { fontSize: 13, fontWeight: '700' },
  nextCard: { borderRadius: 24, padding: 20, minHeight: 210, justifyContent: 'space-between' },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextKind: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  nextKindText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  nextTime: { fontSize: 13, fontWeight: '800' },
  nextTitle: { marginTop: 34, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8 },
  nextMeta: { marginTop: 8, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  nextFooter: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextAction: { fontSize: 14, fontWeight: '800' },
  clearCard: { borderRadius: 20, borderWidth: 1, padding: 18, flexDirection: 'row', gap: 13, alignItems: 'center' },
  clearCopy: { flex: 1 },
  clearTitle: { fontSize: 17, fontWeight: '800' },
  clearMeta: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  timeline: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  timelineRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 11 },
  timelineIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineCopy: { flex: 1, minWidth: 0 },
  timelineTitle: { fontSize: 15, fontWeight: '700' },
  timelineMeta: { marginTop: 3, fontSize: 12 },
  timelineTime: { fontSize: 12, fontWeight: '700', maxWidth: 72 },
  headsUp: { borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headsUpCopy: { flex: 1 },
  headsUpTitle: { fontSize: 15, fontWeight: '800' },
  headsUpMeta: { marginTop: 3, fontSize: 12 },
  bottomLink: { borderTopWidth: 1, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  bottomLinkTitle: { fontSize: 15, fontWeight: '800' },
  bottomLinkMeta: { marginTop: 3, fontSize: 12, lineHeight: 18, maxWidth: 290 },
});