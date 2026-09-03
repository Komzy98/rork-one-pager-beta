import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  getStepAuthorizationRequestStatus,
  getTodaySteps,
  isAppleHealthAvailable,
  requestStepAuthorization as requestNativeStepAuthorization,
} from '@/modules/one-pager-health';

const STEP_ACCESS_REQUESTED_KEY = 'onepager:health:step-access-requested:v1';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type HealthConnectionState = 'unavailable' | 'not_requested' | 'requested' | 'error';

export interface HealthContextValue {
  isAppleHealthAvailable: boolean;
  connectionState: HealthConnectionState;
  permissionRequested: boolean;
  stepsToday: number | null;
  hasStepData: boolean;
  isLoading: boolean;
  lastUpdatedAt: string | null;
  error: string | null;
  requestStepAccess: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const HealthContext = createContext<HealthContextValue | null>(null);

export function HealthContextProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [connectionState, setConnectionState] = useState<HealthConnectionState>('unavailable');
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const healthAvailable = isAppleHealthAvailable();
      setAvailable(healthAvailable);

      if (!healthAvailable) {
        setConnectionState('unavailable');
        setStepsToday(null);
        return;
      }

      const [requestStatus, storedRequested] = await Promise.all([
        getStepAuthorizationRequestStatus(),
        AsyncStorage.getItem(STEP_ACCESS_REQUESTED_KEY),
      ]);

      const permissionRequested = storedRequested === 'true' || requestStatus === 'unnecessary';
      if (!permissionRequested) {
        setConnectionState('not_requested');
        setStepsToday(null);
        return;
      }

      setConnectionState('requested');
      const steps = await getTodaySteps();
      setStepsToday(steps);
      setLastUpdatedAt(new Date().toISOString());
    } catch (cause) {
      setConnectionState('error');
      setStepsToday(null);
      setError(cause instanceof Error ? cause.message : 'Apple Health could not be refreshed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestStepAccess = useCallback(async () => {
    if (!isAppleHealthAvailable()) return false;
    setIsLoading(true);
    setError(null);

    try {
      const completed = await requestNativeStepAuthorization();
      if (!completed) {
        setError('Apple Health did not complete the permission request.');
        return false;
      }

      // HealthKit does not expose whether read access itself was granted. Remember
      // only that the user completed the system permission flow, then query safely.
      await AsyncStorage.setItem(STEP_ACCESS_REQUESTED_KEY, 'true');
      await refresh();
      return true;
    } catch (cause) {
      setConnectionState('error');
      setError(cause instanceof Error ? cause.message : 'Apple Health permission could not be requested.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });

    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    if (connectionState !== 'requested') return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [connectionState, refresh]);

  const value = useMemo<HealthContextValue>(() => ({
    isAppleHealthAvailable: available,
    connectionState,
    permissionRequested: connectionState === 'requested',
    stepsToday,
    hasStepData: stepsToday != null,
    isLoading,
    lastUpdatedAt,
    error,
    requestStepAccess,
    refresh,
  }), [available, connectionState, error, isLoading, lastUpdatedAt, refresh, requestStepAccess, stepsToday]);

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealthContext(): HealthContextValue {
  const value = useContext(HealthContext);
  if (!value) {
    throw new Error('useHealthContext must be used within HealthContextProvider');
  }
  return value;
}
