import Constants from "expo-constants";
import {
    Connect,
    ConnectOptions,
    LogLevel,
    StreamingCategories,
    type TokenHandler,
  } from "react-native-younify-connect-sdk";

  const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const stripKnownSuffixes = (value: string) => {
  const suffixes = ["/api/trpc", "/trpc", "/api"];
  const lower = value.toLowerCase();
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix)) {
      return value.slice(0, value.length - suffix.length);
    }
  }
  return value;
};

const getApiBaseUrl = () => {
  const envBase = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) {
    return `${stripKnownSuffixes(stripTrailingSlashes(envBase.trim()))}/api`;
  }

  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}/api`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    "";
  const host = hostUri.split("/")[0]?.split(":")[0];
  if (host) {
    return `http://${host}:8081/api`;
  }
  return "http://localhost:8081/api";
};

const YOUNIFY_AUTH_BACKEND_URL = getApiBaseUrl();

  let configured = false;
  let younifyUserId: string | null = null;
let younifyAccessToken: string | null = null;
let younifyRefreshToken: string | null = null;

async function createYounifyUserTokens() {
  console.log("Calling Younify backend:", `${YOUNIFY_AUTH_BACKEND_URL}/younify/create-user`);

  const response = await fetch(`${YOUNIFY_AUTH_BACKEND_URL}/younify/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      externalUserId: "one-pager-dev-user",
    }),
  });

  const data = await response.json();
  console.log("Backend token response:", data);

  
  if (!response.ok) {
    throw new Error(data?.error || "Failed to create Younify user tokens");
  }

  if (!data.userId || !data.accessToken || !data.refreshToken) {
    throw new Error("Backend did not return Younify user tokens");
  }

  younifyUserId = data.userId;
  younifyAccessToken = data.accessToken;
  younifyRefreshToken = data.refreshToken;

  return {
    userId: data.userId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

async function refreshYounifyUserTokens() {
  if (!younifyUserId) {
    throw new Error("Missing Younify user ID for token refresh");
  }

  const response = await fetch(`${YOUNIFY_AUTH_BACKEND_URL}/younify/refresh-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: younifyUserId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Failed to refresh Younify user tokens");
  }

  if (!data.accessToken || !data.refreshToken) {
    throw new Error("Backend did not return refreshed Younify tokens");
  }

  younifyAccessToken = data.accessToken;
  younifyRefreshToken = data.refreshToken;

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}
  
  export async function configureYounify() {
    if (configured) return Connect.shared;
  
    const sdkKey =
  Constants.expoConfig?.extra?.younifySdkKey ??
  process.env.EXPO_PUBLIC_YOUNIFY_SDK_KEY;
  
    if (!sdkKey) {
      throw new Error("Missing EXPO_PUBLIC_YOUNIFY_SDK_KEY");
    }
    const tokens = await createYounifyUserTokens();
  
    const tokenHandler: TokenHandler = new (class implements TokenHandler {
      onRenew(
        _expiredAccessToken: string | null,
        _refreshToken: string | null,
        renewed: (newAccessToken: string | null, newRefreshToken: string | null) => void
      ): void {
        void refreshYounifyUserTokens()
  .then((newTokens) => {
    renewed(newTokens.accessToken, newTokens.refreshToken);
  })
  .catch((error) => {
    console.error("Failed to refresh Younify tokens:", error);
    renewed(null, null);
  });
      }
  
      onRenewed(_newAccessToken: string, _newRefreshToken: string): void {
        // add secure persistence later
      }
    })();

    console.log("YOUNIFY SDK KEY (final):", sdkKey);
  
    const options: ConnectOptions = {
        key: sdkKey,
        logLevel: LogLevel.Warning,
        tokenHandler,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
  
    const connect = Connect.shared;
    await connect.configure(options);
  
    configured = true;
    return connect;
  }
  
  export async function fetchYounifyServices() {
    const connect = await configureYounify();
  
    console.log("Calling Younify SDK fetchServices...");
  
    try {
      // ✅ Get ALL services (this populates your UI list)
      const result = await connect.fetchServices(null);
      console.log("Younify all services:", result);
  
      // ✅ Get LINKED services (for debugging)
      const linked = await connect.fetchLinkedServices(null);
      console.log("Linked services:", linked);
  
      return result; // 👈 IMPORTANT: return ALL services, not linked
    } catch (error: any) {
      console.error("Younify SDK fetchServices failed:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        raw: error,
      });
      throw error;
    }
  }

function normalizeLinkedServices(linkedResult: unknown): any[] {
  if (Array.isArray(linkedResult)) return linkedResult;
  if (
    linkedResult &&
    typeof linkedResult === "object" &&
    Array.isArray((linkedResult as any).services)
  ) {
    return (linkedResult as any).services;
  }
  return [];
}

/** Linked `StreamingService` rows (same shape as `fetchLinkedServices`). */
export async function getLinkedStreamingServicesList(): Promise<any[]> {
  const connect = await configureYounify();
  const linked = await connect.fetchLinkedServices(null);
  return normalizeLinkedServices(linked);
}

/** True when the user has at least one linked streaming service (SDK). */
export async function hasConnectedStreaming(): Promise<boolean> {
  const list = await getLinkedStreamingServicesList();
  return list.length > 0;
}

/**
 * Best poster/thumbnail URL on a Younify `StreamingContent` row (native bridge may use snake_case).
 * Prefer **large** first (same class of asset Netflix uses for portrait home-row posters), then small.
 */
export function getYounifyStreamingContentPosterUrl(item: unknown): string | null {
  const x = item as Record<string, unknown> | null;
  if (!x || typeof x !== "object") return null;
  const pick = (a: unknown, b: unknown) =>
    (typeof a === "string" && a.trim() ? a.trim() : null) ??
    (typeof b === "string" && b.trim() ? b.trim() : null);
  const large = pick(x.largeThumbnailUrl, x.large_thumbnail_url);
  const small = pick(x.smallThumbnailUrl, x.small_thumbnail_url);
  const overlay = pick(x.overlayThumbnailUrl, x.overlay_thumbnail_url);
  return (
    large ??
    small ??
    overlay ??
    pick(x.posterPath, x.poster_path) ??
    pick(x.thumbnailUrl, x.thumbnail_url) ??
    pick(x.coverImageUrl, x.cover_image_url) ??
    pick(x.verticalImageUrl, x.vertical_image_url) ??
    pick(x.cardImageUrl, x.card_image_url) ??
    pick(x.imageUrl, x.image_url) ??
    pick(x.image, undefined) ??
    pick(x.artworkUrl, x.artwork_url) ??
    pick(x.artwork, undefined) ??
    pick(x.backdropPath, x.backdrop_path) ??
    pick(x.backdropUrl, x.backdrop_url) ??
    null
  );
}

/**
 * Netflix-style horizontal row: ~3.4–3.5 portrait tiles visible, 2:3 aspect, ~8pt gaps (see parent padding).
 */
export function getYounifyRailPosterCellWidth(windowWidth: number): number {
  const screenEdgePadding = 40;
  const gapBetweenPosters = 8;
  /** Visible “cells” including peek of next title (matches Netflix home). */
  const visiblePosterSlots = 3.42;
  const inner = Math.max(0, windowWidth - screenEdgePadding);
  const gaps = gapBetweenPosters * Math.max(0, visiblePosterSlots - 1);
  const raw = (inner - gaps) / visiblePosterSlots;
  return Math.round(Math.min(122, Math.max(94, raw)));
}

export type YounifySourceServiceSnapshot = {
  id: string;
  name: string;
  smallThumbnailUrl?: string | null;
  largeThumbnailUrl?: string | null;
  overlayThumbnailUrl?: string | null;
};

function serializeStreamingService(service: any): YounifySourceServiceSnapshot | undefined {
  if (!service || typeof service !== "object") return undefined;
  const pick = (a: unknown, b: unknown) =>
    (typeof a === "string" && a.trim() ? a.trim() : null) ??
    (typeof b === "string" && b.trim() ? b.trim() : null);
  const id = String(service.id ?? "").trim();
  const name = String(service.name ?? "").trim();
  if (!id && !name) return undefined;
  return {
    id: id || name,
    name: name || id,
    smallThumbnailUrl: pick(service.smallThumbnailUrl, service.small_thumbnail_url),
    largeThumbnailUrl: pick(service.largeThumbnailUrl, service.large_thumbnail_url),
    overlayThumbnailUrl: pick(service.overlayThumbnailUrl, service.overlay_thumbnail_url),
  };
}

function attachYounifySourceService(row: any, service: any): any {
  if (!row || typeof row !== "object") return row;
  const snap = serializeStreamingService(service);
  if (!snap) return row;
  return { ...row, younifySourceService: snap };
}

/** Logo / icon URL for a `StreamingService` (prefer compact asset for corner badges). */
export function getYounifyStreamingServiceLogoUrl(service: unknown): string | null {
  const s = service as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return null;
  const pick = (a: unknown, b: unknown) =>
    (typeof a === "string" && a.trim() ? a.trim() : null) ??
    (typeof b === "string" && b.trim() ? b.trim() : null);
  return (
    pick(s.smallThumbnailUrl, s.small_thumbnail_url) ??
    pick(s.largeThumbnailUrl, s.large_thumbnail_url) ??
    pick(s.overlayThumbnailUrl, s.overlay_thumbnail_url) ??
    null
  );
}

/** Normalizes `fetchContent` / nested SDK trees into flat content rows. */
function flattenYounifyFetchContentNodes(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.flatMap((entry) => flattenYounifyFetchContentNodes(entry));
  }
  if (typeof input === "object") {
    /** `FetchContentCategoryServiceResult`: { service, content[] } — must run before generic `content` */
    if (input.service != null && Array.isArray((input as any).content)) {
      const svc = (input as any).service;
      return (input as any).content.flatMap((row: any) =>
        flattenYounifyFetchContentNodes(row).map((r: any) => attachYounifySourceService(r, svc)),
      );
    }
    if (Array.isArray(input.content)) return flattenYounifyFetchContentNodes(input.content);
    if (Array.isArray(input.services)) {
      return input.services.flatMap((svc: any) => {
        const service = svc?.service;
        if (Array.isArray(svc?.content)) {
          return svc.content.flatMap((row: any) =>
            flattenYounifyFetchContentNodes(row).map((r: any) =>
              attachYounifySourceService(r, service),
            ),
          );
        }
        return [];
      });
    }
    if (Array.isArray(input.items)) return flattenYounifyFetchContentNodes(input.items);
    if (Array.isArray(input.results)) return flattenYounifyFetchContentNodes(input.results);
    if (Array.isArray(input.data)) return flattenYounifyFetchContentNodes(input.data);
    if ((input.title || input.name || input.id) && !input.content && !input.items) {
      return [input];
    }
  }
  return [];
}

/** Row can show a poster via Younify URLs or TMDB-by-title (Younify recommends TMDB for artwork). */
function eligibleYounifyContentRow(item: any): boolean {
  const title = String(item?.title ?? item?.name ?? "").trim();
  return title.length >= 2;
}

function scoreAndTrimYounifyItems(items: any[], limit: number): any[] {
  const getPopularity = (item: any) =>
    Number(item?.popularity ?? item?.score ?? item?.rating ?? item?.rank ?? 0);
  return items
    .filter((item) => eligibleYounifyContentRow(item))
    .sort((a, b) => getPopularity(b) - getPopularity(a))
    .slice(0, limit);
}

function younifySourceServiceKey(item: any): string {
  const s = item?.younifySourceService;
  if (!s || typeof s !== "object") return "__unknown__";
  const id = String((s as any).id ?? "").trim();
  const name = String((s as any).name ?? "").trim();
  return id || name || "__unknown__";
}

/**
 * Same filters as `scoreAndTrimYounifyItems`, but **round-robin** across linked providers so one
 * service (e.g. Netflix) cannot occupy every slot when others share `popularity` 0.
 */
function scoreAndTrimYounifyItemsBalanced(items: any[], totalLimit: number): any[] {
  const getPopularity = (item: any) =>
    Number(item?.popularity ?? item?.score ?? item?.rating ?? item?.rank ?? 0);

  const cleaned = items.filter((item) => eligibleYounifyContentRow(item));
  const byKey = new Map<string, any[]>();
  for (const item of cleaned) {
    const k = younifySourceServiceKey(item);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(item);
  }
  for (const arr of byKey.values()) {
    arr.sort((a, b) => getPopularity(b) - getPopularity(a));
  }
  const keys = [...byKey.keys()];
  const merged: any[] = [];
  let round = 0;
  while (merged.length < totalLimit && keys.length > 0) {
    let addedThisRound = 0;
    for (const k of keys) {
      const bucket = byKey.get(k)!;
      const item = bucket[round];
      if (item && merged.length < totalLimit) {
        merged.push(item);
        addedThisRound++;
      }
    }
    if (addedThisRound === 0) break;
    round++;
  }
  return merged;
}

function categoryKey(cat: any): string {
  return String(cat?.name ?? cat?.title ?? "").trim().toLowerCase();
}

function categoriesMatch(a: any, b: any): boolean {
  if (a == null || b == null) return false;
  if (typeof a.equals === "function") {
    try {
      if (a.equals(b)) return true;
    } catch {
      /* ignore */
    }
  }
  if (typeof b.equals === "function") {
    try {
      if (b.equals(a)) return true;
    } catch {
      /* ignore */
    }
  }
  const na = categoryKey(a);
  const nb = categoryKey(b);
  return na.length > 0 && na === nb;
}

const YOUNIFY_BROWSE_ROWS: { id: string; title: string; category: (typeof StreamingCategories)["ContinueWatching"] }[] =
  [
    { id: "continue", title: "Continue watching", category: StreamingCategories.ContinueWatching },
    { id: "trending", title: "Trending & popular", category: StreamingCategories.TrendingAndPopular },
    { id: "recommended", title: "Recommended for you", category: StreamingCategories.RecommendedForYou },
    { id: "watchlist", title: "Your watchlist", category: StreamingCategories.YourWatchlist },
    { id: "acclaimed", title: "Critically acclaimed", category: StreamingCategories.CriticallyAcclaimed },
  ];

export type YounifyBrowseSection = {
  id: string;
  title: string;
  items: any[];
};

/**
 * Rows from linked providers (Continue watching, Trending, etc.) using SDK well-known categories.
 */
export async function fetchYounifyBrowseSections(): Promise<YounifyBrowseSection[]> {
  const connect = await configureYounify();
  const linked = normalizeLinkedServices(await connect.fetchLinkedServices(null));
  if (!linked.length) {
    return YOUNIFY_BROWSE_ROWS.map((row) => ({ id: row.id, title: row.title, items: [] }));
  }

  const categories = YOUNIFY_BROWSE_ROWS.map((row) => row.category);
  let contentResult: any[] = [];
  try {
    const raw = await connect.fetchContent(categories, linked, null, null, null);
    contentResult = Array.isArray(raw) ? raw : [];
  } catch (error) {
    console.warn("fetchYounifyBrowseSections: fetchContent failed", error);
    return YOUNIFY_BROWSE_ROWS.map((row) => ({ id: row.id, title: row.title, items: [] }));
  }

  return YOUNIFY_BROWSE_ROWS.map((row) => {
    const block = contentResult.find((cr: any) => categoriesMatch(cr?.category, row.category));
    const flat = block ? flattenYounifyFetchContentNodes(block) : [];
    return {
      id: row.id,
      title: row.title,
      items: scoreAndTrimYounifyItemsBalanced(flat, 24),
    };
  });
}

export async function fetchYounifyContentForConnectedServices() {
  const connect = await configureYounify();

  const linkedServices = normalizeLinkedServices(await connect.fetchLinkedServices(null));
  if (!linkedServices.length) {
    return [];
  }

  const categoriesResult = await connect.fetchCategories(null);
  const categories = Array.isArray(categoriesResult)
    ? categoriesResult
    : Array.isArray((categoriesResult as any)?.categories)
      ? (categoriesResult as any).categories
      : [];

  if (!categories.length) {
    return [];
  }

  const primary =
    categories.find((category: any) =>
      String(category?.name ?? category?.title ?? "")
        .toLowerCase()
        .includes("popular"),
    ) ??
    categories.find((category: any) =>
      String(category?.name ?? category?.title ?? "")
        .toLowerCase()
        .includes("trending"),
    ) ??
    categories[0];

  /** Extra catalog slices so providers that are sparse in “popular” still return rows. */
  const seenKeys = new Set<string>();
  const catalogToFetch: any[] = [];
  const pushCat = (c: any) => {
    if (c == null) return;
    const k = categoryKey(c);
    if (!k || seenKeys.has(k)) return;
    seenKeys.add(k);
    catalogToFetch.push(c);
  };
  pushCat(primary);
  for (const c of categories) {
    if (catalogToFetch.length >= 3) break;
    pushCat(c);
  }

  const contentResult = await connect.fetchContent(
    catalogToFetch,
    linkedServices,
    null,
    null,
    null,
  );

  const normalizedContent = Array.isArray(contentResult)
    ? contentResult.flatMap((block) => flattenYounifyFetchContentNodes(block))
    : flattenYounifyFetchContentNodes(contentResult);

  return scoreAndTrimYounifyItemsBalanced(normalizedContent, 24);
}
