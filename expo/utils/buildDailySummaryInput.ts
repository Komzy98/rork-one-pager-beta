import type { CalendarEvent, Show } from '@/types/habit';
import type { Task } from '@/types/task';
import type { HabitWithStats } from '@/types/habit';
import { shouldDoHabitToday } from '@/utils/dateUtils';
import { buildTodayHabitEntries, buildSummaryHabitsFromEntries } from '@/utils/todayHabits';
import type {
  DailySummaryHabit,
  DailySummaryHabitRollup,
  DailySummaryPriorityTask,
  DailySummaryCalendarEvent,
  DailySummaryContinueWatching,
  DailySummarySportsBeat,
} from '@/utils/dailySummary';
import { formatShowEpisodeLabel, formatYounifyContinueEpisodeLabel } from '@/utils/showEpisodeLabel';

type FootballMatchLike = {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
};

type RecentWinLike = {
  team: string;
  opponent: string;
  score: string;
  date: string;
};

export type ContinueWatchingItem =
  | { kind: 'local'; show: Show & { posterUrl?: string | null } }
  | { kind: 'younify'; row: Record<string, unknown>; key: string };

function eventStartsOnDate(event: CalendarEvent, dateYmd: string): boolean {
  const start = event.startDate;
  if (!start) return false;
  if (start.startsWith(dateYmd)) return true;
  try {
    const d = new Date(start);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` === dateYmd;
  } catch {
    return false;
  }
}

function formatEventTime(event: CalendarEvent): string {
  if (event.isAllDay) return 'all day';
  try {
    return new Date(event.startDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** @deprecated Prefer buildTodayHabitEntries + buildSummaryHabitsFromEntries */
export function buildHabitsForSummary(
  legacyHabits: HabitWithStats[],
  habitTasksDueToday: Task[],
  todayDate: string
): { habits: DailySummaryHabit[]; rollup: DailySummaryHabitRollup | null } {
  const entries = buildTodayHabitEntries(habitTasksDueToday, legacyHabits, todayDate);
  return buildSummaryHabitsFromEntries(entries);
}

export function buildPriorityTaskHighlights(tasks: Task[]): DailySummaryPriorityTask[] {
  return tasks
    .filter((t) => !t.isHabit && (t.priority === 'urgent' || t.priority === 'high'))
    .map((t) => ({
      title: t.title,
      priority: t.priority || 'medium',
      completed: t.status === 'completed',
      category: t.category,
    }));
}

export function buildTodayCalendarHighlights(
  events: CalendarEvent[],
  todayYmd: string
): DailySummaryCalendarEvent[] {
  const seen = new Set<string>();
  const out: DailySummaryCalendarEvent[] = [];

  for (const e of events) {
    if (!eventStartsOnDate(e, todayYmd)) continue;
    const key = `${e.id}|${e.title}|${e.startDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: e.title,
      timeLabel: formatEventTime(e),
      isAllDay: e.isAllDay,
      location: e.location,
    });
    if (out.length >= 6) break;
  }

  return out;
}

export function buildContinueWatchingHighlights(
  items: ContinueWatchingItem[]
): DailySummaryContinueWatching[] {
  const out: DailySummaryContinueWatching[] = [];

  for (const item of items.slice(0, 3)) {
    if (item.kind === 'local') {
      const ep = formatShowEpisodeLabel(item.show, undefined, 'spaced') ?? undefined;
      out.push({
        title: item.show.title,
        episode: ep,
        platform: item.show.platform,
      });
      continue;
    }
    const row = item.row;
    const epLabel = formatYounifyContinueEpisodeLabel(row) ?? undefined;
    out.push({
      title: String(row.showTitle || row.title || 'Continue watching'),
      episode: epLabel,
      platform:
        typeof row.younifySourceService === 'object' && row.younifySourceService != null
          ? String((row.younifySourceService as { name?: string }).name || '')
          : undefined,
    });
  }

  return out;
}

export function buildSavedEventsHighlights(
  snapshots: import('@/types/events').SavedEventSnapshot[],
  todayYmd: string,
  withinDays = 14
): { title: string; dateLabel: string; timeLabel?: string; venue: string; daysUntil: number | null }[] {
  const now = Date.now();
  const maxMs = withinDays * 24 * 60 * 60 * 1000;

  return snapshots
    .map((s) => {
      const startMs = Date.parse(s.startAt);
      const daysUntil = Number.isFinite(startMs)
        ? Math.ceil((startMs - now) / (24 * 60 * 60 * 1000))
        : null;
      return {
        title: s.title,
        dateLabel: s.dateLabel ?? s.startAt.slice(0, 10),
        timeLabel: s.timeLabel,
        venue: s.venueName,
        daysUntil,
        startMs,
      };
    })
    .filter((e) => Number.isFinite(e.startMs) && e.startMs >= now - 24 * 60 * 60 * 1000 && e.startMs <= now + maxMs)
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, 6)
    .map(({ title, dateLabel, timeLabel, venue, daysUntil }) => ({
      title,
      dateLabel,
      timeLabel,
      venue,
      daysUntil,
    }));
}

export function buildSportsEmotionalBeats(params: {
  todayYmd: string;
  recentWins: RecentWinLike[];
  upcomingMatches: FootballMatchLike[];
  liveMatches?: FootballMatchLike[];
}): DailySummarySportsBeat[] {
  const beats: DailySummarySportsBeat[] = [];
  const { todayYmd, recentWins, upcomingMatches, liveMatches = [] } = params;

  for (const win of recentWins.slice(0, 2)) {
    const when =
      win.date === todayYmd
        ? 'today'
        : win.date.startsWith(todayYmd.slice(0, 8))
          ? 'recently'
          : win.date;
    beats.push({
      kind: 'recent_win',
      headline: `${win.team} beat ${win.opponent} ${win.score}`,
      whenLabel: when,
    });
  }

  for (const m of liveMatches.slice(0, 2)) {
    const score =
      m.homeScore != null && m.awayScore != null
        ? ` (${m.homeScore}-${m.awayScore})`
        : '';
    beats.push({
      kind: 'live_now',
      headline: `${m.homeTeam} vs ${m.awayTeam}${score} — live now`,
      whenLabel: 'today',
    });
  }

  for (const m of upcomingMatches) {
    if (m.date !== todayYmd) continue;
    beats.push({
      kind: 'match_today',
      headline: `${m.homeTeam} vs ${m.awayTeam} today`,
      whenLabel: m.time || 'today',
    });
    if (beats.filter((b) => b.kind === 'match_today').length >= 2) break;
  }

  return beats;
}

/** Task habits scheduled for today (includes times_per_week). */
export function getTaskHabitsDueToday(allTasks: Task[]): Task[] {
  return allTasks.filter((task) => {
    if (!task.isHabit || !task.habitFrequency) return false;
    return shouldDoHabitToday(task.habitFrequency);
  });
}
