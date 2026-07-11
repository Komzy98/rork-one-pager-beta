/**
 * Analytics / dev logging guard for partner-visible social activity.
 * Never emit identifiable habit or event names without explicit consent.
 */

export type SocialAnalyticsConsent = {
  /** User opted into generic partner labels (default true in bootstrap). */
  genericSocialActivity?: boolean;
  /** Explicit opt-in to include identifiable names in product analytics. */
  analyticsIdentifiableContent?: boolean;
};

const PARTNER_ACTIVITY_EVENTS = new Set([
  'social_activity_published',
  'social_habit_completed',
  'social_event_saved',
  'social_event_planned',
  'social_match_pinned',
  'social_show_saved',
  'social_habit_published',
]);

const IDENTIFIABLE_PROPERTY_KEYS = new Set([
  'habitName',
  'habitTitle',
  'eventTitle',
  'eventName',
  'showTitle',
  'matchTitle',
  'title',
  'body',
  'venue',
  'homeTeam',
  'awayTeam',
  'username',
  'displayName',
]);

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length <= 24) return '[redacted]';
    return '[redacted_content]';
  }
  if (Array.isArray(value)) return value.map(() => '[redacted]');
  if (value && typeof value === 'object') return { redacted: true };
  return '[redacted]';
}

export function mayLogIdentifiableSocialAnalytics(consent?: SocialAnalyticsConsent | null): boolean {
  if (consent?.analyticsIdentifiableContent === true) return true;
  if (consent?.genericSocialActivity === false) return true;
  return false;
}

/** Sanitize properties before any analytics SDK or remote logging. */
export function sanitizeSocialAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
  consent?: SocialAnalyticsConsent | null,
): Record<string, unknown> {
  if (!properties) return {};
  if (mayLogIdentifiableSocialAnalytics(consent)) return { ...properties };

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (IDENTIFIABLE_PROPERTY_KEYS.has(key)) {
      safe[key] = redactValue(value);
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export interface SocialAnalyticsEventInput {
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * Central hook for partner-activity analytics. Safe no-op today; redacts before
 * any future third-party SDK integration.
 */
export function trackSocialAnalyticsEvent(
  event: SocialAnalyticsEventInput,
  consent?: SocialAnalyticsConsent | null,
): void {
  if (!PARTNER_ACTIVITY_EVENTS.has(event.name)) return;

  const properties = sanitizeSocialAnalyticsProperties(event.properties, consent);

  if (__DEV__) {
    console.log('[social-analytics]', event.name, properties);
  }

  // Future: PostHog / Amplitude / etc. must only receive `properties` above.
}

/** Dev-only logging that never prints partner-identifiable habit/event names by default. */
export function devLogSocial(
  message: string,
  payload?: Record<string, unknown>,
  consent?: SocialAnalyticsConsent | null,
): void {
  if (!__DEV__) return;
  const safe = payload
    ? sanitizeSocialAnalyticsProperties(payload, consent)
    : undefined;
  if (safe) console.log(message, safe);
  else console.log(message);
}
