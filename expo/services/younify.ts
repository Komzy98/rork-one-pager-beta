import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  Connect,
  ConnectOptions,
  LogLevel,
  StreamingCategories,
  type TokenHandler,
} from "react-native-younify-connect-sdk";

/**
 * Younify token minting hits your small Node backend (`create-younify-user`, etc.).
 * - **Explicit:** `EXPO_PUBLIC_YOUNIFY_AUTH_URL` or `expo.extra.younifyAuthUrl` (required for production devices).
 * - **Simulator / emulator (__DEV__):** `expo-device` reports `!isDevice` → auth uses host loopback (`127.0.0.1` iOS,
 *   `10.0.2.2` Android) so a server bound only to localhost on your Mac is reachable.
 * - **Physical device (__DEV__):** Uses `http://<metro-host>:3000` from Metro’s `hostUri` (auth should listen on `0.0.0.0`
 *   or set `EXPO_PUBLIC_YOUNIFY_AUTH_URL`). Override with `EXPO_PUBLIC_YOUNIFY_AUTH_USE_METRO_HOST=1` / `USE_LAN` if needed.
 */
function getYounifyAuthBackendBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = [extra?.younifyAuthUrl, extra?.younifyBackendUrl]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .find((s) => s.length > 0);
  const fromEnv = process.env.EXPO_PUBLIC_YOUNIFY_AUTH_URL?.trim();

  const explicit = fromEnv || fromExtra;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const forceMetroLanHost =
    process.env.EXPO_PUBLIC_YOUNIFY_AUTH_USE_METRO_HOST === "1" ||
    process.env.EXPO_PUBLIC_YOUNIFY_AUTH_USE_LAN === "1";

  if (__DEV__ && !forceMetroLanHost && !Device.isDevice) {
    if (Platform.OS === "ios") return "http://127.0.0.1:3000";
    if (Platform.OS === "android") return "http://10.0.2.2:3000";
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || "";
  const host = debuggerHost.split(":")[0];
  if (host) {
    return `http://${host}:3000`;
  }

  return "http://127.0.0.1:3000";
}

/** SDK key must come from EXPO_PUBLIC_YOUNIFY_SDK_KEY (EAS env / .env). */
function getYounifySdkKey(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_YOUNIFY_SDK_KEY?.trim() || "";
  return fromEnv || undefined;
}

async function readJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { _parseError: true, _bodyPreview: text.slice(0, 240) };
  }
}

let configured = false;
/** Which app user the SDK was last configured for (Supabase id, `guest_*`, or local `user_*`). */
let configuredForExternalUserId: string | null = null;
/** Current One Pager user id for Younify `external_id` — set from auth via `setYounifyExternalUserId`. */
let younifyExternalUserId: string | null = null;
let younifyUserId: string | null = null;
let younifyAccessToken: string | null = null;
let younifyRefreshToken: string | null = null;
let younifyRuntimeIssue: string | null = null;

/**
 * Call when the signed-in app user is known (e.g. after Supabase / local auth resolves).
 * Younify maps `external_id` to streaming accounts — a single shared id caused all users to see the same links.
 */
export function setYounifyExternalUserId(id: string | null) {
  const next = id && String(id).trim() ? String(id).trim() : null;
  younifyExternalUserId = next;
}

async function clearYounifyInternalState(): Promise<void> {
  try {
    await Connect.shared.clearUserData();
  } catch (e) {
    if (__DEV__) console.warn("Younify clearUserData failed (continuing reset):", e);
  }
  configured = false;
  configuredForExternalUserId = null;
  younifyUserId = null;
  younifyAccessToken = null;
  younifyRefreshToken = null;
}

/** Clear Younify SDK state and tokens (call on sign-out or when no user). */
export async function resetYounifySession(): Promise<void> {
  await clearYounifyInternalState();
  younifyExternalUserId = null;
}

function setYounifyRuntimeIssue(message: string | null) {
  younifyRuntimeIssue = message;
}

export function getYounifyRuntimeIssue(): string | null {
  return younifyRuntimeIssue;
}

async function createYounifyUserTokens() {
  const externalUserId = younifyExternalUserId;
  if (!externalUserId) {
    const errorMessage =
      "Missing app user for Younify: sign in first (setYounifyExternalUserId not called)";
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  const base = getYounifyAuthBackendBaseUrl();
  const url = `${base}/create-younify-user`;
  if (__DEV__) console.log("Calling Younify backend:", url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalUserId,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorMessage = `Younify auth unreachable at ${url} (${msg}). Start the backend: expo/backend/younify-auth (node server.js on port 3000).`;
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  const data = await readJsonBody(response);
  if (__DEV__) console.log("Backend token response:", data);

  if (!response.ok) {
    const errMsg =
      typeof data.error === "string"
        ? data.error
        : `HTTP ${response.status} from Younify auth`;
    setYounifyRuntimeIssue(errMsg);
    throw new Error(errMsg);
  }

  const userId = data.userId as string | undefined;
  const accessToken = data.accessToken as string | undefined;
  const refreshToken = data.refreshToken as string | undefined;

  if (!userId || !accessToken || !refreshToken) {
    const errorMessage = "Backend did not return Younify user tokens";
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  younifyUserId = userId;
  younifyAccessToken = accessToken;
  younifyRefreshToken = refreshToken;

  return {
    userId,
    accessToken,
    refreshToken,
  };
}

async function refreshYounifyUserTokens() {
  if (!younifyUserId) {
    const errorMessage = "Missing Younify user ID for token refresh";
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  const base = getYounifyAuthBackendBaseUrl();
  const refreshUrl = `${base}/refresh-younify-user-tokens`;
  let response: Response;
  try {
    response = await fetch(refreshUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: younifyUserId,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorMessage = `Younify auth unreachable at ${refreshUrl} (${msg})`;
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  const data = await readJsonBody(response);

  if (!response.ok) {
    const errMsg =
      typeof data.error === "string"
        ? data.error
        : `HTTP ${response.status} refreshing Younify tokens`;
    setYounifyRuntimeIssue(errMsg);
    throw new Error(errMsg);
  }

  const accessToken = data.accessToken as string | undefined;
  const refreshToken = data.refreshToken as string | undefined;

  if (!accessToken || !refreshToken) {
    const errorMessage = "Backend did not return refreshed Younify tokens";
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  younifyAccessToken = accessToken;
  younifyRefreshToken = refreshToken;

  return {
    accessToken,
    refreshToken,
  };
}
  
export async function configureYounify() {
  const externalId = younifyExternalUserId;
  if (!externalId) {
    const errorMessage =
      "Younify requires a signed-in app user. Sign in and try again.";
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
  }

  if (configured && configuredForExternalUserId === externalId) {
    return Connect.shared;
  }

  if (configured && configuredForExternalUserId !== externalId) {
    await clearYounifyInternalState();
  }

  const sdkKey = getYounifySdkKey();

  if (!sdkKey) {
    const errorMessage = "Missing Younify SDK key: set EXPO_PUBLIC_YOUNIFY_SDK_KEY";
    setYounifyRuntimeIssue(errorMessage);
    throw new Error(errorMessage);
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

  const options: ConnectOptions = {
    key: sdkKey,
    logLevel: LogLevel.Warning,
    tokenHandler,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };

  const connect = Connect.shared;
  await connect.configure(options);
  setYounifyRuntimeIssue(null);

  configured = true;
  configuredForExternalUserId = externalId;
  return connect;
}

export async function fetchYounifyServices() {
  const connect = await configureYounify();

  console.log("Calling Younify SDK fetchServices...");

  try {
    const result = await connect.fetchServices(null);
    console.log("Younify all services:", result);

    const linked = await connect.fetchLinkedServices(null);
    console.log("Linked services:", linked);

    return result;
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
 * Mobile-first horizontal row for 2:3 posters.
 * Slightly larger cards on phones, a bit denser on larger widths.
 */
export function getYounifyRailPosterCellWidth(windowWidth: number): number {
  const screenEdgePadding = 40;
  const gapBetweenPosters = 8;
  const visiblePosterSlots =
    windowWidth < 360 ? 3.05 :
    windowWidth < 430 ? 3.2 :
    windowWidth < 520 ? 3.45 :
    3.7;
  const inner = Math.max(0, windowWidth - screenEdgePadding);
  const gaps = gapBetweenPosters * Math.max(0, visiblePosterSlots - 1);
  const raw = (inner - gaps) / visiblePosterSlots;
  return Math.round(Math.min(138, Math.max(98, raw)));
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
      items: scoreAndTrimYounifyItemsBalanced(flat, 60),
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

  return scoreAndTrimYounifyItemsBalanced(normalizedContent, 60);
}
