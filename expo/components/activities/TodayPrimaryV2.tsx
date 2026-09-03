import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudRain,
  Flame,
  MapPin,
  Play,
  Plus,
  Target,
  Trophy,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useTasks } from '@/hooks/useTasksStore';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { useTodayYmd } from '@/hooks/useTodayYmd';
import { useHealthContext } from '@/contexts/HealthContext';
import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { OP_DOMAIN, OP_LAYOUT, OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import { formatDistanceKm } from '@/utils/eventDiscovery';
import { findUpcomingCalendarConflict, pickQuietActivityObservation } from '@/utils/quietSynthesis';
import { selectTimelineEveningOpportunity } from '@/utils/timelineEveningOpportunity';
import {
  buildStepHabitProgress,
  buildStepOpportunity,
  extractStepTarget,
} from '@/utils/stepHabitIntelligence';
import {
  ActionButton,
  ContextCue,
  ListRow,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/ui/OnePagerUI';

type TimelineMoment = {
  id: string;
  time: Date | null;
  label: string;
  title: string;
  detail?: string;
  accent: string;
  icon: React.ReactNode;
  route?: string;
  status: 'now' | 'next' | 'later' | 'done';
};

function sameDay(date: Date, ymd: string) {
  if (!Number.isFinite(date.getTime())) return false;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` === ymd;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));
}

function priorityScore(priority?: string) {
  if (priority === 'urgent') return 4;
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function parseMatchStart(dateValue?: string, timeValue?: string) {
  if (!dateValue) return null;
  const base = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const time = timeValue && /^\d{1,2}:\d{2}/.test(timeValue.trim()) ? timeValue.trim().slice(0, 5) : '12:00';
  const parsed = new Date(`${base}T${time}:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function parsePlanStart(dateValue: string, timeValue?: string) {
  const base = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const raw = timeValue?.trim() ?? '';
  const match = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hours = match ? Number(match[1]) : 12;
  const minutes = match ? Number(match[2]) : 0;
  const meridiem = match?.[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const parsed = new Date(`${base}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function phaseForHour(hour: number) {
  if (hour < 12) return { title: 'Set the shape of your day.', label: 'Morning brief' };
  if (hour < 17) return { title: 'Use the next window well.', label: 'Midday check-in' };
  if (hour < 21) return { title: 'Make the evening count.', label: 'Evening' };
  return { title: 'Close the day well.', label: 'Wind down' };
}

export default function TodayPrimaryV2() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const app = useAppSafe();
  const tasks = useTasks();
  const calendar = useCalendar();
  const health = useHealthContext();
  const { stats, entries: todayHabitEntries } = useTodayHabits();
  const todayYmd = useTodayYmd();
  const discover = useSharedDiscoverLifeContext();
  const profile = discover.profile;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const phase = phaseForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const weatherMeta = discover.weather?.temp != null
    ? `${Math.round(discover.weather.temp)}° · ${discover.weather.description ?? discover.weather.condition ?? ''}`.replace(/ · $/, '')
    : null;
  const headerMeta = [dateLabel, weatherMeta, discover.areaLabel].filter(Boolean).join(' · ');

  const todayCalendar = useMemo(() => calendar.getTodayCalendarEvents()
    .map((event) => ({ ...event, start: new Date(event.startDate), end: new Date(event.endDate) }))
    .filter((event) => sameDay(event.start, todayYmd))
    .sort((a, b) => a.start.getTime() - b.start.getTime()), [calendar, todayYmd]);

  const activeCalendar = todayCalendar.find((event) => event.start <= now && event.end > now) ?? null;
  const nextCalendar = todayCalendar.find((event) => event.start > now) ?? null;
  const remainingCalendar = todayCalendar.filter((event) => event.end > now);

  const relevantTasks = useMemo(() => tasks.allTasks
    .filter((task) => !task.isHabit && task.status !== 'completed' && task.status !== 'cancelled')
    .filter((task) => {
      if (task.priority === 'urgent' || task.priority === 'high') return true;
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      return sameDay(due, todayYmd) || due.getTime() < now.getTime();
    })
    .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority)), [tasks.allTasks, todayYmd, now]);

  const bestTask = relevantTasks[0] ?? null;

  const todayStepHabit = useMemo(() => {
    const dueTodayIds = new Set(todayHabitEntries.map((entry) => entry.id));
    return tasks.allTasks.find((task) => task.isHabit && dueTodayIds.has(task.id) && extractStepTarget(task) != null) ?? null;
  }, [tasks.allTasks, todayHabitEntries]);

  const stepProgress = useMemo(
    () => todayStepHabit ? buildStepHabitProgress(todayStepHabit, health.stepsToday) : null,
    [health.stepsToday, todayStepHabit],
  );

  const stepAlreadyLogged = Boolean(todayStepHabit?.habitCompletions?.[todayYmd]);
  const healthSatisfiedRoutine = Boolean(stepProgress?.completed && !stepAlreadyLogged);
  const openRoutineCount = Math.max(0, stats.totalHabits - stats.completedHabits - (healthSatisfiedRoutine ? 1 : 0));

  const matches = useMemo(() => discover.sportSignals
    .filter((match) => match.status === 'Live' || match.status === 'Upcoming')
    .map((match) => ({ ...match, start: parseMatchStart(match.date, match.time) }))
    .filter((match) => match.status === 'Live' || (match.start && sameDay(match.start, todayYmd)))
    .sort((a, b) => {
      if (a.status === 'Live' && b.status !== 'Live') return -1;
      if (b.status === 'Live' && a.status !== 'Live') return 1;
      return (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity);
    }), [discover.sportSignals, todayYmd]);

  const continueWatchingTitle = discover.watchSignal?.title
    ?? app.shows.find((show) => show.status === 'Watching')?.title
    ?? null;

  const todayPlans = useMemo(() => discover.saved.upcomingSaved
    .map((plan) => ({ ...plan, start: parsePlanStart(plan.date, plan.time) }))
    .filter((plan) => plan.start && sameDay(plan.start, todayYmd))
    .sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity)), [discover.saved.upcomingSaved, todayYmd]);

  const hasExistingEveningPlan = todayPlans.some((plan) => plan.start && plan.start > now && plan.start.getHours() >= 16 && plan.start.getHours() < 23);
  const eveningPick = useMemo(() => selectTimelineEveningOpportunity({
    context: discover.lifeContext,
    engine: discover.engine,
    isSaved: discover.saved.isSaved,
    hasExistingEveningPlan,
    now,
  }), [discover.lifeContext, discover.engine, discover.saved.isSaved, hasExistingEveningPlan, now]);
  const eveningOpportunity = eveningPick?.opportunity ?? null;

  const nextCommitmentTime = activeCalendar?.end ?? nextCalendar?.start ?? null;
  const freeMinutes = nextCommitmentTime ? minutesBetween(now, nextCommitmentTime) : null;
  const taskFitsGap = Boolean(bestTask && freeMinutes != null && freeMinutes >= Math.max(15, bestTask.estimatedDuration ?? 30));
  const stepOpportunity = useMemo(() => buildStepOpportunity({
    progress: stepProgress,
    now,
    freeMinutes,
    nextCommitmentTitle: nextCalendar?.title ?? activeCalendar?.title ?? null,
    outdoorConditionsPoor: Boolean(discover.weather?.isRaining || discover.weather?.isStormy || discover.weather?.isSnowing),
  }), [activeCalendar?.title, discover.weather?.isRaining, discover.weather?.isSnowing, discover.weather?.isStormy, freeMinutes, nextCalendar?.title, now, stepProgress]);

  const calendarConflict = useMemo(() => findUpcomingCalendarConflict(
    todayCalendar.map((event) => ({ id: event.id, title: event.title, start: event.start, end: event.end, isAllDay: event.isAllDay })),
    now,
  ), [todayCalendar, now]);

  const quietObservation = useMemo(() => pickQuietActivityObservation({
    crossInsights: discover.intelligence.rankedCrossInsights,
    recommendations: discover.intelligence.topRecommendations,
  }), [discover.intelligence.rankedCrossInsights, discover.intelligence.topRecommendations]);

  const briefingLines = useMemo(() => {
    const lines: string[] = [];
    const importantCount = (nextCalendar ? 1 : 0) + (bestTask ? 1 : 0) + (matches.length ? 1 : 0) + (todayPlans.length ? 1 : 0);
    const hour = now.getHours();

    if (hour < 12) {
      lines.push(importantCount > 0 ? `${importantCount} things deserve attention today.` : 'Your day is unusually open.');
      if (nextCalendar) lines.push(`${nextCalendar.title} is at ${formatClock(nextCalendar.start)}.`);
      else if (bestTask) lines.push(`${bestTask.title} is your strongest work item.`);
      if (openRoutineCount > 0) lines.push(`${openRoutineCount} routine${openRoutineCount === 1 ? '' : 's'} still fit somewhere today.`);
    } else if (hour < 17) {
      if (activeCalendar) lines.push(`${activeCalendar.title} is happening now.`);
      else if (freeMinutes != null && freeMinutes >= 20 && nextCalendar) lines.push(`You have ${durationLabel(freeMinutes)} before ${nextCalendar.title}.`);
      else if (!nextCalendar) lines.push('Your calendar is clear for the rest of the afternoon.');
      if (taskFitsGap && bestTask) lines.push(`${bestTask.estimatedDuration ?? 30} minutes on ${bestTask.title} fits this window.`);
      else if (bestTask) lines.push(`${bestTask.title} is still the most important open task.`);
    } else if (hour < 21) {
      if (!nextCalendar && relevantTasks.length === 0) lines.push('Work is effectively finished for today.');
      else if (relevantTasks.length > 0) lines.push(`${relevantTasks.length} important item${relevantTasks.length === 1 ? '' : 's'} still remain.`);
      if (todayPlans[0]) lines.push(`${todayPlans[0].title} is on your plan tonight.`);
      else if (eveningOpportunity?.startsAt) {
        const distance = typeof eveningOpportunity.event?.distanceKm === 'number' ? formatDistanceKm(eveningOpportunity.event.distanceKm) : null;
        lines.push(`${eveningOpportunity.title} starts at ${formatClock(eveningOpportunity.startsAt)}${distance ? ` · ${distance} away` : ''}.`);
      } else if (matches[0]) lines.push(`${matches[0].homeTeam} vs ${matches[0].awayTeam} matters tonight.`);
      if (continueWatchingTitle && lines.length < 3) lines.push(`${continueWatchingTitle} is there if you want an easy night in.`);
    } else {
      const unfinished = relevantTasks.length + openRoutineCount;
      lines.push(unfinished === 0 ? 'You’re done for today.' : `${unfinished} thing${unfinished === 1 ? '' : 's'} can wait or be closed out.`);
      if (continueWatchingTitle) lines.push(`${continueWatchingTitle} is ready if you’re staying in.`);
    }

    if ((discover.weather?.isRaining || discover.weather?.isStormy || discover.weather?.isSnowing) && lines.length < 3) {
      lines.push(`${discover.weather.description ?? discover.weather.condition ?? 'The weather'} may affect anything outdoors.`);
    }
    return lines.slice(0, 3);
  }, [activeCalendar, bestTask, continueWatchingTitle, discover.weather, eveningOpportunity, freeMinutes, matches, nextCalendar, now, openRoutineCount, relevantTasks.length, taskFitsGap, todayPlans]);

  const moments = useMemo<TimelineMoment[]>(() => {
    const rows: TimelineMoment[] = [];
    for (const event of todayCalendar) {
      if (event.end <= now) continue;
      rows.push({
        id: `cal-${event.id}`,
        time: event.start,
        label: event.start <= now ? 'NOW' : event.isAllDay ? 'All day' : formatClock(event.start),
        title: event.title,
        detail: event.location,
        accent: OP_DOMAIN.calendar,
        icon: <CalendarDays size={18} color={OP_DOMAIN.calendar} />,
        status: event.start <= now ? 'now' : 'later',
      });
    }
    for (const plan of todayPlans) {
      if (!plan.start || plan.start < now) continue;
      rows.push({
        id: `plan-${plan.id}`,
        time: plan.start,
        label: formatClock(plan.start),
        title: plan.title,
        detail: plan.venue,
        accent: OP_DOMAIN.events,
        icon: <MapPin size={18} color={OP_DOMAIN.events} />,
        route: `/(root)/event/${plan.id}`,
        status: 'later',
      });
    }
    for (const match of matches.slice(0, 2)) {
      rows.push({
        id: `match-${match.id}`,
        time: match.start,
        label: match.status === 'Live' ? 'LIVE' : match.start ? formatClock(match.start) : 'Today',
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        detail: match.status === 'Live' && match.homeScore != null && match.awayScore != null ? `${match.homeScore}–${match.awayScore}` : 'A team you follow',
        accent: OP_DOMAIN.sports,
        icon: <Trophy size={18} color={OP_DOMAIN.sports} />,
        route: '/(tabs)/sports',
        status: match.status === 'Live' ? 'now' : 'later',
      });
    }
    if (bestTask) {
      rows.push({
        id: `task-${bestTask.id}`,
        time: activeCalendar?.end ?? now,
        label: activeCalendar ? `After ${formatClock(activeCalendar.end)}` : 'Next useful block',
        title: bestTask.title,
        detail: `${bestTask.estimatedDuration ?? 30} min · ${bestTask.priority ?? 'normal'} priority`,
        accent: OP_DOMAIN.tasks,
        icon: <Target size={18} color={OP_DOMAIN.tasks} />,
        route: '/(tabs)/tasks',
        status: activeCalendar ? 'later' : 'next',
      });
    }
    if (openRoutineCount > 0) {
      const routineTime = new Date(now);
      routineTime.setHours(now.getHours() < 17 ? 18 : Math.max(now.getHours(), 18), 0, 0, 0);
      rows.push({
        id: 'routines',
        time: routineTime,
        label: now.getHours() < 17 ? 'This evening' : 'Before you finish',
        title: `${openRoutineCount} routine${openRoutineCount === 1 ? '' : 's'} left`,
        detail: `${stats.completedHabits + (healthSatisfiedRoutine ? 1 : 0)}/${stats.totalHabits} complete today`,
        accent: OP_DOMAIN.routines,
        icon: <Flame size={18} color={OP_DOMAIN.routines} />,
        route: '/(tabs)/tasks',
        status: 'later',
      });
    }
    if (continueWatchingTitle && now.getHours() >= 18) {
      const watchTime = new Date(now);
      watchTime.setHours(Math.max(21, now.getHours()), 0, 0, 0);
      rows.push({
        id: 'watch',
        time: watchTime,
        label: 'Tonight',
        title: continueWatchingTitle,
        detail: 'Continue when the important stuff is done',
        accent: OP_DOMAIN.watch,
        icon: <Play size={18} color={OP_DOMAIN.watch} />,
        route: '/(tabs)/shows',
        status: now.getHours() >= 21 ? 'next' : 'later',
      });
    }
    return rows.sort((a, b) => {
      const rank = { now: 0, next: 1, later: 2, done: 3 } as const;
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return (a.time?.getTime() ?? Infinity) - (b.time?.getTime() ?? Infinity);
    }).slice(0, 7);
  }, [activeCalendar, bestTask, continueWatchingTitle, healthSatisfiedRoutine, matches, now, openRoutineCount, stats.completedHabits, stats.totalHabits, todayCalendar, todayPlans]);

  const eveningEvent = eveningOpportunity?.event ?? null;
  const fitReason = eveningOpportunity?.reasons.find((reason) => !/open\s*·|is open/i.test(reason)) ?? eveningOpportunity?.reasons[0] ?? null;

  const openWindowText = taskFitsGap && bestTask
    ? `${durationLabel(freeMinutes ?? 0)} before ${nextCalendar?.title ?? 'your next commitment'}. ${bestTask.title} fits in about ${bestTask.estimatedDuration ?? 30} minutes.`
    : stepOpportunity?.text
      ?? `${durationLabel(freeMinutes ?? 0)} before ${nextCalendar?.title ?? 'your next commitment'}. You have room to reset.`;
  const openWindowPress = taskFitsGap && bestTask
    ? () => router.push('/(tabs)/tasks' as never)
    : stepOpportunity
      ? () => router.push('/(tabs)/tasks' as never)
      : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: OP_LAYOUT.screenPadding,
        paddingTop: insets.top + OP_SPACING.md,
        paddingBottom: floatingTabBarScrollPadding(insets.bottom),
        gap: OP_LAYOUT.sectionGap,
      }}
    >
      <PageHeader
        eyebrow="Today"
        meta={headerMeta}
        title={phase.title}
        subtitle={profile?.name ? `${profile.name.split(' ')[0]}, here’s what matters now.` : 'Here’s what matters now.'}
        right={<View style={[styles.headerIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F4F8' }]}>{discover.weather?.isRaining ? <CloudRain size={20} color={colors.primary} /> : <Clock3 size={20} color={colors.primary} />}</View>}
      />

      <SurfaceCard variant="hero" style={styles.briefCard}>
        <View style={styles.briefTop}>
          <StatusPill label={phase.label} tone="info" />
          <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>{formatClock(now)}</Text>
        </View>
        <View style={styles.briefLines}>
          {briefingLines.map((line, index) => (
            <View key={`${line}-${index}`} style={styles.briefLine}>
              <View style={[styles.bullet, { backgroundColor: index === 0 ? colors.primary : colors.textSecondary }]} />
              <Text style={[OP_TYPE.body, styles.briefText, { color: colors.text }]}>{line}</Text>
            </View>
          ))}
        </View>
        <View style={styles.glanceRow}>
          <View style={styles.glanceItem}><Text style={[styles.glanceValue, { color: colors.text }]}>{remainingCalendar.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>calendar</Text></View>
          <View style={[styles.glanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.glanceItem}><Text style={[styles.glanceValue, { color: colors.text }]}>{relevantTasks.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>important</Text></View>
          <View style={[styles.glanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.glanceItem}><Text style={[styles.glanceValue, { color: colors.text }]}>{openRoutineCount}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>routines</Text></View>
          <View style={[styles.glanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.glanceItem}><Text style={[styles.glanceValue, { color: colors.text }]}>{todayPlans.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>plans</Text></View>
        </View>
      </SurfaceCard>

      {calendarConflict ? (
        <ContextCue label="Schedule conflict" text={calendarConflict.message} tone="warning" />
      ) : quietObservation ? (
        <ContextCue label="Worth knowing" text={quietObservation} tone="info" />
      ) : null}

      {freeMinutes != null && freeMinutes >= 20 && nextCalendar ? (
        <ContextCue
          label={stepOpportunity && !taskFitsGap ? 'Fits your open window' : 'Open window'}
          text={openWindowText}
          tone="positive"
          onPress={openWindowPress}
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Your rhythm" subtitle="A short sequence of what matters next." />
        {moments.length === 0 ? (
          <SurfaceCard>
            <View style={styles.emptyRow}>
              <CheckCircle2 size={22} color={colors.success} />
              <View style={styles.emptyCopy}>
                <Text style={[OP_TYPE.cardTitle, { color: colors.text }]}>Nothing is competing for your attention.</Text>
                <Text style={[OP_TYPE.meta, styles.emptyMeta, { color: colors.textSecondary }]}>That is useful information too. Your day has space.</Text>
              </View>
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard variant="list">
            {moments.map((moment, index) => (
              <ListRow
                key={moment.id}
                icon={moment.icon}
                eyebrow={moment.label}
                title={moment.title}
                detail={moment.detail}
                accent={moment.accent}
                onPress={moment.route ? () => router.push(moment.route as never) : undefined}
                divided={index > 0}
              />
            ))}
          </SurfaceCard>
        )}
      </View>

      {eveningOpportunity && eveningEvent && eveningPick ? (
        <View style={styles.section}>
          <SectionHeader title="A good use of tonight" subtitle="Only shown when the evening is genuinely open and the fit is unusually strong." />
          <SurfaceCard style={styles.eveningCard}>
            <View style={styles.eveningTop}>
              <View style={[styles.eveningIcon, { backgroundColor: isDark ? `${OP_DOMAIN.events}24` : `${OP_DOMAIN.events}11` }]}><MapPin size={20} color={OP_DOMAIN.events} /></View>
              <StatusPill label="Fits your evening" tone="positive" />
            </View>
            <Text style={[OP_TYPE.heroTitle, styles.eveningTitle, { color: colors.text }]}>{eveningOpportunity.title}</Text>
            <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>{eveningOpportunity.subtitle}</Text>
            {fitReason ? <ContextCue label="Why it fits" text={fitReason} /> : null}
            <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>
              {formatClock(eveningPick.openStart)}–{formatClock(eveningPick.openEnd)}
              {typeof eveningEvent.distanceKm === 'number' ? ` · ${formatDistanceKm(eveningEvent.distanceKm)} away` : ''}
            </Text>
            <View style={styles.actions}>
              <View style={styles.actionGrow}>
                <ActionButton
                  label="Add to my life"
                  onPress={() => {
                    discover.feedback.markPositive(eveningOpportunity.key, eveningOpportunity.kind);
                    void discover.saved.toggleSaved(eveningEvent);
                  }}
                  icon={<Plus size={16} color={colors.textInverse} />}
                />
              </View>
              <ActionButton label="Details" kind="secondary" onPress={() => router.push(eveningOpportunity.route as never)} />
              <ActionButton label="Not tonight" kind="tertiary" onPress={() => discover.feedback.dismiss(eveningOpportunity.key, eveningOpportunity.kind, 'bad_timing')} />
            </View>
          </SurfaceCard>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerIcon: { width: 40, height: 40, borderRadius: OP_RADIUS.medium, alignItems: 'center', justifyContent: 'center' },
  briefCard: { gap: OP_SPACING.md },
  briefTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.sm },
  briefLines: { gap: OP_SPACING.xs },
  briefLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  briefText: { flex: 1 },
  glanceRow: { flexDirection: 'row', alignItems: 'center', paddingTop: OP_SPACING.xs },
  glanceItem: { flex: 1 },
  glanceValue: { ...OP_TYPE.cardTitle, fontSize: 19, lineHeight: 23 },
  glanceDivider: { width: StyleSheet.hairlineWidth, height: 28, marginHorizontal: OP_SPACING.xs },
  section: { gap: OP_SPACING.sm },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: OP_SPACING.sm },
  emptyCopy: { flex: 1 },
  emptyMeta: { marginTop: 3 },
  eveningCard: { gap: OP_SPACING.sm },
  eveningTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.sm },
  eveningIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  eveningTitle: { marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: OP_SPACING.xs },
  actionGrow: { flexGrow: 1, minWidth: 150 },
});
