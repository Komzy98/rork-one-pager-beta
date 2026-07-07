import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkYounifyAuthHealth,
  expectsLocalYounifyAuthServer,
  getYounifyAuthBackendBaseUrl,
} from "@/utils/younifyAuthUrl";

export type YounifyAuthHealthState = {
  /** null = still checking */
  healthy: boolean | null;
  baseUrl: string;
  expectsLocal: boolean;
  recheck: () => Promise<boolean>;
};

export function useYounifyAuthHealth(enabled = true): YounifyAuthHealthState {
  const expectsLocal = expectsLocalYounifyAuthServer();
  const baseUrl = getYounifyAuthBackendBaseUrl();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const mounted = useRef(true);

  const recheck = useCallback(async () => {
    if (!enabled) return false;
    setHealthy(null);
    const ok = await checkYounifyAuthHealth(baseUrl);
    if (mounted.current) setHealthy(ok);
    return ok;
  }, [enabled, baseUrl]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled || !expectsLocal) {
      setHealthy(true);
      return () => {
        mounted.current = false;
      };
    }

    void recheck();
    const id = setInterval(() => {
      void recheck();
    }, 8000);

    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [enabled, expectsLocal, recheck]);

  return { healthy, baseUrl, expectsLocal, recheck };
}
