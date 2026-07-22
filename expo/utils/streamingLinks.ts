import { Platform, Linking } from 'react-native';
import {
  buildPrimeVideoOpenTargets,
  buildPrimeVideoSearchUrl,
  extractAsinFromPrimeUrl,
  extractGtiFromPrimeUrl,
  isPrimeVideoProviderId,
  normalizePrimeVideoWatchUrl,
} from '@/utils/primeVideoLinks';
import {
  normalizeDisneyPlusWatchUrl,
  isDisneyPlusSearchOrGenericUrl,
  extractDisneyPlusUrlFromText,
  buildDisneyPlusOpenTargets,
} from '@/utils/disneyPlusLinks';
import {
  buildNetflixOpenTargets,
  isNetflixSearchOrGenericUrl,
  normalizeNetflixWatchUrl,
} from '@/utils/netflixLinks';
import { PRIME_VIDEO_APP_ORIGIN } from '@/utils/primeVideoLinks';
import { readSeasonEpisodeFromYounifyRow } from '@/utils/younifyProviderIndex';

export { isPrimeVideoProviderId } from '@/utils/primeVideoLinks';

export {
  normalizeDisneyPlusWatchUrl,
  isDisneyPlusSearchOrGenericUrl,
  extractDisneyPlusUrlFromText,
  buildDisneyPlusOpenTargets,
} from '@/utils/disneyPlusLinks';
export {
  buildNetflixOpenTargets,
  isNetflixSearchOrGenericUrl,
  normalizeNetflixWatchUrl,
} from '@/utils/netflixLinks';

export interface StreamingPlatform {
  id: number;
  name: string;
  color: string;
  appScheme?: string;
  iosAppId?: string;
  androidPackage?: string;
  webUrl: string;
  searchUrl?: (title: string, year?: number) => string;
}

export const STREAMING_PLATFORMS: Record<number, StreamingPlatform> = {
  8: {
    id: 8,
    name: 'Netflix',
    color: '#E50914',
    appScheme: 'nflx://',
    iosAppId: '363590051',
    androidPackage: 'com.netflix.mediaclient',
    webUrl: 'https://www.netflix.com',
    searchUrl: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  },
  9: {
    id: 9,
    name: 'Amazon Prime Video',
    color: '#00A8E1',
    appScheme: 'aiv://',
    iosAppId: '545519333',
    androidPackage: 'com.amazon.avod.thirdpartyclient',
    webUrl: 'https://app.primevideo.com',
    searchUrl: (title) => buildPrimeVideoSearchUrl(title),
  },
  337: {
    id: 337,
    name: 'Disney+',
    color: '#113CCF',
    appScheme: 'disneyplus://',
    iosAppId: '1446075923',
    androidPackage: 'com.disney.disneyplus',
    webUrl: 'https://www.disneyplus.com',
    searchUrl: (title) => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
  },
  384: {
    id: 384,
    name: 'HBO Max',
    color: '#5822B4',
    appScheme: 'hbomax://',
    iosAppId: '971265422',
    androidPackage: 'com.hbo.hbonow',
    webUrl: 'https://www.max.com',
    searchUrl: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
  },
  1899: {
    id: 1899,
    name: 'Max',
    color: '#002BE7',
    appScheme: 'max://',
    iosAppId: '1666653815',
    androidPackage: 'com.wbd.stream',
    webUrl: 'https://www.max.com',
    searchUrl: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
  },
  15: {
    id: 15,
    name: 'Hulu',
    color: '#1CE783',
    appScheme: 'hulu://',
    iosAppId: '376510438',
    androidPackage: 'com.hulu.plus',
    webUrl: 'https://www.hulu.com',
    searchUrl: (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
  },
  386: {
    id: 386,
    name: 'Peacock',
    color: '#000000',
    appScheme: 'peacock://',
    iosAppId: '1508186374',
    androidPackage: 'com.peacocktv.peacockandroid',
    webUrl: 'https://www.peacocktv.com',
    searchUrl: (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
  },
  531: {
    id: 531,
    name: 'Paramount+',
    color: '#0064FF',
    appScheme: 'paramountplus://',
    iosAppId: '530168168',
    androidPackage: 'com.cbs.ott',
    webUrl: 'https://www.paramountplus.com',
    searchUrl: (title) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(title)}`,
  },
  350: {
    id: 350,
    name: 'Apple TV+',
    color: '#000000',
    appScheme: 'videos://',
    iosAppId: '1174078549',
    androidPackage: 'com.apple.atve.androidtv.appletv',
    webUrl: 'https://tv.apple.com',
    searchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  },
  283: {
    id: 283,
    name: 'Crunchyroll',
    color: '#F47521',
    appScheme: 'crunchyroll://',
    iosAppId: '329913454',
    androidPackage: 'com.crunchyroll.crunchyroid',
    webUrl: 'https://www.crunchyroll.com',
    searchUrl: (title) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
  },
  2: {
    id: 2,
    name: 'Apple iTunes',
    color: '#EA4CC0',
    appScheme: 'itms://',
    iosAppId: '',
    webUrl: 'https://itunes.apple.com',
    searchUrl: (title) => `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=movie`,
  },
  3: {
    id: 3,
    name: 'Google Play Movies',
    color: '#4285F4',
    webUrl: 'https://play.google.com/store/movies',
    searchUrl: (title) => `https://play.google.com/store/search?q=${encodeURIComponent(title)}&c=movies`,
  },
  10: {
    id: 10,
    name: 'Amazon Video',
    color: '#FF9900',
    appScheme: 'aiv://',
    webUrl: 'https://app.primevideo.com',
    searchUrl: (title) => buildPrimeVideoSearchUrl(title),
  },
  192: {
    id: 192,
    name: 'YouTube',
    color: '#FF0000',
    appScheme: 'youtube://',
    iosAppId: '544007664',
    androidPackage: 'com.google.android.youtube',
    webUrl: 'https://www.youtube.com',
    searchUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
  },
  188: {
    id: 188,
    name: 'YouTube Premium',
    color: '#FF0000',
    appScheme: 'youtube://',
    webUrl: 'https://www.youtube.com/premium',
    searchUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
  },
  257: {
    id: 257,
    name: 'fuboTV',
    color: '#FF6A00',
    appScheme: 'fubo://',
    iosAppId: '905401434',
    androidPackage: 'com.fubo.firetv',
    webUrl: 'https://www.fubo.tv',
    searchUrl: (title) => `https://www.fubo.tv/search?q=${encodeURIComponent(title)}`,
  },
  73: {
    id: 73,
    name: 'Tubi',
    color: '#FA382F',
    appScheme: 'tubi://',
    iosAppId: '886445756',
    androidPackage: 'com.tubitv',
    webUrl: 'https://tubitv.com',
    searchUrl: (title) => `https://tubitv.com/search/${encodeURIComponent(title)}`,
  },
  387: {
    id: 387,
    name: 'Peacock Premium',
    color: '#000000',
    appScheme: 'peacock://',
    webUrl: 'https://www.peacocktv.com',
    searchUrl: (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
  },
  1770: {
    id: 1770,
    name: 'Plex',
    color: '#EBAF00',
    appScheme: 'plex://',
    iosAppId: '383457673',
    androidPackage: 'com.plexapp.android',
    webUrl: 'https://www.plex.tv',
    searchUrl: (title) => `https://watch.plex.tv/search?q=${encodeURIComponent(title)}`,
  },
  526: {
    id: 526,
    name: 'AMC+',
    color: '#000000',
    appScheme: 'amcplus://',
    iosAppId: '1578728498',
    webUrl: 'https://www.amcplus.com',
    searchUrl: (title) => `https://www.amcplus.com/search?q=${encodeURIComponent(title)}`,
  },
  300: {
    id: 300,
    name: 'Pluto TV',
    color: '#1D1D1D',
    appScheme: 'pluto://',
    iosAppId: '751712884',
    androidPackage: 'tv.pluto.android',
    webUrl: 'https://pluto.tv',
    searchUrl: (title) => `https://pluto.tv/search/details/${encodeURIComponent(title)}`,
  },
  582: {
    id: 582,
    name: 'Rakuten Viki',
    color: '#1E88E5',
    appScheme: 'viki://',
    iosAppId: '445553058',
    androidPackage: 'com.viki.android',
    webUrl: 'https://www.viki.com',
    searchUrl: (title) => `https://www.viki.com/search?q=${encodeURIComponent(title)}`,
  },
};

/** TMDB lists multiple Prime rows (9, 119, 2100 with Ads) — treat as one platform for deep links. */
const TMDB_PROVIDER_ALIASES: Record<number, number> = {
  119: 9,
  2100: 9,
};

export function normalizeTmdbWatchProviderId(providerId: number): number {
  return TMDB_PROVIDER_ALIASES[providerId] ?? providerId;
}

export function isTmdbOrJustWatchAggregatorUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const lower = url.toLowerCase();
  return lower.includes('themoviedb.org') || lower.includes('justwatch.com');
}

export function getStreamingPlatform(providerId: number): StreamingPlatform | null {
  const canonicalId = normalizeTmdbWatchProviderId(providerId);
  return STREAMING_PLATFORMS[canonicalId] || null;
}

export { buildPrimeVideoSearchUrl, normalizePrimeVideoWatchUrl } from '@/utils/primeVideoLinks';

function primeVideoRowStub(): Record<string, unknown> {
  return { younifySourceService: { id: '9', name: 'Amazon Prime Video' } };
}

function extractGtiFromRow(row: Record<string, unknown>): string | null {
  for (const key of ['gti', 'globalTitleId', 'global_title_id', 'primeGti', 'prime_gti'] as const) {
    const v = row[key];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.includes('amzn1.')) return t;
    }
  }
  return null;
}

/**
 * Open the provider’s catalog search for this title (web URL). Prefer this over `openStreamingApp`
 * when you want the user to land on title results, not only the app home screen.
 */
export async function openStreamingTitleSearch(
  providerId: number,
  title: string,
  year?: number,
  /** Appended to the title for catalog search (e.g. `S1E6`) so results skew toward the specific episode. */
  episodeSearchHint?: string,
): Promise<boolean> {
  const canonicalId = normalizeTmdbWatchProviderId(providerId);
  /** Disney+ `/search` is not registered for universal links — it opens the app without the query. */
  if (canonicalId === 337 || canonicalId === 8) {
    return false;
  }
  const platform = STREAMING_PLATFORMS[canonicalId];
  if (!platform) return false;
  const t = title.trim();
  const hint = episodeSearchHint?.trim();
  const queryTitle = hint ? `${t} ${hint}` : t;
  let url = platform.searchUrl?.(queryTitle, year) ?? platform.webUrl;
  url = normalizeStreamingWatchUrl(url);

  if (isPrimeVideoProviderId(providerId)) {
    return openWatchUrlWithProviderFallbacks(url, primeVideoRowStub());
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error(`Failed to open title search for ${platform.name}:`, error);
    return false;
  }
}

/** Map Younify linked-service id/name to TMDB provider ids used in `STREAMING_PLATFORMS`. */
export function younifySourceToTmdbProviderId(
  service: { id?: string; name?: string } | null | undefined,
): number | null {
  if (!service) return null;
  const raw = `${String(service.id ?? "")} ${String(service.name ?? "")}`.toLowerCase();
  if (!raw.trim()) return null;
  const rules: { re: RegExp; id: number }[] = [
    { re: /netflix|nflx/, id: 8 },
    { re: /disney|disney\+|disneyplus/, id: 337 },
    { re: /hbo max|hbomax/, id: 1899 },
    { re: /\bhbo\b(?!\s*max)/, id: 384 },
    { re: /^max$|\bmax app\b/, id: 1899 },
    { re: /hulu/, id: 15 },
    { re: /prime video|amazon prime|amazon video|\bprime\b(?=.*video)|\baiv\b/, id: 9 },
    { re: /peacock/, id: 386 },
    { re: /paramount/, id: 531 },
    { re: /apple tv|appletv|\btv\+\b/, id: 350 },
    { re: /crunchyroll/, id: 283 },
    { re: /youtube(?! kids)/, id: 192 },
    { re: /fubo/, id: 257 },
    { re: /tubi/, id: 73 },
    { re: /plex/, id: 1770 },
    { re: /amc\+|amc plus/, id: 526 },
    { re: /pluto/, id: 300 },
    { re: /viki|rakuten/, id: 582 },
  ];
  for (const { re, id } of rules) {
    if (re.test(raw)) return id;
  }
  return null;
}

export function extractContentReleaseYear(item: Record<string, unknown>): number | undefined {
  const y = item.year ?? item.releaseYear ?? item.release_year;
  if (typeof y === "number" && y > 1900 && y < 2100) return y;
  if (typeof y === "string" && /^\d{4}$/.test(y.trim())) {
    const n = parseInt(y.trim(), 10);
    if (!Number.isNaN(n)) return n;
  }
  const s = item.releaseDate ?? item.release_date ?? item.airDate ?? item.air_date ?? item.first_air_date;
  if (typeof s === "string" && s.length >= 4) {
    const n = parseInt(String(s).slice(0, 4), 10);
    if (!Number.isNaN(n) && n > 1900 && n < 2100) return n;
  }
  return undefined;
}

export type OpenYounifyBrowseItemOptions = {
  /** When `continue`, we prefer provider deep links and append resume offsets when available. */
  sectionId?: string;
};

function pickFirstString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim().length > 4) return v.trim();
  }
  return null;
}

/** Drop URLs that open provider home/search instead of a title. */
function sanitizeProviderWatchUrl(
  url: string,
  pid: number | null,
): string | null {
  let normalized = normalizeStreamingWatchUrl(url);

  if (pid === 337 || /disneyplus\.com/i.test(normalized)) {
    if (isDisneyPlusSearchOrGenericUrl(normalized)) return null;
    normalized = normalizeDisneyPlusWatchUrl(normalized);
  }

  if (pid === 8 || /netflix\.com/i.test(normalized)) {
    if (isNetflixSearchOrGenericUrl(normalized)) return null;
    normalized = normalizeNetflixWatchUrl(normalized);
  }

  if (
    isPrimeVideoProviderId(pid) ||
    /amazon\.|primevideo|aiv:\/\//i.test(normalized)
  ) {
    normalized = normalizePrimeVideoWatchUrl(normalized);
    const hasDetail =
      extractAsinFromPrimeUrl(url) ??
      extractAsinFromPrimeUrl(normalized) ??
      extractGtiFromPrimeUrl(url) ??
      extractGtiFromPrimeUrl(normalized);
    if (normalized === PRIME_VIDEO_APP_ORIGIN && !hasDetail) return null;
  }

  if (isTmdbOrJustWatchAggregatorUrl(normalized)) return null;
  return normalized;
}

/** Provider play / resume URLs from Younify rows (camelCase + snake_case). */
export function pickWatchNowUrlFromRow(row: Record<string, unknown>): string | null {
  const keys = [
    "watchNowUrl",
    "watch_now_url",
    "watchUrl",
    "watch_url",
    "playUrl",
    "play_url",
    "deepLink",
    "deep_link",
    "providerWatchUrl",
    "provider_watch_url",
    "streamingUrl",
    "streaming_url",
    "playbackUrl",
    "playback_url",
    "contentUrl",
    "content_url",
    "url",
    "href",
    "link",
    "uri",
    "externalUrl",
    "external_url",
    "amazonUrl",
    "amazon_url",
    "primeVideoUrl",
    "prime_video_url",
  ];
  const direct = pickFirstString(row, keys);
  const svc = row.younifySourceService as { id?: string; name?: string } | undefined;
  const pid = younifySourceToTmdbProviderId(svc);
  if (direct) {
    const safe = sanitizeProviderWatchUrl(direct, pid);
    if (safe) return safe;
  }
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) {
      const safe = sanitizeProviderWatchUrl(v.trim(), pid);
      if (safe) return safe;
    }
  }
  return null;
}

/** ASIN / title id for Amazon Prime Video detail pages (10-char alphanumeric). */
function extractAmazonVideoAsinFromRow(row: Record<string, unknown>): string | null {
  const keyHints = [
    "asin",
    "ASIN",
    "amazonAsin",
    "amazon_asin",
    "gti",
    "globalTitleId",
    "global_title_id",
    "amazonTitleId",
    "amazon_title_id",
  ];
  for (const k of keyHints) {
    const v = row[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (/^[A-Z0-9]{10}$/i.test(t)) return t.toUpperCase();
      const m = t.match(/\/detail\/([A-Z0-9]{10})(?:[\/?#]|$)/i);
      if (m) return m[1].toUpperCase();
    }
  }
  for (const v of Object.values(row)) {
    if (typeof v !== "string") continue;
    if (/\/(?:gp\/video\/|video\/)?detail\/([A-Z0-9]{10})(?:[\/?#]|$)/i.test(v)) {
      const m = v.match(/\/detail\/([A-Z0-9]{10})(?:[\/?#]|$)/i);
      if (m) return m[1].toUpperCase();
    }
  }
  return null;
}

/** Build a Prime Video detail URL when Younify omits watch URLs but exposes ASIN/GTI in row metadata. */
function buildPrimeVideoWatchUrlFromRow(row: Record<string, unknown>): string | null {
  const svc = row.younifySourceService as { id?: string; name?: string } | undefined;
  const pid = younifySourceToTmdbProviderId(svc);
  if (pid !== 9 && pid !== 10) return null;

  for (const key of ["gti", "globalTitleId", "global_title_id", "primeGti", "prime_gti"] as const) {
    const v = row[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.includes("amzn1.")) {
        return `https://app.primevideo.com/detail?gti=${encodeURIComponent(t)}`;
      }
    }
  }

  const asin = extractAmazonVideoAsinFromRow(row);
  if (!asin) return null;
  return `https://app.primevideo.com/detail/${asin}`;
}

function extractNumericWatchId(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 1e3 && v < 1e12) {
      return String(Math.floor(v));
    }
    if (typeof v === "string" && /^\d{5,12}$/.test(v.trim())) return v.trim();
  }
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractUuidContentId(row: Record<string, unknown>): string | null {
  const keys = [
    "contentId",
    "content_id",
    "providerContentId",
    "provider_content_id",
    "playbackContentId",
    "videoUuid",
    "video_uuid",
    "huluContentId",
    "hulu_content_id",
    "disneyContentId",
    "disney_content_id",
  ];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && UUID_RE.test(v.trim())) return v.trim();
  }
  return null;
}

function extractDisneyPlusUrlFromRow(row: Record<string, unknown>): string | null {
  for (const v of Object.values(row)) {
    if (typeof v === "string") {
      const found = extractDisneyPlusUrlFromText(v);
      if (found) return found;
    }
  }
  return null;
}

function buildDisneyPlusWatchUrlFromRow(
  row: Record<string, unknown>,
  title: string,
): string | null {
  const embedded = extractDisneyPlusUrlFromRow(row);
  if (embedded) return embedded;

  const uuid = extractUuidContentId(row);
  if (uuid) {
    return `https://www.disneyplus.com/play/${uuid}`;
  }

  const rawTitle = String(row.title ?? row.name ?? title ?? "").trim();
  for (const k of ["entityId", "entity_id", "disneyEntityId", "disney_entity_id"] as const) {
    const v = row[k];
    if (typeof v === "string" && /^[a-zA-Z0-9-]{6,32}$/.test(v.trim())) {
      const slug = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug) {
        return `https://www.disneyplus.com/series/${slug}/${v.trim()}`;
      }
    }
  }
  return null;
}

async function openDisneyPlusContentUrl(url: string): Promise<boolean> {
  const targets = buildDisneyPlusOpenTargets(url);
  for (const target of targets) {
    try {
      await Linking.openURL(target);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

/**
 * When Younify omits `watchNowUrl`, build best-effort HTTPS URLs so universal links / apps open (same idea as Prime).
 */
function buildProviderFallbackWatchUrl(row: Record<string, unknown>): string | null {
  const prime = buildPrimeVideoWatchUrlFromRow(row);
  if (prime) return prime;

  const svc = row.younifySourceService as { id?: string; name?: string } | undefined;
  const pid = younifySourceToTmdbProviderId(svc);
  if (pid == null) return null;

  if (pid === 8) {
    const wid = extractNumericWatchId(row, [
      "netflixWatchId",
      "netflix_watch_id",
      "watchId",
      "watch_id",
      "itemID",
      "item_id",
      "titleId",
      "title_id",
      "videoId",
      "video_id",
    ]);
    if (wid) return `https://www.netflix.com/watch/${wid}`;
  }

  if (pid === 15) {
    const u = extractUuidContentId(row);
    if (u) return `https://www.hulu.com/watch/${u}`;
  }

  if (pid === 337) {
    return buildDisneyPlusWatchUrlFromRow(row, String(row.title ?? row.name ?? ""));
  }

  return null;
}

/**
 * Improve in-app open rates: Prime → app.primevideo.com; normalize mobile hosts for Disney+/Hulu HTTPS universal links.
 */
export function normalizeStreamingWatchUrl(url: string): string {
  let out = normalizePrimeVideoWatchUrl(url);
  if (/disneyplus\.com/i.test(out)) {
    out = normalizeDisneyPlusWatchUrl(out);
  }
  if (/netflix\.com/i.test(out)) {
    out = normalizeNetflixWatchUrl(out);
  }
  try {
    const u = new URL(out);
    const h = u.hostname.toLowerCase();
    if (h === "m.disneyplus.com") {
      u.hostname = "www.disneyplus.com";
      out = u.toString();
    }
    if (h.startsWith("m.hulu.com")) {
      u.hostname = "www.hulu.com";
      out = u.toString();
    }
    if (h === "m.youtube.com") {
      u.hostname = "www.youtube.com";
      out = u.toString();
    }
  } catch {
    /* keep out */
  }
  return out;
}

/** `https://www.disneyplus.com/...` → `disneyplus://www.disneyplus.com/...` for app handoff when HTTPS open fails. */
function httpsUrlToNativeScheme(httpsUrl: string, schemeWithColon: string): string | null {
  try {
    const u = new URL(httpsUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${schemeWithColon}//${u.host}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

async function openWatchUrlWithProviderFallbacks(
  watchUrl: string,
  row: Record<string, unknown>,
  options?: { skipDisneySearchGuard?: boolean },
): Promise<boolean> {
  const normalizedUrl = normalizeStreamingWatchUrl(watchUrl);
  const svc = row.younifySourceService as { id?: string; name?: string } | undefined;
  const pid = younifySourceToTmdbProviderId(svc);
  const lower = normalizedUrl.toLowerCase();

  if (
    !options?.skipDisneySearchGuard &&
    (pid === 337 || lower.includes("disneyplus.com")) &&
    isDisneyPlusSearchOrGenericUrl(normalizedUrl)
  ) {
    return false;
  }

  const isPrime =
    isPrimeVideoProviderId(pid) ||
    /amazon\.|primevideo|aiv/i.test(watchUrl) ||
    /amazon\.|primevideo|aiv/i.test(normalizedUrl);

  if (isPrime) {
    const asin =
      extractAmazonVideoAsinFromRow(row) ??
      extractAsinFromPrimeUrl(watchUrl) ??
      extractAsinFromPrimeUrl(normalizedUrl);
    const gti =
      extractGtiFromRow(row) ??
      extractGtiFromPrimeUrl(watchUrl) ??
      extractGtiFromPrimeUrl(normalizedUrl);
    const resumeSec = getPlaybackResumeSeconds(row);
    const targets = buildPrimeVideoOpenTargets({
      url: watchUrl,
      asin,
      gti,
      resumeSeconds: resumeSec,
    });
    for (const target of targets) {
      try {
        await Linking.openURL(target);
        return true;
      } catch {
        /* try next handoff */
      }
    }
    return false;
  }

  if (pid === 337 || lower.includes("disneyplus.com")) {
    if (!isDisneyPlusSearchOrGenericUrl(normalizedUrl)) {
      if (await openDisneyPlusContentUrl(normalizedUrl)) return true;
    }
  }

  if (pid === 8 || lower.includes("netflix.com")) {
    if (!isNetflixSearchOrGenericUrl(normalizedUrl)) {
      const resumeSec = getPlaybackResumeSeconds(row);
      const targets = buildNetflixOpenTargets({
        url: normalizedUrl,
        resumeSeconds: resumeSec,
      });
      for (const target of targets) {
        try {
          await Linking.openURL(target);
          return true;
        } catch {
          /* try next */
        }
      }
    }
  }

  try {
    await Linking.openURL(normalizedUrl);
    return true;
  } catch {
    /* try native schemes */
  }

  if (pid === 8 || lower.includes("netflix.com")) {
    const m = normalizedUrl.match(/netflix\.com\/watch\/(\d+)/i);
    if (m) {
      try {
        await Linking.openURL(`nflx://www.netflix.com/watch/${m[1]}`);
        return true;
      } catch {
        /* continue */
      }
    }
  }

  const nativeSchemeAttempts: {
    hostIncludes: string;
    providerIds: number[];
    scheme: string;
    altScheme?: string;
  }[] = [
    { hostIncludes: "disneyplus.com", providerIds: [337], scheme: "disneyplus:" },
    { hostIncludes: "hulu.com", providerIds: [15], scheme: "hulu:" },
    {
      hostIncludes: "max.com",
      providerIds: [1899, 384],
      scheme: "max:",
      altScheme: "hbomax:",
    },
    {
      hostIncludes: "hbomax.com",
      providerIds: [1899, 384],
      scheme: "hbomax:",
      altScheme: "max:",
    },
    { hostIncludes: "paramountplus.com", providerIds: [531], scheme: "paramountplus:" },
    { hostIncludes: "peacocktv.com", providerIds: [386, 387], scheme: "peacock:" },
    { hostIncludes: "tv.apple.com", providerIds: [350], scheme: "videos:" },
    { hostIncludes: "crunchyroll.com", providerIds: [283], scheme: "crunchyroll:" },
    { hostIncludes: "pluto.tv", providerIds: [300], scheme: "pluto:" },
    { hostIncludes: "tubitv.com", providerIds: [73], scheme: "tubi:" },
    { hostIncludes: "fubo.tv", providerIds: [257], scheme: "fubo:" },
    { hostIncludes: "amcplus.com", providerIds: [526], scheme: "amcplus:" },
    { hostIncludes: "viki.com", providerIds: [582], scheme: "viki:" },
    { hostIncludes: "plex.tv", providerIds: [1770], scheme: "plex:" },
    { hostIncludes: "youtube.com", providerIds: [192, 188], scheme: "youtube:" },
    { hostIncludes: "youtu.be", providerIds: [192, 188], scheme: "youtube:" },
  ];

  for (const att of nativeSchemeAttempts) {
    if (!lower.includes(att.hostIncludes)) continue;
    if (pid != null && !att.providerIds.includes(pid)) continue;

    const primary = httpsUrlToNativeScheme(normalizedUrl, att.scheme);
    if (primary) {
      try {
        await Linking.openURL(primary);
        return true;
      } catch {
        /* try alt */
      }
    }
    if (att.altScheme) {
      const alt = httpsUrlToNativeScheme(normalizedUrl, att.altScheme);
      if (alt) {
        try {
          await Linking.openURL(alt);
          return true;
        } catch {
          /* continue */
        }
      }
    }
  }

  return false;
}

function readPositiveNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
    if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim())) {
      const n = parseFloat(v.trim());
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

/** Fraction watched in (0,1), or percent 1–100 as fraction. */
function pickFirstNumericProgress(row: Record<string, unknown>): number | null {
  const keys = [
    "watchProgress",
    "watch_progress",
    "playbackProgress",
    "playback_progress",
    "progress",
    "percentWatched",
    "percent_watched",
  ];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v > 0 && v < 1) return v;
      if (v >= 1 && v <= 100) return v / 100;
    }
    if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim())) {
      const n = parseFloat(v.trim());
      if (!Number.isFinite(n) || n <= 0) continue;
      if (n < 1) return n;
      if (n <= 100) return n / 100;
    }
  }
  return null;
}

/**
 * Best-effort playback offset in **seconds** (Younify may expose extra JSON fields beyond the typed SDK).
 * Used to append `t=` on Netflix / YouTube when the base URL does not already include a start time.
 */
export function getPlaybackResumeSeconds(row: Record<string, unknown>): number | null {
  const ms = readPositiveNumber(row, [
    "bookmarkPositionMs",
    "bookmark_position_ms",
    "resumePositionMs",
    "resume_position_ms",
    "playbackPositionMs",
    "playback_position_ms",
    "positionMs",
    "position_ms",
    "lastPlayedPositionMs",
    "last_played_position_ms",
    "elapsedTimeMs",
    "elapsed_time_ms",
    "watchedDurationMs",
    "watched_duration_ms",
  ]);
  if (ms != null && ms > 500) {
    return Math.min(Math.floor(ms / 1000), 24 * 3600);
  }

  const sec = readPositiveNumber(row, [
    "resumeFromSeconds",
    "resume_from_seconds",
    "bookmarkTime",
    "bookmark_time",
    "playbackPosition",
    "playback_position",
    "position",
    "resumePosition",
    "resume_position",
    "elapsedTime",
    "elapsed_time",
    "watchedDuration",
    "watched_duration",
  ]);
  if (sec != null && sec > 1) {
    return Math.min(Math.floor(sec), 24 * 3600);
  }

  const rawProg = pickFirstNumericProgress(row);
  const durationMs = Number(row.duration);
  if (
    rawProg != null &&
    rawProg > 0 &&
    rawProg < 1 &&
    Number.isFinite(durationMs) &&
    durationMs > 10_000
  ) {
    return Math.min(Math.floor((rawProg * durationMs) / 1000), 24 * 3600);
  }

  return null;
}

/** Best-effort progress percent [0..100] for Continue watching reliability across provider payload shapes. */
export function getContinueWatchingProgressPercent(row: Record<string, unknown>): number {
  const durationMs = Number(row.duration);
  const posSec = getPlaybackResumeSeconds(row);
  if (
    posSec != null &&
    posSec > 0 &&
    Number.isFinite(durationMs) &&
    durationMs > 60_000
  ) {
    const totalSec = Math.max(1, Math.floor(durationMs / 1000));
    return Math.max(0, Math.min(100, Math.round((posSec / totalSec) * 100)));
  }

  const rawProg = pickFirstNumericProgress(row);
  if (rawProg != null && rawProg > 0) {
    return Math.max(0, Math.min(100, Math.round(rawProg * 100)));
  }

  const explicitPct = readPositiveNumber(row, [
    "watchPercent",
    "watch_percent",
    "completionPercent",
    "completion_percent",
    "progressPercent",
    "progress_percent",
  ]);
  if (explicitPct != null && explicitPct > 0) {
    return Math.max(0, Math.min(100, Math.round(explicitPct)));
  }

  return 0;
}

/** Append start offset when the provider URL supports it and no `t=` / `start=` is present. */
export function augmentWatchUrlWithResume(url: string, resumeSeconds: number | null): string {
  if (!url || resumeSeconds == null || resumeSeconds <= 0) return url;
  if (/[?&]t=\d+/.test(url) || /[?&]start=\d+/.test(url)) return url;

  const lower = url.toLowerCase();
  const sep = url.includes("?") ? "&" : "?";

  if (lower.includes("netflix.com/watch") || lower.startsWith("nflx://")) {
    return `${url}${sep}t=${resumeSeconds}`;
  }
  if (lower.includes("youtube.com/watch") || lower.includes("youtu.be/")) {
    return `${url}${sep}t=${resumeSeconds}`;
  }
  if (
    lower.includes("max.com/watch") ||
    lower.includes("hbomax.com") ||
    lower.includes("disneyplus.com") ||
    lower.includes("hulu.com/watch") ||
    lower.includes("paramountplus.com") ||
    lower.includes("peacocktv.com") ||
    lower.includes("pluto.tv") ||
    lower.includes("tubitv.com") ||
    lower.includes("crunchyroll.com") ||
    lower.includes("viki.com") ||
    lower.includes("amcplus.com") ||
    lower.includes("fubo.tv")
  ) {
    return `${url}${sep}t=${resumeSeconds}`;
  }
  // Prime Video (best-effort; some builds honor startTime for continue-watch web/app handoff)
  if (
    lower.includes("primevideo.com") ||
    (lower.includes("amazon.") && lower.includes("/gp/video")) ||
    lower.startsWith("aiv://")
  ) {
    if (!/[?&]starttime=/i.test(url)) {
      return `${url}${sep}startTime=${resumeSeconds}`;
    }
  }

  return url;
}

/** Subtitle for Continue watching tiles: episode + approximate time left. */
export function formatContinueWatchingMeta(row: Record<string, unknown>): string | null {
  const bits: string[] = [];
  const fromProvider = readSeasonEpisodeFromYounifyRow(row);
  if (fromProvider) {
    bits.push(`S${fromProvider.season} E${fromProvider.episode}`);
  } else {
    const season = row.season != null ? String(row.season).trim() : "";
    const episode = row.episode != null ? String(row.episode).trim() : "";
    const series = row.series != null ? String(row.series).trim() : "";
    if (season || episode) {
      const s = season ? `S${season}` : "";
      const e = episode ? `E${episode}` : "";
      if (s && e) bits.push(`${s} ${e}`);
      else bits.push(s || e);
    } else if (series && series.length > 0 && series.length < 40) {
      bits.push(series);
    }
  }

  const durationMs = Number(row.duration);
  const posSec = getPlaybackResumeSeconds(row);
  if (
    posSec != null &&
    posSec > 0 &&
    Number.isFinite(durationMs) &&
    durationMs > 60_000
  ) {
    const totalSec = Math.floor(durationMs / 1000);
    const leftSec = Math.max(0, totalSec - posSec);
    if (leftSec > 30 && leftSec < totalSec) {
      const m = Math.max(1, Math.round(leftSec / 60));
      bits.push(`${m} min left`);
    }
  }

  if (!bits.length) return null;
  return bits.join(" · ");
}

/** Younify browse / rail row: deep link when present, else provider title search, else JustWatch. */
export async function openYounifyBrowseItemOnPlatform(
  row: Record<string, unknown>,
  options?: OpenYounifyBrowseItemOptions,
): Promise<void> {
  const rawTitle = String(row.title ?? row.name ?? "").trim();
  const title = rawTitle || "Untitled";
  const isContinue = options?.sectionId === "continue";

  let watchUrl = pickWatchNowUrlFromRow(row);
  if (watchUrl) {
    watchUrl = normalizeStreamingWatchUrl(watchUrl);
  }
  if (!watchUrl) {
    watchUrl = buildProviderFallbackWatchUrl(row);
  }
  if (watchUrl && isContinue) {
    const resumeSec = getPlaybackResumeSeconds(row);
    watchUrl = augmentWatchUrlWithResume(watchUrl, resumeSec);
  }

  if (watchUrl) {
    const opened = await openWatchUrlWithProviderFallbacks(watchUrl, row);
    if (opened) return;
    console.warn(
      "[openYounifyBrowseItemOnPlatform] watch URL and native fallbacks failed",
      watchUrl,
    );
  }
  const year = extractContentReleaseYear(row);
  const pid = younifySourceToTmdbProviderId(
    row.younifySourceService as { id?: string; name?: string } | undefined,
  );
  if (pid === 337) {
    const disneyUrl = buildDisneyPlusWatchUrlFromRow(row, title);
    if (disneyUrl && (await openDisneyPlusContentUrl(disneyUrl))) return;
  }
  if (pid === 8) {
    const homepage = pickFirstString(row, ["homepage", "homePage", "home_page"]);
    if (homepage && !isNetflixSearchOrGenericUrl(homepage)) {
      const opened = await openWatchUrlWithProviderFallbacks(homepage, row);
      if (opened) return;
    }
  }
  if (pid != null) {
    await openStreamingTitleSearch(pid, title, year);
    return;
  }
  try {
    await Linking.openURL(
      `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`,
    );
  } catch (e) {
    console.warn("[openYounifyBrowseItemOnPlatform] JustWatch fallback failed", e);
  }
}

/**
 * TMDB "homepage" for many Disney+ titles is a disneyplus.com series/movie URL.
 * iOS/Android universal links hand off to the app (watch / browse — closest we get without a UUID from Younify).
 */
export async function tryOpenDisneyPlusFromHomepage(
  homepage: string | null | undefined,
): Promise<boolean> {
  if (!homepage || !/disneyplus\.com/i.test(homepage)) return false;
  return openDisneyPlusContentUrl(homepage.trim());
}

export async function openPrimeVideoForTmdbItem(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<boolean> {
  try {
    const { tmdbApi } = await import("@/utils/tmdbApi");
    const details =
      mediaType === "movie"
        ? await tmdbApi.getMovieDetails(tmdbId)
        : await tmdbApi.getTVShowDetails(tmdbId);
    const homepage = details?.homepage?.trim();
    if (
      !homepage ||
      (!/amazon\.|primevideo/i.test(homepage) && !/^aiv:\/\//i.test(homepage))
    ) {
      return false;
    }
    return openWatchUrlWithProviderFallbacks(homepage, primeVideoRowStub());
  } catch (e) {
    if (__DEV__) console.warn("[openPrimeVideoForTmdbItem]", e);
    return false;
  }
}

export async function openNetflixForTmdbItem(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<boolean> {
  try {
    const { tmdbApi } = await import("@/utils/tmdbApi");
    const details =
      mediaType === "movie"
        ? await tmdbApi.getMovieDetails(tmdbId)
        : await tmdbApi.getTVShowDetails(tmdbId);
    const homepage = details?.homepage?.trim();
    if (!homepage || !/netflix\.com/i.test(homepage)) return false;
    const row = { younifySourceService: { id: "8", name: "Netflix" } };
    return openWatchUrlWithProviderFallbacks(homepage, row);
  } catch (e) {
    if (__DEV__) console.warn("[openNetflixForTmdbItem]", e);
    return false;
  }
}

/** Resolve TMDB `homepage` (often a disneyplus.com series/movie URL) and open in the Disney+ app. */
export async function openDisneyPlusForTmdbItem(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<boolean> {
  try {
    const { tmdbApi } = await import("@/utils/tmdbApi");
    const details =
      mediaType === "movie"
        ? await tmdbApi.getMovieDetails(tmdbId)
        : await tmdbApi.getTVShowDetails(tmdbId);
    return tryOpenDisneyPlusFromHomepage(details?.homepage);
  } catch (e) {
    if (__DEV__) console.warn("[openDisneyPlusForTmdbItem]", e);
    return false;
  }
}

export async function openStreamingApp(
  providerId: number,
  title: string,
  year?: number,
  fallbackUrl?: string
): Promise<boolean> {
  const canonicalId = normalizeTmdbWatchProviderId(providerId);
  const platform = STREAMING_PLATFORMS[canonicalId];

  if (!platform) {
    console.log(`Unknown streaming provider: ${providerId}`);
    if (fallbackUrl && !isTmdbOrJustWatchAggregatorUrl(fallbackUrl)) {
      try {
        await Linking.openURL(fallbackUrl);
        return true;
      } catch {
        return false;
      }
    }
    return openStreamingTitleSearch(canonicalId, title, year);
  }

  const safeFallbackUrl =
    fallbackUrl && !isTmdbOrJustWatchAggregatorUrl(fallbackUrl) ? fallbackUrl : undefined;

  const tryFallback = async (): Promise<boolean> => {
    if (safeFallbackUrl) {
      if (canonicalId === 337) {
        if (await tryOpenDisneyPlusFromHomepage(safeFallbackUrl)) return true;
      } else if (canonicalId === 8) {
        const row = { younifySourceService: { id: "8", name: "Netflix" } };
        if (await openWatchUrlWithProviderFallbacks(safeFallbackUrl, row)) return true;
      } else if (isPrimeVideoProviderId(canonicalId)) {
        if (
          await openWatchUrlWithProviderFallbacks(
            safeFallbackUrl,
            primeVideoRowStub(),
          )
        ) {
          return true;
        }
      } else {
        try {
          await Linking.openURL(normalizeStreamingWatchUrl(safeFallbackUrl));
          return true;
        } catch {
          /* fall through to title search */
        }
      }
    }
    return openStreamingTitleSearch(canonicalId, title, year);
  };

  if (canonicalId === 337 || canonicalId === 8) {
    return await tryFallback();
  }

  if (isPrimeVideoProviderId(canonicalId)) {
    if (safeFallbackUrl) {
      const opened = await openWatchUrlWithProviderFallbacks(
        safeFallbackUrl,
        primeVideoRowStub(),
      );
      if (opened) return true;
    }
    return await tryFallback();
  }

  try {
    const searchUrl = normalizeStreamingWatchUrl(
      platform.searchUrl?.(title, year) || platform.webUrl,
    );

    try {
      await Linking.openURL(searchUrl);
      return true;
    } catch (searchError) {
      if (__DEV__) {
        console.warn(
          `Title search link failed for ${platform.name}, falling back to app scheme`,
          searchError,
        );
      }
    }

    if (Platform.OS !== "web" && platform.appScheme) {
      const canOpen = await Linking.canOpenURL(platform.appScheme);
      if (canOpen) {
        await Linking.openURL(platform.appScheme);
        return true;
      }
    }

    return await tryFallback();
  } catch (error) {
    console.error(`Failed to open ${platform.name}:`, error);
    return await tryFallback();
  }
}

export async function openAppStore(platform: StreamingPlatform): Promise<void> {
  try {
    if (Platform.OS === 'ios' && platform.iosAppId) {
      await Linking.openURL(`https://apps.apple.com/app/id${platform.iosAppId}`);
    } else if (Platform.OS === 'android' && platform.androidPackage) {
      await Linking.openURL(`https://play.google.com/store/apps/details?id=${platform.androidPackage}`);
    } else {
      await Linking.openURL(platform.webUrl);
    }
  } catch (error) {
    console.error('Failed to open app store:', error);
    await Linking.openURL(platform.webUrl);
  }
}

export function getProviderColor(providerId: number): string {
  return STREAMING_PLATFORMS[providerId]?.color || '#666666';
}

export function getProviderName(providerId: number): string {
  return STREAMING_PLATFORMS[providerId]?.name || 'Unknown';
}

export const POPULAR_STREAMING_IDS = [8, 337, 1899, 15, 386, 531, 350, 9];
