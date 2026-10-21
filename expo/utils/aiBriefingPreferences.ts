import { unifiedStorage } from './unifiedStorage';
import type { IntelligenceSource } from './intelligenceContext';

export type AIBriefingPreferences = {
  enabled: boolean;
  sources: Record<IntelligenceSource, boolean>;
};

/** Sharing is opt-in; selecting AI alone only includes habit and task titles. */
export const DEFAULT_AI_BRIEFING_PREFERENCES: AIBriefingPreferences = {
  enabled: false,
  sources: {
    habits: true, tasks: true,
    calendar: false, sports: false, shows: false,
    events: false, weather: false,
  },
};

// Keep privacy changes ordered, including rapid on/off toggles.
const pendingWrites = new Map<string, Promise<void>>();
const storageKey = (userId: string) => `@ai_briefing_preferences_v1_${userId}`;

export async function loadAIBriefingPreferences(userId: string): Promise<AIBriefingPreferences> {
  if (!userId || userId === 'guest') return structuredDefaults();
  try {
    await pendingWrites.get(userId);
    const stored = await unifiedStorage.getItem(storageKey(userId));
    if (!stored) return structuredDefaults();
    const parsed = JSON.parse(stored) as Partial<AIBriefingPreferences>;
    return {
      enabled: parsed.enabled === true,
      sources: Object.fromEntries(
        Object.entries(DEFAULT_AI_BRIEFING_PREFERENCES.sources).map(([key, defaultValue]) => [
          key, typeof parsed.sources?.[key as IntelligenceSource] === 'boolean'
            ? parsed.sources[key as IntelligenceSource] : defaultValue,
        ])
      ) as Record<IntelligenceSource, boolean>,
    };
  } catch {
    return structuredDefaults();
  }
}

function structuredDefaults(): AIBriefingPreferences {
  return { enabled: false, sources: { ...DEFAULT_AI_BRIEFING_PREFERENCES.sources } };
}

export async function saveAIBriefingPreferences(
  userId: string, preferences: AIBriefingPreferences,
): Promise<void> {
  if (!userId || userId === 'guest') return;
  const previous = pendingWrites.get(userId) ?? Promise.resolve();
  const write = previous.catch(() => {}).then(
    () => unifiedStorage.setItem(storageKey(userId), JSON.stringify(preferences))
  );
  pendingWrites.set(userId, write);
  try {
    await write;
  } finally {
    if (pendingWrites.get(userId) === write) pendingWrites.delete(userId);
  }
}
