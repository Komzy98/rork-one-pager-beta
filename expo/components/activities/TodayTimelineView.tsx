import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  Flame,
  MapPin,
  Play,
  Target,
  Trophy,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { useTheme } from '@/hooks/useTheme';
import { formatDistanceKm } from '@/utils/eventDiscovery';
import { selectTimelineEveningOpportunity } from '@/utils/timelineEveningOpportunity';

export type TodayTimelineCalendarItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  isAllDay?: boolean;
};

export type TodayTimelineTaskItem = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
  estimatedDuration?: number;
  isHabit?: boolean;
};

export type TodayTimelineMatchItem = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  status: 'Live' | 'Upcoming' | 'Completed';
  homeScore?: number | null;
  awayScore?: number | null;
};

export type TodayTimelineSavedPlan = {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue?: string;
};

type WeatherLike = {
  condition?: string;
  description?: string;
  temp?: number;
  isRaining?: boolean;
  isStormy?: boolean;
  isSnowing?: boolean;
};

type TimelineMoment = {
  id: string;
  time: Date | null;
  label: string;
  title: string;
  detail?: string;
  kind: 'calendar' | 'task' | 'routine' | 'sport' | 'event' | 'watch' | 'weather';
  status: 'done' | 'now' | 'next' | 'later';
  route?: string;
};

interface TodayTimelineViewProps {
  firstName?: string | null;
  todayYmd: string;
  calendarEvents: TodayTimelineCalendarItem[];
  tasks: TodayTimelineTaskItem[];
  completedHabits: number;
  totalHabits: number;
  matches: TodayTimelineMatchItem[];
  continueWatchingTitle?: string | null;
  savedPlans: TodayTimelineSavedPlan[];
  weather?: WeatherLike | null;
}

function sameDay(date: Date, ymd: string) {
  if (!Number.isFinite(date.getTime())) return false;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` === ymd;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function parseMatchStart(match: TodayTimelineMatchItem): Date | null {
  const dateOnly = match.date.includes('T') ? match.date.split('T')[0] : match.date;
  const rawTime = match.time?.trim();
  const time = rawTime && /^\d{1,2}:\d{2}/.test(rawTime) ? rawTime.slice(0, 5) : '12:00';
  const parsed = new Date(`${dateOnly}T${time}:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function parsePlanStart(plan: TodayTimelineSavedPlan): Date | null {
  const base = plan.date.includes('T') ? plan.date.split('T')[0] : plan.date;
  const raw = plan.time?.trim() ?? '';
  const match = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hours = match ? Number(match[1]) : 12;
  const minutes = match ? Number(match[2]) : 0;
  const meridiem = match?.[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const parsed = new Date(`${base}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function priorityScore(priority?: string) {
  if (priority === 'urgent') return 4;
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function phaseForHour(hour: number) {
  if (hour < 12) return { kicker: 'MORNING BRIEF', title: 'Set the shape of your day.' };
  if (hour < 17) return { kicker: 'MIDDAY CHECK-IN', title: 'Use the next window well.' };
  if (hour < 21) return { kicker: 'EVENING', title: 'Work is winding down.' };
  return { kicker: 'WIND DOWN', title: 'You’re nearly done for today.' };
}

function momentIcon(kind: TimelineMoment['kind'], color: string) {
  switch (kind) {
    case 'calendar': return <CalendarDays size={18} color={color} />;
    case 'task': return <Target size={18} color={color} />;
    case 'routine': return <Flame size={18} color={color} />;
    case 'sport': return <Trophy size={18} color={color} />;
    case 'event': return <MapPin size={18} color={color} />;
    case 'watch': return <Play size={18} color={color} />;
    case 'weather': return <CloudRain size={18} color={color} />;
    default: return <Clock3 size={18} color={color} />;
  }
}

export default function TodayTimelineView({
  firstName,
  todayYmd,
  calendarEvents,
  tasks,
  completedHabits,
  totalHabits,
  matches,
  continueWatchingTitle,
  savedPlans,
  weather,
}: TodayTimelineViewProps) {
  const { colors, isDark } = useTheme();
  const discover = useSharedDiscoverLifeContext();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const phase = phaseForHour(hour);
  const surface = colors.card;
  const border = colors.border;
  const soft = isDark ? '#1A1D24' : '#F4F6F9';

  const todayCalendar = useMemo(
    () => calendarEvents
      .map((event) => ({ ...event, start: new Date(event.startDate), end: new Date(event.endDate) }))
      .filter((event) => sameDay(event.start, todayYmd))
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [calendarEvents, todayYmd],
  );

  const activeCalendar = todayCalendar.find((event) => event.start <= now && event.end > now) ?? null;
  const nextCalendar = todayCalendar.find((event) => event.start > now) ?? null;

  const relevantTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.isHabit && task.status !== 'completed' && task.status !== 'cancelled')
      .filter((task) => {
        if (task.priority === 'urgent' || task.priority === 'high') return true;
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return sameDay(due, todayYmd) || due.getTime() < now.getTime();
      })
      .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
  }, [tasks, todayYmd, now]);

  const bestTask = relevantTasks[0] ?? null;
  const openRoutineCount = Math.max(0, totalHabits - completedHabits);

  const todayMatches = useMemo(
    () => matches
      .map((match) => ({ ...match, start: parseMatchStart(match) }))
      .filter((match) => match.status === 'Live' || (match.start && sameDay(match.start, todayYmd)))
      .sort((a, b) => {
        if (a.status === 'Live' && b.status !== 'Live') return -1;
        if (b.status === 'Live' && a.status !== 'Live') return 1;
        return (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity);
      }),
    [matches, todayYmd],
  );

  const todayPlans = useMemo(
    () => savedPlans
      .map((plan) => ({ ...plan, start: parsePlanStart(plan) }))
      .filter((plan) => plan.start && sameDay(plan.start, todayYmd))
      .sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity)),
    [savedPlans, todayYmd],
  );

  const hasExistingEveningPlan = todayPlans.some((plan) => {
    if (!plan.start || plan.start <= now) return false;
    const planHour = plan.start.getHours();
    return planHour >= 16 && planHour < 23;
  });

  const eveningOpportunityPick = useMemo(
    () => selectTimelineEveningOpportunity({
      context: discover.lifeContext,
      engine: discover.engine,
      isSaved: discover.saved.isSaved,
      hasExistingEveningPlan,
      now,
    }),
    [discover.lifeContext, discover.engine, discover.saved.isSaved, hasExistingEveningPlan, now],
  );

  const eveningOpportunity = eveningOpportunityPick?.opportunity ?? null;
  const eveningDistance = typeof eveningOpportunity?.event?.distanceKm === 'number'
    ? formatDistanceKm(eveningOpportunity.event.distanceKm)
    : null;

  const nextCommitmentTime = activeCalendar?.end ?? nextCalendar?.start ?? null;
  const freeMinutes = nextCommitmentTime ? minutesBetween(now, nextCommitmentTime) : null;
  const taskFitsGap = Boolean(
    bestTask && freeMinutes != null && freeMinutes >= Math.max(15, bestTask.estimatedDuration ?? 30),
  );

  const briefingLines = useMemo(() => {
    const lines: string[] = [];
    const importantCount = (nextCalendar ? 1 : 0) + (bestTask ? 1 : 0) + (todayMatches.length ? 1 : 0) + (todayPlans.length ? 1 : 0);

    if (hour < 12) {
      lines.push(importantCount > 0 ? `${importantCount} things deserve attention today.` : 'Your day is unusually open.');
      if (nextCalendar) lines.push(`${nextCalendar.title} is at ${formatClock(nextCalendar.start)}.`);
      else if (bestTask) lines.push(`${bestTask.title} is your strongest work item.`);
      if (openRoutineCount > 0) lines.push(`${openRoutineCount} routine${openRoutineCount === 1 ? '' : 's'} still fit somewhere today.`);
    } else if (hour < 17) {
      if (activeCalendar) {
        lines.push(`${activeCalendar.title} is happening now.`);
      } else if (freeMinutes != null && freeMinutes >= 20 && nextCalendar) {
        lines.push(`You have ${durationLabel(freeMinutes)} before ${nextCalendar.title}.`);
      } else if (!nextCalendar) {
        lines.push('Your calendar is clear for the rest of the afternoon.');
      }
      if (taskFitsGap && bestTask) {
        lines.push(`${bestTask.estimatedDuration ?? 30} minutes on ${bestTask.title} would fit before your next commitment.`);
      } else if (bestTask) {
        lines.push(`${bestTask.title} is still the most important open task.`);
      }
    } else if (hour < 21) {
      if (!nextCalendar && relevantTasks.length === 0) lines.push('Work is effectively finished for today.');
      else if (relevantTasks.length > 0) lines.push(`${relevantTasks.length} important item${relevantTasks.length === 1 ? '' : 's'} still remain.`);

      if (todayPlans[0]) {
        lines.push(`${todayPlans[0].title} is on your plan tonight.`);
      } else if (eveningOpportunity?.startsAt) {
        lines.push(`${eveningOpportunity.title} starts at ${formatClock(eveningOpportunity.startsAt)}${eveningDistance ? ` · ${eveningDistance} away` : ''}.`);
      } else if (todayMatches[0]) {
        lines.push(`${todayMatches[0].homeTeam} vs ${todayMatches[0].awayTeam} matters tonight.`);
      }

      if (continueWatchingTitle && lines.length < 3) {
        lines.push(`${continueWatchingTitle} is there if you want an easy night in.`);
      }
    } else {
      const unfinished = relevantTasks.length + openRoutineCount;
      lines.push(unfinished === 0 ? 'You’re done for today.' : `${unfinished} thing${unfinished === 1 ? '' : 's'} can wait or be closed out.`);
      if (continueWatchingTitle) lines.push(`${continueWatchingTitle} is ready if you’re staying in.`);
      if (nextCalendar) lines.push(`Your next calendar commitment is ${nextCalendar.title}.`);
    }

    if ((weather?.isRaining || weather?.isStormy || weather?.isSnowing) && lines.length < 3) {
      lines.push(`${weather.description ?? weather.condition ?? 'The weather'} may affect anything outdoors.`);
    }

    return lines.slice(0, 3);
  }, [
    activeCalendar,
    bestTask,
    continueWatchingTitle,
    eveningDistance,
    eveningOpportunity,
    freeMinutes,
    hour,
    nextCalendar,
    openRoutineCount,
    relevantTasks.length,
    taskFitsGap,
    todayMatches,
    todayPlans,
    weather,
  ]);

  const moments = useMemo<TimelineMoment[]>(() => {
    const rows: TimelineMoment[] = [];

    for (const event of todayCalendar) {
      const status: TimelineMoment['status'] = event.end <= now ? 'done' : event.start <= now ? 'now' : 'later';
      rows.push({
        id: `cal-${event.id}`,
        time: event.start,
        label: event.isAllDay ? 'All day' : formatClock(event.start),
        title: event.title,
        detail: event.location,
        kind: 'calendar',
        status,
      });
    }

    for (const plan of todayPlans) {
      rows.push({
        id: `plan-${plan.id}`,
        time: plan.start,
        label: plan.start ? formatClock(plan.start) : 'Today',
        title: plan.title,
        detail: plan.venue,
        kind: 'event',
        status: plan.start && plan.start < now ? 'done' : 'later',
        route: `/(root)/event/${plan.id}`,
      });
    }

    if (eveningOpportunity?.startsAt) {
      const reason = eveningOpportunity.reasons.find((value) => !/open\s*·|is open/i.test(value));
      rows.push({
        id: `discover-${eveningOpportunity.id}`,
        time: eveningOpportunity.startsAt,
        label: formatClock(eveningOpportunity.startsAt),
        title: eveningOpportunity.title,
        detail: [eveningDistance, reason].filter(Boolean).join(' · ') || 'A strong fit for your open evening',
        kind: 'event',
        status: 'later',
        route: eveningOpportunity.route,
      });
    }

    for (const match of todayMatches.slice(0, 3)) {
      rows.push({
        id: `match-${match.id}`,
        time: match.start,
        label: match.status === 'Live' ? 'LIVE' : match.start ? formatClock(match.start) : 'Today',
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        detail: match.status === 'Live' && match.homeScore != null && match.awayScore != null
          ? `${match.homeScore}–${match.awayScore}`
          : 'A team you follow',
        kind: 'sport',
        status: match.status === 'Live' ? 'now' : 'later',
        route: '/(tabs)/sports',
      });
    }

    if (bestTask) {
      const suggested = activeCalendar?.end ?? now;
      rows.push({
        id: `task-${bestTask.id}`,
        time: suggested,
        label: activeCalendar ? `After ${formatClock(activeCalendar.end)}` : 'Next useful block',
        title: bestTask.title,
        detail: `${bestTask.estimatedDuration ?? 30} min · ${bestTask.priority ?? 'normal'} priority`,
        kind: 'task',
        status: activeCalendar ? 'later' : 'next',
        route: '/(tabs)/tasks',
      });
    }

    if (openRoutineCount > 0) {
      const routineTime = new Date(now);
      routineTime.setHours(hour < 17 ? 18 : Math.max(hour, 18), 0, 0, 0);
      rows.push({
        id: 'routines',
        time: routineTime,
        label: hour < 17 ? 'This evening' : 'Before you finish',
        title: `${openRoutineCount} routine${openRoutineCount === 1 ? '' : 's'} left`,
        detail: `${completedHabits}/${totalHabits} complete today`,
        kind: 'routine',
        status: 'later',
        route: '/(tabs)/tasks',
      });
    }

    if (continueWatchingTitle && hour >= 18) {
      const watchTime = new Date(now);
      watchTime.setHours(Math.max(21, hour), 0, 0, 0);
      rows.push({
        id: 'continue-watching',
        time: watchTime,
        label: 'Tonight',
        title: continueWatchingTitle,
        detail: 'Continue watching when the important stuff is done',
        kind: 'watch',
        status: hour >= 21 ? 'next' : 'later',
        route: '/(tabs)/shows',
      });
    }

    return rows
      .sort((a, b) => {
        const rank = { now: 0, next: 1, later: 2, done: 3 } as const;
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return (a.time?.getTime() ?? Infinity) - (b.time?.getTime() ?? Infinity);
      })
      .slice(0, 8);
  }, [activeCalendar, bestTask, completedHabits, continueWatchingTitle, eveningDistance, eveningOpportunity, hour, now, openRoutineCount, todayCalendar, todayMatches, todayPlans, totalHabits]);

  const nextMoment = moments.find((moment) => moment.status === 'now' || moment.status === 'next' || moment.status === 'later') ?? null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#172038', '#11151E'] : ['#EDF3FF', '#F8FAFF']}
        style={[styles.briefCard, { borderColor: border }]}
      >
        <View style={styles.briefTop}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>{phase.kicker}</Text>
            <Text style={[styles.briefTime, { color: colors.textSecondary }]}>{formatClock(now)}</Text>
          </View>
          <View style={[styles.clockBadge, { backgroundColor: isDark ? '#26314A' : '#DDE8FF' }]}>
            <Clock3 size={20} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.briefTitle, { color: colors.text }]}>{phase.title}</Text>
        <Text style={[styles.briefHello, { color: colors.textSecondary }]}>
          {firstName ? `${firstName}, here’s what matters now.` : 'Here’s what matters now.'}
        </Text>

        <View style={styles.briefLines}>
          {briefingLines.map((line, index) => (
            <View key={`${line}-${index}`} style={styles.briefLine}>
              <View style={[styles.bullet, { backgroundColor: index === 0 ? colors.primary : colors.textSecondary }]} />
              <Text style={[styles.briefLineText, { color: colors.text }]}>{line}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {freeMinutes != null && freeMinutes >= 20 && nextCalendar ? (
        <View style={[styles.windowCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.windowHeader}>
            <View style={[styles.windowIcon, { backgroundColor: soft }]}><Clock3 size={18} color={colors.primary} /></View>
            <View style={styles.windowCopy}>
              <Text style={[styles.windowKicker, { color: colors.primary }]}>OPEN WINDOW</Text>
              <Text style={[styles.windowTitle, { color: colors.text }]}>{durationLabel(freeMinutes)} before {nextCalendar.title}</Text>
            </View>
          </View>
          {taskFitsGap && bestTask ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks' as never)} style={[styles.fitRow, { backgroundColor: soft }]}>
              <Target size={17} color={colors.primary} />
              <View style={styles.fitCopy}>
                <Text style={[styles.fitTitle, { color: colors.text }]} numberOfLines={1}>{bestTask.title}</Text>
                <Text style={[styles.fitMeta, { color: colors.textSecondary }]}>Fits this gap · about {bestTask.estimatedDuration ?? 30} min</Text>
              </View>
              <ChevronRight size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.windowBody, { color: colors.textSecondary }]}>You have room to reset before the next commitment.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your rhythm</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>A short sequence, not another dashboard.</Text>
        </View>
        {nextMoment ? <Text style={[styles.nextLabel, { color: colors.primary }]}>NEXT</Text> : null}
      </View>

      {moments.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }]}>
          <CheckCircle2 size={24} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing is competing for your attention.</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>That is useful information too. Your day has space.</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {moments.map((moment, index) => {
            const emphasized = moment.status === 'now' || moment.status === 'next';
            const muted = moment.status === 'done';
            return (
              <TouchableOpacity
                key={moment.id}
                activeOpacity={moment.route ? 0.82 : 1}
                disabled={!moment.route}
                onPress={() => moment.route && router.push(moment.route as never)}
                style={styles.timelineRow}
              >
                <View style={styles.railColumn}>
                  <View style={[
                    styles.dot,
                    { borderColor: emphasized ? colors.primary : border, backgroundColor: emphasized ? colors.primary : colors.background },
                  ]} />
                  {index < moments.length - 1 ? <View style={[styles.rail, { backgroundColor: border }]} /> : null}
                </View>
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeLabel, { color: emphasized ? colors.primary : colors.textSecondary }]}>{moment.label}</Text>
                </View>
                <View style={[
                  styles.momentCard,
                  { backgroundColor: emphasized ? soft : surface, borderColor: emphasized ? `${colors.primary}55` : border, opacity: muted ? 0.55 : 1 },
                ]}>
                  <View style={[styles.momentIcon, { backgroundColor: colors.background }]}>{momentIcon(moment.kind, emphasized ? colors.primary : colors.textSecondary)}</View>
                  <View style={styles.momentCopy}>
                    <Text style={[styles.momentTitle, { color: colors.text }]} numberOfLines={2}>{moment.title}</Text>
                    {moment.detail ? <Text style={[styles.momentDetail, { color: colors.textSecondary }]} numberOfLines={2}>{moment.detail}</Text> : null}
                  </View>
                  {moment.route ? <ChevronRight size={17} color={colors.textSecondary} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {(weather?.isRaining || weather?.isStormy || weather?.isSnowing) ? (
        <View style={[styles.weatherRow, { borderColor: border }]}>
          <CloudRain size={18} color={colors.primary} />
          <Text style={[styles.weatherText, { color: colors.textSecondary }]}>
            {weather.description ?? weather.condition ?? 'Weather'} may change the best plan for anything outdoors today.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, gap: 22 },
  briefCard: { borderWidth: 1, borderRadius: 25, padding: 20, gap: 12 },
  briefTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  briefTime: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  clockBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  briefTitle: { fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7 },
  briefHello: { marginTop: -4, fontSize: 13, lineHeight: 19 },
  briefLines: { gap: 10, paddingTop: 3 },
  briefLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  briefLineText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  windowCard: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 12 },
  windowHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  windowIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  windowCopy: { flex: 1 },
  windowKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  windowTitle: { marginTop: 3, fontSize: 17, lineHeight: 21, fontWeight: '800' },
  windowBody: { fontSize: 13, lineHeight: 19 },
  fitRow: { minHeight: 58, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fitCopy: { flex: 1 },
  fitTitle: { fontSize: 14, fontWeight: '700' },
  fitMeta: { marginTop: 2, fontSize: 11 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  sectionSubtitle: { marginTop: 3, fontSize: 12 },
  nextLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  timeline: { gap: 0 },
  timelineRow: { minHeight: 86, flexDirection: 'row', alignItems: 'stretch' },
  railColumn: { width: 20, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 17, zIndex: 2 },
  rail: { width: StyleSheet.hairlineWidth, flex: 1, marginTop: -1 },
  timeColumn: { width: 88, paddingTop: 14, paddingHorizontal: 8 },
  timeLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  momentCard: { flex: 1, minHeight: 70, marginBottom: 10, borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  momentIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  momentCopy: { flex: 1, minWidth: 0 },
  momentTitle: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  momentDetail: { marginTop: 3, fontSize: 11, lineHeight: 15 },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 7 },
  emptyTitle: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  weatherRow: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  weatherText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
