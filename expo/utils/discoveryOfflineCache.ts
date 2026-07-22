import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_VERSION = 1;

type Envelope<T> = {
  v: number;
  savedAt: number;
  data: T;
};

export async function readDiscoveryCache<T>(
  key: string,
  maxAgeMs: number,
): Promise<{ data: T; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed.v !== CACHE_VERSION || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export async function writeDiscoveryCache<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: Envelope<T> = { v: CACHE_VERSION, savedAt: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* best-effort */
  }
}

export const DISCOVERY_CACHE_KEYS = {
  globalSearch: (keyword: string) =>
    `discovery:search:v1:${keyword.trim().toLowerCase().slice(0, 80)}`,
  forYouTrending: 'discovery:forYou:trending:v1',
  forYouPopular: 'discovery:forYou:popular:v1',
} as const;

/** Default TTL: 6 hours */
export const DISCOVERY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function formatCacheAgeLabel(savedAt: number): string {
  const mins = Math.max(1, Math.round((Date.now() - savedAt) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}
