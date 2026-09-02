import type { CrossActivityInsight, SmartRecommendation } from '@/types/activity';

export type CalendarConflictInput = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
};

export type CalendarConflict = {
  first: CalendarConflictInput;
  second: CalendarConflictInput;
  overlapMinutes: number;
  message: string;
};

function compact(text: string, max = 148) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max - 1).replace(/[\s,;:.!?-]+$/g, '');
  return `${clipped}…`;
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

/** Finds the first genuine overlap that still matters from now onward. */
export function findUpcomingCalendarConflict(
  events: readonly CalendarConflictInput[],
  now = new Date(),
): CalendarConflict | null {
  const rows = events
    .filter((event) => !event.isAllDay && Number.isFinite(event.start.getTime()) && Number.isFinite(event.end.getTime()) && event.end > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const first = rows[i];
      const second = rows[j];
      if (second.start >= first.end) break;
      const overlapMs = Math.min(first.end.getTime(), second.end.getTime()) - Math.max(first.start.getTime(), second.start.getTime());
      const overlapMinutes = Math.max(0, Math.round(overlapMs / 60_000));
      if (overlapMinutes < 5) continue;
      return {
        first,
        second,
        overlapMinutes,
        message: `${first.title} overlaps ${second.title} by ${durationLabel(overlapMinutes)}.`,
      };
    }
  }

  return null;
}

/**
 * Selects at most one high-confidence intelligence output for a normal product surface.
 * There is deliberately no AI label here: the observation only earns a slot if it is
 * actionable, confident, and useful in the current day.
 */
export function pickQuietActivityObservation(params: {
  crossInsights?: readonly CrossActivityInsight[];
  recommendations?: readonly SmartRecommendation[];
}): string | null {
  const cross = (params.crossInsights ?? []).find((item) =>
    item.actionable
    && item.confidence >= 0.82
    && (item.priorityScore ?? 0.5) >= 0.5
    && Boolean(item.insight?.trim() || item.description?.trim()),
  );
  if (cross) return compact(cross.insight?.trim() || cross.description.trim());

  const recommendation = (params.recommendations ?? []).find((item) =>
    item.confidence >= 0.84
    && item.estimatedBenefit >= 0.65
    && item.urgencyLabel !== 'later'
    && Boolean(item.reasoning?.trim() || item.description?.trim()),
  );
  if (!recommendation) return null;
  return compact(recommendation.reasoning?.trim() || recommendation.description.trim());
}
