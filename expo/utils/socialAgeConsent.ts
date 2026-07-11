import type { UserProfile } from '@/types/habit';

/** Minimum age to use the app at all (COPPA-style baseline). */
export const APP_MIN_AGE = 13;

/** Minimum age for accountability partners without parental consent. */
export const MIN_SOCIAL_AGE = 16;

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}

export function canUseSocialFeatures(profile?: UserProfile | null): boolean {
  const birthYear = profile?.birthYear;
  if (!birthYear || birthYear < 1900) return false;

  const age = ageFromBirthYear(birthYear);
  if (age < APP_MIN_AGE) return false;
  if (age < MIN_SOCIAL_AGE) return profile?.parentalSocialConsent === true;
  return true;
}

export function socialRestrictionMessage(profile?: UserProfile | null): string | null {
  const birthYear = profile?.birthYear;
  if (!birthYear) {
    return 'Confirm your birth year in Profile → Your data to use accountability partners.';
  }

  const age = ageFromBirthYear(birthYear);
  if (age < APP_MIN_AGE) {
    return `One Pager social features are not available under age ${APP_MIN_AGE}.`;
  }
  if (age < MIN_SOCIAL_AGE && !profile?.parentalSocialConsent) {
    return `Accountability partners require age ${MIN_SOCIAL_AGE}+, or parental consent if you are ${APP_MIN_AGE}–${MIN_SOCIAL_AGE - 1}.`;
  }
  return null;
}

export function isValidBirthYear(value: number): boolean {
  const year = Math.floor(value);
  const current = new Date().getFullYear();
  return year >= current - 120 && year <= current;
}
