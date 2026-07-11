export const APP_SCHEME = 'onepager';

/** Public HTTPS origin for shareable event invite links. */
export const WEB_INVITE_ORIGIN = 'https://join.onepagerapp.co.uk';

export type ParsedDeepLink =
  | { kind: 'challenge'; id: string }
  | { kind: 'user'; username: string }
  | { kind: 'event'; id: string }
  | { kind: 'tab'; name: string }
  | { kind: 'unknown'; path: string };

const HOSTNAME_ROUTES = new Set(['event', 'challenge', 'u', 'user', 'tabs']);

function clean(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

/** Build a shareable link to a challenge, e.g. onepager://challenge/abc123 */
export function buildChallengeLink(challengeId: string): string {
  return `${APP_SCHEME}://challenge/${encodeURIComponent(clean(challengeId))}`;
}

/** Primary share link — HTTPS so it works without the app installed. */
export function buildEventLink(
  eventId: string,
  options?: { from?: string | null; planToken?: string | null },
): string {
  return buildEventWebLink(eventId, options);
}

/** HTTPS link for sharing (works without the app installed). */
export function buildEventWebLink(
  eventId: string,
  options?: { from?: string | null; planToken?: string | null },
): string {
  const url = new URL(`/event/${encodeURIComponent(clean(eventId))}`, WEB_INVITE_ORIGIN);
  const from = options?.from?.trim().replace(/^@/, '');
  if (from) url.searchParams.set('from', from);
  const planToken = options?.planToken?.trim();
  if (planToken) url.searchParams.set('ptoken', planToken);
  return url.toString();
}

/** Custom scheme link — opens the native app directly when installed. */
export function buildEventAppLink(eventId: string): string {
  return `${APP_SCHEME}:///event/${encodeURIComponent(clean(eventId))}`;
}

/** Build a shareable link to a user profile, e.g. onepager://u/komzy */
export function buildUserLink(username: string): string {
  const handle = clean(username).replace(/^@/, '');
  return `${APP_SCHEME}://u/${encodeURIComponent(handle)}`;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * onepager://event/{id} puts "event" in the hostname (path becomes just the id).
 * Normalize to "event/{id}" path segments for routing.
 */
export function normalizeDeepLinkPath(url: string): string {
  if (!url) return '';

  const proxyIdx = url.indexOf('/--/');
  if (proxyIdx >= 0) {
    return clean(url.slice(proxyIdx + 4).split('?')[0] ?? '');
  }

  try {
    const parsed = new URL(url);
    let path = clean(parsed.pathname ?? '');
    const hostname = clean(parsed.hostname ?? '');

    if (hostname && HOSTNAME_ROUTES.has(hostname)) {
      return path ? `${hostname}/${path}` : hostname;
    }

    return path;
  } catch {
    const afterScheme = url.split('://')[1] ?? '';
    return clean(afterScheme.split('?')[0] ?? '');
  }
}

/**
 * Parse an incoming deep link URL into a typed route.
 * Handles both raw scheme links (onepager://challenge/123) and
 * Expo-generated dev/proxy links (exp://.../--/challenge/123).
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;
  const path = normalizeDeepLinkPath(url);
  if (!path) return null;
  const segments = path.split('/').filter(Boolean).map(decodeSegment);
  if (segments.length === 0) return null;

  const [head, ...rest] = segments;

  if (head === 'challenge' && rest[0]) {
    return { kind: 'challenge', id: rest[0] };
  }
  if (head === 'event' && rest[0]) {
    return { kind: 'event', id: rest[0] };
  }
  if ((head === 'u' || head === 'user') && rest[0]) {
    return { kind: 'user', username: rest[0].replace(/^@/, '') };
  }
  if (head === 'tabs' && rest[0]) {
    return { kind: 'tab', name: rest[0] };
  }
  if (['sports', 'shows', 'tasks', 'activities', 'profile'].includes(head)) {
    return { kind: 'tab', name: head };
  }

  return { kind: 'unknown', path };
}
