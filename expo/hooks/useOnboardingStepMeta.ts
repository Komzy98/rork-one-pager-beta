import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  getOnboardingProgressMeta,
  hasFootballOnboarding,
  hasMoviesOnboarding,
  type OnboardingScreenId,
} from '@/utils/onboardingFlow';

/**
 * Dynamic onboarding steps branch by interest:
 * - Football → football-favorites → feed-tuning (right after sports picks)
 * - NBA only → nba-teams
 * - Movies → streaming
 * - Events → event-categories (music, comedy, tech, etc.)
 * - Fitness/productivity/etc. → chronotype → calendar (after sports tuning)
 * - UFC/F1-only → interests → complete (short path)
 */
export function useOnboardingStepMeta(screen: OnboardingScreenId = 'interests') {
  const { profile } = useUserProfile();
  const interests = profile?.interests ?? [];

  return useMemo(() => {
    const { currentStep, totalSteps } = getOnboardingProgressMeta(screen, interests);

    return {
      currentStep,
      totalSteps,
      hasMoviesInterest: hasMoviesOnboarding(interests),
      hasFootballInterest: hasFootballOnboarding(interests),
    };
  }, [interests, screen]);
}
