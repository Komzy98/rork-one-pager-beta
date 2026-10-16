/**
 * Validate the active Supabase identity before an RSVP mutation.
 *
 * UI identity may be restored from local cache before Supabase recovers its
 * access token. Never turn that cached identity into an owner_id write.
 */
export type PlanWriteSession = {
  access_token: string;
  user: { id: string };
} | null;

type AuthResult<T> = { data: T; error?: { message: string } | null };

export interface PlanWriteAuthAdapter {
  getSession: () => Promise<AuthResult<{ session: PlanWriteSession }>>;
  recoverSession: () => Promise<PlanWriteSession>;
  getUser: () => Promise<AuthResult<{ user: { id: string } | null }>>;
  refreshSession: () => Promise<AuthResult<{ session: PlanWriteSession }>>;
}

export const RSVP_SESSION_REQUIRED =
  'Your sign-in session has expired. Please sign in again to save your RSVP.';
export const RSVP_ACCOUNT_CHANGED =
  'Your active account has changed. Please sign in again before saving this RSVP.';
export const RSVP_SESSION_UNVERIFIED =
  'Could not verify your sign-in. Check your connection and try again.';

function requireOwner(session: PlanWriteSession, expectedUserId: string): void {
  if (!session?.access_token || !session.user?.id) {
    throw new Error(RSVP_SESSION_REQUIRED);
  }
  if (session.user.id !== expectedUserId) {
    throw new Error(RSVP_ACCOUNT_CHANGED);
  }
}

export async function verifyPlanWriteAuth(
  expectedUserId: string,
  auth: PlanWriteAuthAdapter,
): Promise<void> {
  if (!expectedUserId) throw new Error(RSVP_SESSION_REQUIRED);

  let session: PlanWriteSession = null;
  try {
    const response = await auth.getSession();
    if (!response.error) session = response.data.session;
  } catch {
    // A cold-start session may not yet be restored; try recovery below.
  }
  if (!session) {
    try {
      session = await auth.recoverSession();
    } catch {
      // Do not allow writes using the cached UI identity.
    }
  }
  requireOwner(session, expectedUserId);

  try {
    const verified = await auth.getUser();
    if (!verified.error && verified.data.user?.id === expectedUserId) return;
    if (!verified.error && verified.data.user?.id && verified.data.user.id !== expectedUserId) {
      throw new Error(RSVP_ACCOUNT_CHANGED);
    }
  } catch (error) {
    if (error instanceof Error && error.message === RSVP_ACCOUNT_CHANGED) throw error;
    // Token verification can fail for an expired JWT; refresh once below.
  }

  // Refresh only after the server could not verify this token. Never retry a
  // rejected insert, and never use a service-role key to bypass the RLS policy.
  let refreshed: PlanWriteSession = null;
  try {
    const response = await auth.refreshSession();
    if (!response.error) refreshed = response.data.session;
  } catch {
    // Fail closed if the refresh token is missing or network is unavailable.
  }
  requireOwner(refreshed, expectedUserId);
  try {
    const verified = await auth.getUser();
    if (verified.error || !verified.data.user) throw new Error(RSVP_SESSION_UNVERIFIED);
    if (verified.data.user.id !== expectedUserId) throw new Error(RSVP_ACCOUNT_CHANGED);
  } catch (error) {
    if (error instanceof Error && error.message === RSVP_ACCOUNT_CHANGED) throw error;
    throw new Error(RSVP_SESSION_UNVERIFIED);
  }
}
