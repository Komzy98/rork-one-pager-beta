import type {
  DiscoverEngineResult,
  DiscoverLifeContext,
  DiscoverOpenWindow,
  DiscoverOpportunity,
} from '@/utils/discoverLifeEngine';

export interface TimelineEveningOpportunity {
  opportunity: DiscoverOpportunity;
  openStart: Date;
  openEnd: Date;
  openMinutes: number;
}

export interface TimelineEveningOpportunityInput {
  context: DiscoverLifeContext;
  engine: DiscoverEngineResult;
  isSaved?: (eventId: string) => boolean;
  hasExistingEveningPlan?: boolean;
  now?: Date;
  minScore?: number;
  maxDistanceKm?: number;
}

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function eveningBounds(now: Date) {
  const start = new Date(now);
  start.setHours(17, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 0, 0, 0);
  return { start, end };
}

function eveningOverlap(window: DiscoverOpenWindow, now: Date) {
  if (!window.isToday) return null;
  const bounds = eveningBounds(now);
  const startMs = Math.max(window.start.getTime(), bounds.start.getTime(), now.getTime());
  const endMs = Math.min(window.end.getTime(), bounds.end.getTime());
  if (endMs <= startMs) return null;
  const minutes = Math.floor((endMs - startMs) / 60_000);
  return { start: new Date(startMs), end: new Date(endMs), minutes };
}

export function selectTimelineEveningOpportunity({
  context,
  engine,
  isSaved = () => false,
  hasExistingEveningPlan = false,
  now = new Date(),
  minScore = 92,
  maxDistanceKm = 12,
}: TimelineEveningOpportunityInput): TimelineEveningOpportunity | null {
  const hour = now.getHours();

  // Timeline should not advertise an evening plan during the morning or after wind-down.
  if (hour < 16 || hour >= 21) return null;
  if (hasExistingEveningPlan) return null;
  if (context.busyModeActive || context.recoveryActive) return null;
  if (context.taskPressure.score >= 65) return null;

  const openEvenings = context.openWindows
    .map((window) => ({ window, overlap: eveningOverlap(window, now) }))
    .filter((entry): entry is { window: DiscoverOpenWindow; overlap: NonNullable<ReturnType<typeof eveningOverlap>> } => Boolean(entry.overlap))
    // A two-hour event should still leave useful transition/decompression time around it.
    .filter((entry) => entry.overlap.minutes >= 165)
    .sort((a, b) => b.overlap.minutes - a.overlap.minutes);

  if (openEvenings.length === 0) return null;

  const candidates = engine.eventPicks
    .filter((item) => item.kind === 'event' && item.event && item.startsAt)
    .filter((item) => !isSaved(item.id))
    .filter((item) => item.score >= minScore)
    .filter((item) => {
      const distance = item.event?.distanceKm;
      return typeof distance === 'number' && Number.isFinite(distance) && distance <= maxDistanceKm;
    })
    .filter((item) => sameLocalDay(item.startsAt as Date, now))
    .sort((a, b) => b.score - a.score);

  for (const item of candidates) {
    const start = item.startsAt as Date;
    const duration = item.durationMinutes ?? 120;
    const endMs = start.getTime() + duration * 60_000;

    for (const entry of openEvenings) {
      if (start.getTime() < entry.overlap.start.getTime()) continue;
      if (endMs > entry.overlap.end.getTime()) continue;

      return {
        opportunity: item,
        openStart: entry.overlap.start,
        openEnd: entry.overlap.end,
        openMinutes: entry.overlap.minutes,
      };
    }
  }

  return null;
}
