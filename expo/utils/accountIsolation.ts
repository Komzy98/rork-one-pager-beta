/**
 * Hard boundaries between signed-in users. Any cross-account read/write is a privacy bug.
 */
import { resetYounifySession, clearYounifyTokensKeepingUser } from '@/services/younify';
import { clearUserScopedQueries, purgeAllReactQueryCaches } from '@/utils/queryClientRef';

export { isProfileForUser } from '@/utils/sessionProfile';

export function dataOwnedBySession(
  sessionUserId: string | null | undefined,
  ownerId: string | null | undefined,
): boolean {
  return Boolean(sessionUserId && ownerId && sessionUserId === ownerId);
}

/** Throws if `ownerId` is not the active session user (use before cloud writes). */
export function assertDataOwnedBySession(
  sessionUserId: string | null | undefined,
  ownerId: string | null | undefined,
  label: string,
): void {
  if (!dataOwnedBySession(sessionUserId, ownerId)) {
    throw Object.assign(new Error(`Account isolation blocked: ${label}`), {
      code: 'ACCOUNT_ISOLATION',
    });
  }
}

/**
 * Wipe in-memory caches and third-party SDK state when the active user changes or signs out.
 * Safe to call multiple times.
 */
export async function purgeAccountSessionState(
  reason: 'logout' | 'switch' | 'sign_in',
): Promise<void> {
  clearUserScopedQueries();
  purgeAllReactQueryCaches();
  try {
    // On logout there is no next user, so fully reset (drops the external id).
    // On switch / sign-in the auth layer sets the new user's external id right
    // after, so only clear the previous account's tokens + cached data — never
    // null the external id, or the SDK is left with no signed-in app user.
    if (reason === 'logout') {
      await resetYounifySession();
    } else {
      await clearYounifyTokensKeepingUser();
    }
  } catch {
    /* SDK may be unavailable in tests / web */
  }
}

/** Strip avatar (and force id) when persisting a UserProfile for `sessionUserId`. */
export function sanitizeUserProfileForSession<T extends { id?: string; avatar?: string }>(
  sessionUserId: string,
  profile: T,
): T {
  if (profile.id === sessionUserId) return profile;
  if (__DEV__) {
    console.error('[accountIsolation] discarding mismatched profile fields on save', {
      sessionUserId,
      profileId: profile.id,
    });
  }
  const { avatar: _drop, ...rest } = profile;
  return { ...rest, id: sessionUserId } as T;
}
