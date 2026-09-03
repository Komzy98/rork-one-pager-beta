import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  LayoutGrid,
  ListChecks,
  MapPin,
  Trophy,
} from 'lucide-react-native';

import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasksStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import { usePinnedMatches } from '@/hooks/usePinnedMatches';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { OP_DOMAIN, OP_LAYOUT, OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import {
  ContextCue,
  ListRow,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/ui/OnePagerUI';

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

function ageDays(value: string | undefined | null, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function weekRoutineCount(completions: Record<string, boolean> | undefined, now: Date) {
  if (!completions) return 0;
  const start = new Date(now);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  let count = 0;
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    if (completions[dayKey(date)]) count += 1;
  }
  return count;
}

function daysUntil(value: Date | null, now: Date) {
  if (!value || !Number.isFinite(value.getTime())) return null;
  return Math.ceil((startOfDay(value).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

function eventWhen(date: Date | null, now: Date) {
  const days = daysUntil(date, now);
  if (days == null) return 'Upcoming';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return date?.toLocaleDateString('en-GB', { weekday: 'long' }) ?? 'This week';
  return date?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) ?? 'Upcoming';
}

function sportWhen(dateValue?: string, timeValue?: string, live?: boolean) {
  if (live) return 'Live now';
  if (dateValue) {
    const date = new Date(dateValue);
    if (Number.isFinite(date.getTime())) {
      const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      return [day, timeValue].filter(Boolean).join(' · ');
    }
  }
  return timeValue || 'Upcoming';
}

type DomainCardProps = {
  title: string;
  status: string;
  focus: string;
  detail: string;
  route: string;
  accent: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  wide?: boolean;
};

function statusTone(status: string): 'neutral' | 'positive' | 'warning' | 'danger' | 'info' {
  if (/STRONG|CLEAR|USED|LIVE/.test(status)) return 'positive';
  if (/NEEDS|STALE|LOSING/.test(status)) return 'danger';
  if (/BUSY/.test(status)) return 'warning';
  if (/ACTIVE|IN MOTION|NEXT UP|COMING UP|WATCHING|IN PROGRESS/.test(status)) return 'info';
  return 'neutral';
}

function DomainCard({ title, status, focus, detail, route, accent, icon: Icon, wide }: DomainCardProps) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push(route as never)}
      style={[styles.domainPressable, wide && styles.domainWide]}
    >
      <SurfaceCard style={styles.domainCard}>
        <View style={styles.domainTop}>
          <View style={[styles.domainIcon, { backgroundColor: isDark ? `${accent}24` : `${accent}11` }]}>
            <Icon size={19} color={accent} />
          </View>
          <StatusPill label={status} tone={statusTone(status)} accent={accent} />
        </View>
        <View style={styles.domainCopy}>
          <Text style={[OP_TYPE.eyebrow, { color: accent }]}>{title.toUpperCase()}</Text>
          <Text style={[OP_TYPE.cardTitle, styles.domainFocus, { color: colors.text }]} numberOfLines={wide ? 2 : 3}>{focus}</Text>
          <Text style={[OP_TYPE.meta, styles.domainDetail, { color: colors.textSecondary }]} numberOfLines={2}>{detail}</Text>
        </View>
        <View style={styles.domainFooter}>
          <Text style={[OP_TYPE.meta, styles.openLabel, { color: colors.textSecondary }]}>Open</Text>
          <ChevronRight size={16} color={colors.textSecondary} />
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

type AttentionSignal = {
  id: string;
  label: string;
  text: string;
  route: string;
  tone: 'warning' | 'info';
};

export default function MyLifeWorldV3() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const taskStore = useTasks();
  const calendar = useCalendar();
  const cooking = useCookingStorage();
  const pinnedMatches = usePinnedMatches();
  const app = useAppSafe();
  const discover = useSharedDiscoverLifeContext();
  const profile = discover.profile;
  const now = new Date();

  const tasks = useMemo(() => taskStore.allTasks.filter((task) => !task.isHabit), [taskStore.allTasks]);
  const routines = useMemo(() => taskStore.allTasks.filter((task) => task.isHabit), [taskStore.allTasks]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled'), [tasks]);
  const inProgressTasks = useMemo(() => openTasks.filter((task) => task.status === 'in-progress'), [openTasks]);
  const overdueTasks = useMemo(() => openTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < now.getTime()), [openTasks, now]);
  const staleTasks = useMemo(() => openTasks.filter((task) => ageDays(task.updatedAt, now) >= 14), [openTasks, now]);
  const activeProjects = useMemo(() => taskStore.projects.filter((project) => !project.isArchived), [taskStore.projects]);
  const nextWeekCalendar = useMemo(() => calendar.getUpcomingCalendarEvents(7), [calendar]);
  const upcomingSaved = discover.saved.upcomingSaved;
  const thisWeekSaved = useMemo(() => upcomingSaved.filter((event) => {
    const start = parseEventStartDateTime(event);
    return start ? withinDays(start, now, 7) : false;
  }), [upcomingSaved, now]);

  const watching = useMemo(() => app.shows.filter((show) => show.status === 'Watching'), [app.shows]);
  const plannedShows = useMemo(() => app.shows.filter((show) => show.status === 'Plan to Watch' || show.status === 'On Hold'), [app.shows]);
  const staleWatching = useMemo(() => watching.filter((show) => ageDays(show.updatedAt, now) >= 21), [watching, now]);
  const currentWatch = discover.watchSignal?.title ?? watching[0]?.title ?? null;

  const maxStreak = routines.reduce((max, routine) => Math.max(max, routine.habitStreak ?? 0), 0);
  const routineCompletionsThisWeek = routines.reduce((sum, routine) => sum + weekRoutineCount(routine.habitCompletions, now), 0);
  const quietRoutines = routines.filter((routine) => weekRoutineCount(routine.habitCompletions, now) === 0 && ageDays(routine.createdAt, now) >= 7);

  const favoriteTeams = (profile?.favoriteTeams?.length ?? 0) + (profile?.favoriteNBATeams?.length ?? 0);
  const followedSportSignals = discover.sportSignals.filter((signal) => Boolean(signal.favoriteTeamName));
  const nextSport = followedSportSignals.find((signal) => signal.status === 'Live')
    ?? followedSportSignals.find((signal) => signal.status === 'Upcoming')
    ?? null;

  const goals = profile?.identityGoals ?? [];
  const nextSaved = upcomingSaved[0] ?? null;
  const nextSavedStart = nextSaved ? parseEventStartDateTime(nextSaved) : null;
  const learningInProgress = app.activities.find((activity) => activity.category === 'Learning' && activity.status === 'In Progress') ?? null;
  const savedBooks = profile?.favoriteBooks?.length ?? 0;
  const firstBookTitle = profile?.favoriteBooks?.[0]?.title ?? null;
  const savedRecipeCount = cooking.bookmarks.length;
  const totalCooked = Object.values(cooking.cookCounts).reduce((sum, count) => sum + count, 0);
  const pinnedCount = pinnedMatches.records.length;

  const taskStatus = overdueTasks.length > 0 ? 'NEEDS ATTENTION' : inProgressTasks.length > 0 ? 'IN MOTION' : openTasks.length > 0 ? 'ACTIVE' : 'CLEAR';
  const taskFocus = overdueTasks.length > 0
    ? `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} need a decision`
    : inProgressTasks[0]?.title ?? openTasks[0]?.title ?? 'Nothing open right now';
  const taskDetail = `${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'} · ${openTasks.length} open${staleTasks.length ? ` · ${staleTasks.length} stale` : ''}`;

  const routineStatus = quietRoutines.length > 0 ? 'LOSING MOMENTUM' : maxStreak >= 7 ? 'STRONG' : routineCompletionsThisWeek > 0 ? 'IN MOTION' : routines.length > 0 ? 'QUIET' : 'EMPTY';
  const routineFocus = quietRoutines.length > 0
    ? `${quietRoutines.length} routine${quietRoutines.length === 1 ? '' : 's'} have gone quiet`
    : maxStreak > 0 ? `${maxStreak}-day streak is your strongest current run` : routines.length > 0 ? 'Build some momentum this week' : 'No routines tracked yet';
  const routineDetail = `${routineCompletionsThisWeek} completion${routineCompletionsThisWeek === 1 ? '' : 's'} this week · ${routines.length} active`;

  const nextCalendar = nextWeekCalendar[0] ?? null;
  const calendarStatus = nextWeekCalendar.length >= 8 ? 'BUSY' : nextWeekCalendar.length > 0 ? 'PLANNED' : 'OPEN';
  const calendarFocus = nextCalendar?.title ?? 'The next seven days are unusually open';
  const calendarDetail = nextCalendar
    ? `${new Date(nextCalendar.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${nextWeekCalendar.length} commitment${nextWeekCalendar.length === 1 ? '' : 's'} in 7 days`
    : 'No upcoming calendar commitments';

  const watchStatus = staleWatching.length > 0 ? 'GOING STALE' : currentWatch ? 'WATCHING' : plannedShows.length > 0 ? 'SAVED' : 'QUIET';
  const watchFocus = currentWatch ?? plannedShows[0]?.title ?? 'Nothing in progress';
  const watchDetail = `${watching.length} watching · ${plannedShows.length} saved for later${staleWatching.length ? ` · ${staleWatching.length} untouched 3+ weeks` : ''}`;

  const sportStatus = nextSport?.status === 'Live' ? 'LIVE' : nextSport ? 'NEXT UP' : favoriteTeams > 0 ? 'FOLLOWING' : 'QUIET';
  const sportFocus = nextSport ? `${nextSport.homeTeam} vs ${nextSport.awayTeam}` : favoriteTeams ? `${favoriteTeams} teams in your world` : 'No teams followed yet';
  const sportDetail = nextSport
    ? `${sportWhen(nextSport.date, nextSport.time, nextSport.status === 'Live')} · ${pinnedCount} pinned match${pinnedCount === 1 ? '' : 'es'}`
    : `${pinnedCount} pinned match${pinnedCount === 1 ? '' : 'es'}`;

  const eventStatus = nextSavedStart && withinDays(nextSavedStart, now, 7) ? 'COMING UP' : upcomingSaved.length > 0 ? 'SAVED' : 'OPEN';
  const eventFocus = nextSaved?.title ?? 'Nothing planned yet';
  const eventDetail = nextSavedStart
    ? `${eventWhen(nextSavedStart, now)} · ${upcomingSaved.length} saved plan${upcomingSaved.length === 1 ? '' : 's'}`
    : `${upcomingSaved.length} saved plan${upcomingSaved.length === 1 ? '' : 's'}`;

  const cookingStatus = totalCooked > 0 ? 'USED' : savedRecipeCount > 0 ? 'SAVED' : 'OPEN';
  const cookingFocus = discover.recipeSignal?.saved
    ? discover.recipeSignal.title
    : savedRecipeCount > 0 ? `${savedRecipeCount} recipe${savedRecipeCount === 1 ? '' : 's'} waiting to be cooked` : 'No recipes saved yet';
  const cookingDetail = `${savedRecipeCount} saved · ${totalCooked} cook${totalCooked === 1 ? '' : 's'} logged`;

  const learningStatus = learningInProgress ? 'IN PROGRESS' : savedBooks > 0 ? 'SAVED' : 'OPEN';
  const learningFocus = learningInProgress?.title ?? firstBookTitle ?? 'Nothing active right now';
  const learningDetail = learningInProgress
    ? `${savedBooks} book${savedBooks === 1 ? '' : 's'} · 1 learning activity in progress`
    : `${savedBooks} book${savedBooks === 1 ? '' : 's'} · Learning is quiet`;

  const attentionSignals = ([
    overdueTasks.length > 0 ? { id: 'tasks', label: 'Tasks need a look', text: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} need a decision.`, route: '/(tabs)/tasks', tone: 'warning' as const } : null,
    quietRoutines.length > 0 ? { id: 'routines', label: 'Losing momentum', text: `${quietRoutines.length} routine${quietRoutines.length === 1 ? '' : 's'} have no wins this week.`, route: '/(tabs)/tasks', tone: 'warning' as const } : null,
    staleWatching.length > 0 ? { id: 'watch', label: 'Going stale', text: `${staleWatching[0].title} has not moved in ${ageDays(staleWatching[0].updatedAt, now)} days.`, route: '/(tabs)/shows', tone: 'info' as const } : null,
    staleTasks.length > overdueTasks.length ? { id: 'stale-tasks', label: 'Projects drifting', text: `${staleTasks.length} open task${staleTasks.length === 1 ? '' : 's'} have been untouched for 2+ weeks.`, route: '/(tabs)/tasks', tone: 'info' as const } : null,
  ] satisfies Array<AttentionSignal | null>).filter((item): item is AttentionSignal => item !== null).slice(0, 2);

  const activeAreaCount = [
    openTasks.length > 0,
    routines.length > 0,
    nextWeekCalendar.length > 0,
    watching.length + plannedShows.length > 0,
    favoriteTeams + pinnedCount > 0,
    upcomingSaved.length > 0,
    savedRecipeCount > 0,
    savedBooks + (learningInProgress ? 1 : 0) > 0,
  ].filter(Boolean).length;

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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: OP_LAYOUT.screenPadding,
        paddingTop: insets.top + OP_SPACING.md,
        paddingBottom: floatingTabBarScrollPadding(insets.bottom),
        gap: OP_LAYOUT.sectionGap,
      }}
    >
      <PageHeader
        eyebrow="My Life"
        title="Your world, at a glance."
        subtitle="See what is moving, what is waiting and what has quietly gone stale — without turning everything into Today."
      />

      <SurfaceCard variant="hero" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: isDark ? `${colors.primary}24` : `${colors.primary}10` }]}>
            <LayoutGrid size={20} color={colors.primary} />
          </View>
          <StatusPill label={`${activeAreaCount} active areas`} tone="info" />
        </View>
        <Text style={[OP_TYPE.heroTitle, { color: colors.text }]}>Your life has shape right now.</Text>
        <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>Tasks, routines, plans and interests stay here as persistent state. Today only borrows what matters now.</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}><Text style={[styles.heroNumber, { color: colors.text }]}>{activeProjects.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>projects</Text></View>
          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
          <View style={styles.heroStat}><Text style={[styles.heroNumber, { color: colors.text }]}>{routineCompletionsThisWeek}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>routine wins</Text></View>
          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
          <View style={styles.heroStat}><Text style={[styles.heroNumber, { color: colors.text }]}>{thisWeekSaved.length + nextWeekCalendar.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>coming up</Text></View>
        </View>
      </SurfaceCard>

      {attentionSignals.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Needs a look" subtitle="Slow drift, not urgent Today items." />
          <View style={styles.cueStack}>
            {attentionSignals.map((signal) => (
              <ContextCue key={signal.id} label={signal.label} text={signal.text} tone={signal.tone} onPress={() => router.push(signal.route as never)} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="This week" subtitle="How much of the next seven days is already spoken for." />
        <SurfaceCard style={styles.weekCard}>
          <View style={styles.weekStrip}>
            {weekDays.map((day) => (
              <View key={day.key} style={[styles.dayCell, day.today && { backgroundColor: colors.primary }]}>
                <Text style={[OP_TYPE.meta, styles.dayName, { color: day.today ? colors.textInverse : colors.textSecondary }]}>{day.label}</Text>
                <Text style={[styles.dayDate, { color: day.today ? colors.textInverse : colors.text }]}>{day.date}</Text>
                <View style={[styles.dayDot, { backgroundColor: day.load > 0 ? (day.today ? colors.textInverse : colors.primary) : 'transparent' }]} />
              </View>
            ))}
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Your world" subtitle="State and momentum first. Navigation second." />
        <View style={styles.domainGrid}>
          <DomainCard title="Tasks & projects" status={taskStatus} focus={taskFocus} detail={taskDetail} route="/(tabs)/tasks" accent={OP_DOMAIN.tasks} icon={ListChecks} wide />
          <DomainCard title="Routines" status={routineStatus} focus={routineFocus} detail={routineDetail} route="/(tabs)/tasks" accent={OP_DOMAIN.routines} icon={Flame} />
          <DomainCard title="Calendar" status={calendarStatus} focus={calendarFocus} detail={calendarDetail} route="/(tabs)/activities" accent={OP_DOMAIN.calendar} icon={CalendarDays} />
          <DomainCard title="Watch" status={watchStatus} focus={watchFocus} detail={watchDetail} route="/(tabs)/shows" accent={OP_DOMAIN.watch} icon={Clapperboard} />
          <DomainCard title="Sports" status={sportStatus} focus={sportFocus} detail={sportDetail} route="/(tabs)/sports" accent={OP_DOMAIN.sports} icon={Trophy} />
          <DomainCard title="Events" status={eventStatus} focus={eventFocus} detail={eventDetail} route="/(tabs)/events" accent={OP_DOMAIN.events} icon={MapPin} />
          <DomainCard title="Cooking" status={cookingStatus} focus={cookingFocus} detail={cookingDetail} route="/(tabs)/cooking" accent={OP_DOMAIN.cooking} icon={ChefHat} />
          <DomainCard title="Learning" status={learningStatus} focus={learningFocus} detail={learningDetail} route="/(tabs)/learning" accent={OP_DOMAIN.learning} icon={BookOpen} />
        </View>
      </View>

      {nextSaved ? (
        <View style={styles.section}>
          <SectionHeader title="Next plan" subtitle="Something you chose is now part of your life." />
          <SurfaceCard variant="list">
            <ListRow
              icon={<MapPin size={18} color={OP_DOMAIN.events} />}
              eyebrow={`Saved plan · ${eventWhen(nextSavedStart, now)}`}
              title={nextSaved.title}
              detail={[nextSaved.time, nextSaved.venue].filter(Boolean).join(' · ')}
              accent={OP_DOMAIN.events}
              onPress={() => router.push(`/(root)/event/${nextSaved.id}` as never)}
            />
          </SurfaceCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Goals" subtitle="Direction, not another checklist." actionLabel="Manage" onAction={() => router.push('/(tabs)/profile' as never)} />
        <SurfaceCard variant="list">
          {goals.length === 0 ? (
            <ListRow icon={<Goal size={18} color={colors.primary} />} title="Add an identity goal" detail="Give One Pager more direction in You." onPress={() => router.push('/(tabs)/profile' as never)} />
          ) : goals.slice(0, 4).map((goal, index) => (
            <ListRow key={`${goal}-${index}`} icon={<Goal size={18} color={colors.primary} />} title={goal} divided={index > 0} />
          ))}
        </SurfaceCard>
      </View>

      <SurfaceCard variant="list">
        <ListRow
          icon={<FolderKanban size={18} color={colors.primary} />}
          title="Manage tasks, projects & routines"
          detail="Open the deeper workspace when you actually need to organise things."
          onPress={() => router.push('/(tabs)/tasks' as never)}
        />
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { gap: OP_SPACING.sm },
  hero: { gap: OP_SPACING.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.sm },
  heroIcon: { width: 40, height: 40, borderRadius: OP_RADIUS.medium, alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', alignItems: 'center', paddingTop: OP_SPACING.xs },
  heroStat: { flex: 1 },
  heroNumber: { ...OP_TYPE.cardTitle, fontSize: 20, lineHeight: 24 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 32, marginHorizontal: OP_SPACING.sm },
  cueStack: { gap: OP_SPACING.xs },
  weekCard: { padding: OP_SPACING.xs },
  weekStrip: { flexDirection: 'row', gap: 4 },
  dayCell: { flex: 1, minHeight: 64, borderRadius: OP_RADIUS.control, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayName: { fontWeight: '700' },
  dayDate: { ...OP_TYPE.cardTitle, fontSize: 15, lineHeight: 19 },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: OP_LAYOUT.cardGap },
  domainPressable: { width: '48.2%' },
  domainWide: { width: '100%' },
  domainCard: { minHeight: 188, justifyContent: 'space-between', gap: OP_SPACING.sm },
  domainTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.xs },
  domainIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  domainCopy: { flex: 1, minWidth: 0 },
  domainFocus: { marginTop: 7 },
  domainDetail: { marginTop: 5 },
  domainFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  openLabel: { fontWeight: '700' },
});
