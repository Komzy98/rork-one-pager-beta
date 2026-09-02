import React, { useMemo } from 'react';

import TodayEveningOpportunity from '@/components/activities/TodayEveningOpportunity';
import TodayTimelineView from '@/components/activities/TodayTimelineView';
import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useCalendar } from '@/hooks/useCalendar';
import { useTasks } from '@/hooks/useTasksStore';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { useTodayYmd } from '@/hooks/useTodayYmd';

/**
 * Kept under the old filename so older imports continue to work.
 * The product surface is Timeline: intelligence is used underneath,
 * but the user sees a time-aware rhythm rather than an "AI" dashboard.
 *
 * Discover data comes from DiscoverLifeContextProvider. Timeline never starts
 * a second event/media/weather fetch tree of its own.
 */
export default function ActivitiesAIView(_props: { onRequestPeakScheduler?: () => void }) {
  const app = useAppSafe();
  const tasks = useTasks();
  const calendar = useCalendar();
  const { stats } = useTodayHabits();
  const todayYmd = useTodayYmd();
  const discover = useSharedDiscoverLifeContext();
  const profile = discover.profile;

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

  const matches = useMemo(
    () => discover.sportSignals
      .filter((match) => match.status === 'Live' || match.status === 'Upcoming')
      .map((match) => ({
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        date: match.date ?? '',
        time: match.time,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      })),
    [discover.sportSignals],
  );

  const continueWatchingTitle = useMemo(
    () => discover.watchSignal?.title
      ?? app.shows.find((show) => show.status === 'Watching')?.title
      ?? null,
    [app.shows, discover.watchSignal],
  );

  const savedPlans = useMemo(
    () => discover.saved.upcomingSaved.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
    })),
    [discover.saved.upcomingSaved],
  );

  return (
    <>
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
        weather={discover.weather}
      />
      <TodayEveningOpportunity />
    </>
  );
}
