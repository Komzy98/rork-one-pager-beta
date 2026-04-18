import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import Constants from "expo-constants";
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

const getBaseUrl = () => {
  // First priority: explicit environment variable
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  if (baseUrl && baseUrl.trim().length > 0) {
    const normalized = normalizeBaseUrl(baseUrl);
    console.log("🎯 Using env base URL:", normalized);
    return normalized;
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
      const normalizedHost = host?.split(":")[0];
      if (normalizedHost) {
        const derived = `http://${normalizedHost}:8081`;
        console.log("🎯 Derived base URL from Expo hostUri:", derived);
        return normalizeBaseUrl(derived);
      }
    }
  } catch (e) {
    console.warn("⚠️ Failed to get Expo hostUri:", e);
  }

  const fallbackUrl = "http://localhost:8081";
  console.warn("⚠️ No base URL found, using fallback:", fallbackUrl);
  return fallbackUrl;
};

const getTrpcUrl = () => {
  const base = getBaseUrl();
  const url = appendTrpcPath(base);
  console.log("🔗 tRPC URL:", url);
  return url;
};

export const trpcReactClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getTrpcUrl(),
      maxURLLength: 1500,
      headers: () => {
        return {
          'Content-Type': 'application/json',
        };
      },
      fetch: async (url, options) => {
        const trpcUrl = String(url);
        console.log('🚀 tRPC Request:', trpcUrl.substring(0, 150), options?.method || 'GET');
        
        const maxRetries = 2;
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);
            
            const response = await fetch(trpcUrl, {
              ...options,
              signal: controller.signal,
              mode: 'cors',
              credentials: 'omit',
            });
            
            clearTimeout(timeoutId);
            console.log('✅ tRPC Response status:', response.status);
            
            return response;
          } catch (error: any) {
            lastError = error;
            const isNetworkError = error.message === 'Load failed' || 
                                   error.message === 'Failed to fetch' ||
                                   error.name === 'AbortError';
            
            if (isNetworkError && attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
              console.log(`⚠️ tRPC network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            console.log(`⚠️ tRPC request failed (${attempt + 1}/${maxRetries}):`, error.message || error);
            throw error;
          }
        }
        
        throw lastError || new Error('Failed after retries');
      },
    }),
  ],
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getTrpcUrl(),
      headers: () => {
        return {
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
});
