import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  getOnboardingProgressMeta,
  hasFootballOnboarding,
  hasMoviesOnboarding,
  type OnboardingScreenId,
} from '@/utils/onboardingFlow';

/**
 * First-run onboarding is intentionally short: interests -> one relevant
 * quick preference (when supported) -> preview -> classic Overview.
 * Original detailed setup routes are still accessible after onboarding.
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
