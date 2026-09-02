import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import TodayTimelineView from '@/components/activities/TodayTimelineView';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useFootballBundle } from '@/contexts/FootballBundleContext';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useTasks } from '@/hooks/useTasksStore';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { useTodayYmd } from '@/hooks/useTodayYmd';
import { useUserProfile } from '@/hooks/useUserProfile';
import { apiFixturesToLiveFootballMatches } from '@/utils/footballFixtureTransform';
import { getCurrentWeather } from '@/utils/weatherApi';

/**
 * Kept under the old filename so older imports continue to work.
 * The product surface is now Timeline: intelligence is used underneath,
 * but the user sees a time-aware rhythm rather than an "AI" dashboard.
 */
export default function ActivitiesAIView(_props: { onRequestPeakScheduler?: () => void }) {
  const app = useAppSafe();
  const tasks = useTasks();
  const calendar = useCalendar();
  const saved = useSavedEvents();
  const { stats } = useTodayHabits();
  const todayYmd = useTodayYmd();
  const { profile } = useUserProfile();
  const football = useFootballBundle();

  const weatherQuery = useQuery({
    queryKey: ['today-timeline', 'weather'],
    queryFn: () => getCurrentWeather(),
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  const calendarEvents = useMemo(
    () => calendar.getTodayCalendarEvents().map((event) => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      isAllDay: event.isAllDay,
    })),
    [calendar],
  );

  const taskItems = useMemo(
    () => tasks.allTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      estimatedDuration: task.estimatedDuration,
      isHabit: task.isHabit,
    })),
    [tasks.allTasks],
  );

  const favoriteTeams = profile?.favoriteTeams ?? [];
  const favoriteTeamNames = useMemo(
    () => favoriteTeams.map((team) => team.name.toLowerCase().trim()).filter(Boolean),
    [favoriteTeams],
  );
  const favoriteTeamApiIds = useMemo(
    () => new Set(favoriteTeams.map((team) => team.apiId).filter((id): id is number => typeof id === 'number')),
    [favoriteTeams],
  );

  const matches = useMemo(() => {
    const live = apiFixturesToLiveFootballMatches(football.query.data?.live?.response ?? []);
    const upcoming = apiFixturesToLiveFootballMatches(football.query.data?.upcoming?.response ?? []);
    const all = [...live, ...upcoming];
    if (favoriteTeams.length === 0) return [];
    return all.filter((match) => {
      if (
        (match.homeTeamId && favoriteTeamApiIds.has(match.homeTeamId)) ||
        (match.awayTeamId && favoriteTeamApiIds.has(match.awayTeamId))
      ) return true;
      const home = match.homeTeam.toLowerCase();
      const away = match.awayTeam.toLowerCase();
      return favoriteTeamNames.some((name) => home.includes(name) || away.includes(name));
    });
  }, [favoriteTeamApiIds, favoriteTeamNames, favoriteTeams.length, football.query.data]);

  const continueWatchingTitle = useMemo(
    () => app.shows.find((show) => show.status === 'Watching')?.title ?? null,
    [app.shows],
  );

  const savedPlans = useMemo(
    () => saved.upcomingSaved.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
    })),
    [saved.upcomingSaved],
  );

  return (
    <TodayTimelineView
      firstName={profile?.name?.split(' ')[0] ?? null}
      todayYmd={todayYmd}
      calendarEvents={calendarEvents}
      tasks={taskItems}
      completedHabits={stats.completedHabits}
      totalHabits={stats.totalHabits}
      matches={matches}
      continueWatchingTitle={continueWatchingTitle}
      savedPlans={savedPlans}
      weather={weatherQuery.data ?? null}
    />
  );
}
