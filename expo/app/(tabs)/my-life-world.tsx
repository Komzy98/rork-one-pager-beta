import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ChevronRight,
  Clapperboard,
  Flame,
  FolderKanban,
  Goal,
  ListChecks,
  MapPin,
  Sparkles,
  Trophy,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasksStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useDiscoverSavedLibrary } from '@/hooks/useDiscoverSavedLibrary';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function withinDays(value: string | Date | undefined | null, now: Date, days: number) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const start = startOfDay(now).getTime();
  const end = start + days * 86_400_000;
  return date.getTime() >= start && date.getTime() < end;
}

function weekRoutineCount(completions: Record<string, boolean> | undefined, now: Date) {
  if (!completions) return 0;
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  let count = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    if (completions[dayKey(day)]) count += 1;
  }
  return count;
}

type WorldCardProps = {
  title: string;
  value: string;
  detail: string;
  route: string;
  accent: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  wide?: boolean;
};

function WorldCard({ title, value, detail, route, accent, icon: Icon, wide }: WorldCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(route as never)}
      style={[styles.worldCard, wide && styles.worldCardWide, { backgroundColor: `${accent}12`, borderColor: `${accent}28` }]}
    >
      <View style={[styles.worldIcon, { backgroundColor: `${accent}1F` }]}>
        <Icon size={20} color={accent} />
      </View>
      <View style={styles.worldCopy}>
        <Text style={[styles.worldTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.worldValue}>{value}</Text>
        <Text style={styles.worldDetail} numberOfLines={2}>{detail}</Text>
      </View>
      <ChevronRight size={17} color={accent} />
    </TouchableOpacity>
  );
}

export default function MyLifeWorldScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const taskStore = useTasks();
  const calendar = useCalendar();
  const savedEvents = useSavedEvents();
  const savedLibrary = useDiscoverSavedLibrary();
  const { profile } = useUserProfile();
  const app = useAppSafe();

  const now = new Date();
  const surface = isDark ? '#15171C' : '#FFFFFF';
  const border = isDark ? '#292D36' : '#E6E9EF';
  const subtle = isDark ? '#1C1F25' : '#F3F5F8';

  const tasks = useMemo(() => taskStore.allTasks.filter((task) => !task.isHabit), [taskStore.allTasks]);
  const routines = useMemo(() => taskStore.allTasks.filter((task) => task.isHabit), [taskStore.allTasks]);
  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled'),
    [tasks],
  );
  const overdueTasks = useMemo(
    () => openTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < now.getTime()),
    [openTasks, now],
  );
  const nextWeekCalendar = useMemo(() => calendar.getUpcomingCalendarEvents(7), [calendar]);
  const upcomingSaved = savedEvents.upcomingSaved;
  const thisWeekSaved = useMemo(
    () => upcomingSaved.filter((event) => {
      const start = parseEventStartDateTime(event);
      return start ? withinDays(start, now, 7) : false;
    }),
    [upcomingSaved, now],
  );
  const watching = useMemo(() => app.shows.filter((show) => show.status === 'Watching'), [app.shows]);
  const plannedShows = useMemo(() => app.shows.filter((show) => show.status === 'Plan to Watch'), [app.shows]);
  const maxStreak = routines.reduce((max, routine) => Math.max(max, routine.habitStreak ?? 0), 0);
  const routineCompletionsThisWeek = routines.reduce((sum, routine) => sum + weekRoutineCount(routine.habitCompletions, now), 0);
  const favoriteTeams = (profile?.favoriteTeams?.length ?? 0) + (profile?.favoriteNBATeams?.length ?? 0);
  const goals = profile?.identityGoals ?? [];
  const nextSaved = upcomingSaved[0] ?? null;
  const plannedTotal = upcomingSaved.length + savedLibrary.counts.shows + savedLibrary.counts.recipes + savedLibrary.counts.matches + savedLibrary.counts.books;

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(now);
    date.setDate(date.getDate() + index);
    const key = dayKey(date);
    const taskLoad = openTasks.filter((task) => task.dueDate && dayKey(new Date(task.dueDate)) === key).length;
    const calendarLoad = nextWeekCalendar.filter((event) => dayKey(new Date(event.startDate)) === key).length;
    const planLoad = upcomingSaved.filter((event) => {
      const start = parseEventStartDateTime(event);
      return start ? dayKey(start) === key : false;
    }).length;
    return {
      key,
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2),
      date: date.getDate(),
      load: taskLoad + calendarLoad + planLoad,
      today: index === 0,
    };
  }), [now, openTasks, nextWeekCalendar, upcomingSaved]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: floatingTabBarScrollPadding(insets.bottom) }]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MY LIFE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Your world, in one place.</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Everything you’re building, following and keeping — without turning it into another Today feed.</Text>
      </View>

      <LinearGradient
        colors={isDark ? ['#16213A', '#11151F'] : ['#E9F0FF', '#F7F9FF']}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: isDark ? '#25345A' : '#D8E5FF' }]}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <Text style={[styles.heroKicker, { color: colors.primary }]}>YOUR WORLD</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {openTasks.length + routines.length + plannedTotal} things are actively part of your life.
        </Text>
        <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
          {openTasks.length} open tasks · {routines.length} routines · {plannedTotal} saved or planned
        </Text>
        <View style={styles.heroStats}>
          <View><Text style={[styles.heroStatValue, { color: colors.text }]}>{overdueTasks.length}</Text><Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>overdue</Text></View>
          <View style={[styles.heroDivider, { backgroundColor: border }]} />
          <View><Text style={[styles.heroStatValue, { color: colors.text }]}>{routineCompletionsThisWeek}</Text><Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>routine wins</Text></View>
          <View style={[styles.heroDivider, { backgroundColor: border }]} />
          <View><Text style={[styles.heroStatValue, { color: colors.text }]}>{thisWeekSaved.length + nextWeekCalendar.length}</Text><Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>this week</Text></View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>This week</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>A quick sense of how full the next seven days are.</Text></View>
        </View>
        <View style={[styles.weekStrip, { backgroundColor: surface, borderColor: border }]}>
          {weekDays.map((day) => (
            <View key={day.key} style={[styles.dayCell, day.today && { backgroundColor: colors.primary }]}>
              <Text style={[styles.dayName, { color: day.today ? '#FFFFFF' : colors.textSecondary }]}>{day.label}</Text>
              <Text style={[styles.dayDate, { color: day.today ? '#FFFFFF' : colors.text }]}>{day.date}</Text>
              <View style={[styles.dayDot, { backgroundColor: day.load > 0 ? (day.today ? '#FFFFFF' : colors.primary) : 'transparent' }]} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Your world</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Open a part of your life and go deeper.</Text></View>
        </View>
        <View style={styles.worldGrid}>
          <WorldCard title="Tasks & projects" value={`${openTasks.length} open`} detail={`${taskStore.projects.length} projects${overdueTasks.length ? ` · ${overdueTasks.length} overdue` : ''}`} route="/(tabs)/tasks" accent="#3B63F3" icon={ListChecks} wide />
          <WorldCard title="Routines" value={`${routines.length} active`} detail={maxStreak ? `${maxStreak}-day best current streak` : `${routineCompletionsThisWeek} completions this week`} route="/(tabs)/tasks" accent="#13A66A" icon={Flame} />
          <WorldCard title="Calendar" value={`${nextWeekCalendar.length} upcoming`} detail="Next 7 days" route="/(tabs)/activities" accent="#6E56CF" icon={CalendarDays} />
          <WorldCard title="Watch" value={`${watching.length} watching`} detail={`${plannedShows.length} saved for later`} route="/(tabs)/shows" accent="#8A5CF6" icon={Clapperboard} />
          <WorldCard title="Sports" value={`${favoriteTeams} teams`} detail={`${savedLibrary.counts.matches} pinned matches`} route="/(tabs)/sports" accent="#D88900" icon={Trophy} />
          <WorldCard title="Events" value={`${upcomingSaved.length} saved`} detail={`${thisWeekSaved.length} in the next 7 days`} route="/(tabs)/events" accent="#E05273" icon={MapPin} />
          <WorldCard title="Cooking" value={`${savedLibrary.counts.recipes} saved`} detail="Recipes you want to come back to" route="/(tabs)/cooking" accent="#E56B3E" icon={ChefHat} />
          <WorldCard title="Learning" value={`${savedLibrary.counts.books} books`} detail={`${goals.length} goals shaping what matters`} route="/(tabs)/learning" accent="#2586C8" icon={BookOpen} />
        </View>
      </View>

      {nextSaved ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Next plan</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Something you’ve already chosen.</Text></View>
          </View>
          <TouchableOpacity activeOpacity={0.88} onPress={() => router.push(`/(root)/event/${nextSaved.id}` as never)} style={[styles.planCard, { backgroundColor: isDark ? '#1B2232' : '#EEF3FF', borderColor: isDark ? '#293552' : '#DCE6FF' }]}>
            <View style={[styles.planIcon, { backgroundColor: isDark ? '#263452' : '#DCE7FF' }]}><MapPin size={20} color={colors.primary} /></View>
            <View style={styles.planCopy}><Text style={[styles.planKicker, { color: colors.primary }]}>SAVED PLAN</Text><Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={2}>{nextSaved.title}</Text><Text style={[styles.planMeta, { color: colors.textSecondary }]}>{[nextSaved.date, nextSaved.time, nextSaved.venue].filter(Boolean).join(' · ')}</Text></View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Goals</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>The longer-term things you’re trying to move toward.</Text></View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as never)}><ChevronRight size={19} color={colors.textSecondary} /></TouchableOpacity>
        </View>
        <View style={[styles.goalsCard, { backgroundColor: surface, borderColor: border }]}>
          {goals.length === 0 ? (
            <View style={styles.goalRow}><View style={[styles.goalIcon, { backgroundColor: subtle }]}><Goal size={18} color={colors.primary} /></View><Text style={[styles.goalText, { color: colors.textSecondary }]}>Add an identity goal in You to give One Pager more direction.</Text></View>
          ) : goals.slice(0, 4).map((goal, index) => (
            <View key={`${goal}-${index}`} style={[styles.goalRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}><View style={[styles.goalIcon, { backgroundColor: subtle }]}><Goal size={18} color={colors.primary} /></View><Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text></View>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push('/(tabs)/tasks' as never)} style={[styles.manageCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={[styles.manageIcon, { backgroundColor: subtle }]}><FolderKanban size={20} color={colors.primary} /></View>
        <View style={styles.manageCopy}><Text style={[styles.manageTitle, { color: colors.text }]}>Manage tasks, projects & routines</Text><Text style={[styles.manageMeta, { color: colors.textSecondary }]}>Open the full management workspace.</Text></View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 28 },
  header: { gap: 7 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  title: { fontSize: 36, lineHeight: 41, fontWeight: '900', letterSpacing: -1.15 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  hero: { borderRadius: 26, padding: 20, gap: 13, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.7 },
  heroMeta: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 4 },
  heroStatValue: { fontSize: 22, fontWeight: '900' },
  heroStatLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroDivider: { width: 1, height: 34 },
  section: { gap: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  sectionTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.7 },
  sectionSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  weekStrip: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, padding: 8, gap: 5 },
  dayCell: { flex: 1, minHeight: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayName: { fontSize: 10, fontWeight: '800' },
  dayDate: { fontSize: 16, fontWeight: '900' },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  worldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  worldCard: { width: '48.2%', minHeight: 158, borderRadius: 22, borderWidth: 1, padding: 15, justifyContent: 'space-between' },
  worldCardWide: { width: '100%', minHeight: 140, flexDirection: 'row', alignItems: 'center', gap: 14 },
  worldIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  worldCopy: { flex: 1, minWidth: 0 },
  worldTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  worldValue: { marginTop: 12, fontSize: 27, fontWeight: '900', color: '#111318', letterSpacing: -0.5 },
  worldDetail: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600', color: '#667085' },
  planCard: { borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  planIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  planCopy: { flex: 1, minWidth: 0 },
  planKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  planTitle: { marginTop: 3, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  planMeta: { marginTop: 5, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  goalsCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  goalRow: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '650' as any },
  manageCard: { borderRadius: 20, borderWidth: 1, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  manageIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  manageCopy: { flex: 1 },
  manageTitle: { fontSize: 15, fontWeight: '800' },
  manageMeta: { marginTop: 3, fontSize: 12, lineHeight: 17 },
});
