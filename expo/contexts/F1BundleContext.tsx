import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/backend/trpc/app-router';
import { trpc } from '@/lib/trpc';

export type F1SeasonBundle = inferRouterOutputs<AppRouter>['f1']['getSeasonBundle'];
export type F1LiveWeekend = inferRouterOutputs<AppRouter>['f1']['getLiveWeekend'];
type F1SeasonInput = inferRouterInputs<AppRouter>['f1']['getSeasonBundle'];

type F1Query<T> = {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: { message?: string } | null;
  refetch: () => Promise<unknown>;
};

type F1BundleContextValue = {
  season: F1Query<F1SeasonBundle>;
  live: F1Query<F1LiveWeekend>;
  setPollLive: (poll: boolean) => void;
  refetchAll: () => Promise<void>;
};

const F1BundleContext = createContext<F1BundleContextValue | null>(null);

const DEFAULT_INPUT: F1SeasonInput = { year: new Date().getFullYear() };

export function F1BundleProvider({ children }: { children: ReactNode }) {
  const [pollLive, setPollLive] = useState(false);

  const season = trpc.f1.getSeasonBundle.useQuery(DEFAULT_INPUT, {
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const live = trpc.f1.getLiveWeekend.useQuery(DEFAULT_INPUT, {
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      if (!pollLive) return false;
      return query.state.data?.isSessionLive ? 20_000 : 5 * 60 * 1000;
    },
  });

  const refetchAll = useCallback(async () => {
    await Promise.all([season.refetch(), live.refetch()]);
  }, [season, live]);

  const value = useMemo<F1BundleContextValue>(
    () => ({
      season: season as F1Query<F1SeasonBundle>,
      live: live as F1Query<F1LiveWeekend>,
      setPollLive,
      refetchAll,
    }),
    [season, live, refetchAll],
  );

  return <F1BundleContext.Provider value={value}>{children}</F1BundleContext.Provider>;
}

export function useF1Bundle() {
  const ctx = useContext(F1BundleContext);
  if (!ctx) {
    throw new Error('useF1Bundle must be used within F1BundleProvider');
  }
  return ctx;
}
