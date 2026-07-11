import type { ActivityType } from '@/utils/activityService';
import type { LocalEvent, SavedEventSnapshot } from '@/types/events';
import type { SocialPrivacyPreferences } from '@/utils/socialPrivacy';

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;

/** Tokens, keys, and credentials that must never appear in activity metadata. */
const SECRET_PATTERNS = [
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/i,
  /\b(api[_-]?key|secret|password|private[_-]?key|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{6,}/i,
  /[?&](token|key|secret|auth|access_token|refresh_token|api_key)=/i,
  /\bsb_[a-z0-9_-]{20,}\b/i,
  /\b(sk|pk)_[a-z0-9]{16,}\b/i,
];

const SENSITIVE_HABIT_PATTERN =
  /\b(therapy|therapist|counsel|counsell|mental|anxiety|depress|recovery|rehab|meditat|mindful|journal|wellbeing|wellness|sleep\s*log|mood\s*track|medication|medicine|pill|doctor|grief|sobriety|trigger|panic|self[- ]?harm|wellness check|check[- ]?in)\b/i;

const ALLOWED_METADATA_KEYS: Partial<Record<ActivityType, string[]>> = {
  event_saved: ['domain', 'eventId', 'category'],
  event_planned: ['domain', 'eventId', 'category'],
  event_attending: ['domain', 'eventId', 'category'],
  match_pinned: ['domain', 'matchId', 'leagueId'],
  show_saved: ['domain', 'showId', 'tmdbId', 'mediaType'],
  workout: ['domain', 'habitId'],
  published_habit: ['domain', 'category'],
  streak_milestone: ['milestone'],
  custom: ['domain'],
  achievement: ['domain'],
  challenge_joined: ['domain'],
};

export interface SocialPublishContext {
  genericCopy?: boolean;
  recoveryModeActive?: boolean;
  privacy?: SocialPrivacyPreferences;
}

export interface HabitPublishInput {
  habitId: string;
  habitName: string;
  description?: string | null;
  taskCategory?: string | null;
}

export function isSensitiveHabitForSocialPublish(input: {
  name?: string | null;
  description?: string | null;
  taskCategory?: string | null;
  recoveryModeActive?: boolean;
}): boolean {
  if (input.recoveryModeActive) return true;
  if (input.taskCategory === 'health') return true;
  const text = `${input.name ?? ''} ${input.description ?? ''}`.trim();
  if (!text) return false;
  return SENSITIVE_HABIT_PATTERN.test(text);
}

export function containsActivitySecret(text?: string | null): boolean {
  if (!text?.trim()) return false;
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export function stripActivityPii(text?: string | null): string | null {
  if (!text?.trim()) return null;
  let next = text.trim();
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, '[redacted]');
  }
  next = next.replace(EMAIL_PATTERN, '[redacted]');
  next = next.replace(PHONE_PATTERN, '[redacted]');
  if (next.length > 120) {
    next = `${next.slice(0, 117)}...`;
  }
  return next || null;
}

function minimizeMetadataForGeneric(
  type: ActivityType,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const domain = metadata.domain;
  if (typeof domain === 'string' && domain.trim()) {
    return { domain: domain.trim() };
  }
  const fallbackDomain: Partial<Record<ActivityType, string>> = {
    event_saved: 'events',
    event_planned: 'events',
    event_attending: 'events',
    workout: 'tasks',
    published_habit: 'community',
    match_pinned: 'sports',
    show_saved: 'shows',
    streak_milestone: 'gamification',
  };
  const d = fallbackDomain[type];
  return d ? { domain: d } : {};
}

export function sanitizeActivityMetadata(
  type: ActivityType,
  metadata?: Record<string, unknown>,
  options?: { genericCopy?: boolean },
): Record<string, unknown> {
  if (options?.genericCopy) {
    return minimizeMetadataForGeneric(type, metadata ?? {});
  }

  const allowed = new Set(ALLOWED_METADATA_KEYS[type] ?? ['domain']);
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (!allowed.has(key)) continue;
    if (typeof value === 'string') {
      if (containsActivitySecret(value)) continue;
      const stripped = stripActivityPii(value);
      if (!stripped || containsActivitySecret(stripped)) continue;
      clean[key] = stripped;
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }
  return clean;
}

function genericEventDate(event: LocalEvent): string | null {
  return stripActivityPii(event.date) ?? null;
}

export function buildEventSavedActivity(
  event: LocalEvent,
  options: SocialPublishContext = {},
): { title: string; body: string | null; metadata: Record<string, unknown> } {
  const generic = options.genericCopy ?? true;
  return {
    title: generic ? 'Saved an event' : `Saved ${stripActivityPii(event.title) ?? 'an event'}`,
    body: generic
      ? genericEventDate(event)
      : stripActivityPii(`${event.date}${event.category ? ` · ${event.category}` : ''}`),
    metadata: sanitizeActivityMetadata('event_saved', {
      domain: 'events',
      eventId: event.id,
      category: event.category,
    }, { genericCopy: generic }),
  };
}

export function buildEventPlannedActivity(
  event: LocalEvent,
  options: SocialPublishContext = {},
): { title: string; body: string | null; metadata: Record<string, unknown> } {
  const generic = options.genericCopy ?? true;
  return {
    title: generic ? 'Planned an event' : `Planned ${stripActivityPii(event.title) ?? 'an event'}`,
    body: generic
      ? 'Added to calendar'
      : stripActivityPii(`${event.date} · added to calendar`),
    metadata: sanitizeActivityMetadata('event_planned', {
      domain: 'events',
      eventId: event.id,
      category: event.category,
    }, { genericCopy: generic }),
  };
}

export function buildHabitCompletedActivity(
  input: HabitPublishInput,
  options: SocialPublishContext = {},
): { title: string; body: string | null; metadata: Record<string, unknown> } | null {
  if (
    isSensitiveHabitForSocialPublish({
      name: input.habitName,
      description: input.description,
      taskCategory: input.taskCategory,
      recoveryModeActive: options.recoveryModeActive,
    })
  ) {
    return null;
  }

  const generic = options.genericCopy ?? true;
  return {
    title: generic
      ? 'Completed a habit'
      : `Completed ${stripActivityPii(input.habitName) ?? 'a habit'}`,
    body: generic || options.privacy?.shareHabitsGeneric ? 'Checked in today' : null,
    metadata: sanitizeActivityMetadata('workout', {
      domain: 'tasks',
      habitId: input.habitId,
    }, { genericCopy: generic }),
  };
}

export function buildShowSavedActivity(
  showId: string,
  title: string,
  tmdbId?: number,
  mediaType?: string,
  options: SocialPublishContext = {},
): { title: string; body: string | null; metadata: Record<string, unknown> } {
  const generic = options.genericCopy ?? true;
  return {
    title: generic ? 'Added to watchlist' : `Added ${stripActivityPii(title) ?? 'a title'} to watchlist`,
    body: mediaType === 'tv' ? 'Series queued up' : 'Film on the list',
    metadata: sanitizeActivityMetadata('show_saved', {
      domain: 'shows',
      showId,
      tmdbId,
      mediaType: mediaType ?? 'tv',
    }, { genericCopy: generic }),
  };
}

export function buildMatchPinnedActivity(
  homeTeam: string,
  awayTeam: string,
  matchId: string,
  leagueId?: string,
  league?: string | null,
  options: SocialPublishContext = {},
): { title: string; body: string | null; metadata: Record<string, unknown> } {
  const generic = options.genericCopy ?? true;
  return {
    title: generic
      ? 'Pinned a match'
      : `Pinned ${stripActivityPii(homeTeam) ?? 'a team'} vs ${stripActivityPii(awayTeam) ?? 'a team'}`,
    body: stripActivityPii(league ?? 'Watch party ready'),
    metadata: sanitizeActivityMetadata('match_pinned', {
      domain: 'sports',
      matchId,
      leagueId,
    }, { genericCopy: generic }),
  };
}

export function buildPublishedHabitActivity(
  habitName: string,
  category: string,
  options: SocialPublishContext = {},
): { title: string; body: string | null; metadata: Record<string, unknown> } {
  const generic = options.genericCopy ?? true;
  return {
    title: generic
      ? 'Published a routine 📣'
      : `Published "${stripActivityPii(habitName) ?? 'a routine'}" 📣`,
    body: 'A new routine is live in Discover.',
    metadata: sanitizeActivityMetadata(
      'published_habit',
      generic ? { domain: 'community' } : { domain: 'community', category },
      { genericCopy: generic },
    ),
  };
}

export function sanitizePublishedActivity(input: {
  type: ActivityType;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  genericCopy?: boolean;
}): { title: string; body: string | null; metadata: Record<string, unknown> } {
  if (containsActivitySecret(input.title) || containsActivitySecret(input.body)) {
    return {
      title: 'Shared an update',
      body: null,
      metadata: minimizeMetadataForGeneric(input.type, input.metadata ?? {}),
    };
  }
  return {
    title: stripActivityPii(input.title) ?? input.title,
    body: stripActivityPii(input.body),
    metadata: sanitizeActivityMetadata(input.type, input.metadata, {
      genericCopy: input.genericCopy,
    }),
  };
}

/** Partner-visible event save — title, date, and category only. */
export function toPartnerVisibleEventSnapshot(snapshot: SavedEventSnapshot): SavedEventSnapshot {
  return {
    id: snapshot.id,
    title: snapshot.title,
    category: snapshot.category,
    startAt: snapshot.startAt,
    savedAt: snapshot.savedAt,
    dateLabel: snapshot.dateLabel,
    venueName: '',
    latitude: 0,
    longitude: 0,
    source: snapshot.source,
  };
}

export const ACTIVITY_VISIBILITY_STORAGE_PREFIX = 'activity_visibility';

export function activityVisibilityStorageKey(userId: string): string {
  return `${ACTIVITY_VISIBILITY_STORAGE_PREFIX}_${userId}`;
}
