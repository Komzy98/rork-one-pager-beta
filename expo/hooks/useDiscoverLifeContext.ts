import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserLocation } from '@/hooks/useUserLocation';
import { usePerCategoryEvents } from '@/hooks/usePerCategoryEvents';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { useBusyModeSafe } from '@/hooks/useBusyMode';
import { useActivityIntelligence } from '@/hooks/useBackgroundServices';
import { useEventRecommendationInput } from '@/hooks/useEventRecommendationInput';
import { useFriendsEventPicks } from '@/hooks/useFriendsEventPicks';
import { useFriends } from '@/hooks/useFriends';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import { usePremiumKitchen } from '@/hooks/usePremiumKitchen';
import { useFootballBundle } from '@/contexts/FootballBundleContext';
import { useDiscoverFeedback } from '@/hooks/useDiscoverFeedback';

import { apiFixturesToLiveFootballMatches } from '@/utils/footballFixtureTransform';
import { getCurrentWeather } from '@/utils/weatherApi';
import {
  fetchDiscoverMediaPicks,
  resolveDiscoverShowArtwork,
} from '@/utils/discoverMedia';
import { formatShowEpisodeLabel } from '@/utils/showEpisodeLabel';
import {
  buildDiscoverLifeContext,
  buildDiscoverOpportunities,
  type DiscoverHabitSignal,
  type DiscoverMediaSignal,
  type DiscoverRecipeSignal,
  type DiscoverSportSignal,
  type DiscoverWatchSignal,
} from '@/utils/discoverLifeEngine';

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function useDiscoverLifeContext() {
  const { profile } = useUserProfile();
  const { coords, areaLabel, refresh: refreshLocation } = useUserLocation();
  const app = useAppSafe();
  const tasks = useTasksSafe();
  const busyMode = useBusyModeSafe();
  const intelligence = useActivityIntelligence();
  const friends = useFriends();

  const {
    allEvents,
    source: eventsSource,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = usePerCategoryEvents({
    latitude: coords.latitude,
    longitude: coords.longitude,
    radiusMiles: 35,
    enabled: true,
  });

  const friendEventData = useFriendsEventPicks(allEvents);
  const eventRecommendationInput = useEventRecommendationInput(friendEventData.friendCountByEventId);
  const savedEvents = useSavedEvents();
  const feedback = useDiscoverFeedback();
  const cooking = useCookingStorage();
  const kitchen = usePremiumKitchen({ searchQuery: '', activeCollection: 'discover' });
  const football = useFootballBundle();

  const watchingShow = useMemo(
    () => app.shows.find((show) => show.status === 'Watching') ?? null,
    [app.shows],
  );

  const showArtworkQuery = useQuery({
    queryKey: ['discover-v3', 'show-artwork', watchingShow?.id, watchingShow?.updatedAt],
    queryFn: () => watchingShow ? resolveDiscoverShowArtwork(watchingShow) : Promise.resolve(null),
    enabled: Boolean(watchingShow),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const showsFingerprint = useMemo(
    () => app.shows.map((show) => `${show.id}:${show.tmdbId ?? ''}:${show.status}:${show.updatedAt}`).join('|'),
    [app.shows],
  );

  const mediaQuery = useQuery({
    queryKey: ['discover-v3', 'media-picks', showsFingerprint],
    queryFn: () => fetchDiscoverMediaPicks(app.shows, 12),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const weatherQuery = useQuery({
    queryKey: ['discover-v3', 'weather', coords.latitude.toFixed(2), coords.longitude.toFixed(2)],
    queryFn: () => getCurrentWeather(coords.latitude, coords.longitude),
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  const watchSignal = useMemo<DiscoverWatchSignal | null>(() => {
    if (!watchingShow) return null;
    const art = showArtworkQuery.data;
    return {
      id: watchingShow.id,
      title: watchingShow.title,
      platform: watchingShow.platform,
      episodeLabel: formatShowEpisodeLabel(watchingShow, undefined, 'bullet'),
      posterUrl: art?.posterUrl,
      backdropUrl: art?.backdropUrl,
      rating: art?.rating,
    };
  }, [watchingShow, showArtworkQuery.data]);

  const liveFootball = useMemo(() => {
    const live = apiFixturesToLiveFootballMatches(football.query.data?.live?.response ?? []);
    const upcoming = apiFixturesToLiveFootballMatches(football.query.data?.upcoming?.response ?? []);
    return [...live, ...upcoming];
  }, [football.query.data]);

  const sportSignals = useMemo<DiscoverSportSignal[]>(() => {
    const favorites = profile?.favoriteTeams ?? [];
    const favoriteForMatch = (match: { homeTeam: string; awayTeam: string; homeTeamId?: number; awayTeamId?: number }) => {
      return favorites.find((team) => {
        if (team.apiId && (team.apiId === match.homeTeamId || team.apiId === match.awayTeamId)) return true;
        const teamName = normalize(team.name);
        return normalize(match.homeTeam).includes(teamName) || normalize(match.awayTeam).includes(teamName);
      }) ?? null;
    };

    const fromLive: DiscoverSportSignal[] = liveFootball.map((match) => {
      const favorite = favoriteForMatch(match);
      return {
        id: `football-${match.id}`,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        date: match.date,
        time: match.time,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeTeamLogo: match.homeTeamLogo,
        awayTeamLogo: match.awayTeamLogo,
        favoriteTeamName: favorite?.name,
      };
    });

    const existing = new Set(fromLive.map((match) => `${normalize(match.homeTeam)}|${normalize(match.awayTeam)}`));
    const fromStored: DiscoverSportSignal[] = app.sports
      .filter((match) => match.status !== 'Completed')
      .filter((match) => !existing.has(`${normalize(match.homeTeam)}|${normalize(match.awayTeam)}`))
      .map((match) => {
        const favorite = favoriteForMatch(match);
        return {
          id: `stored-${match.id}`,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          date: match.date,
          time: match.time,
          status: match.status,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          favoriteTeamName: favorite?.name,
        };
      });

    return [...fromLive, ...fromStored]
      .sort((a, b) => {
        if (a.status === 'Live' && b.status !== 'Live') return -1;
        if (b.status === 'Live' && a.status !== 'Live') return 1;
        const ta = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      })
      .slice(0, 12);
  }, [app.sports, liveFootball, profile?.favoriteTeams]);

  const habitSignals = useMemo<DiscoverHabitSignal[]>(() => {
    const taskHabits: DiscoverHabitSignal[] = tasks.allTasks
      .filter((task) => task.isHabit)
      .map((task) => {
        const today = new Date().toISOString().slice(0, 10);
        const completions = Object.values(task.habitCompletions ?? {}).filter(Boolean).length;
        return {
          id: `task-${task.id}`,
          title: task.title,
          streak: task.habitStreak ?? 0,
          completedToday: task.habitCompletions?.[today] === true,
          totalCompletions: completions,
          estimatedMinutes: task.estimatedDuration ?? 20,
        };
      });

    const taskNames = new Set(taskHabits.map((habit) => normalize(habit.title)));
    const legacy = app.habitsWithStats
      .filter((habit) => !taskNames.has(normalize(habit.name)))
      .map((habit) => ({
        id: `legacy-${habit.id}`,
        title: habit.name,
        streak: habit.streak,
        completedToday: habit.completedToday,
        totalCompletions: habit.totalCompletions,
        estimatedMinutes: 20,
      }));

    return [...taskHabits, ...legacy]
      .filter((habit) => habit.streak > 0 || habit.totalCompletions >= 2 || !habit.completedToday)
      .sort((a, b) => b.streak - a.streak || b.totalCompletions - a.totalCompletions)
      .slice(0, 8);
  }, [app.habitsWithStats, tasks.allTasks]);

  const recipeSignal = useMemo<DiscoverRecipeSignal | null>(() => {
    const candidates = [
      kitchen.bundle.hero,
      ...kitchen.bundle.collections.flatMap((collection) => collection.recipes),
    ];
    const unique = [...new Map(candidates.map((recipe) => [recipe.id, recipe])).values()];
    const saved = unique.find((recipe) => cooking.bookmarkSet.has(recipe.id));
    const cooked = [...unique]
      .filter((recipe) => (cooking.cookCounts[recipe.id] ?? 0) > 0)
      .sort((a, b) => (cooking.cookCounts[b.id] ?? 0) - (cooking.cookCounts[a.id] ?? 0))[0];
    const recipe = saved ?? cooked ?? kitchen.bundle.hero;
    if (!recipe) return null;
    return {
      id: recipe.id,
      title: recipe.title,
      subtitle: recipe.subtitle,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      rating: recipe.rating,
      category: recipe.category,
      saved: cooking.bookmarkSet.has(recipe.id),
      cookedCount: cooking.cookCounts[recipe.id] ?? 0,
    };
  }, [cooking.bookmarkSet, cooking.cookCounts, kitchen.bundle]);

  const mediaSignals = useMemo<DiscoverMediaSignal[]>(
    () => (mediaQuery.data ?? []).map((pick) => ({
      id: `${pick.mediaType}-${pick.id}`,
      title: pick.title,
      posterUrl: pick.posterUrl,
      backdropUrl: pick.backdropUrl,
      rating: pick.rating,
      mediaType: pick.mediaType,
      reason: pick.reason,
    })),
    [mediaQuery.data],
  );

  const lifeContext = useMemo(() => buildDiscoverLifeContext({
    profile,
    tasks: tasks.allTasks,
    calendarEvents: eventRecommendationInput.calendarEvents ?? [],
    areaLabel,
    busyModeActive: busyMode.isEnabled,
    busyModeReason: busyMode.reason,
    weather: weatherQuery.data,
  }), [
    profile,
    tasks.allTasks,
    eventRecommendationInput.calendarEvents,
    areaLabel,
    busyMode.isEnabled,
    busyMode.reason,
    weatherQuery.data,
  ]);

  const engine = useMemo(() => buildDiscoverOpportunities({
    context: lifeContext,
    profile,
    tasks: tasks.allTasks,
    events: allEvents,
    eventRecommendationInput: {
      ...eventRecommendationInput,
      areaLabel,
    },
    watch: watchSignal,
    sports: sportSignals,
    habits: habitSignals,
    recipe: recipeSignal,
    media: mediaSignals,
    feedback: feedback.feedback,
  }), [
    lifeContext,
    profile,
    tasks.allTasks,
    allEvents,
    eventRecommendationInput,
    areaLabel,
    watchSignal,
    sportSignals,
    habitSignals,
    recipeSignal,
    mediaSignals,
    feedback.feedback,
  ]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      refreshLocation(),
      refetchEvents(),
      football.query.refetch(),
      kitchen.refetchAll(),
      weatherQuery.refetch(),
      mediaQuery.refetch(),
      watchingShow ? showArtworkQuery.refetch() : Promise.resolve(),
      friends.refresh(),
    ]);
  }, [
    refreshLocation,
    refetchEvents,
    football.query,
    kitchen,
    weatherQuery,
    mediaQuery,
    watchingShow,
    showArtworkQuery,
    friends,
  ]);

  return {
    profile,
    areaLabel,
    coords,
    eventsSource,
    eventsLoading,
    allEvents,
    eventRecommendationInput,
    friendEventData,
    friendCount: friends.friends.length,
    lifeContext,
    engine,
    watchSignal,
    sportSignals,
    habitSignals,
    recipeSignal,
    mediaSignals,
    intelligence: {
      stats: intelligence.stats,
      topRecommendations: intelligence.topRecommendations,
      actionableInsights: intelligence.actionableInsights,
      rankedCrossInsights: intelligence.rankedCrossInsights,
      isLoading: intelligence.isLoading,
    },
    saved: {
      isSaved: savedEvents.isSaved,
      toggleSaved: savedEvents.toggleSaved,
      upcomingSaved: savedEvents.upcomingSaved,
      savedSnapshots: savedEvents.savedSnapshots,
    },
    feedback,
    weather: weatherQuery.data ?? null,
    isLoading:
      eventsLoading ||
      (Boolean(watchingShow) && showArtworkQuery.isLoading) ||
      (app.shows.length > 0 && mediaQuery.isLoading),
    refresh,
  };
}
