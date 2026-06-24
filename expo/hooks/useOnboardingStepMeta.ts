import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Streaming only appears when "Movies & TV" (`movies`) is selected.
 * Flow now includes a dedicated Favorite Leagues step early, a Nationality step
 * (used to surface national-team / World Cup matches), a Calendar step for habit timing,
 * and a Feed Tuning step before completion.
 * Football and non-football paths share the same step numbering now that football
 * also goes through the Nationality step.
 */
export function useOnboardingStepMeta() {
  const { profile } = useUserProfile();
  const hasMoviesInterest = Boolean(profile?.interests?.includes('movies'));
  const hasFootballInterest = Boolean(profile?.interests?.includes('football'));

  return useMemo(() => {
    const totalSteps = hasMoviesInterest ? 8 : 7;
    const stepStreaming = hasMoviesInterest ? 3 : 0;
    const stepChronotype = hasMoviesInterest ? 4 : 3;
    const stepNationality = hasMoviesInterest ? 5 : 4;
    const stepSportsPick = hasMoviesInterest ? 6 : 5;
    const stepCalendar = hasMoviesInterest ? 7 : 6;
    const stepFeedTuning = hasMoviesInterest ? 8 : 7;
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
      stepCalendar,
      stepFeedTuning,
    };
  }, [hasMoviesInterest, hasFootballInterest]);
}
