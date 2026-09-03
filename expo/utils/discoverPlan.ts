import type { DiscoverOpenWindow, DiscoverOpportunity } from '@/utils/discoverLifeEngine';

export interface DiscoverPlanItem {
  id: string;
  opportunity: DiscoverOpportunity;
  start: Date;
  end: Date;
  timeLabel: string;
}

export interface DiscoverWindowPlan {
  window: DiscoverOpenWindow;
  items: DiscoverPlanItem[];
  usedMinutes: number;
  freeMinutes: number;
}

function durationFor(opportunity: DiscoverOpportunity): number {
  if (opportunity.durationMinutes && opportunity.durationMinutes > 0) {
    return Math.max(10, Math.min(opportunity.durationMinutes, 180));
  }
  switch (opportunity.kind) {
    case 'watch':
    case 'media':
      return 50;
    case 'sport':
      return 130;
    case 'event':
      return 120;
    case 'recipe':
      return 35;
    case 'task':
      return 30;
    case 'habit':
    default:
      return 20;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function createPlanItem(opportunity: DiscoverOpportunity, start: Date, duration: number): DiscoverPlanItem {
  const end = addMinutes(start, duration);
  return {
    id: `${opportunity.key}-${start.getTime()}`,
    opportunity,
    start,
    end,
    timeLabel: `${formatTime(start)} – ${formatTime(end)}`,
  };
}

function fits(start: Date, duration: number, endLimit: Date): boolean {
  return addMinutes(start, duration).getTime() <= endLimit.getTime();
}

export function buildPlanForWindow(
  window: DiscoverOpenWindow,
  opportunities: DiscoverOpportunity[],
): DiscoverWindowPlan {
  const candidates = opportunities
    .filter((item) => item.kind !== 'event' || item.event != null)
    .sort((a, b) => b.score - a.score);

  const timed = candidates
    .filter((item) => item.startsAt && item.startsAt >= window.start && item.startsAt < window.end)
    .sort((a, b) => b.score - a.score || (a.startsAt!.getTime() - b.startsAt!.getTime()));

  const anchor = timed[0] ?? null;
  const chosen = new Set<string>();
  const items: DiscoverPlanItem[] = [];
  const gapMinutes = 10;

  const flexible = candidates.filter((item) => !item.startsAt && item.kind !== 'media');

  if (anchor?.startsAt) {
    const anchorDuration = durationFor(anchor);
    const anchorEnd = addMinutes(anchor.startsAt, anchorDuration);
    if (anchorEnd <= window.end) {
      items.push(createPlanItem(anchor, anchor.startsAt, anchorDuration));
      chosen.add(anchor.key);
    }

    let preCursor = new Date(window.start);
    for (const item of flexible) {
      if (chosen.has(item.key)) continue;
      const duration = durationFor(item);
      const latestEnd = addMinutes(anchor.startsAt, -gapMinutes);
      if (!fits(preCursor, duration, latestEnd)) continue;
      items.push(createPlanItem(item, preCursor, duration));
      chosen.add(item.key);
      preCursor = addMinutes(preCursor, duration + gapMinutes);
      if (items.length >= 4) break;
    }

    let postCursor = addMinutes(anchorEnd, gapMinutes);
    for (const item of flexible) {
      if (chosen.has(item.key)) continue;
      const duration = durationFor(item);
      if (!fits(postCursor, duration, window.end)) continue;
      items.push(createPlanItem(item, postCursor, duration));
      chosen.add(item.key);
      postCursor = addMinutes(postCursor, duration + gapMinutes);
      if (items.length >= 4) break;
    }
  } else {
    let cursor = new Date(window.start);
    const fillCandidates = [...flexible, ...candidates.filter((item) => item.kind === 'media')];
    for (const item of fillCandidates) {
      if (chosen.has(item.key)) continue;
      const duration = durationFor(item);
      if (!fits(cursor, duration, window.end)) continue;
      items.push(createPlanItem(item, cursor, duration));
      chosen.add(item.key);
      cursor = addMinutes(cursor, duration + gapMinutes);
      if (items.length >= 4) break;
    }
  }

  items.sort((a, b) => a.start.getTime() - b.start.getTime());
  const usedMinutes = items.reduce((sum, item) => sum + Math.round((item.end.getTime() - item.start.getTime()) / 60_000), 0);
  const freeMinutes = Math.max(0, window.durationMinutes - usedMinutes - Math.max(0, items.length - 1) * gapMinutes);

  return { window, items, usedMinutes, freeMinutes };
}
