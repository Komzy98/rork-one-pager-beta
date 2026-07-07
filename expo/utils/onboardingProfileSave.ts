import type { UserNationality, UserTeam } from '@/types/habit';
import { normalizeOnboardingLeagueIds } from '@/utils/onboardingFootballOptions';

/**
 * Onboarding must not replace profile arrays with empty local React state
 * unless the user explicitly edited that section (dirty flag).
 */

export function pickOnboardingTeams(params: {
  dirty: boolean;
  selected: readonly UserTeam[];
  existing: readonly UserTeam[] | undefined;
}): UserTeam[] | undefined {
  const { dirty, selected, existing } = params;
  if (dirty) return [...selected];
  if (selected.length > 0) {
    if (!existing || existing.length === 0) return [...selected];
    return undefined;
  }
  if (existing && existing.length > 0) return undefined;
  return undefined;
}

export function pickOnboardingLeagues(params: {
  dirty: boolean;
  selected: readonly number[];
  existing: readonly number[] | undefined;
  /** Skip: only seed default leagues when the profile has none yet. */
  skipMode?: boolean;
}): number[] | undefined {
  const { dirty, selected, existing, skipMode } = params;
  if (skipMode) {
    if (existing && existing.length > 0) return undefined;
    return normalizeOnboardingLeagueIds(selected);
  }
  if (dirty) {
    return normalizeOnboardingLeagueIds(selected);
  }
  if (selected.length > 0) {
    // Screen seeds World Cup defaults before profile hydrates — don't clobber saved leagues.
    if (!existing || existing.length === 0) {
      return normalizeOnboardingLeagueIds(selected);
    }
    return undefined;
  }
  if (existing && existing.length > 0) return undefined;
  return normalizeOnboardingLeagueIds(selected);
}

export function shouldApplyNationalities(params: {
  dirty: boolean;
  selectedCount: number;
  /** When set, only auto-apply non-dirty selections if the profile has no national teams yet. */
  existingCount?: number;
}): boolean {
  if (params.dirty) return true;
  if (params.selectedCount <= 0) return false;
  if (params.existingCount != null && params.existingCount > 0) return false;
  return true;
}

export function pickOnboardingNbaTeams<T extends { id: string }>(params: {
  dirty: boolean;
  selected: readonly T[];
  existing: readonly T[] | undefined;
}): T[] | undefined {
  const { dirty, selected, existing } = params;
  if (dirty) return [...selected];
  if (selected.length > 0) {
    if (!existing || existing.length === 0) return [...selected];
    return undefined;
  }
  if (existing && existing.length > 0) return undefined;
  return undefined;
}

/** User-facing streaming step — auth server down, missing SDK key, or no signed-in user yet. */
export function isYounifyAuthUnreachableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('younify auth unreachable') ||
    m.includes('network request failed') ||
    m.includes('missing app user for younify') ||
    m.includes('missing younify sdk key') ||
    m.includes('127.0.0.1:3000') ||
    m.includes('create-younify-user') ||
    m.includes('fetch failed')
  );
}

export function younifyAuthUnavailableMessage(): string {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return "Streaming auth isn\u2019t running. Run `npm run dev` in the expo folder (starts auth + simulator), or tap Start auth server.";
  }
  return "Streaming links aren\u2019t set up in this build yet. You can connect Netflix, Disney+, and others later from Profile \u2192 Streaming.";
}
