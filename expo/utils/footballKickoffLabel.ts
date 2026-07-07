/** Resolve display kickoff clock from API ISO date and/or separate `time` field. */
export function resolveFootballKickoffTime(date: string, time?: string): string {
  const trimmed = time?.trim();
  if (trimmed) return trimmed;
  if (!date?.includes('T')) return '';
  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function normalizeMatchDay(date: string): Date | null {
  if (!date) return null;
  try {
    if (date.includes('T')) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return null;
      const day = new Date(parsed);
      day.setHours(0, 0, 0, 0);
      return day;
    }
    const dateOnly = date.split('T')[0];
    const [year, month, dayNum] = dateOnly.split('-').map(Number);
    if (!year || !month || !dayNum) return null;
    const d = new Date(year, month - 1, dayNum);
    d.setHours(0, 0, 0, 0);
    return d;
  } catch {
    return null;
  }
}

function formatTimeSuffix(kickoff: string): string {
  return kickoff ? ` · ${kickoff}` : '';
}

/**
 * Human-readable kickoff line for upcoming fixtures, e.g. `Tomorrow · 15:00`, `Sat 6 Jul · 20:00`.
 */
export function formatFootballKickoffLabel(date: string, time?: string): string {
  const kickoff = resolveFootballKickoffTime(date, time);
  const matchDay = normalizeMatchDay(date);
  if (!matchDay) return kickoff || 'TBD';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (matchDay.getTime() === today.getTime()) {
    return kickoff ? `Today${formatTimeSuffix(kickoff)}` : 'Today';
  }
  if (matchDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow${formatTimeSuffix(kickoff)}`;
  }

  const datePart = matchDay.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${datePart}${formatTimeSuffix(kickoff)}`;
}

/**
 * Compact badge on Sports match cards: today → kickoff time; tomorrow+ → day label with time.
 */
export function formatFootballMatchBadgeTime(date: string, time?: string): string {
  const kickoff = resolveFootballKickoffTime(date, time);
  const matchDay = normalizeMatchDay(date);
  if (!matchDay) return kickoff || 'TBD';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (matchDay.getTime() === today.getTime()) {
    return kickoff || 'Today';
  }
  if (matchDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow${formatTimeSuffix(kickoff)}`;
  }

  const datePart = matchDay.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  return kickoff ? `${datePart} · ${kickoff}` : datePart;
}
