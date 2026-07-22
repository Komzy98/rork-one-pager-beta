import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const stripKnownSuffixes = (value: string) => {
  const suffixes = ["/api/trpc", "/trpc"];
  const lowerValue = value.toLowerCase();

  for (const suffix of suffixes) {
    if (lowerValue.endsWith(suffix)) {
      const sliceIndex = value.length - suffix.length;
      return value.slice(0, sliceIndex);
    }
  }

  return value;
};

export const normalizeMetroApiBaseUrl = (rawValue: string) => {
  const trimmed = stripTrailingSlashes(rawValue.trim());
  return stripKnownSuffixes(trimmed);
};

/**
 * iOS + Metro: `localhost` can resolve to ::1 while the packager listens on IPv4, causing
 * "TypeError: Network request failed". On the iOS *simulator*, LAN hostUri hosts can
 * be rewritten to 127.0.0.1 to reliably reach the dev server on the host Mac.
 */
export const normalizeDevMetroApiBaseUrl = (
  url: string,
  options: { rewritePrivateLanToLoopbackOnIosSim?: boolean } = {},
) => {
  if (Platform.OS === "web" || typeof __DEV__ === "undefined" || !__DEV__) {
    return url;
  }

  const { rewritePrivateLanToLoopbackOnIosSim = false } = options;

  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "[::1]") {
      u.hostname = "127.0.0.1";
      return u.origin;
    }
    if (
      rewritePrivateLanToLoopbackOnIosSim &&
      Platform.OS === "ios" &&
      !Device.isDevice
    ) {
      const h = u.hostname;
      const isPrivate =
        /^192\.168\./.test(h) ||
        /^10\./.test(h) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(h);
      if (isPrivate) {
        u.hostname = "127.0.0.1";
        return u.origin;
      }
    }
  } catch {
    return url;
  }
  return url;
};

/** Metro-embedded API root (no `/api/trpc` suffix). Used by tRPC and dev Supabase proxy. */
export function getMetroApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (baseUrl && baseUrl.trim().length > 0) {
    const normalized = normalizeMetroApiBaseUrl(baseUrl);
    return normalizeDevMetroApiBaseUrl(normalized);
  }

  if (typeof window !== "undefined" && window.location) {
    try {
      const origin = `${window.location.protocol}//${window.location.host}`;
      return normalizeMetroApiBaseUrl(origin);
    } catch {
      /* fall through */
    }
  }

  try {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.expoGoConfig as { hostUri?: string } | null | undefined)?.hostUri;
    if (hostUri) {
      const [host] = hostUri.split("/");
      const [normalizedHost, hostPort] = host?.split(":") ?? [];
      if (normalizedHost) {
        const derivedPort = hostPort && /^\d+$/.test(hostPort) ? hostPort : "8081";
        const derived = `http://${normalizedHost}:${derivedPort}`;
        return normalizeDevMetroApiBaseUrl(normalizeMetroApiBaseUrl(derived), {
          rewritePrivateLanToLoopbackOnIosSim: true,
        });
      }
    }
  } catch {
    /* fall through */
  }

  return normalizeDevMetroApiBaseUrl("http://localhost:8081");
}
