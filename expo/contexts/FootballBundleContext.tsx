import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/backend/trpc/app-router';
import { trpc } from '@/lib/trpc';
import { useUserProfile } from '@/hooks/useUserProfile';
import { collectNationalTeamApiIds, collectNationalTeamNames } from '@/utils/nationalTeamApiIds';
import {
  mergeFollowedClubTeamIds,
  mergeFollowedNationalTeamIds,
} from '@/utils/footballQueryContext';

export type FootballBundleInput = inferRouterInputs<AppRouter>['football']['getMatchesBundle'];
export type FootballMatchesBundleData = inferRouterOutputs<AppRouter>['football']['getMatchesBundle'];

type FootballBundleQuery = {
  data: FootballMatchesBundleData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isFetched: boolean;
  status: 'error' | 'success' | 'pending';
  error: { message?: string } | null;
  refetch: () => Promise<unknown>;
};

type FootballBundleContextValue = {
  query: FootballBundleQuery;
  /** Sports tab publishes the active bundle input so Activities shares the same React Query cache. */
  publishBundleInput: (input: FootballBundleInput | null) => void;
  setPollLive: (poll: boolean) => void;
  requestIncludeResults: () => void;
};

const FootballBundleContext = createContext<FootballBundleContextValue | null>(null);

const BUNDLE_DAYS = 14;

function buildProfileFallbackInput(params: {
  favoriteTeamApiIds: readonly number[];
  nationalTeamApiIds: readonly number[];
  nationalTeamNames: readonly string[];
  includeResults: boolean;
}): FootballBundleInput {
  const { favoriteTeamApiIds, nationalTeamApiIds, nationalTeamNames, includeResults } = params;
  return {
    days: BUNDLE_DAYS,
    teamIds: favoriteTeamApiIds.length > 0 ? [...favoriteTeamApiIds] : undefined,
    nationalTeamIds: nationalTeamApiIds.length > 0 ? [...nationalTeamApiIds] : undefined,
    nationalTeamNames: nationalTeamNames.length > 0 ? [...nationalTeamNames] : undefined,
    includeAfcon: nationalTeamNames.length > 0 || nationalTeamApiIds.length > 0 ? true : undefined,
    includeResults,
  };
}

export function FootballBundleProvider({ children }: { children: ReactNode }) {
  const { profile } = useUserProfile();

  const [publishedInput, setPublishedInput] = useState<FootballBundleInput | null>(null);
  const [pollLive, setPollLive] = useState(false);
  const [includeResults, setIncludeResults] = useState(false);

  const favoriteTeamApiIds = useMemo(
    () =>
      (profile?.favoriteTeams ?? [])
        .map((t) => t.apiId)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    [profile?.favoriteTeams],
  );

  const nationalTeamApiIds = useMemo(
    () => collectNationalTeamApiIds(profile?.nationalities),
    [profile?.nationalities],
  );

  const nationalTeamNames = useMemo(
    () => collectNationalTeamNames(profile?.nationalities),
    [profile?.nationalities],
  );

  const fallbackInput = useMemo(
    () =>
      buildProfileFallbackInput({
        favoriteTeamApiIds,
        nationalTeamApiIds,
        nationalTeamNames,
        includeResults,
      }),
    [favoriteTeamApiIds, nationalTeamApiIds, nationalTeamNames, includeResults],
  );

  const effectiveInput = useMemo(() => {
    const base = publishedInput ?? fallbackInput;
    const withTeams = mergeFollowedNationalTeamIds(
      mergeFollowedClubTeamIds(base, favoriteTeamApiIds),
      nationalTeamApiIds,
    );
    const mergedNationalNames = Array.from(
      new Set([...(withTeams.nationalTeamNames ?? []), ...nationalTeamNames]),
    );
    return {
      ...withTeams,
      nationalTeamNames: mergedNationalNames.length > 0 ? mergedNationalNames : undefined,
      includeAfcon:
        withTeams.includeAfcon ?? (mergedNationalNames.length > 0 ? true : undefined),
    };
  }, [publishedInput, fallbackInput, favoriteTeamApiIds, nationalTeamApiIds, nationalTeamNames]);

  const query = trpc.football.getMatchesBundle.useQuery(effectiveInput, {
    staleTime: 45 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: publishedInput == null,
    refetchInterval: pollLive ? 60 * 1000 : false,
    placeholderData: keepPreviousData,
  });

  const publishBundleInput = useCallback((input: FootballBundleInput | null) => {
    setPublishedInput(input);
  }, []);

  const requestIncludeResults = useCallback(() => {
    setIncludeResults(true);
  }, []);

  const value = useMemo<FootballBundleContextValue>(
    () => ({
      query: query as FootballBundleQuery,
      publishBundleInput,
      setPollLive,
      requestIncludeResults,
    }),
    [query, publishBundleInput, requestIncludeResults],
  );

  return <FootballBundleContext.Provider value={value}>{children}</FootballBundleContext.Provider>;
}

export function useFootballBundle() {
  const ctx = useContext(FootballBundleContext);
  if (!ctx) {
    throw new Error('useFootballBundle must be used within FootballBundleProvider');
  }
  return ctx;
}
