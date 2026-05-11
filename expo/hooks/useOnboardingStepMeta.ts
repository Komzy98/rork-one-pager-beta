import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Streaming only appears when "Movies & TV" (`movies`) is selected.
 * Flow now includes a dedicated Favorite Leagues step early and a Feed Tuning step before completion.
 */
export function useOnboardingStepMeta() {
  const { profile } = useUserProfile();
  const hasMoviesInterest = Boolean(profile?.interests?.includes('movies'));
  const hasFootballInterest = Boolean(profile?.interests?.includes('football'));

  return useMemo(() => {
    const totalSteps = hasFootballInterest
      ? hasMoviesInterest
        ? 6
        : 5
      : hasMoviesInterest
        ? 7
        : 6;
    const stepStreaming = hasMoviesInterest ? 3 : 0;
    const stepChronotype = hasMoviesInterest ? 4 : 3;
    const stepNationality = hasFootballInterest ? 0 : hasMoviesInterest ? 5 : 4;
    const stepSportsPick = hasFootballInterest
      ? hasMoviesInterest
        ? 5
        : 4
      : hasMoviesInterest
        ? 6
        : 5;
    const stepFeedTuning = hasFootballInterest
      ? hasMoviesInterest
        ? 6
        : 5
      : hasMoviesInterest
        ? 7
        : 6;
    return {
      totalSteps,
      hasMoviesInterest,
      hasFootballInterest,
      stepInterests: 1,
      stepFavoriteLeagues: 2,
      stepStreaming,
      stepChronotype,
      stepNationality,
      /** Countries, football teams, NBA teams (same conceptual step in different branches) */
      stepSportsPick,
      stepFeedTuning,
    };
  }, [hasMoviesInterest, hasFootballInterest]);
}
