import type { LocalEvent } from '@/types/events';
import { parseEventStartDateTime, getEventCalendarRange } from '@/utils/eventDiscovery';

export type NightOutStepKind =
  | 'pre'
  | 'leave'
  | 'arrive'
  | 'meet'
  | 'doors'
  | 'interval'
  | 'wrap'
  | 'transit'
  | 'home';

export interface NightOutStep {
  id: string;
  timeLabel: string;
  title: string;
  subtitle?: string;
  kind: NightOutStepKind;
}

interface CategoryNightProfile {
  defaultDurationMinutes: number;
  arriveEarlyMinutes: number;
  exitBufferMinutes: number;
  doorsTitle: string;
  wrapTitle: string;
  includeInterval: boolean;
  preEvent?: {
    minStartHour: number;
    leadMinutes: number;
    title: string;
    subtitle: string;
  };
}

const CATEGORY_PROFILES: Record<string, CategoryNightProfile> = {
  theatre: {
    defaultDurationMinutes: 150,
    arriveEarlyMinutes: 20,
    exitBufferMinutes: 20,
    doorsTitle: 'Curtain up',
    wrapTitle: 'Show ends',
    includeInterval: true,
    preEvent: {
      minStartHour: 17,
      leadMinutes: 75,
      title: 'Dinner nearby',
      subtitle: 'Allow time before doors — theatre bars get busy',
    },
  },
  music: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 30,
    exitBufferMinutes: 25,
    doorsTitle: 'Doors & support act',
    wrapTitle: 'Headliners finish',
    includeInterval: false,
    preEvent: {
      minStartHour: 18,
      leadMinutes: 50,
      title: 'Pre-show drink',
      subtitle: 'Meet friends near the venue first',
    },
  },
  comedy: {
    defaultDurationMinutes: 90,
    arriveEarlyMinutes: 15,
    exitBufferMinutes: 15,
    doorsTitle: 'Show starts',
    wrapTitle: 'Show ends',
    includeInterval: false,
    preEvent: {
      minStartHour: 18,
      leadMinutes: 40,
      title: 'Quick drink first',
      subtitle: 'Most clubs seat latecomers after the opener',
    },
  },
  sports: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 45,
    exitBufferMinutes: 30,
    doorsTitle: 'Kick-off',
    wrapTitle: 'Full time',
    includeInterval: false,
  },
  food: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 10,
    exitBufferMinutes: 10,
    doorsTitle: 'Reservation',
    wrapTitle: 'Meal wraps up',
    includeInterval: false,
  },
  nightlife: {
    defaultDurationMinutes: 180,
    arriveEarlyMinutes: 20,
    exitBufferMinutes: 20,
    doorsTitle: 'Doors open',
    wrapTitle: 'Last orders',
    includeInterval: false,
    preEvent: {
      minStartHour: 20,
      leadMinutes: 45,
      title: 'Warm-up spot',
      subtitle: 'Start somewhere quieter before the main venue',
    },
  },
  arts: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 20,
    exitBufferMinutes: 15,
    doorsTitle: 'Exhibition / opening',
    wrapTitle: 'Gallery closes',
    includeInterval: false,
  },
  fitness: {
    defaultDurationMinutes: 90,
    arriveEarlyMinutes: 15,
    exitBufferMinutes: 10,
    doorsTitle: 'Session starts',
    wrapTitle: 'Session ends',
    includeInterval: false,
  },
  networking: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 10,
    exitBufferMinutes: 10,
    doorsTitle: 'Event starts',
    wrapTitle: 'Networking wraps',
    includeInterval: false,
  },
  tech: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 10,
    exitBufferMinutes: 10,
    doorsTitle: 'Event starts',
    wrapTitle: 'Session ends',
    includeInterval: false,
  },
  family: {
    defaultDurationMinutes: 120,
    arriveEarlyMinutes: 20,
    exitBufferMinutes: 15,
    doorsTitle: 'Doors open',
    wrapTitle: 'Event ends',
    includeInterval: false,
  },
};

const DEFAULT_PROFILE: CategoryNightProfile = {
  defaultDurationMinutes: 120,
  arriveEarlyMinutes: 20,
  exitBufferMinutes: 20,
  doorsTitle: 'Doors',
  wrapTitle: 'Event ends',
  includeInterval: false,
  preEvent: {
    minStartHour: 18,
    leadMinutes: 45,
    title: 'Pre-event stop',
    subtitle: 'Grab food or a drink before you head in',
  },
};

function formatPlanTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function estimateTravelMinutes(distanceKm?: number): number {
  if (distanceKm == null || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    return 45;
  }
  return Math.max(15, Math.min(90, Math.round(distanceKm * 2.8 + 10)));
}

function getCategoryProfile(category: string): CategoryNightProfile {
  const key = category.toLowerCase().trim();
  return CATEGORY_PROFILES[key] ?? DEFAULT_PROFILE;
}

function resolveEventEnd(start: Date, event: LocalEvent, profile: CategoryNightProfile): Date {
  const range = getEventCalendarRange(event);
  if (range && range.end > start) {
    return range.end;
  }
  return new Date(start.getTime() + profile.defaultDurationMinutes * 60 * 1000);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6;
}

function isLateFinish(endAt: Date): boolean {
  const hour = endAt.getHours() + endAt.getMinutes() / 60;
  return hour >= 22.5 || hour < 5;
}

function planReturnLeg(
  endAt: Date,
  travelMinutes: number,
): {
  leaveVenueAt: Date;
  transitAt: Date;
  homeByAt: Date;
  transitTitle: string;
  transitSubtitle: string;
} {
  const leaveVenueAt = new Date(endAt.getTime() + 15 * 60 * 1000);
  const weekend = isWeekend(endAt);
  const late = isLateFinish(endAt);

  let transitAt: Date;
  let transitTitle: string;
  let transitSubtitle: string;

  if (late && !weekend) {
    transitAt = new Date(leaveVenueAt.getTime() + 5 * 60 * 1000);
    transitTitle = 'Book a ride home';
    transitSubtitle = 'Last trains may have gone — check Uber, taxi, or night bus';
  } else if (late && weekend) {
    transitAt = new Date(leaveVenueAt.getTime() + 20 * 60 * 1000);
    transitTitle = 'Night bus / late tube';
    transitSubtitle = 'Weekend services run later — still worth checking the last departure';
  } else if (endAt.getHours() >= 21) {
    transitAt = new Date(leaveVenueAt.getTime() + 15 * 60 * 1000);
    transitTitle = 'Last train or bus';
    transitSubtitle = 'Leave the venue soon after the show to make the last service';
  } else {
    transitAt = new Date(leaveVenueAt.getTime() + 20 * 60 * 1000);
    transitTitle = 'Train or bus home';
    transitSubtitle = 'Regular evening services should still be running';
  }

  const homeByAt = new Date(transitAt.getTime() + travelMinutes * 60 * 1000);

  return { leaveVenueAt, transitAt, homeByAt, transitTitle, transitSubtitle };
}

function cityLabel(event: LocalEvent, areaLabel?: string): string {
  return (
    event.location?.split(',')[0]?.trim() ||
    areaLabel?.split(',')[0]?.trim() ||
    'your area'
  );
}

export function buildNightOutPlan(event: LocalEvent, areaLabel?: string): NightOutStep[] {
  const start = parseEventStartDateTime(event);
  if (!start) return [];

  const profile = getCategoryProfile(event.category);
  const travelMinutes = estimateTravelMinutes(event.distanceKm);
  const endAt = resolveEventEnd(start, event, profile);
  const arriveAt = new Date(start.getTime() - profile.arriveEarlyMinutes * 60 * 1000);
  const leaveAt = new Date(arriveAt.getTime() - travelMinutes * 60 * 1000);
  const city = cityLabel(event, areaLabel);
  const returnLeg = planReturnLeg(endAt, travelMinutes);

  const steps: NightOutStep[] = [];

  if (
    profile.preEvent &&
    start.getHours() >= profile.preEvent.minStartHour
  ) {
    const preAt = new Date(start.getTime() - profile.preEvent.leadMinutes * 60 * 1000);
    if (preAt > leaveAt && preAt < arriveAt) {
      steps.push({
        id: 'pre',
        timeLabel: formatPlanTime(preAt),
        title: profile.preEvent.title,
        subtitle: profile.preEvent.subtitle,
        kind: 'pre',
      });
    }
  }

  steps.push(
    {
      id: 'leave',
      timeLabel: formatPlanTime(leaveAt),
      title: 'Leave home',
      subtitle: `${travelMinutes} min travel · ${city}`,
      kind: 'leave',
    },
    {
      id: 'arrive',
      timeLabel: formatPlanTime(arriveAt),
      title: 'Arrive at venue',
      subtitle: `${profile.arriveEarlyMinutes} min before ${profile.doorsTitle.toLowerCase()}`,
      kind: 'arrive',
    },
    {
      id: 'doors',
      timeLabel: formatPlanTime(start),
      title: profile.doorsTitle,
      subtitle: event.venue,
      kind: 'doors',
    },
  );

  if (profile.includeInterval) {
    const durationMs = endAt.getTime() - start.getTime();
    if (durationMs >= 90 * 60 * 1000) {
      const intervalAt = new Date(start.getTime() + Math.round(durationMs * 0.45));
      steps.push({
        id: 'interval',
        timeLabel: formatPlanTime(intervalAt),
        title: 'Interval',
        subtitle: 'Drinks & stretch — plan your trip to the bar early',
        kind: 'interval',
      });
    }
  }

  steps.push({
    id: 'wrap',
    timeLabel: formatPlanTime(endAt),
    title: profile.wrapTitle,
    subtitle: `Allow ~${profile.exitBufferMinutes} min to exit the venue`,
    kind: 'wrap',
  });

  steps.push(
    {
      id: 'transit',
      timeLabel: formatPlanTime(returnLeg.transitAt),
      title: returnLeg.transitTitle,
      subtitle: returnLeg.transitSubtitle,
      kind: 'transit',
    },
    {
      id: 'home',
      timeLabel: formatPlanTime(returnLeg.homeByAt),
      title: 'Home by',
      subtitle: `${travelMinutes} min journey · wind down`,
      kind: 'home',
    },
  );

  return steps;
}

export function mergeGroupMeetStep(
  steps: NightOutStep[],
  options: {
    meetAt: Date | null;
    venue: string;
    goingNames: string[];
  },
): NightOutStep[] {
  if (!options.meetAt || options.goingNames.length < 2) return steps;

  const doorsIndex = steps.findIndex((s) => s.kind === 'doors');
  if (doorsIndex < 0) return steps;

  const names =
    options.goingNames.length <= 2
      ? options.goingNames.join(' & ')
      : `${options.goingNames[0]} + ${options.goingNames.length - 1} friends`;

  const meetStep: NightOutStep = {
    id: 'meet',
    timeLabel: formatPlanTime(options.meetAt),
    title: 'Meet up',
    subtitle: `${names} · ${options.venue}`,
    kind: 'meet',
  };

  const next = [...steps];
  next.splice(doorsIndex, 0, meetStep);
  return next;
}

export function defaultGroupMeetTime(event: LocalEvent, minutesBeforeDoors = 15): Date | null {
  const start = parseEventStartDateTime(event);
  if (!start) return null;
  return new Date(start.getTime() - minutesBeforeDoors * 60 * 1000);
}

export function countSavedEventsThisWeek(events: LocalEvent[]): number {
  return events.filter((event) => {
    const start = parseEventStartDateTime(event);
    if (!start) return false;
    const diffDays = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;
}
