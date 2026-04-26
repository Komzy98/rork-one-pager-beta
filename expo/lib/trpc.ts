import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

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

const normalizeBaseUrl = (rawValue: string) => {
  const trimmed = stripTrailingSlashes(rawValue.trim());
  return stripKnownSuffixes(trimmed);
};

const appendTrpcPath = (base: string) => {
  const lowerBase = base.toLowerCase();

  if (lowerBase.endsWith("/api/trpc") || lowerBase.endsWith("/trpc")) {
    return base;
  }

  if (lowerBase.endsWith("/api")) {
    return `${base}/trpc`;
  }

  return `${base}/api/trpc`;
};

/**
 * iOS + Metro: `localhost` can resolve to ::1 while the packager listens on IPv4, causing
 * "TypeError: Network request failed". On the iOS *simulator*, LAN hostUri hosts can
 * be rewritten to 127.0.0.1 to reliably reach the dev server on the host Mac.
 */
const normalizeDevBaseUrl = (
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

const getBaseUrl = () => {
  // First priority: explicit environment variable
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (baseUrl && baseUrl.trim().length > 0) {
    const normalized = normalizeBaseUrl(baseUrl);
    console.log("🎯 Using env base URL:", normalized);
    return normalizeDevBaseUrl(normalized);
  }

  // Second priority: window.location for web
  if (typeof window !== "undefined" && window.location) {
    try {
      const origin = `${window.location.protocol}//${window.location.host}`;
      console.log("🎯 Using window.location origin:", origin);
      return normalizeBaseUrl(origin);
    } catch (e) {
      console.warn("⚠️ Failed to get window.location:", e);
    }
  }

  // Third priority: Expo host URI for native development
  try {
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri;
    if (hostUri) {
      const [host] = hostUri.split("/");
      const [normalizedHost, hostPort] = host?.split(":") ?? [];
      if (normalizedHost) {
        const derivedPort = hostPort && /^\d+$/.test(hostPort) ? hostPort : "8081";
        const derived = `http://${normalizedHost}:${derivedPort}`;
        console.log("🎯 Derived base URL from Expo hostUri:", derived);
        return normalizeDevBaseUrl(normalizeBaseUrl(derived), {
          rewritePrivateLanToLoopbackOnIosSim: true,
        });
      }
    }
  } catch (e) {
    console.warn("⚠️ Failed to get Expo hostUri:", e);
  }

  const fallbackUrl = "http://localhost:8081";
  console.warn("⚠️ No base URL found, using fallback:", fallbackUrl);
  return normalizeDevBaseUrl(fallbackUrl);
};

const getTrpcUrl = () => {
  const base = getBaseUrl();
  const url = appendTrpcPath(base);
  console.log("🔗 tRPC URL:", url);
  return url;
};

async function trpcFetchWithRetries(
  trpcUrl: string,
  init: RequestInit | undefined,
  logLabel: string,
): Promise<Response> {
  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(trpcUrl, {
        ...init,
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
      });

      clearTimeout(timeoutId);
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log(`✅ tRPC ${logLabel} status:`, response.status);
      }

      const contentType = response.headers.get("content-type") || "";
      const looksLikeHtml = contentType.includes("text/html");

      if (
        looksLikeHtml &&
        attempt < maxRetries - 1
      ) {
        const delay = Math.min(1500 * Math.pow(2, attempt), 8000);
        console.log(
          `⚠️ tRPC ${logLabel} returned HTML (not JSON), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        try {
          await response.text();
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (
        (response.status === 429 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt < maxRetries - 1
      ) {
        const delay = Math.min(1500 * Math.pow(2, attempt), 8000);
        console.log(
          `⚠️ tRPC ${logLabel} got ${response.status}${looksLikeHtml ? " (HTML)" : ""}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        try {
          await response.text();
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;
      const isNetworkError =
        error.message === "Load failed" ||
        error.message === "Failed to fetch" ||
        error.name === "AbortError" ||
        error.name === "TypeError";

      if (isNetworkError && attempt < maxRetries - 1) {
        const delay = Math.min(1500 * Math.pow(2, attempt), 8000);
        console.log(
          `⚠️ tRPC ${logLabel} network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.log(`⚠️ tRPC ${logLabel} failed (${attempt + 1}/${maxRetries}):`, error.message || error);
      throw error;
    }
  }

  throw lastError || new Error("Failed after retries");
}

export const trpcReactClient = trpc.createClient({
  links: [
    /** Per-procedure requests avoid batched URLs that Metro sometimes answers with HTML. */
    httpLink({
      url: getTrpcUrl(),
      headers: () => ({
        "Content-Type": "application/json",
      }),
      fetch: (url, options) => {
        const trpcUrl = String(url);
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log("🚀 tRPC Request:", trpcUrl.substring(0, 180), options?.method || "GET");
        }
        return trpcFetchWithRetries(trpcUrl, options, "react");
      },
    }),
  ],
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: getTrpcUrl(),
      headers: () => ({
        "Content-Type": "application/json",
      }),
      fetch: (url, options) => trpcFetchWithRetries(String(url), options, "client"),
    }),
  ],
});
