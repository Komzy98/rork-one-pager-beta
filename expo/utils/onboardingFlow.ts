/**
 * Onboarding V2: welcome -> interests -> one relevant preference -> preview.
 * All the existing detailed setup routes remain available from the app, but
 * don't gate the first useful experience behind provider logins or permissions.
 */
export const HABIT_ONBOARDING_INTERESTS = [
  'fitness', 'productivity', 'learning', 'events', 'cooking',
] as const;

export type QuickSetupFocus = 'football' | 'nba' | 'events' | 'movies' | 'task' | null;
export type OnboardingScreenId =
  | 'interests'
  | 'quick-setup'
  | 'event-categories'
  | 'football-favorites'
  | 'nba-teams'
  | 'streaming'
  | 'chronotype'
  | 'calendar'
  | 'feed-tuning'
  | 'joy-sources'
  | 'complete';

const SCREEN_ROUTES: Record<Exclude<OnboardingScreenId, 'complete'>, string> = {
  interests: '/(onboarding)/interests',
  'quick-setup': '/(onboarding)/quick-setup',
  'event-categories': '/(onboarding)/event-categories',
  'football-favorites': '/(onboarding)/football-favorites',
  'nba-teams': '/(onboarding)/nba-teams',
  streaming: '/(onboarding)/streaming',
  chronotype: '/(onboarding)/chronotype',
  calendar: '/(onboarding)/calendar',
  'feed-tuning': '/(onboarding)/feed-tuning',
  'joy-sources': '/(onboarding)/joy-sources',
};

/** The first supported selection gets personalised first; additional interests
 * are saved and can be configured later in their original tabs. */
export function getQuickSetupFocus(interests: readonly string[]): QuickSetupFocus {
  for (const interest of interests) {
    if (interest === 'football' || interest === 'nba' || interest === 'events' || interest === 'movies') {
      return interest;
    }
    if (interest === 'productivity' || interest === 'fitness' || interest === 'learning') {
      return 'task';
    }
  }
  return null;
}

export function buildOnboardingPath(interests: readonly string[]): OnboardingScreenId[] {
  return getQuickSetupFocus(interests)
    ? ['interests', 'quick-setup', 'complete']
    : ['interests', 'complete'];
}

export function getNextOnboardingScreen(
  current: OnboardingScreenId, interests: readonly string[],
): OnboardingScreenId {
  const path = buildOnboardingPath(interests);
  const idx = path.indexOf(current);
  return idx < 0 || idx >= path.length - 1 ? 'complete' : path[idx + 1]!;
}

export function getOnboardingRoute(screen: Exclude<OnboardingScreenId, 'complete'>): string {
  return SCREEN_ROUTES[screen];
}

export function getNextOnboardingRoute(
  current: OnboardingScreenId, interests: readonly string[],
): string {
  const next = getNextOnboardingScreen(current, interests);
  return next === 'complete' ? '/(onboarding)/complete' : SCREEN_ROUTES[next];
}

export function getOnboardingProgressMeta(
  screen: OnboardingScreenId, interests: readonly string[],
): { currentStep: number; totalSteps: number } {
  const path: OnboardingScreenId[] = buildOnboardingPath(interests).filter((s) => s !== 'complete');
  const idx = path.indexOf(screen);
  return {
    currentStep: idx >= 0 ? idx + 1 : path.length,
    totalSteps: Math.max(path.length, 1),
  };
}

export function hasFootballOnboarding(interests: readonly string[]): boolean {
  return interests.includes('football');
}
export function hasNbaOnboarding(interests: readonly string[]): boolean {
  return interests.includes('nba');
}
export function hasMoviesOnboarding(interests: readonly string[]): boolean {
  return interests.includes('movies');
}
export function hasEventsOnboarding(interests: readonly string[]): boolean {
  return interests.includes('events');
}

/** Old deep links intentionally remain valid for profile / edit entry points. */
export type LegacyOnboardingScreenId = 'leagues' | 'nationality' | 'teams';
export function resolveLegacyOnboardingRoute(legacy: LegacyOnboardingScreenId): string {
  return ['leagues', 'nationality', 'teams'].includes(legacy)
    ? SCREEN_ROUTES['football-favorites']
    : SCREEN_ROUTES.interests;
}
