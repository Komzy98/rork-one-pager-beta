import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

/** Same suffix stripping as `lib/trpc.ts` so Railway root URLs work for Younify auth too. */
export function normalizeYounifyAuthBaseUrl(rawValue: string): string {
  let trimmed = stripTrailingSlashes(rawValue.trim());
  const lower = trimmed.toLowerCase();
  for (const suffix of ["/api/trpc", "/trpc", "/api"]) {
    if (lower.endsWith(suffix)) {
      trimmed = trimmed.slice(0, trimmed.length - suffix.length);
      break;
    }
  }
  return stripTrailingSlashes(trimmed);
}

/**
 * Base URL for Younify token minting (`/create-younify-user`, etc.).
 *
 * - **Production / TestFlight:** set `EXPO_PUBLIC_YOUNIFY_AUTH_URL` on EAS (or rely on
 *   `EXPO_PUBLIC_RORK_API_BASE_URL` when auth routes are mounted on the same Railway service).
 * - **Simulator dev:** `http://127.0.0.1:3000` (run `npm run dev` to start auth + Metro).
 * - **Physical device dev:** Metro LAN host on port 3000, or set `EXPO_PUBLIC_YOUNIFY_AUTH_URL`.
 */
export function getYounifyAuthBackendBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = [extra?.younifyAuthUrl, extra?.younifyBackendUrl]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .find((s) => s.length > 0);
  const fromEnv = process.env.EXPO_PUBLIC_YOUNIFY_AUTH_URL?.trim();
  const explicit = fromEnv || fromExtra;
  if (explicit) {
    return normalizeYounifyAuthBaseUrl(explicit);
  }

  const rorkApi = process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.trim();
  const useRemoteInDev =
    process.env.EXPO_PUBLIC_YOUNIFY_AUTH_USE_METRO_HOST === "1" ||
    process.env.EXPO_PUBLIC_YOUNIFY_AUTH_USE_LAN === "1";

  if (rorkApi && (!__DEV__ || Device.isDevice || useRemoteInDev)) {
    return normalizeYounifyAuthBaseUrl(rorkApi);
  }

  const forceMetroLanHost = useRemoteInDev;

  if (__DEV__ && !forceMetroLanHost && !Device.isDevice) {
    if (Platform.OS === "ios") return "http://127.0.0.1:3000";
    if (Platform.OS === "android") return "http://10.0.2.2:3000";
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri || (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost || "";
  const host = debuggerHost.split(":")[0];
  if (host && __DEV__) {
    return `http://${host}:3000`;
  }

  if (!__DEV__ && Device.isDevice) {
    throw new Error(
      "Missing EXPO_PUBLIC_YOUNIFY_AUTH_URL for production builds. Set it on EAS to your deployed auth URL (no localhost on device).",
    );
  }

  return "http://127.0.0.1:3000";
}

/** True when the app expects a local Younify auth process (simulator / emulator dev). */
export function expectsLocalYounifyAuthServer(): boolean {
  if (!__DEV__) return false;
  if (process.env.EXPO_PUBLIC_YOUNIFY_AUTH_URL?.trim()) return false;
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.trim() && Device.isDevice) return false;
  return !Device.isDevice;
}

export const YOUNIFY_AUTH_DEV_START_COMMAND = "npm run dev";

export async function checkYounifyAuthHealth(baseUrl?: string): Promise<boolean> {
  const base = baseUrl ?? getYounifyAuthBackendBaseUrl();
  const healthPaths = ["/health", "/health/younify"];
  for (const path of healthPaths) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${base}${path}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return true;
    } catch {
      /* try next path */
    }
  }
  return false;
}
