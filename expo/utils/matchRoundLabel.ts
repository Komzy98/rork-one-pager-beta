/** User-facing label for API-Football `league.round` (e.g. "Semi-finals", "Regular Season - 38"). */
export function formatMatchRoundLabel(round?: string | null): string | null {
  if (!round?.trim()) return null;

  const raw = round.trim();
  const lower = raw.toLowerCase();

  if (/^final$/i.test(raw)) return 'Final';
  if (/semi[- ]?final/i.test(lower)) return 'Semi-final';
  if (/quarter[- ]?final/i.test(lower)) return 'Quarter-final';
  if (/(3rd|third).*(final|place)/i.test(lower)) return '3rd Place Final';

  const roundOf = raw.match(/round of (\d+)/i);
  if (roundOf) return `Round of ${roundOf[1]}`;

  const matchday = raw.match(/regular season\s*[-–]\s*(\d+)/i);
  if (matchday) return `Matchday ${matchday[1]}`;

  if (/group stage/i.test(lower)) {
    const group = raw.match(/group\s*[-–]?\s*(\d+|[A-Za-z])/i);
    return group ? `Group ${group[1].toUpperCase()}` : 'Group stage';
  }

  if (/play-?off|playoff|relegation|promotion|preliminary|qualifying/i.test(lower)) {
    return raw.replace(/\s*-\s*/g, ' · ');
  }

  if (/final|round|leg\s*\d/i.test(lower)) {
    return raw.replace(/\s*-\s*/g, ' · ');
  }

  return raw.replace(/\s*-\s*/g, ' · ');
}

export function isKnockoutRoundLabel(label: string | null): boolean {
  if (!label) return false;
  const lower = label.toLowerCase();
  return (
    lower.includes('final') ||
    lower.includes('semi') ||
    lower.includes('quarter') ||
    lower.includes('round of') ||
    lower.includes('play-off') ||
    lower.includes('playoff')
  );
}
