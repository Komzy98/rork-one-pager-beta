import type { ChronotypeInfo } from '@/types/habit';
import {
  getChronotypeInfo,
  getSecondaryPeakHours,
  isInPeakHours,
} from '@/constants/chronotypes';

export type TodayCoachPhase = 'morning' | 'afternoon' | 'evening';

let devCoachPhaseOverride: TodayCoachPhase | null = null;

/** __DEV__ only — deep link `?coachPhase=morning|afternoon|evening` on Overview. */
export function setDevCoachPhaseOverride(phase: TodayCoachPhase | null): void {
  if (!__DEV__) return;
  devCoachPhaseOverride = phase;
}

export function resolveTodayCoachPhase(now = new Date()): TodayCoachPhase {
  if (__DEV__ && devCoachPhaseOverride) return devCoachPhaseOverride;
  return getTodayCoachPhase(now);
}

export function getTodayCoachPhase(now = new Date()): TodayCoachPhase {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export function getTodayCoachKicker(phase: TodayCoachPhase): string {
  switch (phase) {
    case 'morning':
      return 'MORNING CHECK-IN';
    case 'afternoon':
      return 'AFTERNOON PULSE';
    case 'evening':
      return 'EVENING WRAP-UP';
  }
}

export function getTodayCoachTitle(phase: TodayCoachPhase): string {
  switch (phase) {
    case 'morning':
      return 'Plan a good day';
    case 'afternoon':
      return 'How is today going?';
    case 'evening':
      return 'Close the day well';
  }
}

export function getTodayCoachEmptyPrompt(phase: TodayCoachPhase): string {
  switch (phase) {
    case 'morning':
      return 'Get a read on your day — habits, plans, and what to look forward to.';
    case 'afternoon':
      return 'A quick check-in on progress, energy, and what still matters today.';
    case 'evening':
      return 'Reflect on what went well and what to carry into tomorrow.';
  }
}

/** Living-well framing for chronotype tips (not task/productivity language). */
export function getLivingWellChronotypeTip(chronotype: ChronotypeInfo, now = new Date()): string {
  const hour = now.getHours();
  const inPeak = isInPeakHours(chronotype);
  const secondary = getSecondaryPeakHours(chronotype);
  const inSecondary = secondary ? hour >= secondary.start && hour < secondary.end : false;

  if (inPeak || inSecondary) {
    return 'You’re in a strong energy window — good time for something that matters to you.';
  }

  switch (chronotype.id) {
    case 'lion':
      if (hour < chronotype.wakeHour) return 'Rest while you can — your best hours are still ahead.';
      if (hour >= 12 && hour < 17) return 'Energy is easing — lighter plans and people time fit well now.';
      return 'Wind down — protect sleep so tomorrow starts well.';
    case 'bear':
      if (hour < 10) return 'Ease in — your rhythm picks up mid-morning.';
      if (hour >= 14 && hour < 17) return 'Natural lull — a walk or something easy can reset the afternoon.';
      return 'Evening mode — wrap up and make space to recharge.';
    case 'wolf':
      if (hour < 12) return 'Slow mornings are fine — save the big moves for later.';
      if (hour >= 12 && hour < 17) return 'Momentum is building — your evening window is coming.';
      return 'This is your time — deep focus or guilt-free downtime both count.';
    case 'dolphin':
      if (hour < 10) return 'Ease in — your first strong window opens soon.';
      if (hour >= 12 && hour < 16) return 'Recharge gap — save energy for your later window.';
      if (hour >= 18) return 'Wind down with something calming — you’ve earned it.';
      return 'Stay flexible — match your energy to what the day needs.';
    default:
      return '';
  }
}

export function getTodayCoachChronotypeLine(
  chronotypeId: string | undefined,
  now = new Date(),
): string | null {
  if (!chronotypeId) return null;
  const info = getChronotypeInfo(chronotypeId);
  if (!info) return null;
  const tip = getLivingWellChronotypeTip(info, now);
  return tip || null;
}

export function getHeroLivingWellTagline(phase: TodayCoachPhase): string {
  switch (phase) {
    case 'morning':
      return 'What would make today a good day?';
    case 'afternoon':
      return 'What still matters for the rest of today?';
    case 'evening':
      return 'What would help you end today well?';
  }
}
