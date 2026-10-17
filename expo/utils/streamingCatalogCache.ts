/**
 * Best-effort, user-scoped snapshot of the last successful Younify catalogue.
 * Only display metadata is saved here: never SDK tokens or raw linked-service credentials.
 * A snapshot is used immediately on app reopen, then revalidated in the background.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { YounifyBrowseSection } from '@/services/younify';

const VERSION = 1;
const PREFIX = 'streaming:catalogue:v1:';
export const STREAMING_CATALOGUE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CACHE_CHARS = 1_800_000;

export type StreamingCatalogueSnapshot = {
  savedAt: number;
  linkedStreamingCount: number;
  linkedProviderIds: number[];
  heroContent: Record<string, unknown>[];
  browseSections: YounifyBrowseSection[];
};

export function streamingCatalogueKey(userId: string): string {
  return PREFIX + encodeURIComponent(userId);
}

export function streamingSnapshotHasContent(snapshot: StreamingCatalogueSnapshot): boolean {
  return snapshot.heroContent.length > 0 ||
    snapshot.browseSections.some(section => section.items.length > 0);
}

export async function readStreamingCatalogue(
  userId: string,
): Promise<StreamingCatalogueSnapshot | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(streamingCatalogueKey(userId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as {
      version?: number;
      ownerId?: string;
      snapshot?: StreamingCatalogueSnapshot;
    };
    const value = envelope.snapshot;
    if (envelope.version !== VERSION || envelope.ownerId !== userId || !value) return null;
    if (
      !Number.isFinite(value.savedAt) ||
      Date.now() - value.savedAt > STREAMING_CATALOGUE_MAX_AGE_MS ||
      value.savedAt > Date.now() + 60_000 ||
      !Array.isArray(value.browseSections) ||
      !Array.isArray(value.heroContent) ||
      !Array.isArray(value.linkedProviderIds) ||
      !Number.isFinite(value.linkedStreamingCount)
    ) return null;
    return value;
  } catch {
    // Offline data is optional and must never prevent the live fetch.
    return null;
  }
}

export async function writeStreamingCatalogue(
  userId: string,
  snapshot: Omit<StreamingCatalogueSnapshot, 'savedAt'>,
): Promise<void> {
  if (!userId) return;
  try {
    // Save a bounded feed. Metadata may contain provider-specific large nested values.
    // Restricting rows protects AsyncStorage startup cost without trimming the live UI.
    const makeEnvelope = (maxRows: number) => JSON.stringify({
      version: VERSION,
      ownerId: userId,
      snapshot: {
        savedAt: Date.now(),
        linkedStreamingCount: snapshot.linkedStreamingCount,
        linkedProviderIds: snapshot.linkedProviderIds,
        heroContent: snapshot.heroContent.slice(0, Math.min(maxRows, 20)),
        browseSections: snapshot.browseSections.map(section => ({
          id: section.id,
          title: section.title,
          items: section.items.slice(0, maxRows),
        })),
      },
    });
    let serialized = makeEnvelope(30);
    if (serialized.length > MAX_CACHE_CHARS) serialized = makeEnvelope(12);
    if (serialized.length > MAX_CACHE_CHARS) return;
    await AsyncStorage.setItem(streamingCatalogueKey(userId), serialized);
  } catch {
    // SDK rows aren't guaranteed to be JSON serialisable; never block the live feed.
  }
}

/** Remove an account's snapshot when its streaming connection is explicitly cleared. */
export async function clearStreamingCatalogue(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(streamingCatalogueKey(userId));
  } catch {
    // best-effort
  }
}
