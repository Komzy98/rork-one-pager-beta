/** Human-readable labels for onboarding summary (match interests step). */
export const ONBOARDING_INTEREST_LABELS: Record<string, string> = {
  football: 'Football',
  ufc: 'UFC / MMA',
  nba: 'NBA',
  f1: 'Formula 1',
  fitness: 'Fitness',
  movies: 'Movies & TV',
  cooking: 'Cooking',
  learning: 'Learning',
  events: 'Events',
  productivity: 'Productivity',
  work: 'Work',
};

export function formatInterestLabel(id: string): string {
  const key = id.trim().toLowerCase();
  if (ONBOARDING_INTEREST_LABELS[key]) return ONBOARDING_INTEREST_LABELS[key];
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatInterestsSummary(ids: string[], max = 3): string {
  if (ids.length === 0) return 'None selected';
  const names = ids.slice(0, max).map(formatInterestLabel);
  const suffix = ids.length > max ? ` +${ids.length - max}` : '';
  return `${names.join(', ')}${suffix}`;
}

/** Title-case generic daily-stack snippet words for summary screens. */
export function polishDailyStackHeadline(headline: string | null): string | null {
  if (!headline) return null;
  if (!headline.startsWith('Today: ')) return headline;
  const body = headline.slice('Today: '.length);
  const parts = body.split(' · ').map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return trimmed;
    if (trimmed.includes('/')) return trimmed;
    if (trimmed.startsWith('Continue ')) return trimmed;
    if (/^\d+\/\d+/.test(trimmed)) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  });
  return `Today: ${parts.join(' · ')}`;
}
