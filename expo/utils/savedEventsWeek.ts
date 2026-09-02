import type { LocalEvent } from '@/types/events';
import {
  buildNightOutPlan,
  type NightOutStep,
} from '@/utils/eventNightOutPlanner';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';

export interface SavedEventDayGroup {
  dayKey: string;
  dayLabel: string;
  relativeLabel: string;
  events: LocalEvent[];
}

export interface MultiEventDayPlan {
  dayKey: string;
  dayLabel: string;
  events: LocalEvent[];
}

export interface SavedEventsWeekOptions {
  maxDaysAhead?: number;
  referenceMs?: number;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatRelativeDayLabel(start: Date, now = new Date()): string {
  const today = startOfLocalDay(now).getTime();
  const target = startOfLocalDay(start).getTime();
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Tonight';
  if (diffDays === 1) return 'Tomorrow';
  return start.toLocaleDateString('en-GB', { weekday: 'long' });
}

function formatDayLabel(start: Date): string {
  return start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function groupSavedEventsByDay(
  events: LocalEvent[],
  options?: SavedEventsWeekOptions,
): SavedEventDayGroup[] {
  const now = options?.referenceMs ?? Date.now();
  const maxDaysAhead = options?.maxDaysAhead ?? 7;
  const weekEnd = now + maxDaysAhead * 24 * 60 * 60 * 1000;
  const groups = new Map<string, SavedEventDayGroup>();

  for (const event of events) {
    const start = parseEventStartDateTime(event, now);
    if (!start || start.getTime() < now - 60 * 60 * 1000 || start.getTime() > weekEnd) continue;

    const dayKey = formatDayKey(start);
    const existing = groups.get(dayKey);
    if (existing) {
      existing.events.push(event);
      continue;
    }
    groups.set(dayKey, {
      dayKey,
      dayLabel: formatDayLabel(start),
      relativeLabel: formatRelativeDayLabel(start, new Date(now)),
      events: [event],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      events: [...group.events].sort(
        (a, b) =>
          (parseEventStartDateTime(a)?.getTime() ?? 0) -
          (parseEventStartDateTime(b)?.getTime() ?? 0),
      ),
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

export function findMultiEventDays(
  events: LocalEvent[],
  options?: SavedEventsWeekOptions,
): MultiEventDayPlan[] {
  return groupSavedEventsByDay(events, options)
    .filter((group) => group.events.length >= 2)
    .map((group) => ({
      dayKey: group.dayKey,
      dayLabel: group.relativeLabel,
      events: group.events,
    }));
}

export function buildCombinedNightOutPlan(
  events: LocalEvent[],
  areaLabel?: string,
): NightOutStep[] {
  const sorted = [...events]
    .filter((event) => parseEventStartDateTime(event))
    .sort(
      (a, b) =>
        (parseEventStartDateTime(a)?.getTime() ?? 0) -
        (parseEventStartDateTime(b)?.getTime() ?? 0),
    );

  if (sorted.length === 0) return [];
  if (sorted.length === 1) return buildNightOutPlan(sorted[0], areaLabel);

  const steps: NightOutStep[] = [];
  const firstPlan = buildNightOutPlan(sorted[0], areaLabel);
  const leave = firstPlan.find((step) => step.kind === 'leave');
  if (leave) steps.push({ ...leave, title: 'Leave home', subtitle: 'Stacked night — first stop first' });

  sorted.forEach((event, index) => {
    const plan = buildNightOutPlan(event, areaLabel);
    const arrive = plan.find((step) => step.kind === 'arrive');
    const doors = plan.find((step) => step.kind === 'doors');
    const wrap = plan.find((step) => step.kind === 'wrap');

    if (index > 0) {
      const prev = sorted[index - 1];
      const prevWrap = buildNightOutPlan(prev, areaLabel).find((step) => step.kind === 'wrap');
      steps.push({
        id: `between-${index}`,
        timeLabel: prevWrap?.timeLabel ?? doors?.timeLabel ?? '',
        title: 'Travel to next venue',
        subtitle: `${event.venue} — allow ~30 min between events`,
        kind: 'transit',
      });
    }

    if (arrive) {
      steps.push({
        ...arrive,
        id: `arrive-${index}`,
        subtitle: index === 0 ? arrive.subtitle : `Arrive for ${event.title}`,
      });
    }
    if (doors) {
      steps.push({
        ...doors,
        id: `doors-${index}`,
        title: index === 0 ? doors.title : `Event ${index + 1}`,
        subtitle: event.title,
      });
    }
    if (wrap) {
      steps.push({
        ...wrap,
        id: `wrap-${index}`,
        subtitle: event.venue,
      });
    }
  });

  const lastPlan = buildNightOutPlan(sorted[sorted.length - 1], areaLabel);
  const returnSteps = lastPlan.filter((step) => step.kind === 'transit' || step.kind === 'home');
  steps.push(...returnSteps.map((step, index) => ({ ...step, id: `${step.id}-combined-${index}` })));

  return steps;
}
