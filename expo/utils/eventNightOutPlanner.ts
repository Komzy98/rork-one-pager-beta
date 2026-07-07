import type { LocalEvent } from '@/types/events';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import { getEventCalendarRange } from '@/utils/openEventActions';

export type NightOutStepKind = 'leave' | 'meet' | 'doors' | 'return';

export interface NightOutStep {
  id: string;
  timeLabel: string;
  title: string;
  subtitle?: string;
  kind: NightOutStepKind;
}

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

export function buildNightOutPlan(event: LocalEvent, areaLabel?: string): NightOutStep[] {
  const start = parseEventStartDateTime(event);
  if (!start) return [];

  const travelMinutes = estimateTravelMinutes(event.distanceKm);
  const leaveAt = new Date(start.getTime() - travelMinutes * 60 * 1000);
  const range = getEventCalendarRange(event);
  const endAt = range?.end ?? new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const lastTrainAt = new Date(endAt.getTime() + 30 * 60 * 1000);

  const city =
    event.location?.split(',')[0]?.trim() ||
    areaLabel?.split(',')[0]?.trim() ||
    'your area';

  return [
    {
      id: 'leave',
      timeLabel: formatPlanTime(leaveAt),
      title: 'Leave home',
      subtitle: `${travelMinutes} min · ${city}`,
      kind: 'leave',
    },
    {
      id: 'doors',
      timeLabel: formatPlanTime(start),
      title: 'Doors',
      subtitle: event.venue,
      kind: 'doors',
    },
    {
      id: 'return',
      timeLabel: formatPlanTime(lastTrainAt),
      title: 'Last train reminder',
      subtitle: 'Plan your journey home',
      kind: 'return',
    },
  ];
}

export function mergeGroupMeetStep(
  steps: NightOutStep[],
  options: {
    meetAt: Date | null;
    venue: string;
    goingNames: string[];
  }
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
    title: 'Meet at venue',
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
