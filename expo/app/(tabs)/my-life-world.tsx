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

import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasksStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import { usePinnedMatches } from '@/hooks/usePinnedMatches';
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

function ageDays(value: string | undefined | null, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
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

type WorldCardProps = {
  title: string;
  status: string;
  focus: string;
  detail: string;
  route: string;
  accent: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  textColor: string;
  secondaryColor: string;
  wide?: boolean;
};

function WorldCard({
  title,
  status,
  focus,
  detail,
  route,
  accent,
  icon: Icon,
  textColor,
  secondaryColor,
  wide,
}: WorldCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(route as never)}
      style={[styles.worldCard, wide && styles.worldCardWide, { backgroundColor: `${accent}10`, borderColor: `${accent}2B` }]}
    >
      <View style={styles.worldTop}>
        <View style={[styles.worldIcon, { backgroundColor: `${accent}1F` }]}>
          <Icon size={20} color={accent} />
        </View>
        <View style={[styles.stateBadge, { backgroundColor: `${accent}18` }]}>
          <Text style={[styles.stateBadgeText, { color: accent }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.worldCopy}>
        <Text style={[styles.worldTitle, { color: accent }]}>{title}</Text>
        <Text style={[styles.worldFocus, { color: textColor }]} numberOfLines={wide ? 2 : 3}>{focus}</Text>
        <Text style={[styles.worldDetail, { color: secondaryColor }]} numberOfLines={2}>{detail}</Text>
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
  const cooking = useCookingStorage();
  const pinnedMatches = usePinnedMatches();
  const app = useAppSafe();
  const discover = useSharedDiscoverLifeContext();
  const profile = discover.profile;

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
  const inProgressTasks = useMemo(() => openTasks.filter((task) => task.status === 'in-progress'), [openTasks]);
  const overdueTasks = useMemo(
    () => openTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < now.getTime()),
    [openTasks, now],
  );
  const staleTasks = useMemo(
    () => openTasks.filter((task) => ageDays(task.updatedAt, now) >= 14),
    [openTasks, now],
  );
  const activeProjects = useMemo(() => taskStore.projects.filter((project) => !project.isArchived), [taskStore.projects]);
  const nextWeekCalendar = useMemo(() => calendar.getUpcomingCalendarEvents(7), [calendar]);
  const upcomingSaved = discover.saved.upcomingSaved;
  const thisWeekSaved = useMemo(
    () => upcomingSaved.filter((event) => {
      const start = parseEventStartDateTime(event);
      return start ? withinDays(start, now, 7) : false;
    }),
    [upcomingSaved, now],
  );

  const watching = useMemo(() => app.shows.filter((show) => show.status === 'Watching'), [app.shows]);
  const plannedShows = useMemo(() => app.shows.filter((show) => show.status === 'Plan to Watch' || show.status === 'On Hold'), [app.shows]);
  const staleWatching = useMemo(() => watching.filter((show) => ageDays(show.updatedAt, now) >= 21), [watching, now]);
  const currentWatch = discover.watchSignal?.title ?? watching[0]?.title ?? null;

  const maxStreak = routines.reduce((max, routine) => Math.max(max, routine.habitStreak ?? 0), 0);
  const routineCompletionsThisWeek = routines.reduce((sum, routine) => sum + weekRoutineCount(routine.habitCompletions, now), 0);
  const quietRoutines = routines.filter((routine) => weekRoutineCount(routine.habitCompletions, now) === 0 && ageDays(routine.createdAt, now) >= 7);

  const favoriteTeams = (profile?.favoriteTeams?.length ?? 0) + (profile?.favoriteNBATeams?.length ?? 0);
  const nextSport = discover.sportSignals.find((signal) => signal.status === 'Live')
    ?? discover.sportSignals.find((signal) => signal.favoriteTeamName && signal.status === 'Upcoming')
    ?? discover.sportSignals.find((signal) => signal.status === 'Upcoming')
    ?? null;

  const goals = profile?.identityGoals ?? [];
  const nextSaved = upcomingSaved[0] ?? null;
  const nextSavedStart = nextSaved ? parseEventStartDateTime(nextSaved) : null;
  const learningInProgress = app.activities.find((activity) => activity.category === 'Learning' && activity.status === 'In Progress') ?? null;
  const savedBooks = profile?.favoriteBooks?.length ?? 0;
  const savedRecipeCount = cooking.bookmarks.length;
  const totalCooked = Object.values(cooking.cookCounts).reduce((sum, count) => sum + count, 0);
  const pinnedCount = pinnedMatches.records.length;

  const taskStatus = overdueTasks.length > 0
    ? 'NEEDS ATTENTION'
    : inProgressTasks.length > 0
      ? 'IN MOTION'
      : openTasks.length > 0
        ? 'ACTIVE'
        : 'CLEAR';
  const taskFocus = overdueTasks.length > 0
    ? `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} need a decision`
    : inProgressTasks[0]
      ? inProgressTasks[0].title
      : openTasks[0]?.title ?? 'Nothing open right now';
  const taskDetail = `${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'} · ${openTasks.length} open${staleTasks.length ? ` · ${staleTasks.length} stale` : ''}`;

  const routineStatus = quietRoutines.length > 0
    ? 'LOSING MOMENTUM'
    : maxStreak >= 7
      ? 'STRONG'
      : routineCompletionsThisWeek > 0
        ? 'IN MOTION'
        : routines.length > 0
          ? 'QUIET'
          : 'EMPTY';
  const routineFocus = quietRoutines.length > 0
    ? `${quietRoutines.length} routine${quietRoutines.length === 1 ? '' : 's'} have gone quiet`
    : maxStreak > 0
      ? `${maxStreak}-day streak is your strongest current run`
      : routines.length > 0
        ? 'Build some momentum this week'
        : 'No routines tracked yet';
  const routineDetail = `${routineCompletionsThisWeek} completion${routineCompletionsThisWeek === 1 ? '' : 's'} this week · ${routines.length} active`;

  const calendarStatus = nextWeekCalendar.length >= 8 ? 'BUSY' : nextWeekCalendar.length > 0 ? 'PLANNED' : 'OPEN';
  const nextCalendar = nextWeekCalendar[0] ?? null;
  const calendarFocus = nextCalendar
    ? `${nextCalendar.title}`
    : 'The next seven days are unusually open';
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
    : savedRecipeCount > 0
      ? `${savedRecipeCount} recipe${savedRecipeCount === 1 ? '' : 's'} waiting to be cooked`
      : 'No recipes saved yet';
  const cookingDetail = `${savedRecipeCount} saved · ${totalCooked} cook${totalCooked === 1 ? '' : 's'} logged`;

  const learningStatus = learningInProgress ? 'IN PROGRESS' : savedBooks > 0 ? 'SAVED' : goals.length > 0 ? 'DIRECTED' : 'OPEN';
  const learningFocus = learningInProgress?.title ?? profile?.favoriteBooks?.[0] ?? goals[0] ?? 'Nothing active right now';
  const learningDetail = `${savedBooks} book${savedBooks === 1 ? '' : 's'} · ${goals.length} long-term goal${goals.length === 1 ? '' : 's'}`;

  const attentionSignals = [
    overdueTasks.length > 0 ? { id: 'tasks', label: 'Tasks', text: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} need a decision`, route: '/(tabs)/tasks', accent: '#3B63F3' } : null,
    quietRoutines.length > 0 ? { id: 'routines', label: 'Routines', text: `${quietRoutines.length} routine${quietRoutines.length === 1 ? '' : 's'} have no wins this week`, route: '/(tabs)/tasks', accent: '#13A66A' } : null,
    staleWatching.length > 0 ? { id: 'watch', label: 'Watch', text: `${staleWatching[0].title} has not moved in ${ageDays(staleWatching[0].updatedAt, now)} days`, route: '/(tabs)/shows', accent: '#8A5CF6' } : null,
    staleTasks.length > overdueTasks.length ? { id: 'stale-tasks', label: 'Projects', text: `${staleTasks.length} open task${staleTasks.length === 1 ? '' : 's'} have been untouched for 2+ weeks`, route: '/(tabs)/tasks', accent: '#3B63F3' } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 3);

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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: floatingTabBarScrollPadding(insets.bottom) }]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MY LIFE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Your world, not another to-do list.</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>See what is moving, what is waiting, what is coming up and what has quietly gone stale.</Text>
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
          {activeAreaCount} parts of your life are active right now.
        </Text>
        <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
          {attentionSignals.length > 0
            ? `${attentionSignals.length} area${attentionSignals.length === 1 ? '' : 's'} could use attention. The rest can keep moving in the background.`
            : 'Nothing looks neglected. You can scan the state of your life without turning everything into an obligation.'}
        </Text>
        <View style={styles.heroStats}>
          <View><Text style={[styles.heroStatValue, { color: colors.text }]}>{activeProjects.length}</Text><Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>projects</Text></View>
          <View style={[styles.heroDivider, { backgroundColor: border }]} />
          <View><Text style={[styles.heroStatValue, { color: colors.text }]}>{routineCompletionsThisWeek}</Text><Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>routine wins</Text></View>
          <View style={[styles.heroDivider, { backgroundColor: border }]} />
          <View><Text style={[styles.heroStatValue, { color: colors.text }]}>{thisWeekSaved.length + nextWeekCalendar.length}</Text><Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>coming up</Text></View>
        </View>
      </LinearGradient>

      {attentionSignals.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Needs a look</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Not urgent Today items — just parts of your life that are drifting.</Text></View>
          </View>
          <View style={[styles.attentionList, { backgroundColor: surface, borderColor: border }]}>
            {attentionSignals.map((signal, index) => (
              <TouchableOpacity
                key={signal.id}
                onPress={() => router.push(signal.route as never)}
                style={[styles.attentionRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}
              >
                <View style={[styles.attentionDot, { backgroundColor: signal.accent }]} />
                <View style={styles.attentionCopy}>
                  <Text style={[styles.attentionLabel, { color: signal.accent }]}>{signal.label.toUpperCase()}</Text>
                  <Text style={[styles.attentionText, { color: colors.text }]}>{signal.text}</Text>
                </View>
                <ChevronRight size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>This week</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>How much life is already spoken for across the next seven days.</Text></View>
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
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Your world</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Each area shows what is actually happening, not just where to tap.</Text></View>
        </View>
        <View style={styles.worldGrid}>
          <WorldCard title="Tasks & projects" status={taskStatus} focus={taskFocus} detail={taskDetail} route="/(tabs)/tasks" accent="#3B63F3" icon={ListChecks} textColor={colors.text} secondaryColor={colors.textSecondary} wide />
          <WorldCard title="Routines" status={routineStatus} focus={routineFocus} detail={routineDetail} route="/(tabs)/tasks" accent="#13A66A" icon={Flame} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <WorldCard title="Calendar" status={calendarStatus} focus={calendarFocus} detail={calendarDetail} route="/(tabs)/activities" accent="#6E56CF" icon={CalendarDays} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <WorldCard title="Watch" status={watchStatus} focus={watchFocus} detail={watchDetail} route="/(tabs)/shows" accent="#8A5CF6" icon={Clapperboard} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <WorldCard title="Sports" status={sportStatus} focus={sportFocus} detail={sportDetail} route="/(tabs)/sports" accent="#D88900" icon={Trophy} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <WorldCard title="Events" status={eventStatus} focus={eventFocus} detail={eventDetail} route="/(tabs)/events" accent="#E05273" icon={MapPin} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <WorldCard title="Cooking" status={cookingStatus} focus={cookingFocus} detail={cookingDetail} route="/(tabs)/cooking" accent="#E56B3E" icon={ChefHat} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <WorldCard title="Learning" status={learningStatus} focus={learningFocus} detail={learningDetail} route="/(tabs)/learning" accent="#2586C8" icon={BookOpen} textColor={colors.text} secondaryColor={colors.textSecondary} />
        </View>
      </View>

      {nextSaved ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Next plan</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Something you chose in Discover is now part of your life.</Text></View>
          </View>
          <TouchableOpacity activeOpacity={0.88} onPress={() => router.push(`/(root)/event/${nextSaved.id}` as never)} style={[styles.planCard, { backgroundColor: isDark ? '#1B2232' : '#EEF3FF', borderColor: isDark ? '#293552' : '#DCE6FF' }]}>
            <View style={[styles.planIcon, { backgroundColor: isDark ? '#263452' : '#DCE7FF' }]}><MapPin size={20} color={colors.primary} /></View>
            <View style={styles.planCopy}><Text style={[styles.planKicker, { color: colors.primary }]}>SAVED PLAN · {eventWhen(nextSavedStart, now).toUpperCase()}</Text><Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={2}>{nextSaved.title}</Text><Text style={[styles.planMeta, { color: colors.textSecondary }]}>{[nextSaved.time, nextSaved.venue].filter(Boolean).join(' · ')}</Text></View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Goals</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Direction, not another checklist.</Text></View>
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
        <View style={styles.manageCopy}><Text style={[styles.manageTitle, { color: colors.text }]}>Manage tasks, projects & routines</Text><Text style={[styles.manageMeta, { color: colors.textSecondary }]}>The deeper workspace lives here when you actually need to organise things.</Text></View>
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
  sectionSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '500', maxWidth: 340 },
  attentionList: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  attentionRow: { minHeight: 70, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  attentionDot: { width: 9, height: 9, borderRadius: 5 },
  attentionCopy: { flex: 1, minWidth: 0 },
  attentionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  attentionText: { marginTop: 3, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  weekStrip: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, padding: 8, gap: 5 },
  dayCell: { flex: 1, minHeight: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayName: { fontSize: 10, fontWeight: '800' },
  dayDate: { fontSize: 16, fontWeight: '900' },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  worldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  worldCard: { width: '48.2%', minHeight: 210, borderRadius: 22, borderWidth: 1, padding: 15, justifyContent: 'space-between', gap: 10 },
  worldCardWide: { width: '100%', minHeight: 170 },
  worldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  worldIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stateBadge: { maxWidth: '62%', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  stateBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  worldCopy: { flex: 1, minWidth: 0 },
  worldTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  worldFocus: { marginTop: 8, fontSize: 19, lineHeight: 23, fontWeight: '900', letterSpacing: -0.3 },
  worldDetail: { marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: '600' },
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