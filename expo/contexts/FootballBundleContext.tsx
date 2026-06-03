import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/backend/trpc/app-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

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
  manualLeagueIds: readonly number[];
  includeResults: boolean;
}): FootballBundleInput {
  const { favoriteTeamApiIds, nationalTeamApiIds, manualLeagueIds, includeResults } = params;
  return {
    days: BUNDLE_DAYS,
    teamIds: favoriteTeamApiIds.length > 0 ? [...favoriteTeamApiIds] : undefined,
    leagueIds: manualLeagueIds.length > 0 ? [...manualLeagueIds] : undefined,
    nationalTeamIds: nationalTeamApiIds.length > 0 ? [...nationalTeamApiIds] : undefined,
    includeAfcon: nationalTeamApiIds.length > 0 ? true : undefined,
    includeResults,
  };
}

export function FootballBundleProvider({ children }: { children: ReactNode }) {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const scopedKey = useCallback(
    (base: string) => (user?.id ? `${base}_${user.id}` : base),
    [user?.id],
  );

  const [publishedInput, setPublishedInput] = useState<FootballBundleInput | null>(null);
  const [pollLive, setPollLive] = useState(false);
  const [includeResults, setIncludeResults] = useState(false);
  const [manualLeagueIds, setManualLeagueIds] = useState<number[]>([]);

  const favoriteTeamApiIds = useMemo(
    () =>
      (profile?.favoriteTeams ?? [])
        .map((t) => t.apiId)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    [profile?.favoriteTeams],
  );

  const nationalTeamApiIds = useMemo(
    () =>
      (profile?.nationalities ?? [])
        .map((n) => n.apiId)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    [profile?.nationalities],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        let stored = await AsyncStorage.getItem(scopedKey('sports_selected_leagues'));
        if (!stored) {
          const legacy = await AsyncStorage.getItem('sports_selected_leagues');
          if (legacy) stored = legacy;
        }
        if (cancelled || !stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setManualLeagueIds(parsed.filter((id): id is number => typeof id === 'number' && id > 0));
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopedKey]);

  const fallbackInput = useMemo(
    () =>
      buildProfileFallbackInput({
        favoriteTeamApiIds,
        nationalTeamApiIds,
        manualLeagueIds,
        includeResults,
      }),
    [favoriteTeamApiIds, nationalTeamApiIds, manualLeagueIds, includeResults],
  );

  const effectiveInput = publishedInput ?? fallbackInput;

  const query = trpc.football.getMatchesBundle.useQuery(effectiveInput, {
    staleTime: 45 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: publishedInput == null,
    refetchInterval: pollLive ? 60 * 1000 : false,
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
