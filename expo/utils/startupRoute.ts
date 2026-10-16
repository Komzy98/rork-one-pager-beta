/**
 * Cold-start routing is only allowed after both auth AND the user-owned profile
 * have been restored. A missing profile during hydration is not a new user.
 * Guest profiles are checked exactly like signed-in profiles.
 */
export type StartupRoute = 'loading' | 'login' | 'onboarding' | 'overview' | 'recovery';

export interface StartupRouteInput {
  authInitialized: boolean;
  isAuthenticated: boolean;
  userId: string | undefined;
  profileLoading: boolean;
  profileRestoreError: boolean;
  profile: { id: string; onboardingCompleted: boolean } | null;
}

export function resolveStartupRoute(input: StartupRouteInput): StartupRoute {
  if (!input.authInitialized) return 'loading';
  if (!input.isAuthenticated) return 'login';
  if (input.profileRestoreError) return 'recovery';
  if (
    input.profileLoading ||
    !input.userId ||
    !input.profile ||
    input.profile.id !== input.userId
  ) return 'loading';
  return input.profile.onboardingCompleted ? 'overview' : 'onboarding';
}
