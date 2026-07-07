import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import { getMetroApiBaseUrl } from "@/utils/metroApiBaseUrl";

export const trpc = createTRPCReact<AppRouter>();

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

const getTrpcUrl = () => {
  const base = getMetroApiBaseUrl();
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("🎯 Metro API base URL:", base);
  }
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
