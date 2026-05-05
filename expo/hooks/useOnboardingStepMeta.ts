import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Streaming only appears when "Movies & TV" (`movies`) is selected.
 * Flow now includes a dedicated Favorite Leagues step early and a Feed Tuning step before completion.
 */
export function useOnboardingStepMeta() {
  const { profile } = useUserProfile();
  const hasMoviesInterest = Boolean(profile?.interests?.includes('movies'));

  return useMemo(() => {
    const totalSteps = hasMoviesInterest ? 7 : 6;
    return {
      totalSteps,
      hasMoviesInterest,
      stepInterests: 1,
      stepFavoriteLeagues: 2,
      stepStreaming: hasMoviesInterest ? 3 : 0,
      stepChronotype: hasMoviesInterest ? 4 : 3,
      stepNationality: hasMoviesInterest ? 5 : 4,
      /** Countries, football teams, NBA teams (same conceptual step in different branches) */
      stepSportsPick: hasMoviesInterest ? 6 : 5,
      stepFeedTuning: hasMoviesInterest ? 7 : 6,
    };
  }, [hasMoviesInterest]);
}
