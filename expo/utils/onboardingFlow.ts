/** Habit / lifestyle interests that trigger chronotype + calendar setup. */
export const HABIT_ONBOARDING_INTERESTS = [
  'fitness',
  'productivity',
  'learning',
  'events',
  'cooking',
] as const;

export type OnboardingScreenId =
  | 'interests'
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
  'event-categories': '/(onboarding)/event-categories',
  'football-favorites': '/(onboarding)/football-favorites',
  'nba-teams': '/(onboarding)/nba-teams',
  streaming: '/(onboarding)/streaming',
  chronotype: '/(onboarding)/chronotype',
  calendar: '/(onboarding)/calendar',
  'feed-tuning': '/(onboarding)/feed-tuning',
  'joy-sources': '/(onboarding)/joy-sources',
};

function hasInterest(interests: readonly string[], id: string): boolean {
  return interests.includes(id);
}

function wantsHabitsSetup(interests: readonly string[]): boolean {
  return interests.some((id) =>
    (HABIT_ONBOARDING_INTERESTS as readonly string[]).includes(id),
  );
}

/** Linear onboarding path from interests selection (excludes welcome + complete from progress). */
export function buildOnboardingPath(interests: readonly string[]): OnboardingScreenId[] {
  const path: OnboardingScreenId[] = ['interests'];

  if (hasInterest(interests, 'events')) {
    path.push('event-categories');
  }

  if (hasInterest(interests, 'football')) {
    path.push('football-favorites');
    if (hasInterest(interests, 'nba')) {
      path.push('nba-teams');
    }
    path.push('feed-tuning');
  } else if (hasInterest(interests, 'nba')) {
    path.push('nba-teams');
  }

  if (hasInterest(interests, 'movies')) {
    path.push('streaming');
  }

  if (wantsHabitsSetup(interests)) {
    path.push('chronotype', 'calendar');
  }

  path.push('joy-sources', 'complete');
  return path;
}

export function getNextOnboardingScreen(
  current: OnboardingScreenId,
  interests: readonly string[],
): OnboardingScreenId {
  const path = buildOnboardingPath(interests);
  const idx = path.indexOf(current);
  if (idx === -1 || idx >= path.length - 1) {
    return 'complete';
  }
  return path[idx + 1]!;
}

export function getOnboardingRoute(
  screen: Exclude<OnboardingScreenId, 'complete'>,
): string {
  return SCREEN_ROUTES[screen];
}

export function getNextOnboardingRoute(
  current: OnboardingScreenId,
  interests: readonly string[],
): string {
  const next = getNextOnboardingScreen(current, interests);
  if (next === 'complete') {
    return '/(onboarding)/complete';
  }
  return SCREEN_ROUTES[next];
}

/** Progress bar: numbered steps only (excludes terminal complete screen). */
export function getOnboardingProgressMeta(
  screen: OnboardingScreenId,
  interests: readonly string[],
): { currentStep: number; totalSteps: number } {
  const path = buildOnboardingPath(interests).filter((s) => s !== 'complete');
  const idx = path.indexOf(screen);
  return {
    currentStep: idx >= 0 ? idx + 1 : 1,
    totalSteps: Math.max(path.length, 1),
  };
}

export function hasFootballOnboarding(interests: readonly string[]): boolean {
  return hasInterest(interests, 'football');
}

export function hasNbaOnboarding(interests: readonly string[]): boolean {
  return hasInterest(interests, 'nba');
}

export function hasMoviesOnboarding(interests: readonly string[]): boolean {
  return hasInterest(interests, 'movies');
}

export function hasEventsOnboarding(interests: readonly string[]): boolean {
  return hasInterest(interests, 'events');
}

/** @deprecated Use football-favorites — kept for deep links */
export type LegacyOnboardingScreenId = 'leagues' | 'nationality' | 'teams';

export function resolveLegacyOnboardingRoute(legacy: LegacyOnboardingScreenId): string {
  if (legacy === 'leagues' || legacy === 'nationality' || legacy === 'teams') {
    return SCREEN_ROUTES['football-favorites'];
  }
  return SCREEN_ROUTES.interests;
}
