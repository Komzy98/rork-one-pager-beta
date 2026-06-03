import * as Linking from 'expo-linking';

export const APP_SCHEME = 'onepager';

export type ParsedDeepLink =
  | { kind: 'challenge'; id: string }
  | { kind: 'user'; username: string }
  | { kind: 'tab'; name: string }
  | { kind: 'unknown'; path: string };

function clean(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

/** Build a shareable link to a challenge, e.g. onepager://challenge/abc123 */
export function buildChallengeLink(challengeId: string): string {
  return `${APP_SCHEME}://challenge/${encodeURIComponent(clean(challengeId))}`;
}

/** Build a shareable link to a user profile, e.g. onepager://u/komzy */
export function buildUserLink(username: string): string {
  const handle = clean(username).replace(/^@/, '');
  return `${APP_SCHEME}://u/${encodeURIComponent(handle)}`;
}

/**
 * Parse an incoming deep link URL into a typed route.
 * Handles both raw scheme links (onepager://challenge/123) and
 * Expo-generated dev/proxy links (exp://.../--/challenge/123).
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;
  let path = '';
  try {
    const parsed = Linking.parse(url);
    path = clean(parsed.path ?? '');
    // Fall back to manual extraction if expo-linking didn't capture the path.
    if (!path) {
      const afterScheme = url.split('://')[1] ?? '';
      const afterProxy = afterScheme.includes('/--/')
        ? afterScheme.split('/--/')[1]
        : afterScheme;
      path = clean(afterProxy.split('?')[0] ?? '');
    }
  } catch {
    return null;
  }

  if (!path) return null;
  const segments = path.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  if (segments.length === 0) return null;

  const [head, ...rest] = segments;

  if (head === 'challenge' && rest[0]) {
    return { kind: 'challenge', id: rest[0] };
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
