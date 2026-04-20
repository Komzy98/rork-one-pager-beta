import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCalendar } from '@/hooks/useCalendar';

export type BrainDomain = 'habits' | 'productivity' | 'entertainment' | 'sports' | 'lifestyle';

export interface DomainSignal {
  id: BrainDomain;
  label: string;
  emoji: string;
  color: string;
  score: number;
  status: 'strong' | 'steady' | 'weak' | 'idle';
  summary: string;
  metrics: { label: string; value: string }[];
}

export interface BrainDirective {
  id: string;
  title: string;
  rationale: string;
  domains: BrainDomain[];
  impact: 'low' | 'medium' | 'high';
  timeframe: 'now' | 'today' | 'this-week';
}

export interface BrainPrediction {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  horizon: 'tonight' | 'tomorrow' | 'this-week';
}

export interface BrainInsight {
  id: string;
  headline: string;
  detail: string;
  domains: BrainDomain[];
}

export interface BrainState {
  systemScore: number;
  mood: 'optimized' | 'balanced' | 'strained' | 'recovering';
  tagline: string;
  signals: DomainSignal[];
  directives: BrainDirective[];
  predictions: BrainPrediction[];
  insights: BrainInsight[];
  lastUpdated: string;
  isThinking: boolean;
}

const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);

function computeSignals(params: {
  habits: { total: number; doneToday: number; avgStreak: number };
  tasks: { total: number; completed: number; overdue: number; productivityScore: number };
  shows: { watching: number; planToWatch: number; completed: number };
  sports: { liveCount: number; upcomingCount: number; teamsFollowed: number };
  lifestyle: { upcomingEvents: number; todayEvents: number };
}): DomainSignal[] {
  const { habits, tasks, shows, sports, lifestyle } = params;

  const habitScore = habits.total === 0 ? 0 : (habits.doneToday / habits.total) * 100;
  const taskScore = tasks.total === 0 ? 0 : Math.max(0, tasks.productivityScore || (tasks.completed / tasks.total) * 100);
  const entScore = shows.watching > 0 ? Math.min(100, 40 + shows.watching * 12) : shows.planToWatch > 0 ? 25 : 10;
  const sportsScore = sports.teamsFollowed === 0 ? 10 : Math.min(100, 30 + sports.upcomingCount * 10 + sports.liveCount * 25);
  const lifestyleScore = Math.min(100, 30 + lifestyle.todayEvents * 15 + lifestyle.upcomingEvents * 5);

  const pick = (score: number): DomainSignal['status'] =>
    score >= 75 ? 'strong' : score >= 45 ? 'steady' : score >= 20 ? 'weak' : 'idle';

  return [
    {
      id: 'habits',
      label: 'Habits',
      emoji: '🌱',
      color: '#10B981',
      score: fmt(habitScore),
      status: pick(habitScore),
      summary: habits.total === 0
        ? 'No habits tracked yet'
        : `${habits.doneToday}/${habits.total} done · ${habits.avgStreak}d avg streak`,
      metrics: [
        { label: 'Today', value: `${habits.doneToday}/${habits.total}` },
        { label: 'Streak', value: `${habits.avgStreak}d` },
      ],
    },
    {
      id: 'productivity',
      label: 'Productivity',
      emoji: '⚡',
      color: '#F59E0B',
      score: fmt(taskScore),
      status: pick(taskScore),
      summary: tasks.total === 0
        ? 'Inbox is empty'
        : `${tasks.completed}/${tasks.total} done · ${tasks.overdue} overdue`,
      metrics: [
        { label: 'Done', value: String(tasks.completed) },
        { label: 'Overdue', value: String(tasks.overdue) },
      ],
    },
    {
      id: 'entertainment',
      label: 'Entertainment',
      emoji: '🎬',
      color: '#EC4899',
      score: fmt(entScore),
      status: pick(entScore),
      summary: `${shows.watching} watching · ${shows.planToWatch} queued`,
      metrics: [
        { label: 'Active', value: String(shows.watching) },
        { label: 'Backlog', value: String(shows.planToWatch) },
      ],
    },
    {
      id: 'sports',
      label: 'Sports',
      emoji: '🏟️',
      color: '#3B82F6',
      score: fmt(sportsScore),
      status: pick(sportsScore),
      summary: sports.liveCount > 0
        ? `${sports.liveCount} live now · ${sports.upcomingCount} upcoming`
        : `${sports.upcomingCount} upcoming · ${sports.teamsFollowed} teams`,
      metrics: [
        { label: 'Live', value: String(sports.liveCount) },
        { label: 'Next', value: String(sports.upcomingCount) },
      ],
    },
    {
      id: 'lifestyle',
      label: 'Lifestyle',
      emoji: '🌤️',
      color: '#8B5CF6',
      score: fmt(lifestyleScore),
      status: pick(lifestyleScore),
      summary: `${lifestyle.todayEvents} today · ${lifestyle.upcomingEvents} upcoming`,
      metrics: [
        { label: 'Today', value: String(lifestyle.todayEvents) },
        { label: 'Week', value: String(lifestyle.upcomingEvents) },
      ],
    },
  ];
}

const directiveSchema = z.object({
  tagline: z.string().describe('One-line summary of the user\'s current system state (max 90 chars).'),
  mood: z.enum(['optimized', 'balanced', 'strained', 'recovering']),
  directives: z
    .array(
      z.object({
        title: z.string().describe('Imperative, specific action. No generic advice.'),
        rationale: z.string().describe('1 short sentence on why, referencing the data.'),
        domains: z.array(z.enum(['habits', 'productivity', 'entertainment', 'sports', 'lifestyle'])),
        impact: z.enum(['low', 'medium', 'high']),
        timeframe: z.enum(['now', 'today', 'this-week']),
      })
    )
    .min(2)
    .max(4),
  predictions: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string().describe('What the user can expect and why, 1 sentence.'),
        confidence: z.number().min(0).max(1),
        horizon: z.enum(['tonight', 'tomorrow', 'this-week']),
      })
    )
    .min(2)
    .max(3),
  insights: z
    .array(
      z.object({
        headline: z.string(),
        detail: z.string().describe('Cross-domain correlation, 1 sentence.'),
        domains: z.array(z.enum(['habits', 'productivity', 'entertainment', 'sports', 'lifestyle'])).min(2),
      })
    )
    .min(1)
    .max(3),
});

export const [AIBrainProvider, useAIBrain] = createContextHook<BrainState>(() => {
  const app = useAppSafe();
  const tasks = useTasksSafe();
  const { profile } = useUserProfile();
  const calendar = useCalendar();

  const snapshot = useMemo(() => {
    const habitsWithStats = app.habitsWithStats || [];
    const doneToday = habitsWithStats.filter(h => h.completedToday).length;
    const avgStreak = habitsWithStats.length
      ? Math.round(habitsWithStats.reduce((a, h) => a + (h.streak || 0), 0) / habitsWithStats.length)
      : 0;

    const allTasks = tasks.allTasks || [];
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const overdueTasks = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    const shows = app.shows || [];
    const watching = shows.filter(s => s.status === 'Watching').length;
    const planToWatch = shows.filter(s => s.status === 'Plan to Watch').length;
    const completedShows = shows.filter(s => s.status === 'Completed').length;

    const todayEvents = calendar?.getUpcomingCalendarEvents
      ? calendar.getUpcomingCalendarEvents(1).length
      : 0;
    const upcomingEvents = calendar?.getUpcomingCalendarEvents
      ? calendar.getUpcomingCalendarEvents(7).length
      : 0;

    return {
      habits: {
        total: habitsWithStats.length,
        doneToday,
        avgStreak,
      },
      tasks: {
        total: allTasks.length,
        completed: completedTasks,
        overdue: overdueTasks,
        productivityScore: tasks.taskStats?.productivityScore || 0,
      },
      shows: {
        watching,
        planToWatch,
        completed: completedShows,
      },
      sports: {
        liveCount: 0,
        upcomingCount: 0,
        teamsFollowed:
          (profile?.favoriteTeams?.length || 0) +
          (profile?.favoriteNBATeams?.length || 0),
      },
      lifestyle: {
        todayEvents,
        upcomingEvents,
      },
    };
  }, [
    app.habitsWithStats,
    app.shows,
    tasks.allTasks,
    tasks.taskStats,
    profile?.favoriteTeams,
    profile?.favoriteNBATeams,
    calendar,
  ]);

  const signals = useMemo(() => computeSignals(snapshot), [snapshot]);

  const systemScore = useMemo(() => {
    if (signals.length === 0) return 0;
    const weights: Record<BrainDomain, number> = {
      habits: 0.3,
      productivity: 0.3,
      lifestyle: 0.15,
      entertainment: 0.1,
      sports: 0.15,
    };
    const total = signals.reduce((acc, s) => acc + s.score * weights[s.id], 0);
    return Math.round(total);
  }, [signals]);

  const mood: BrainState['mood'] = useMemo(() => {
    if (systemScore >= 75) return 'optimized';
    if (systemScore >= 50) return 'balanced';
    if (systemScore >= 25) return 'strained';
    return 'recovering';
  }, [systemScore]);

  const snapshotKey = useMemo(
    () =>
      JSON.stringify({
        h: snapshot.habits,
        t: snapshot.tasks,
        s: snapshot.shows,
        sp: snapshot.sports,
        l: snapshot.lifestyle,
        mood,
      }),
    [snapshot, mood]
  );

  const brainQuery = useQuery({
    queryKey: ['ai-brain', snapshotKey],
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const promptData = {
        user: profile?.name || 'user',
        chronotype: profile?.chronotype || 'unknown',
        systemScore,
        mood,
        signals: signals.map(s => ({
          domain: s.id,
          score: s.score,
          status: s.status,
          summary: s.summary,
        })),
        raw: snapshot,
      };

      try {
        const result = await generateObject({
          messages: [
            {
              role: 'user',
              content: `You are the central intelligence layer of a personal operating system. Analyse how the user's habits, productivity, entertainment, sports and lifestyle signals correlate. Produce specific, data-grounded directives and predictions — no generic advice.\n\nData:\n${JSON.stringify(promptData, null, 2)}`,
            },
          ],
          schema: directiveSchema,
        });
        return result;
      } catch (err) {
        console.log('[AIBrain] generateObject failed, using fallback', err);
        return null;
      }
    },
  });

  const fallback = useMemo(() => {
    const directives: BrainDirective[] = [];
    const predictions: BrainPrediction[] = [];
    const insights: BrainInsight[] = [];

    if (snapshot.tasks.overdue > 0) {
      directives.push({
        id: 'd-overdue',
        title: `Clear ${snapshot.tasks.overdue} overdue task${snapshot.tasks.overdue > 1 ? 's' : ''}`,
        rationale: 'Overdue items drag down productivity and carry into tomorrow.',
        domains: ['productivity'],
        impact: 'high',
        timeframe: 'today',
      });
    }
    if (snapshot.habits.total > 0 && snapshot.habits.doneToday < snapshot.habits.total) {
      directives.push({
        id: 'd-habits',
        title: `Finish ${snapshot.habits.total - snapshot.habits.doneToday} habit${snapshot.habits.total - snapshot.habits.doneToday > 1 ? 's' : ''} before wind-down`,
        rationale: `Protect your ${snapshot.habits.avgStreak}-day average streak.`,
        domains: ['habits'],
        impact: 'medium',
        timeframe: 'today',
      });
    }
    if (snapshot.shows.watching > 0 && snapshot.tasks.overdue > 0) {
      directives.push({
        id: 'd-balance',
        title: 'Delay streaming until tasks are cleared',
        rationale: 'Entertainment usage is active while tasks are overdue.',
        domains: ['entertainment', 'productivity'],
        impact: 'medium',
        timeframe: 'now',
      });
    }
    if (directives.length === 0) {
      directives.push({
        id: 'd-default',
        title: 'Protect your momentum',
        rationale: 'All systems are green — lock in a short review block tonight.',
        domains: ['habits', 'productivity'],
        impact: 'low',
        timeframe: 'today',
      });
    }

    predictions.push({
      id: 'p-streak',
      title:
        snapshot.habits.doneToday >= snapshot.habits.total && snapshot.habits.total > 0
          ? 'Streak will extend tomorrow'
          : 'Streak at risk tonight',
      detail: `Based on today\'s ${snapshot.habits.doneToday}/${snapshot.habits.total} habit completion.`,
      confidence: snapshot.habits.total > 0 ? 0.78 : 0.4,
      horizon: 'tonight',
    });
    predictions.push({
      id: 'p-productivity',
      title:
        snapshot.tasks.overdue > 2
          ? 'Productivity dip forecast this week'
          : 'Week trending on target',
      detail: `${snapshot.tasks.completed}/${snapshot.tasks.total} tasks cleared, ${snapshot.tasks.overdue} overdue.`,
      confidence: 0.7,
      horizon: 'this-week',
    });

    if (snapshot.shows.watching > 1 && snapshot.habits.doneToday < snapshot.habits.total) {
      insights.push({
        id: 'i-1',
        headline: 'Watch-time is crowding out habits',
        detail: 'Days with multiple active shows correlate with missed habit windows.',
        domains: ['entertainment', 'habits'],
      });
    }
    if (snapshot.sports.teamsFollowed > 0 && snapshot.lifestyle.upcomingEvents > 0) {
      insights.push({
        id: 'i-2',
        headline: 'Fixture clash with your calendar',
        detail: 'Upcoming matches overlap with scheduled events this week.',
        domains: ['sports', 'lifestyle'],
      });
    }
    if (insights.length === 0) {
      insights.push({
        id: 'i-default',
        headline: 'Signals are balanced',
        detail: 'No strong cross-domain conflicts detected right now.',
        domains: ['habits', 'productivity'],
      });
    }

    return { directives, predictions, insights };
  }, [snapshot]);

  const ai = brainQuery.data;

  const directives: BrainDirective[] = useMemo(
    () =>
      ai?.directives
        ? ai.directives.map((d, i) => ({ id: `ai-d-${i}`, ...d }))
        : fallback.directives,
    [ai, fallback]
  );
  const predictions: BrainPrediction[] = useMemo(
    () =>
      ai?.predictions
        ? ai.predictions.map((p, i) => ({ id: `ai-p-${i}`, ...p }))
        : fallback.predictions,
    [ai, fallback]
  );
  const insights: BrainInsight[] = useMemo(
    () =>
      ai?.insights
        ? ai.insights.map((s, i) => ({ id: `ai-i-${i}`, ...s }))
        : fallback.insights,
    [ai, fallback]
  );

  const tagline = useMemo(() => {
    if (ai?.tagline) return ai.tagline;
    switch (mood) {
      case 'optimized':
        return 'Every system is firing — protect the rhythm.';
      case 'balanced':
        return 'Steady signal across domains. One nudge can lift the week.';
      case 'strained':
        return 'Load is uneven — the brain suggests a reset block.';
      case 'recovering':
        return 'Low signal detected. Start small, rebuild the core loops.';
    }
  }, [ai, mood]);

  return {
    systemScore,
    mood,
    tagline,
    signals,
    directives,
    predictions,
    insights,
    lastUpdated: new Date().toISOString(),
    isThinking: brainQuery.isLoading || brainQuery.isFetching,
  };
});
