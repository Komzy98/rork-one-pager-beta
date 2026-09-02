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
import { useYounifyAuthHealth } from '@/hooks/useYounifyAuthHealth';
import { useFootballBundle } from '@/contexts/FootballBundleContext';
import { useF1Bundle } from '@/contexts/F1BundleContext';
import { useDiscoverFeedback } from '@/hooks/useDiscoverFeedback';

import { apiFixturesToLiveFootballMatches } from '@/utils/footballFixtureTransform';
import { fetchNBAGamesMultipleDays } from '@/utils/nbaApi';
import { getCurrentWeather } from '@/utils/weatherApi';
import {
  fetchYounifyBrowseSections,
  getYounifyStreamingContentPosterUrl,
} from '@/services/younify';
import {
  fetchDiscoverMediaPicks,
  resolveDiscoverShowArtwork,
} from '@/utils/discoverMedia';
import { formatShowEpisodeLabel, formatYounifyContinueEpisodeLabel } from '@/utils/showEpisodeLabel';
import {
  buildDiscoverLifeContext,
  buildDiscoverOpportunities,
  type DiscoverHabitSignal,
  type DiscoverMediaSignal,
  type DiscoverOpportunity,
  type DiscoverRecipeSignal,
  type DiscoverSportSignal,
  type DiscoverWatchSignal,
} from '@/utils/discoverLifeEngine';
import { rerankDiscoverEngine } from '@/utils/discoverBehavioralBoosts';

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function younifyTitle(row: Record<string, unknown> | null | undefined) {
  if (!row) return '';
  const candidates = [row.showTitle, row.title, row.name, row.Title, row.Name];
  for (const value of candidates) {
    const text = stringValue(value);
    if (text) return text;
  }
  if (Array.isArray(row.path)) {
    for (const value of [...row.path].reverse()) {
      const text = stringValue(value);
      if (text) return text;
    }
  }
  return '';
}

function younifyServiceName(row: Record<string, unknown> | null | undefined) {
  const service = row?.younifySourceService;
  if (!service || typeof service !== 'object') return '';
  return stringValue((service as Record<string, unknown>).name);
}

function younifyMediaType(row: Record<string, unknown>): 'movie' | 'tv' {
  const raw = normalize(String(row.mediaType ?? row.media_type ?? row.type ?? row.contentType ?? ''));
  return raw.includes('movie') || raw.includes('film') ? 'movie' : 'tv';
}

export function useDiscoverLifeContext() {
  const { profile } = useUserProfile();
  const { coords, areaLabel, refresh: refreshLocation } = useUserLocation();
  const app = useAppSafe();
  const tasks = useTasksSafe();
  const busyMode = useBusyModeSafe();
  const intelligence = useActivityIntelligence();
  const friends = useFriends();
  const younifyHealth = useYounifyAuthHealth(Boolean(process.env.EXPO_PUBLIC_YOUNIFY_SDK_KEY));

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
  const f1 = useF1Bundle();

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

  const younifyQuery = useQuery({
    queryKey: ['discover-v3', 'younify-browse'],
    queryFn: async () => {
      const sections = await fetchYounifyBrowseSections();
      const continueRows = sections.find((section) => section.id === 'continue')?.items ?? [];
      const recommended = sections.find((section) => section.id === 'recommended')?.items ?? [];
      const trending = sections.find((section) => section.id === 'trending')?.items ?? [];
      return {
        continueRows: continueRows as Record<string, unknown>[],
        discoveryRows: [...recommended, ...trending] as Record<string, unknown>[],
      };
    },
    enabled: Boolean(process.env.EXPO_PUBLIC_YOUNIFY_SDK_KEY) && younifyHealth.healthy === true,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  const nbaRelevant = useMemo(
    () =>
      (profile?.favoriteNBATeams?.length ?? 0) > 0 ||
      (profile?.interests ?? []).some((interest) => /(^|\s)nba($|\s)|basketball/i.test(interest)) ||
      profile?.sportsFeedPrefs?.discoveryLevel === 'high',
    [profile?.favoriteNBATeams, profile?.interests, profile?.sportsFeedPrefs?.discoveryLevel],
  );

  const nbaQuery = useQuery({
    queryKey: ['discover-v3', 'nba-games'],
    queryFn: () => fetchNBAGamesMultipleDays(1, 7),
    enabled: nbaRelevant,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const weatherQuery = useQuery({
    queryKey: ['discover-v3', 'weather', coords.latitude.toFixed(2), coords.longitude.toFixed(2)],
    queryFn: () => getCurrentWeather(coords.latitude, coords.longitude),
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  const localWatchSignal = useMemo<DiscoverWatchSignal | null>(() => {
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

  const younifyWatchSignal = useMemo<DiscoverWatchSignal | null>(() => {
    const row = younifyQuery.data?.continueRows?.[0];
    if (!row) return null;
    const title = younifyTitle(row);
    if (!title) return null;
    const id = stringValue(row.itemID ?? row.itemId ?? row.id) || normalize(title);
    return {
      id: `younify-${id}`,
      title,
      platform: younifyServiceName(row) || undefined,
      episodeLabel: formatYounifyContinueEpisodeLabel(row),
      posterUrl: getYounifyStreamingContentPosterUrl(row),
      backdropUrl: null,
      rating: null,
    };
  }, [younifyQuery.data?.continueRows]);

  const watchSignal = useMemo<DiscoverWatchSignal | null>(() => {
    if (!younifyWatchSignal) return localWatchSignal;
    if (localWatchSignal && normalize(localWatchSignal.title) === normalize(younifyWatchSignal.title)) {
      return {
        ...younifyWatchSignal,
        posterUrl: younifyWatchSignal.posterUrl ?? localWatchSignal.posterUrl,
        backdropUrl: localWatchSignal.backdropUrl,
        rating: localWatchSignal.rating,
      };
    }
    return younifyWatchSignal;
  }, [localWatchSignal, younifyWatchSignal]);

  const liveFootball = useMemo(() => {
    const live = apiFixturesToLiveFootballMatches(football.query.data?.live?.response ?? []);
    const upcoming = apiFixturesToLiveFootballMatches(football.query.data?.upcoming?.response ?? []);
    return [...live, ...upcoming];
  }, [football.query.data]);

  const footballSignals = useMemo<DiscoverSportSignal[]>(() => {
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

    return [...fromLive, ...fromStored];
  }, [app.sports, liveFootball, profile?.favoriteTeams]);

  const nbaSignals = useMemo<DiscoverSportSignal[]>(() => {
    const favorites = profile?.favoriteNBATeams ?? [];
    const games = [...(nbaQuery.data?.live ?? []), ...(nbaQuery.data?.upcoming ?? [])];
    return games.map((game) => {
      const favorite = favorites.find((team) => {
        const abbreviation = team.abbreviation.toLowerCase();
        return (
          abbreviation === game.team1.abbreviation.toLowerCase() ||
          abbreviation === game.team2.abbreviation.toLowerCase() ||
          normalize(game.team1.name).includes(normalize(team.name)) ||
          normalize(game.team2.name).includes(normalize(team.name))
        );
      });
      return {
        id: `nba-${game.id}`,
        homeTeam: game.team1.name,
        awayTeam: game.team2.name,
        league: game.season || 'NBA',
        date: game.date,
        time: game.startTime,
        status: game.status === 'live' ? 'Live' : 'Upcoming',
        homeScore: game.team1.score,
        awayScore: game.team2.score,
        homeTeamLogo: game.team1.logo,
        awayTeamLogo: game.team2.logo,
        favoriteTeamName: favorite?.name,
      };
    });
  }, [nbaQuery.data, profile?.favoriteNBATeams]);

  const sportSignals = useMemo<DiscoverSportSignal[]>(
    () => [...footballSignals, ...nbaSignals]
      .sort((a, b) => {
        if (a.status === 'Live' && b.status !== 'Live') return -1;
        if (b.status === 'Live' && a.status !== 'Live') return 1;
        if (a.favoriteTeamName && !b.favoriteTeamName) return -1;
        if (b.favoriteTeamName && !a.favoriteTeamName) return 1;
        const ta = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      })
      .slice(0, 16),
    [footballSignals, nbaSignals],
  );

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

  const tmdbMediaSignals = useMemo<DiscoverMediaSignal[]>(
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

  const younifyMediaSignals = useMemo<DiscoverMediaSignal[]>(() => {
    const known = new Set(app.shows.map((show) => normalize(show.title)));
    const seen = new Set<string>();
    const out: DiscoverMediaSignal[] = [];
    for (const row of younifyQuery.data?.discoveryRows ?? []) {
      const title = younifyTitle(row);
      const normalizedTitle = normalize(title);
      if (!title || known.has(normalizedTitle) || seen.has(normalizedTitle)) continue;
      seen.add(normalizedTitle);
      const id = stringValue(row.itemID ?? row.itemId ?? row.id) || normalizedTitle;
      const service = younifyServiceName(row);
      const rawRating = Number(row.rating ?? row.score ?? 0);
      out.push({
        id: `younify-${id}`,
        title,
        posterUrl: getYounifyStreamingContentPosterUrl(row),
        backdropUrl: null,
        rating: Number.isFinite(rawRating) && rawRating > 0 ? rawRating : null,
        mediaType: younifyMediaType(row),
        reason: service ? `Available on ${service}` : 'From your connected streaming services',
      });
      if (out.length >= 8) break;
    }
    return out;
  }, [app.shows, younifyQuery.data?.discoveryRows]);

  const mediaSignals = useMemo<DiscoverMediaSignal[]>(() => {
    const seen = new Set<string>();
    return [...younifyMediaSignals, ...tmdbMediaSignals]
      .filter((pick) => {
        const key = normalize(pick.title);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 14);
  }, [tmdbMediaSignals, younifyMediaSignals]);

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

  const f1Opportunity = useMemo<DiscoverOpportunity | null>(() => {
    const weekend = f1.live.data;
    const session = weekend?.activeSession ?? weekend?.nextSession;
    if (!session || !weekend?.meetingLabel) return null;
    const f1Interest = (profile?.interests ?? []).some((interest) => /(^|\s)f1($|\s)|formula\s*1|formula one/i.test(interest));
    if (!f1Interest && !weekend.isSessionLive) return null;
    const startsAt = new Date(session.dateStart);
    const hoursUntil = Number.isFinite(startsAt.getTime())
      ? (startsAt.getTime() - lifeContext.now.getTime()) / 3_600_000
      : null;
    let score = weekend.isSessionLive ? 116 : f1Interest ? 78 : 55;
    if (hoursUntil != null && hoursUntil >= 0 && hoursUntil <= 24) score += 15;
    const reasons = [
      ...(f1Interest ? ['Because you’re into Formula 1'] : []),
      ...(weekend.isSessionLive ? ['Live right now'] : hoursUntil != null && hoursUntil <= 24 ? ['This race weekend is happening now'] : []),
    ];
    return {
      id: `f1-${weekend.meetingKey}-${session.sessionKey}`,
      key: `sport:f1-${weekend.meetingKey}-${session.sessionKey}`,
      kind: 'sport',
      title: `${weekend.meetingLabel} · ${session.sessionName}`,
      subtitle: [session.circuitShortName, session.countryName].filter(Boolean).join(' · '),
      eyebrow: weekend.isSessionLive ? 'F1 LIVE NOW' : 'RACE WEEKEND',
      reasons: reasons.length ? reasons : ['Formula 1 race weekend'],
      score,
      route: '/(tabs)/sports',
      actionLabel: weekend.isSessionLive ? 'Follow live' : 'Open F1',
      accent: '#E10600',
      startsAt: Number.isFinite(startsAt.getTime()) ? startsAt : null,
      durationMinutes: 120,
    };
  }, [f1.live.data, lifeContext.now, profile?.interests]);

  const rawEngine = useMemo(() => buildDiscoverOpportunities({
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

  const engine = useMemo(() => {
    const withLiveSport = f1Opportunity
      ? { ...rawEngine, ranked: [...rawEngine.ranked, f1Opportunity] }
      : rawEngine;
    return rerankDiscoverEngine({
      engine: withLiveSport,
      context: lifeContext,
      profile,
      tasks: tasks.allTasks,
      feedback: feedback.feedback,
    });
  }, [rawEngine, f1Opportunity, lifeContext, profile, tasks.allTasks, feedback.feedback]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      refreshLocation(),
      refetchEvents(),
      football.query.refetch(),
      f1.refetchAll(),
      kitchen.refetchAll(),
      weatherQuery.refetch(),
      mediaQuery.refetch(),
      nbaRelevant ? nbaQuery.refetch() : Promise.resolve(),
      younifyQuery.isEnabled ? younifyQuery.refetch() : Promise.resolve(),
      watchingShow ? showArtworkQuery.refetch() : Promise.resolve(),
      friends.refresh(),
    ]);
  }, [
    refreshLocation,
    refetchEvents,
    football.query,
    f1,
    kitchen,
    weatherQuery,
    mediaQuery,
    nbaRelevant,
    nbaQuery,
    younifyQuery,
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
    streaming: {
      connectedFeedAvailable: Boolean(younifyQuery.data),
      isLoading: younifyQuery.isLoading,
      authHealthy: younifyHealth.healthy,
    },
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
