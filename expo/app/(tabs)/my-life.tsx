import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ChefHat,
  CircleDot,
  Clapperboard,
  Flame,
  FolderKanban,
  Goal,
  ListChecks,
  MapPin,
  Trophy,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasksStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useDiscoverSavedLibrary } from '@/hooks/useDiscoverSavedLibrary';
import { useUserProfile } from '@/hooks/useUserProfile';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import type { Task } from '@/types/task';

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isWithinNextDays(value: string | Date | undefined, now: Date, days: number) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const start = startOfDay(now).getTime();
  const end = start + days * 86_400_000;
  return date.getTime() >= start && date.getTime() < end;
}

function priorityRank(task: Task) {
  return task.priority === 'urgent' ? 4 : task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
}

function weeklyRoutineProgress(task: Task, now: Date) {
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  let done = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    if (task.habitCompletions?.[dayKey(day)]) done += 1;
  }
  const target = task.habitFrequency?.type === 'times_per_week'
    ? task.habitFrequency.timesPerWeek ?? 7
    : task.habitFrequency?.days?.length || 7;
  return { done, target };
}

function formatClock(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function SectionHeader({ title, detail, onPress, color, textColor }: { title: string; detail?: string; onPress?: () => void; color: string; textColor: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}><Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>{detail ? <Text style={[styles.sectionDetail, { color }]}>{detail}</Text> : null}</View>
      {onPress ? <TouchableOpacity onPress={onPress} hitSlop={12}><ChevronRight size={19} color={color} /></TouchableOpacity> : null}
    </View>
  );
}

export default function MyLifeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const taskStore = useTasks();
  const calendar = useCalendar();
  const savedEvents = useSavedEvents();
  const savedLibrary = useDiscoverSavedLibrary();
  const { profile } = useUserProfile();

  const now = new Date();
  const surface = isDark ? '#15171C' : '#FFFFFF';
  const subtle = isDark ? '#1B1E24' : '#F4F5F7';
  const border = isDark ? '#292D36' : '#E7E9EE';

  const tasks = useMemo(
    () => taskStore.allTasks.filter((task) => !task.isHabit),
    [taskStore.allTasks],
  );
  const routines = useMemo(
    () => taskStore.allTasks.filter((task) => task.isHabit),
    [taskStore.allTasks],
  );
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled').sort((a, b) => priorityRank(b) - priorityRank(a)),
    [tasks],
  );
  const weekTasks = useMemo(
    () => activeTasks.filter((task) => isWithinNextDays(task.dueDate, now, 7)),
    [activeTasks, now],
  );
  const upcomingCalendar = useMemo(
    () => calendar.getUpcomingCalendarEvents(7),
    [calendar],
  );
  const weekSavedEvents = useMemo(
    () => savedEvents.upcomingSaved.filter((event) => {
      const start = parseEventStartDateTime(event);
      return start ? isWithinNextDays(start, now, 7) : false;
    }),
    [savedEvents.upcomingSaved, now],
  );

  const plannedCount = savedEvents.upcomingSaved.length + savedLibrary.counts.shows + savedLibrary.counts.recipes + savedLibrary.counts.matches + savedLibrary.counts.books;
  const identityGoals = profile?.identityGoals ?? [];

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(now);
    date.setDate(date.getDate() + index);
    const key = dayKey(date);
    const taskCount = activeTasks.filter((task) => task.dueDate && dayKey(new Date(task.dueDate)) === key).length;
    const calendarCount = upcomingCalendar.filter((event) => dayKey(new Date(event.startDate)) === key).length;
    const savedCount = savedEvents.upcomingSaved.filter((event) => {
      const start = parseEventStartDateTime(event);
      return start ? dayKey(start) === key : false;
    }).length;
    return {
      key,
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2),
      date: date.getDate(),
      load: taskCount + calendarCount + savedCount,
      isToday: index === 0,
    };
  }), [activeTasks, now, savedEvents.upcomingSaved, upcomingCalendar]);

  const routineRows = useMemo(() => routines
    .map((routine) => ({ routine, progress: weeklyRoutineProgress(routine, now) }))
    .sort((a, b) => (b.routine.habitStreak ?? 0) - (a.routine.habitStreak ?? 0))
    .slice(0, 4), [routines, now]);

  const nextCalendar = upcomingCalendar.slice(0, 3);
  const nextSaved = savedEvents.upcomingSaved[0] ?? null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: floatingTabBarScrollPadding(insets.bottom) }]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MY LIFE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Everything you’ve committed to.</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage the week, your routines and the things you’ve chosen to keep.</Text>
      </View>

      <View style={[styles.weekCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.weekTop}>
          <View><Text style={[styles.weekTitle, { color: colors.text }]}>This week</Text><Text style={[styles.weekMeta, { color: colors.textSecondary }]}>{weekTasks.length} tasks · {upcomingCalendar.length} calendar · {weekSavedEvents.length} plans</Text></View>
          <View style={[styles.weekBadge, { backgroundColor: subtle }]}><Text style={[styles.weekBadgeText, { color: colors.text }]}>{activeTasks.length} open</Text></View>
        </View>
        <View style={styles.dayStrip}>
          {weekDays.map((day) => (
            <View key={day.key} style={[styles.dayCell, day.isToday && { backgroundColor: colors.primary }]}> 
              <Text style={[styles.dayName, { color: day.isToday ? '#FFFFFF' : colors.textSecondary }]}>{day.label}</Text>
              <Text style={[styles.dayDate, { color: day.isToday ? '#FFFFFF' : colors.text }]}>{day.date}</Text>
              <View style={[styles.loadDot, { backgroundColor: day.load > 0 ? (day.isToday ? '#FFFFFF' : colors.primary) : 'transparent' }]} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Tasks & projects" detail={`${activeTasks.length} open`} onPress={() => router.push('/(tabs)/tasks' as never)} color={colors.textSecondary} textColor={colors.text} />
        <View style={[styles.listCard, { backgroundColor: surface, borderColor: border }]}>
          {activeTasks.length === 0 ? (
            <View style={styles.emptyRow}><CheckCircle2 size={20} color="#168A51" /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No open tasks.</Text></View>
          ) : activeTasks.slice(0, 4).map((task, index) => (
            <TouchableOpacity key={task.id} onPress={() => router.push('/(tabs)/tasks' as never)} style={[styles.listRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}> 
              <View style={[styles.iconBox, { backgroundColor: task.priority === 'urgent' ? '#FDECEC' : subtle }]}><ListChecks size={18} color={task.priority === 'urgent' ? '#C94742' : colors.primary} /></View>
              <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text><Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{[task.projectId ? 'Project' : task.category, task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) : 'No deadline'].join(' · ')}</Text></View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
        {taskStore.projects.length > 0 ? <Text style={[styles.underNote, { color: colors.textSecondary }]}><FolderKanban size={12} color={colors.textSecondary} /> {taskStore.projects.length} active project{taskStore.projects.length === 1 ? '' : 's'}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Routines" detail={`${routines.length} active`} onPress={() => router.push('/(tabs)/tasks' as never)} color={colors.textSecondary} textColor={colors.text} />
        <View style={[styles.listCard, { backgroundColor: surface, borderColor: border }]}>
          {routineRows.length === 0 ? (
            <View style={styles.emptyRow}><Flame size={20} color="#D98B00" /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No routines yet.</Text></View>
          ) : routineRows.map(({ routine, progress }, index) => {
            const pct = progress.target > 0 ? Math.min(100, Math.round((progress.done / progress.target) * 100)) : 0;
            return (
              <TouchableOpacity key={routine.id} onPress={() => router.push('/(tabs)/tasks' as never)} style={[styles.routineRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}> 
                <View style={styles.routineTop}><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]}>{routine.title}</Text><Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{progress.done}/{progress.target} this week{routine.habitStreak ? ` · ${routine.habitStreak}-day streak` : ''}</Text></View><Text style={[styles.percent, { color: colors.textSecondary }]}>{pct}%</Text></View>
                <View style={[styles.progressTrack, { backgroundColor: subtle }]}><View style={[styles.progressFill, { backgroundColor: '#19A66A', width: `${pct}%` }]} /></View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Calendar" detail="Next 7 days" onPress={() => router.push('/(tabs)/activities' as never)} color={colors.textSecondary} textColor={colors.text} />
        <View style={[styles.listCard, { backgroundColor: surface, borderColor: border }]}>
          {nextCalendar.length === 0 ? (
            <View style={styles.emptyRow}><CalendarDays size={20} color={colors.primary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing scheduled in the next 7 days.</Text></View>
          ) : nextCalendar.map((event, index) => (
            <View key={event.id} style={[styles.listRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}> 
              <View style={[styles.dateBox, { backgroundColor: subtle }]}><Text style={[styles.dateDay, { color: colors.primary }]}>{new Date(event.startDate).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</Text><Text style={[styles.dateNum, { color: colors.text }]}>{new Date(event.startDate).getDate()}</Text></View>
              <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text><Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{event.isAllDay ? 'All day' : formatClock(event.startDate)}{event.location ? ` · ${event.location}` : ''}</Text></View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Saved & planned" detail={`${plannedCount} kept`} color={colors.textSecondary} textColor={colors.text} />
        {nextSaved ? (
          <TouchableOpacity activeOpacity={0.86} onPress={() => router.push(`/(root)/event/${nextSaved.id}` as never)} style={[styles.savedHero, { backgroundColor: isDark ? '#182037' : '#EDF3FF' }]}> 
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#253052' : '#DCE8FF' }]}><MapPin size={19} color={colors.primary} /></View>
            <View style={styles.rowCopy}><Text style={[styles.savedKicker, { color: colors.primary }]}>NEXT SAVED PLAN</Text><Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={2}>{nextSaved.title}</Text><Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{[nextSaved.date, nextSaved.time, nextSaved.venue].filter(Boolean).join(' · ')}</Text></View>
            <ChevronRight size={17} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.libraryGrid}>
          {[
            { label: 'Events', value: savedEvents.upcomingSaved.length, icon: MapPin, route: '/(tabs)/events' },
            { label: 'Watch', value: savedLibrary.counts.shows, icon: Clapperboard, route: '/(tabs)/shows' },
            { label: 'Recipes', value: savedLibrary.counts.recipes, icon: ChefHat, route: '/(tabs)/cooking' },
            { label: 'Matches', value: savedLibrary.counts.matches, icon: Trophy, route: '/(tabs)/sports' },
            { label: 'Books', value: savedLibrary.counts.books, icon: BookOpen, route: '/(tabs)/learning' },
          ].map((item) => {
            const Icon = item.icon;
            return <TouchableOpacity key={item.label} onPress={() => router.push(item.route as never)} style={[styles.libraryTile, { backgroundColor: subtle }]}><Icon size={18} color={colors.primary} /><Text style={[styles.libraryValue, { color: colors.text }]}>{item.value}</Text><Text style={[styles.libraryLabel, { color: colors.textSecondary }]}>{item.label}</Text></TouchableOpacity>;
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Goals" detail={`${identityGoals.length}`} onPress={() => router.push('/(tabs)/profile' as never)} color={colors.textSecondary} textColor={colors.text} />
        <View style={[styles.goalsCard, { backgroundColor: surface, borderColor: border }]}>
          {identityGoals.length === 0 ? (
            <View style={styles.emptyRow}><Goal size={20} color="#7B61FF" /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add identity goals in You so One Pager knows what you’re building toward.</Text></View>
          ) : identityGoals.slice(0, 5).map((goal, index) => (
            <View key={`${goal}-${index}`} style={[styles.goalRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}><CircleDot size={15} color="#7B61FF" /><Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text></View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 30 },
  header: { gap: 7 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1.1, maxWidth: 330 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '500', maxWidth: 340 },
  weekCard: { borderWidth: 1, borderRadius: 22, padding: 17 },
  weekTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  weekTitle: { fontSize: 21, fontWeight: '800' },
  weekMeta: { marginTop: 3, fontSize: 12 },
  weekBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  weekBadgeText: { fontSize: 11, fontWeight: '700' },
  dayStrip: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayCell: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 9, borderRadius: 13 },
  dayName: { fontSize: 9, fontWeight: '700' },
  dayDate: { marginTop: 3, fontSize: 15, fontWeight: '800' },
  loadDot: { marginTop: 5, width: 4, height: 4, borderRadius: 2 },
  section: { gap: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionCopy: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sectionTitle: { fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  sectionDetail: { fontSize: 12, fontWeight: '600' },
  listCard: { borderWidth: 1, borderRadius: 19, overflow: 'hidden' },
  listRow: { minHeight: 67, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  emptyRow: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText: { flex: 1, fontSize: 13, lineHeight: 19 },
  underNote: { marginLeft: 5, fontSize: 11 },
  routineRow: { paddingHorizontal: 15, paddingVertical: 14, gap: 10 },
  routineTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  percent: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  dateBox: { width: 42, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 8, fontWeight: '800' },
  dateNum: { fontSize: 17, fontWeight: '800' },
  savedHero: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  savedTitle: { marginTop: 3, fontSize: 16, fontWeight: '800' },
  libraryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  libraryTile: { width: '31%', minHeight: 90, borderRadius: 16, padding: 12, justifyContent: 'space-between' },
  libraryValue: { marginTop: 10, fontSize: 20, fontWeight: '800' },
  libraryLabel: { marginTop: 2, fontSize: 11, fontWeight: '600' },
  goalsCard: { borderWidth: 1, borderRadius: 19, overflow: 'hidden' },
  goalRow: { minHeight: 52, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  goalText: { flex: 1, fontSize: 14, fontWeight: '650' as '600' },
});