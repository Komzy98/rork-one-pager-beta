import type { ActivityEvent } from '@/utils/activityService';
import type { ProcessedWeatherData } from '@/utils/weatherApi';
import { getTodayFormatted } from '@/utils/dateUtils';
import { isInPeakHours, getChronotypeInfo, getSecondaryPeakHours } from '@/constants/chronotypes';

export type DecisionMomentKind =
  | 'walk_before_match'
  | 'cheer_partner'
  | 'habit_in_peak'
  | 'unwind_show'
  | 'celebrate_partner';

export type DecisionMomentAction =
  | { type: 'route'; route: string }
  | { type: 'cheer'; eventId: string }
  | { type: 'tasks' };

export type DecisionMoment = {
  id: string;
  kind: DecisionMomentKind;
  emoji: string;
  headline: string;
  body: string;
  actionLabel: string;
  priority: number;
  action: DecisionMomentAction;
};

export type BuildDecisionMomentsInput = {
  now?: Date;
  completedHabits?: number;
  totalHabits?: number;
  chronotypeId?: string;
  tonightMatchLabel?: string | null;
  matchKickoffTime?: string | null;
  weather?: ProcessedWeatherData | null;
  continueWatchingTitle?: string | null;
  partnerFeed?: ActivityEvent[];
  currentUserId?: string;
};

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === getTodayFormatted();
}

function isWalkFriendlyWeather(weather: ProcessedWeatherData | null | undefined): boolean {
  if (!weather || weather.isTimeBased) return true;
  if (weather.isStormy || weather.isRaining || weather.isSnowing) return false;
  if (weather.temp <= 2) return false;
  if (weather.windSpeed >= 16) return false;
  return true;
}

function parseKickoffMinutes(timeLabel: string | null | undefined, now: Date): number | null {
  if (!timeLabel?.trim()) return null;
  const match = timeLabel.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const kickoff = new Date(now);
  kickoff.setHours(hours, minutes, 0, 0);
  return kickoff.getTime();
}

function isInEnergyWindow(chronotypeId: string | undefined, now: Date): boolean {
  if (!chronotypeId) return false;
  const info = getChronotypeInfo(chronotypeId);
  if (!info) return false;
  const hour = now.getHours();
  if (isInPeakHours(info)) return true;
  const secondary = getSecondaryPeakHours(info);
  return secondary ? hour >= secondary.start && hour < secondary.end : false;
}

function findPartnerHabitCompletion(
  feed: ActivityEvent[],
  currentUserId?: string,
): ActivityEvent | null {
  return (
    feed.find(
      (event) =>
        event.type === 'workout' &&
        isToday(event.createdAt) &&
        event.userId !== currentUserId &&
        !event.cheeredByMe,
    ) ?? null
  );
}

function findPartnerStreakMilestone(
  feed: ActivityEvent[],
  currentUserId?: string,
): ActivityEvent | null {
  return (
    feed.find(
      (event) =>
        event.type === 'streak_milestone' &&
        isToday(event.createdAt) &&
        event.userId !== currentUserId &&
        !event.cheeredByMe,
    ) ?? null
  );
}

export function buildDecisionMoments(input: BuildDecisionMomentsInput): DecisionMoment[] {
  const now = input.now ?? new Date();
  const hour = now.getHours();
  const moments: DecisionMoment[] = [];

  const partnerHabit = findPartnerHabitCompletion(input.partnerFeed ?? [], input.currentUserId);
  if (partnerHabit) {
    const name = firstName(
      partnerHabit.author?.displayName?.trim() ||
        partnerHabit.author?.username?.trim() ||
        'Your partner',
    );
    moments.push({
      id: `cheer-${partnerHabit.id}`,
      kind: 'cheer_partner',
      emoji: '🤝',
      headline: `${name} completed habits today`,
      body: 'A quick cheer keeps you both showing up.',
      actionLabel: 'Send a cheer',
      priority: 92,
      action: { type: 'cheer', eventId: partnerHabit.id },
    });
  }

  const partnerStreak = findPartnerStreakMilestone(input.partnerFeed ?? [], input.currentUserId);
  if (partnerStreak) {
    const name = firstName(
      partnerStreak.author?.displayName?.trim() ||
        partnerStreak.author?.username?.trim() ||
        'Your partner',
    );
    moments.push({
      id: `celebrate-${partnerStreak.id}`,
      kind: 'celebrate_partner',
      emoji: '🎉',
      headline: `${name} hit a streak milestone`,
      body: 'Celebrate the win — consistency is easier together.',
      actionLabel: 'Celebrate',
      priority: 90,
      action: { type: 'cheer', eventId: partnerStreak.id },
    });
  }

  if (
    input.tonightMatchLabel &&
    isWalkFriendlyWeather(input.weather) &&
    hour >= 10 &&
    hour < 20
  ) {
    const kickoffMs = parseKickoffMinutes(input.matchKickoffTime, now);
    const hoursUntilMatch =
      kickoffMs != null ? (kickoffMs - now.getTime()) / (1000 * 60 * 60) : null;
    const fitsBeforeMatch = hoursUntilMatch == null || (hoursUntilMatch >= 0.75 && hoursUntilMatch <= 4);

    if (fitsBeforeMatch) {
      moments.push({
        id: 'walk-before-match',
        kind: 'walk_before_match',
        emoji: '🚶',
        headline: 'Good time for a walk before the match',
        body: input.tonightMatchLabel.includes('tonight')
          ? `${input.tonightMatchLabel.replace(' tonight', '')} — move now, relax later.`
          : `${input.tonightMatchLabel} — a short walk now, kickoff guilt-free.`,
        actionLabel: 'See match details',
        priority: 85,
        action: { type: 'route', route: '/(tabs)/sports' },
      });
    }
  }

  const total = input.totalHabits ?? 0;
  const done = input.completedHabits ?? 0;
  if (total > 0 && done < total && isInEnergyWindow(input.chronotypeId, now) && hour < 20) {
    const remaining = total - done;
    moments.push({
      id: 'habit-in-peak',
      kind: 'habit_in_peak',
      emoji: '✨',
      headline: 'Strong window for one habit',
      body:
        remaining === 1
          ? 'Your energy is up — one habit now and the rest of the day is yours.'
          : `${remaining} left today — start with one while you’ve got momentum.`,
      actionLabel: 'Open habits',
      priority: 78,
      action: { type: 'tasks' },
    });
  }

  if (input.continueWatchingTitle && hour >= 18) {
    moments.push({
      id: 'unwind-show',
      kind: 'unwind_show',
      emoji: '📺',
      headline: 'Unwind without guilt',
      body: `Continue ${input.continueWatchingTitle} — rest counts as living well too.`,
      actionLabel: 'Continue watching',
      priority: 70,
      action: { type: 'route', route: '/(tabs)/shows' },
    });
  }

  return moments.sort((a, b) => b.priority - a.priority).slice(0, 2);
}
