import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Streaming (step 2) only appears when "Movies & TV" (`movies`) is selected.
 * When it is skipped, later steps shift down by one and totalSteps is 5 instead of 6.
 */
export function useOnboardingStepMeta() {
  const { profile } = useUserProfile();
  const hasMoviesInterest = Boolean(profile?.interests?.includes('movies'));

  return useMemo(() => {
    const totalSteps = hasMoviesInterest ? 6 : 5;
    return {
      totalSteps,
      hasMoviesInterest,
      stepInterests: 1,
      stepStreaming: 2,
      stepChronotype: hasMoviesInterest ? 3 : 2,
      stepNationality: hasMoviesInterest ? 4 : 3,
      /** Countries, football teams, NBA teams (same conceptual step in different branches) */
      stepSportsPick: hasMoviesInterest ? 5 : 4,
    };
  }, [hasMoviesInterest]);
}
